# 📋 SoccerSim — Code-Level Decision Logic Notes

> Detailed notes on the decision logic found in each critical Cyrus2DBase source file.
> Use alongside RESEARCH_MAP.md to locate and understand the principles of play.

---

## 1. /src/player/strategy.cpp

```cpp
// -*-c++-*-

/*!
  \file strategy.cpp
  \brief team strategh Source File
*/

/*
 *Copyright:

 Cyrus2D
 Modified by Omid Amini, Nader Zare

 Gliders2d
 Modified by Mikhail Prokopenko, Peter Wang

 Copyright (C) Hidehisa AKIYAMA

 This code is free software; you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation; either version 3, or (at your option)
 any later version.

 This code is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this code; see the file COPYING.  If not, write to
 the Free Software Foundation, 675 Mass Ave, Cambridge, MA 02139, USA.

 *EndCopyright:
 */

/////////////////////////////////////////////////////////////////////

#ifdef HAVE_CONFIG_H
#include <config.h>
#endif

#include "strategy.h"

#include "soccer_role.h"


#ifndef USE_GENERIC_FACTORY
#include "role_sample.h"

#include "role_center_back.h"
#include "role_center_forward.h"
#include "role_defensive_half.h"
#include "role_goalie.h"
#include "role_offensive_half.h"
#include "role_side_back.h"
#include "role_side_forward.h"
#include "role_side_half.h"

#include "role_keepaway_keeper.h"
#include "role_keepaway_taker.h"
#endif

#include <rcsc/player/intercept_table.h>
#include <rcsc/player/world_model.h>
#include <rcsc/geom/voronoi_diagram.h>

#include <rcsc/formation/formation_parser.h>
#include <rcsc/common/logger.h>
#include <rcsc/common/server_param.h>
#include <rcsc/param/cmd_line_parser.h>
#include <rcsc/param/param_map.h>
#include <rcsc/game_mode.h>

#include <iostream>

using namespace rcsc;

const std::string Strategy::BEFORE_KICK_OFF_CONF = "before-kick-off.conf";
const std::string Strategy::NORMAL_FORMATION_CONF = "normal-formation.conf";
const std::string Strategy::DEFENSE_FORMATION_CONF = "defense-formation.conf";
const std::string Strategy::OFFENSE_FORMATION_CONF = "offense-formation.conf";
const std::string Strategy::GOAL_KICK_OPP_FORMATION_CONF = "goal-kick-opp.conf";
const std::string Strategy::GOAL_KICK_OUR_FORMATION_CONF = "goal-kick-our.conf";
const std::string Strategy::GOALIE_CATCH_OPP_FORMATION_CONF = "goalie-catch-opp.conf";
const std::string Strategy::GOALIE_CATCH_OUR_FORMATION_CONF = "goalie-catch-our.conf";
const std::string Strategy::KICKIN_OUR_FORMATION_CONF = "kickin-our-formation.conf";
const std::string Strategy::SETPLAY_OPP_FORMATION_CONF = "setplay-opp-formation.conf";
const std::string Strategy::SETPLAY_OUR_FORMATION_CONF = "setplay-our-formation.conf";
const std::string Strategy::INDIRECT_FREEKICK_OPP_FORMATION_CONF = "indirect-freekick-opp-formation.conf";
const std::string Strategy::INDIRECT_FREEKICK_OUR_FORMATION_CONF = "indirect-freekick-our-formation.conf";

/*-------------------------------------------------------------------*/
/*!

 */
namespace {
struct MyCompare {

    const Vector2D pos_;

    MyCompare( const Vector2D & pos )
        : pos_( pos )
      { }

    bool operator()( const Vector2D & lhs,
                     const Vector2D & rhs ) const
      {
          return (lhs - pos_).length() < (rhs - pos_).length();
      }
};
}

/*-------------------------------------------------------------------*/
/*!

 */
Strategy::Strategy()
    : M_goalie_unum( Unum_Unknown ),
      M_current_situation( Normal_Situation ),
      M_role_number( 11, 0 ),
      M_position_types( 11, Position_Center ),
      M_positions( 11 )
{
#ifndef USE_GENERIC_FACTORY
    //
    // roles
    //

    M_role_factory[RoleSample::name()] = &RoleSample::create;

    M_role_factory[RoleGoalie::name()] = &RoleGoalie::create;
    M_role_factory[RoleCenterBack::name()] = &RoleCenterBack::create;
    M_role_factory[RoleSideBack::name()] = &RoleSideBack::create;
    M_role_factory[RoleDefensiveHalf::name()] = &RoleDefensiveHalf::create;
    M_role_factory[RoleOffensiveHalf::name()] = &RoleOffensiveHalf::create;
    M_role_factory[RoleSideHalf::name()] = &RoleSideHalf::create;
    M_role_factory[RoleSideForward::name()] = &RoleSideForward::create;
    M_role_factory[RoleCenterForward::name()] = &RoleCenterForward::create;

    // keepaway
    M_role_factory[RoleKeepawayKeeper::name()] = &RoleKeepawayKeeper::create;
    M_role_factory[RoleKeepawayTaker::name()] = &RoleKeepawayTaker::create;

#endif

    for ( size_t i = 0; i < M_role_number.size(); ++i )
    {
        M_role_number[i] = i + 1;
    }
}

/*-------------------------------------------------------------------*/
/*!

 */
Strategy &
Strategy::instance()
{
    static Strategy s_instance;
    return s_instance;
}

/*-------------------------------------------------------------------*/
/*!

 */
bool
Strategy::init( CmdLineParser & cmd_parser )
{
    ParamMap param_map( "HELIOS_base options" );

    // std::string fconf;
    //param_map.add()
    //    ( "fconf", "", &fconf, "another formation file." );

    //
    //
    //

    if ( cmd_parser.count( "help" ) > 0 )
    {
        param_map.printHelp( std::cout );
        return false;
    }

    //
    //
    //

    cmd_parser.parse( param_map );

    return true;
}

/*-------------------------------------------------------------------*/
/*!

 */
bool
Strategy::read( const std::string & formation_dir )
{
    static bool s_initialized = false;

    if ( s_initialized )
    {
        std::cerr << __FILE__ << ' ' << __LINE__ << ": already initialized."
                  << std::endl;
        return false;
    }

    std::string configpath = formation_dir;
    if ( ! configpath.empty()
         && configpath[ configpath.length() - 1 ] != '/' )
    {
        configpath += '/';
    }

    // before kick off
    M_before_kick_off_formation = createFormation( configpath + BEFORE_KICK_OFF_CONF );
    if ( ! M_before_kick_off_formation )
    {
        std::cerr << "Failed to read before_kick_off formation" << std::endl;
        return false;
    }

    ///////////////////////////////////////////////////////////
    M_normal_formation = createFormation( configpath + NORMAL_FORMATION_CONF );
    if ( ! M_normal_formation )
    {
        std::cerr << "Failed to read normal formation" << std::endl;
        return false;
    }

    M_defense_formation = createFormation( configpath + DEFENSE_FORMATION_CONF );
    if ( ! M_defense_formation )
    {
        std::cerr << "Failed to read defense formation" << std::endl;
        return false;
    }

    M_offense_formation = createFormation( configpath + OFFENSE_FORMATION_CONF );
    if ( ! M_offense_formation )
    {
        std::cerr << "Failed to read offense formation" << std::endl;
        return false;
    }

    M_goal_kick_opp_formation = createFormation( configpath + GOAL_KICK_OPP_FORMATION_CONF );
    if ( ! M_goal_kick_opp_formation )
    {
        return false;
    }

    M_goal_kick_our_formation = createFormation( configpath + GOAL_KICK_OUR_FORMATION_CONF );
    if ( ! M_goal_kick_our_formation )
    {
        return false;
    }

    M_goalie_catch_opp_formation = createFormation( configpath + GOALIE_CATCH_OPP_FORMATION_CONF );
    if ( ! M_goalie_catch_opp_formation )
    {
        return false;
    }

    M_goalie_catch_our_formation = createFormation( configpath + GOALIE_CATCH_OUR_FORMATION_CONF );
    if ( ! M_goalie_catch_our_formation )
    {
        return false;
    }

    M_kickin_our_formation = createFormation( configpath + KICKIN_OUR_FORMATION_CONF );
    if ( ! M_kickin_our_formation )
    {
        std::cerr << "Failed to read kickin our formation" << std::endl;
        return false;
    }

    M_setplay_opp_formation = createFormation( configpath + SETPLAY_OPP_FORMATION_CONF );
    if ( ! M_setplay_opp_formation )
    {
        std::cerr << "Failed to read setplay opp formation" << std::endl;
        return false;
    }

    M_setplay_our_formation = createFormation( configpath + SETPLAY_OUR_FORMATION_CONF );
    if ( ! M_setplay_our_formation )
    {
        std::cerr << "Failed to read setplay our formation" << std::endl;
        return false;
    }

    M_indirect_freekick_opp_formation = createFormation( configpath + INDIRECT_FREEKICK_OPP_FORMATION_CONF );
    if ( ! M_indirect_freekick_opp_formation )
    {
        std::cerr << "Failed to read indirect freekick opp formation" << std::endl;
        return false;
    }

    M_indirect_freekick_our_formation = createFormation( configpath + INDIRECT_FREEKICK_OUR_FORMATION_CONF );
    if ( ! M_indirect_freekick_our_formation )
    {
        std::cerr << "Failed to read indirect freekick our formation" << std::endl;
        return false;
    }


    s_initialized = true;
    return true;
}

/*-------------------------------------------------------------------*/
/*!

 */
Formation::Ptr
Strategy::createFormation( const std::string & filepath )
{
    Formation::Ptr f = FormationParser::parse( filepath );

    if ( ! f )
    {
        std::cerr << "(Strategy::createFormation) Could not create a formation from " << filepath << std::endl;
        return Formation::Ptr();
    }

    //
    // check role names
    //
    for ( int unum = 1; unum <= 11; ++unum )
    {
        const std::string role_name = f->roleName( unum );
        if ( role_name == "Savior"
             || role_name == "Goalie" )
        {
            if ( M_goalie_unum == Unum_Unknown )
            {
                M_goalie_unum = unum;
            }

            if ( M_goalie_unum != unum )
            {
                std::cerr << __FILE__ << ':' << __LINE__ << ':'
                          << " ***ERROR*** Illegal goalie's uniform number"
                          << " read unum=" << unum
                          << " expected=" << M_goalie_unum
                          << std::endl;
                f.reset();
                return f;
            }
        }


#ifdef USE_GENERIC_FACTORY
        SoccerRole::Ptr role = SoccerRole::create( role_name );
        if ( ! role )
        {
            std::cerr << __FILE__ << ':' << __LINE__ << ':'
                      << " ***ERROR*** Unsupported role name ["
                      << role_name << "] is appered in ["
                      << filepath << "]" << std::endl;
            f.reset();
            return f;
        }
#else
        if ( M_role_factory.find( role_name ) == M_role_factory.end() )
        {
            std::cerr << __FILE__ << ':' << __LINE__ << ':'
                      << " ***ERROR*** Unsupported role name ["
                      << role_name << "] is appered in ["
                      << filepath << "]" << std::endl;
            f.reset();
            return f;
        }
#endif
    }

    return f;
}

/*-------------------------------------------------------------------*/
/*!

 */
void
Strategy::update( const WorldModel & wm )
{
    static GameTime s_update_time( -1, 0 );

    if ( s_update_time == wm.time() )
    {
        return;
    }
    s_update_time = wm.time();

    updateSituation( wm );
    updatePosition( wm );
}

/*-------------------------------------------------------------------*/
/*!

 */
void
Strategy::exchangeRole( const int unum0,
                        const int unum1 )
{
    if ( unum0 < 1 || 11 < unum0
         || unum1 < 1 || 11 < unum1 )
    {
        std::cerr << __FILE__ << ':' << __LINE__ << ':'
                  << "(exchangeRole) Illegal uniform number. "
                  << unum0 << ' ' << unum1
                  << std::endl;
        dlog.addText( Logger::TEAM,
                      __FILE__":(exchangeRole) Illegal unum. %d %d",
                      unum0, unum1 );
        return;
    }

    if ( unum0 == unum1 )
    {
        std::cerr << __FILE__ << ':' << __LINE__ << ':'
                  << "(exchangeRole) same uniform number. "
                  << unum0 << ' ' << unum1
                  << std::endl;
        dlog.addText( Logger::TEAM,
                      __FILE__":(exchangeRole) same unum. %d %d",
                      unum0, unum1 );
        return;
    }

    int role0 = M_role_number[unum0 - 1];
    int role1 = M_role_number[unum1 - 1];

    dlog.addText( Logger::TEAM,
                  __FILE__":(exchangeRole) unum=%d(role=%d) <-> unum=%d(role=%d)",
                  unum0, role0,
                  unum1, role1 );

    M_role_number[unum0 - 1] = role1;
    M_role_number[unum1 - 1] = role0;
}

/*-------------------------------------------------------------------*/
/*!

*/
bool
Strategy::isMarkerType( const int unum ) const
{
    int number = roleNumber( unum );

    if ( number == 2
         || number == 3
         || number == 4
         || number == 5 )
    {
        return true;
    }

    return false;
}

/*-------------------------------------------------------------------*/
/*!

 */
SoccerRole::Ptr
Strategy::createRole( const int unum,
                      const WorldModel & world ) const
{
    const int number = roleNumber( unum );

    SoccerRole::Ptr role;

    if ( number < 1 || 11 < number )
    {
        std::cerr << __FILE__ << ": " << __LINE__
                  << " ***ERROR*** Invalid player number " << number
                  << std::endl;
        return role;
    }

    Formation::Ptr f = getFormation( world );
    if ( ! f )
    {
        std::cerr << __FILE__ << ": " << __LINE__
                  << " ***ERROR*** faled to create role. Null formation" << std::endl;
        return role;
    }

    const std::string role_name = f->roleName( number );

#ifdef USE_GENERIC_FACTORY
    role = SoccerRole::create( role_name );
#else
    RoleFactory::const_iterator factory = M_role_factory.find( role_name );
    if ( factory != M_role_factory.end() )
    {
        role = factory->second();
    }
#endif

    if ( ! role )
    {
        std::cerr << __FILE__ << ": " << __LINE__
                  << " ***ERROR*** unsupported role name ["
                  << role_name << "]"
                  << std::endl;
    }
    return role;
}

/*-------------------------------------------------------------------*/
/*!

 */
void
Strategy::updateSituation( const WorldModel & wm )
{
    M_current_situation = Normal_Situation;

    if ( wm.gameMode().type() != GameMode::PlayOn )
    {
        if ( wm.gameMode().isPenaltyKickMode() )
        {
            dlog.addText( Logger::TEAM,
                          __FILE__": Situation PenaltyKick" );
            M_current_situation = PenaltyKick_Situation;
        }
        else if ( wm.gameMode().isPenaltyKickMode() )
        {
            dlog.addText( Logger::TEAM,
                          __FILE__": Situation OurSetPlay" );
            M_current_situation = OurSetPlay_Situation;
        }
        else
        {
            dlog.addText( Logger::TEAM,
                          __FILE__": Situation OppSetPlay" );
            M_current_situation = OppSetPlay_Situation;
        }
        return;
    }

    int self_min = wm.interceptTable().selfStep();
    int mate_min = wm.interceptTable().teammateStep();
    int opp_min = wm.interceptTable().opponentStep();
    int our_min = std::min( self_min, mate_min );

    if ( opp_min <= our_min - 2 )
    {
        dlog.addText( Logger::TEAM,
                      __FILE__": Situation Defense" );
        M_current_situation = Defense_Situation;
        return;
    }

    if ( our_min <= opp_min - 2 )
    {
        dlog.addText( Logger::TEAM,
                      __FILE__": Situation Offense" );
        M_current_situation = Offense_Situation;
        return;
    }

    dlog.addText( Logger::TEAM,
                  __FILE__": Situation Normal" );
}

/*-------------------------------------------------------------------*/
/*!

 */
void
Strategy::updatePosition( const WorldModel & wm )
{
    static GameTime s_update_time( 0, 0 );
    if ( s_update_time == wm.time() )
    {
        return;
    }
    s_update_time = wm.time();

    Formation::Ptr f = getFormation( wm );
    if ( ! f )
    {
        std::cerr << wm.teamName() << ':' << wm.self().unum() << ": "
                  << wm.time()
                  << " ***ERROR*** could not get the current formation" << std::endl;
        return;
    }

    int ball_step = 0;
    if ( wm.gameMode().type() == GameMode::PlayOn
         || wm.gameMode().type() == GameMode::GoalKick_ )
    {
        ball_step = std::min( 1000, wm.interceptTable().teammateStep() );
        ball_step = std::min( ball_step, wm.interceptTable().opponentStep() );
        ball_step = std::min( ball_step, wm.interceptTable().selfStep() );
    }

    Vector2D ball_pos = wm.ball().inertiaPoint( ball_step );

    dlog.addText( Logger::TEAM,
                  __FILE__": HOME POSITION: ball pos=(%.1f %.1f) step=%d",
                  ball_pos.x, ball_pos.y,
                  ball_step );

    M_positions.clear();
    f->getPositions( ball_pos, M_positions );

    // G2d: various states
    bool indFK = false;
    if ( ( wm.gameMode().type() == GameMode::BackPass_
           && wm.gameMode().side() == wm.theirSide() )
         || ( wm.gameMode().type() == GameMode::IndFreeKick_
              && wm.gameMode().side() == wm.ourSide() )
         || ( wm.gameMode().type() == GameMode::FoulCharge_
              && wm.gameMode().side() == wm.theirSide() )
         || ( wm.gameMode().type() == GameMode::FoulPush_
              && wm.gameMode().side() == wm.theirSide() )
        )
        indFK = true;

    bool dirFK = false;
    if (
          ( wm.gameMode().type() == GameMode::FreeKick_
              && wm.gameMode().side() == wm.ourSide() )
         || ( wm.gameMode().type() == GameMode::FoulCharge_
              && wm.gameMode().side() == wm.theirSide() )
         || ( wm.gameMode().type() == GameMode::FoulPush_
              && wm.gameMode().side() == wm.theirSide() )
        )
        dirFK = true;

    bool cornerK = false;
    if (
          ( wm.gameMode().type() == GameMode::CornerKick_
              && wm.gameMode().side() == wm.ourSide() )
        )
        cornerK = true;

    bool kickin = false;
    if (
          ( wm.gameMode().type() == GameMode::KickIn_
              && wm.gameMode().side() == wm.ourSide() )
        )
        kickin = true;


    // C2D: Helios 18 Tune removed -> replace with BNN
	// bool heliosbase = false;
	// bool helios2018 = false;
	// if (wm.opponentTeamName().find("HELIOS_base") != std::string::npos)
	// 	heliosbase = true;
	// else if (wm.opponentTeamName().find("HELIOS2018") != std::string::npos)
	// 	helios2018 = true;

    if ( ServerParam::i().useOffside() )
    {
        double max_x = wm.offsideLineX();
        if ( ServerParam::i().kickoffOffside()
             && ( wm.gameMode().type() == GameMode::BeforeKickOff
                  || wm.gameMode().type() == GameMode::AfterGoal_ ) )
        {
            max_x = 0.0;
        }
        else
        {
            int mate_step = wm.interceptTable().teammateStep();
            if ( mate_step < 50 )
            {
                Vector2D trap_pos = wm.ball().inertiaPoint( mate_step );
                if ( trap_pos.x > max_x ) max_x = trap_pos.x;
            }

            max_x -= 1.0;
        }
    // C2d: PlayerPtrCont::const_iterator replace with auto
    // G2d: Voronoi diagram
			bool newvel = false;

                        VoronoiDiagram vd;
                        // const ServerParam & SP = ServerParam::i();

                        std::vector<Vector2D> vd_cont;
                        std::vector<Vector2D> NOL_cont;  // Near Offside Line
                        std::vector<Vector2D> NOL_tmp;  // Near Offside Line tmp

                        std::vector<Vector2D> OffsideSegm_cont;
                        std::vector<Vector2D> OffsideSegm_tmpcont;

                        Vector2D y1( wm.offsideLineX(), -34.0);
                        Vector2D y2( wm.offsideLineX(), 34.0);

                        if (wm.ball().pos().x > 25.0)
                        {
                                if (wm.ball().pos().y < 0.0)
                                        y2.y = 20.0;
                                if (wm.ball().pos().y > 0.0)
                                        y1.y = -20.0;
                        }

                        if (wm.ball().pos().x > 36.0)
                        {
                                if (wm.ball().pos().y < 0.0)
                                        y2.y = 8.0;
                                if (wm.ball().pos().y > 0.0)
                                        y1.y = -8.0;
                        }

                        if (wm.ball().pos().x > 49.0)
                        {
                                y1.x = y1.x - 4.0;
                                y2.x = y2.x - 4.0;
                        }

                        for ( auto o = wm.opponentsFromSelf().begin();
                                o != wm.opponentsFromSelf().end();
                                ++o )
                        {
                                if (newvel)
                                           vd.addPoint((*o)->pos() + (*o)->vel());
                                else
                                           vd.addPoint((*o)->pos());
                        }

                        if (y1.x < 37.0)
                        {
                                   vd.addPoint(y1);
                                   vd.addPoint(y2);
                        }

                                vd.compute();


                        Line2D offsideLine (y1, y2);

                            for ( VoronoiDiagram::Segment2DCont::const_iterator p = vd.segments().begin(),
                                      end = vd.segments().end();
                                          p != end;
                                          ++p )
                            {
                                Vector2D si = (*p).intersection( offsideLine );
                                if (si.isValid() && fabs(si.y) < 34.0 && fabs(si.x) < 52.5)
                                {
                                        OffsideSegm_tmpcont.push_back(si);

                                }
                            }

                            std::sort( OffsideSegm_tmpcont.begin(), OffsideSegm_tmpcont.end(), MyCompare( wm.ball().pos() ) );

                            double prevY = -1000.0;

                                for ( std::vector<Vector2D>::iterator p = OffsideSegm_tmpcont.begin(),
                                      end = OffsideSegm_tmpcont.end();
                                          p != end;
                                          ++p )
                                {
                                    if ( p == OffsideSegm_tmpcont.begin() )
                                    {
                                        OffsideSegm_cont.push_back((*p));
                                        prevY = (*p).y;
                                        continue;
                                    }

                                    if ( fabs ( (*p).y - prevY ) > 2.0  )
                                    {
                                        prevY = (*p).y;
                                        OffsideSegm_cont.push_back((*p));
                                    }
                                }


                            // int n_points = 0;

                            for ( VoronoiDiagram::Vector2DCont::const_iterator p = vd.vertices().begin(),
                                      end = vd.vertices().end();
                                          p != end;
                                          ++p )
                            {
                                if ( (*p).x < wm.offsideLineX() - 5.0  && (*p).x > 0.0 )
                                {
                                        vd_cont.push_back((*p));

                                }
                            }

        // end of Voronoi

        // G2d: assign players to Voronoi points

                            Vector2D rank (y1.x, -34.0);

                            Vector2D first_pt (-100.0, -100.0);
                            Vector2D mid_pt (-100.0, -100.0);
                            Vector2D third_pt (-100.0, -100.0);

                            if (wm.ball().pos().y > 0.0)
                                rank.y = 34.0;

                            std::sort( OffsideSegm_cont.begin(), OffsideSegm_cont.end(), MyCompare( rank ) );

                            // int shift = 0;

                            // if (OffsideSegm_cont.size() > 4)
                                // shift = 1;

                            if (OffsideSegm_cont.size() > 0)
                                first_pt = OffsideSegm_cont[0];

                            if (OffsideSegm_cont.size() > 1)
                                third_pt = OffsideSegm_cont[OffsideSegm_cont.size() - 1];

                            if (OffsideSegm_cont.size() > 2)
                                mid_pt = OffsideSegm_cont[2];

                            int first_unum = -1;
                            int sec_unum = -1;
                            int third_unum = -1;

                            if (wm.ball().pos().y <= 0.0)
                            {
                                double tmp = 100.0;
                                for ( int ch = 9; ch <= 11; ch++ )
                                {
                                        if ( wm.ourPlayer(ch) == NULL )
                                                continue;

                                        if (wm.ourPlayer(ch)->pos().y < tmp)
                                        {
                                                tmp = wm.ourPlayer(ch)->pos().y;
                                                first_unum = ch;
                                        }
                                }

                                tmp = 100.0;

                                for ( int ch = 9; ch <= 11; ch++ )
                                {
                                        if ( wm.ourPlayer(ch) == NULL )
                                                continue;

                                        if (ch == first_unum)
                                                continue;

                                        if (wm.ourPlayer(ch)->pos().y < tmp)
                                        {
                                                tmp = wm.ourPlayer(ch)->pos().y;
                                                sec_unum = ch;
                                        }
                                }

                                for ( int ch = 9; ch <= 11; ch++ )
                                {
                                        if (ch == first_unum || ch == sec_unum)
                                                continue;

                                        if (first_unum > 0 && sec_unum > 0)
                                                third_unum = ch;
                                }
                            }

                            if (wm.ball().pos().y > 0.0)
                            {
                                double tmp = -100.0;
                                for ( int ch = 9; ch <= 11; ch++ )
                                {
                                        if ( wm.ourPlayer(ch) == NULL )
                                                continue;

                                        if (wm.ourPlayer(ch)->pos().y > tmp)
                                        {
                                                tmp = wm.ourPlayer(ch)->pos().y;
                                                first_unum = ch;
                                        }
                                }

                                tmp = -100.0;

                                for ( int ch = 9; ch <= 11; ch++ )
                                {
                                        if ( wm.ourPlayer(ch) == NULL )
                                                continue;

                                        if (ch == first_unum)
                                                continue;

                                        if (wm.ourPlayer(ch)->pos().y > tmp)
                                        {
                                                tmp = wm.ourPlayer(ch)->pos().y;
                                                sec_unum = ch;
                                        }
                                }

                                for ( int ch = 9; ch <= 11; ch++ )
                                {
                                        if (ch == first_unum || ch == sec_unum)
                                                continue;

                                        if (first_unum > 0 && sec_unum > 0)
                                                third_unum = ch;
                                }

                            }

                        bool first = false;
                        bool sec = false;
                        bool third = false;

			double voron_depth = 42.0;
            // C2D: Helios 18 Tune removed -> replace with BNN

			// if (helios2018)
			// 	voron_depth = 36.0;
			// if (heliosbase)
			// 	voron_depth = 0.2;

                        if ( wm.gameMode().type() == GameMode::PlayOn && wm.ball().pos().x > voron_depth)
                        {
                            if (first_pt.x > -1.0 && first_unum > 0)
                            {
                                first = true;
                                M_positions[first_unum-1] = first_pt;
                            }
                            if (mid_pt.x > -1.0  && sec_unum > 0)
                            {
                                sec = true;
                                M_positions[sec_unum-1] = mid_pt;
                            }
                            if (third_pt.x > -1.0 && third_unum > 0)
                            {
                                third = true;
                                M_positions[third_unum-1] = third_pt;
                            }
                        }
        // end of assignment

        for ( int unum = 1; unum <= 11; ++unum )
        {
            // G2d: skip assigned players

            if ( unum == first_unum && first )
                continue;

            if ( unum == sec_unum && sec )
                continue;

            if ( unum == third_unum && third )
                continue;

            if ( M_positions[unum-1].x > max_x )
            {
                dlog.addText( Logger::TEAM,
                              "____ %d offside. home_pos_x %.2f -> %.2f",
                              unum,
                              M_positions[unum-1].x, max_x );
                M_positions[unum-1].x = max_x;
            }
        }
    }

    int self_min = wm.interceptTable().selfStep();
    int mate_min = wm.interceptTable().teammateStep();
    int opp_min = wm.interceptTable().opponentStep();

    const int our_min = std::min(self_min, mate_min);

    // G2d : wing tactic
    double wing_x = -15.0;
    double wing_y = 7.0;
    double wing_depth = 5.0;
    double wing_limit = 39.0;

    // C2D: Tune removed
    // if (mt || helios2018)
    // {
    //     wing_depth = 10.0;
    //     wing_y = 17.0;
    // }

    if (our_min < opp_min)
        if (wm.ball().pos().x > wing_x)
            if (wm.ball().pos().x < wing_limit)
                if (fabs(wm.ball().pos().y) > wing_y)
                    if (!indFK && !dirFK && !cornerK && !kickin)
                    {
                        M_positions[9 - 1].x = wm.offsideLineX() + wm.ball().vel().x;
                        M_positions[10 - 1].x = wm.offsideLineX() + wm.ball().vel().x;
                        M_positions[11 - 1].x = wm.offsideLineX() + wm.ball().vel().x;

                        if (wm.ball().pos().y > 0)
                        {
                            M_positions[9 - 1].y = 15.0;
                            M_positions[11 - 1].y = 22.5;
                            M_positions[10 - 1].y = 30.0;
                        }
                        else
                        {
                            M_positions[9 - 1].y = -30.0;
                            M_positions[11 - 1].y = -22.5;
                            M_positions[10 - 1].y = -15.0;
                        }

                        double midX = wm.offsideLineX() - wing_depth;

                        M_positions[6 - 1].x = midX;
                        M_positions[7 - 1].x = midX;
                        M_positions[8 - 1].x = midX;

                        M_positions[7 - 1].y = M_positions[9 - 1].y;
                        M_positions[6 - 1].y = M_positions[11 - 1].y;
                        M_positions[8 - 1].y = M_positions[10 - 1].y;
                    }

    M_position_types.clear();
    for ( int unum = 1; unum <= 11; ++unum )
    {
        PositionType type = Position_Center;

        const RoleType role_type = f->roleType( unum );
        if ( role_type.side() == RoleType::Left )
        {
            type = Position_Left;
        }
        else if ( role_type.side() == RoleType::Right )
        {
            type = Position_Right;
        }

        M_position_types.push_back( type );

        dlog.addText( Logger::TEAM,
                      "__ %d home pos (%.2f %.2f) type=%d",
                      unum,
                      M_positions[unum-1].x, M_positions[unum-1].y,
                      type );
        dlog.addCircle( Logger::TEAM,
                        M_positions[unum-1], 0.5,
                        "#000000" );
    }
}


/*-------------------------------------------------------------------*/
/*!

 */
PositionType
Strategy::getPositionType( const int unum ) const
{
    const int number = roleNumber( unum );

    if ( number < 1 || 11 < number )
    {
        std::cerr << __FILE__ << ' ' << __LINE__
                  << ": Illegal number : " << number
                  << std::endl;
        return Position_Center;
    }

    try
    {
        return M_position_types.at( number - 1 );
    }
    catch ( std::exception & e )
    {
        std::cerr<< __FILE__ << ':' << __LINE__ << ':'
                 << " Exception caught! " << e.what()
                 << std::endl;
        return Position_Center;
    }
}

/*-------------------------------------------------------------------*/
/*!

 */
Vector2D
Strategy::getPosition( const int unum ) const
{
    const int number = roleNumber( unum );

    if ( number < 1 || 11 < number )
    {
        std::cerr << __FILE__ << ' ' << __LINE__
                  << ": Illegal number : " << number
                  << std::endl;
        return Vector2D::INVALIDATED;
    }

    try
    {
        return M_positions.at( number - 1 );
    }
    catch ( std::exception & e )
    {
        std::cerr<< __FILE__ << ':' << __LINE__ << ':'
                 << " Exception caught! " << e.what()
                 << std::endl;
        return Vector2D::INVALIDATED;
    }
}

/*-------------------------------------------------------------------*/
/*!

 */
Formation::Ptr
Strategy::getFormation( const WorldModel & wm ) const
{
    //
    // play on
    //
    if ( wm.gameMode().type() == GameMode::PlayOn )
    {
        switch ( M_current_situation ) {
        case Defense_Situation:
            return M_defense_formation;
        case Offense_Situation:
            return M_offense_formation;
        default:
            break;
        }
        return M_normal_formation;
    }

    //
    // kick in, corner kick
    //
    if ( wm.gameMode().type() == GameMode::KickIn_
         || wm.gameMode().type() == GameMode::CornerKick_ )
    {
        if ( wm.ourSide() == wm.gameMode().side() )
        {
            // our kick-in or corner-kick
            return M_kickin_our_formation;
        }
        else
        {
            return M_setplay_opp_formation;
        }
    }

    //
    // our indirect free kick
    //
    if ( ( wm.gameMode().type() == GameMode::BackPass_
           && wm.gameMode().side() == wm.theirSide() )
         || ( wm.gameMode().type() == GameMode::IndFreeKick_
              && wm.gameMode().side() == wm.ourSide() ) )
    {
        return M_indirect_freekick_our_formation;
    }

    //
    // opponent indirect free kick
    //
    if ( ( wm.gameMode().type() == GameMode::BackPass_
           && wm.gameMode().side() == wm.ourSide() )
         || ( wm.gameMode().type() == GameMode::IndFreeKick_
              && wm.gameMode().side() == wm.theirSide() ) )
    {
        return M_indirect_freekick_opp_formation;
    }

    //
    // after foul
    //
    if ( wm.gameMode().type() == GameMode::FoulCharge_
         || wm.gameMode().type() == GameMode::FoulPush_ )
    {
        if ( wm.gameMode().side() == wm.ourSide() )
        {
            //
            // opponent (indirect) free kick
            //
            if ( wm.ball().pos().x < ServerParam::i().ourPenaltyAreaLineX() + 1.0
                 && wm.ball().pos().absY() < ServerParam::i().penaltyAreaHalfWidth() + 1.0 )
            {
                return M_indirect_freekick_opp_formation;
            }
            else
            {
                return M_setplay_opp_formation;
            }
        }
        else
        {
            //
            // our (indirect) free kick
            //
            if ( wm.ball().pos().x > ServerParam::i().theirPenaltyAreaLineX()
                 && wm.ball().pos().absY() < ServerParam::i().penaltyAreaHalfWidth() )
            {
                return M_indirect_freekick_our_formation;
            }
            else
            {
                return M_setplay_our_formation;
            }
        }
    }

    //
    // goal kick
    //
    if ( wm.gameMode().type() == GameMode::GoalKick_ )
    {
        if ( wm.gameMode().side() == wm.ourSide() )
        {
            return M_goal_kick_our_formation;
        }
        else
        {
            return M_goal_kick_opp_formation;
        }
    }

    //
    // goalie catch
    //
    if ( wm.gameMode().type() == GameMode::GoalieCatch_ )
    {
        if ( wm.gameMode().side() == wm.ourSide() )
        {
            return M_goalie_catch_our_formation;
        }
        else
        {
            return M_goalie_catch_opp_formation;
        }
    }

    //
    // before kick off
    //
    if ( wm.gameMode().type() == GameMode::BeforeKickOff
         || wm.gameMode().type() == GameMode::AfterGoal_ )
    {
        return M_before_kick_off_formation;
    }

    //
    // other set play
    //
    if ( wm.gameMode().isOurSetPlay( wm.ourSide() ) )
    {
        return M_setplay_our_formation;
    }

    if ( wm.gameMode().type() != GameMode::PlayOn )
    {
        return M_setplay_opp_formation;
    }

    //
    // unknown
    //
    switch ( M_current_situation ) {
    case Defense_Situation:
        return M_defense_formation;
    case Offense_Situation:
        return M_offense_formation;
    default:
        break;
    }

    return M_normal_formation;
}

/*-------------------------------------------------------------------*/
/*!

 */
Strategy::BallArea
Strategy::get_ball_area( const WorldModel & wm )
{
    int ball_step = 1000;
    ball_step = std::min( ball_step, wm.interceptTable().teammateStep() );
    ball_step = std::min( ball_step, wm.interceptTable().opponentStep() );
    ball_step = std::min( ball_step, wm.interceptTable().selfStep() );

    return get_ball_area( wm.ball().inertiaPoint( ball_step ) );
}

/*-------------------------------------------------------------------*/
/*!

 */
Strategy::BallArea
Strategy::get_ball_area( const Vector2D & ball_pos )
{
    dlog.addLine( Logger::TEAM,
                  52.5, -17.0, -52.5, -17.0,
                  "#999999" );
    dlog.addLine( Logger::TEAM,
                  52.5, 17.0, -52.5, 17.0,
                  "#999999" );
    dlog.addLine( Logger::TEAM,
                  36.0, -34.0, 36.0, 34.0,
                  "#999999" );
    dlog.addLine( Logger::TEAM,
                  -1.0, -34.0, -1.0, 34.0,
                  "#999999" );
    dlog.addLine( Logger::TEAM,
                  -30.0, -17.0, -30.0, 17.0,
                  "#999999" );
    dlog.addLine( Logger::TEAM,
                  //-36.5, -34.0, -36.5, 34.0,
                  -35.5, -34.0, -35.5, 34.0,
                  "#999999" );

    if ( ball_pos.x > 36.0 )
    {
        if ( ball_pos.absY() > 17.0 )
        {
            dlog.addText( Logger::TEAM,
                          __FILE__": get_ball_area: Cross" );
            dlog.addRect( Logger::TEAM,
                          36.0, -34.0, 52.5 - 36.0, 34.0 - 17.0,
                          "#00ff00" );
            dlog.addRect( Logger::TEAM,
                          36.0, 17.0, 52.5 - 36.0, 34.0 - 17.0,
                          "#00ff00" );
            return BA_Cross;
        }
        else
        {
            dlog.addText( Logger::TEAM,
                          __FILE__": get_ball_area: ShootChance" );
            dlog.addRect( Logger::TEAM,
                          36.0, -17.0, 52.5 - 36.0, 34.0,
                          "#00ff00" );
            return BA_ShootChance;
        }
    }
    else if ( ball_pos.x > -1.0 )
    {
        if ( ball_pos.absY() > 17.0 )
        {
            dlog.addText( Logger::TEAM,
                          __FILE__": get_ball_area: DribbleAttack" );
            dlog.addRect( Logger::TEAM,
                          -1.0, -34.0, 36.0 + 1.0, 34.0 - 17.0,
                          "#00ff00" );
            dlog.addRect( Logger::TEAM,
                          -1.0, 17.0, 36.0 + 1.0, 34.0 - 17.0,
                          "#00ff00" );
            return BA_DribbleAttack;
        }
        else
        {
            dlog.addText( Logger::TEAM,
                          __FILE__": get_ball_area: OffMidField" );
            dlog.addRect( Logger::TEAM,
                          -1.0, -17.0, 36.0 + 1.0, 34.0,
                          "#00ff00" );
            return BA_OffMidField;
        }
    }
    else if ( ball_pos.x > -30.0 )
    {
        if ( ball_pos.absY() > 17.0 )
        {
            dlog.addText( Logger::TEAM,
                          __FILE__": get_ball_area: DribbleBlock" );
            dlog.addRect( Logger::TEAM,
                          -30.0, -34.0, -1.0 + 30.0, 34.0 - 17.0,
                          "#00ff00" );
            dlog.addRect( Logger::TEAM,
                          -30.0, 17.0, -1.0 + 30.0, 34.0 - 17.0,
                          "#00ff00" );
            return BA_DribbleBlock;
        }
        else
        {
            dlog.addText( Logger::TEAM,
                          __FILE__": get_ball_area: DefMidField" );
            dlog.addRect( Logger::TEAM,
                          -30.0, -17.0, -1.0 + 30.0, 34.0,
                          "#00ff00" );
            return BA_DefMidField;
        }
    }
    // 2009-06-17 akiyama: -36.5 -> -35.5
    //else if ( ball_pos.x > -36.5 )
    else if ( ball_pos.x > -35.5 )
    {
        if ( ball_pos.absY() > 17.0 )
        {
            dlog.addText( Logger::TEAM,
                          __FILE__": get_ball_area: CrossBlock" );
            dlog.addRect( Logger::TEAM,
                          //-36.5, -34.0, 36.5 - 30.0, 34.0 - 17.0,
                          -35.5, -34.0, 35.5 - 30.0, 34.0 - 17.0,
                          "#00ff00" );
            dlog.addRect( Logger::TEAM,
                          -35.5, 17.0, 35.5 - 30.0, 34.0 - 17.0,
                          "#00ff00" );
            return BA_CrossBlock;
        }
        else
        {
            dlog.addText( Logger::TEAM,
                          __FILE__": get_ball_area: Stopper" );
            dlog.addRect( Logger::TEAM,
                          //-36.5, -17.0, 36.5 - 30.0, 34.0,
                          -35.5, -17.0, 35.5 - 30.0, 34.0,
                          "#00ff00" );
            // 2009-06-17 akiyama: Stopper -> DefMidField
            //return BA_Stopper;
            return BA_DefMidField;
        }
    }
    else
    {
        if ( ball_pos.absY() > 17.0 )
        {
            dlog.addText( Logger::TEAM,
                          __FILE__": get_ball_area: CrossBlock" );
            dlog.addRect( Logger::TEAM,
                          -52.5, -34.0, 52.5 - 36.5, 34.0 - 17.0,
                          "#00ff00" );
            dlog.addRect( Logger::TEAM,
                          -52.5, 17.0, 52.5 - 36.5, 34.0 - 17.0,
                          "#00ff00" );
            return BA_CrossBlock;
        }
        else
        {
            dlog.addText( Logger::TEAM,
                          __FILE__": get_ball_area: Danger" );
            dlog.addRect( Logger::TEAM,
                          -52.5, -17.0, 52.5 - 36.5, 34.0,
                          "#00ff00" );
            return BA_Danger;
        }
    }

    dlog.addText( Logger::TEAM,
                  __FILE__": get_ball_area: unknown area" );
    return BA_None;
}

/*-------------------------------------------------------------------*/
/*!

 */
double
Strategy::get_normal_dash_power( const WorldModel & wm )
{
    static bool s_recover_mode = false;

    // G2d: role
    int role = Strategy::i().roleNumber(wm.self().unum());

    if ( wm.self().staminaModel().capacityIsEmpty() )
    {
        return std::min( ServerParam::i().maxDashPower(),
                         wm.self().stamina() + wm.self().playerType().extraStamina() );
    }

    const int self_min = wm.interceptTable().selfStep();
    const int mate_min = wm.interceptTable().teammateStep();
    const int opp_min = wm.interceptTable().opponentStep();

    // check recover
    if ( wm.self().staminaModel().capacityIsEmpty() )
    {
        s_recover_mode = false;
    }
    else if ( wm.self().stamina() < ServerParam::i().staminaMax() * 0.5 )
    {
        s_recover_mode = true;
    }
    else if ( wm.self().stamina() > ServerParam::i().staminaMax() * 0.7 )
    {
        s_recover_mode = false;
    }

    /*--------------------------------------------------------*/
    double dash_power = ServerParam::i().maxDashPower();
    const double my_inc
        = wm.self().playerType().staminaIncMax()
        * wm.self().recovery();

    if ( wm.ourDefenseLineX() > wm.self().pos().x
         && wm.ball().pos().x < wm.ourDefenseLineX() + 20.0 )
    {
        dlog.addText( Logger::TEAM,
                      __FILE__": (get_normal_dash_power) correct DF line. keep max power" );
        // keep max power
        dash_power = ServerParam::i().maxDashPower();
    }
    else if ( s_recover_mode )
    {
        dash_power = my_inc - 25.0; // preffered recover value
        if ( dash_power < 0.0 ) dash_power = 0.0;

        dlog.addText( Logger::TEAM,
                      __FILE__": (get_normal_dash_power) recovering" );
    }

    // G2d: run to offside line
    else if (wm.ball().pos().x > 0.0 && wm.self().pos().x < wm.offsideLineX() && fabs(wm.ball().pos().x - wm.self().pos().x) < 25.0)
        dash_power = ServerParam::i().maxDashPower();

    // G2d: defenders
    else if (wm.ball().pos().x < 10.0 && (role == 4 || role == 5 || role == 2 || role == 3))
        dash_power = ServerParam::i().maxDashPower();

    // G2d: midfielders
    else if (wm.ball().pos().x < -10.0 && (role == 6 || role == 7 || role == 8))
        dash_power = ServerParam::i().maxDashPower();

    // G2d: run in opp penalty area
    else if (wm.ball().pos().x > 36.0 && wm.self().pos().x > 36.0 && mate_min < opp_min - 4)
        dash_power = ServerParam::i().maxDashPower();

    // exist kickable teammate
    else if ( wm.kickableTeammate()
              && wm.ball().distFromSelf() < 20.0 )
    {
        dash_power = std::min( my_inc * 1.1,
                               ServerParam::i().maxDashPower() );
        dlog.addText( Logger::TEAM,
                      __FILE__": (get_normal_dash_power) exist kickable teammate. dash_power=%.1f",
                      dash_power );
    }
    // in offside area
    else if ( wm.self().pos().x > wm.offsideLineX() )
    {
        dash_power = ServerParam::i().maxDashPower();
        dlog.addText( Logger::TEAM,
                      __FILE__": in offside area. dash_power=%.1f",
                      dash_power );
    }
    else if ( wm.ball().pos().x > 25.0
              && wm.ball().pos().x > wm.self().pos().x + 10.0
              && self_min < opp_min - 6
              && mate_min < opp_min - 6 )
    {
        dash_power = bound( ServerParam::i().maxDashPower() * 0.1,
                            my_inc * 0.5,
                            ServerParam::i().maxDashPower() );
        dlog.addText( Logger::TEAM,
                      __FILE__": (get_normal_dash_power) opponent ball dash_power=%.1f",
                      dash_power );
    }
    // normal
    else
    {
        dash_power = std::min( my_inc * 1.7,
                               ServerParam::i().maxDashPower() );
        dlog.addText( Logger::TEAM,
                      __FILE__": (get_normal_dash_power) normal mode dash_power=%.1f",
                      dash_power );
    }

    return dash_power;
}

```

---

## 2. /src/player/bhv_basic_move.cpp

```cpp
// -*-c++-*-

/*
 *Copyright:

 Cyrus2D
 Modified by Omid Amini, Nader Zare

 Gliders2d
 Modified by Mikhail Prokopenko, Peter Wang

 Copyright (C) Hidehisa AKIYAMA

 This code is free software; you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation; either version 3, or (at your option)
 any later version.

 This code is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this code; see the file COPYING.  If not, write to
 the Free Software Foundation, 675 Mass Ave, Cambridge, MA 02139, USA.

 *EndCopyright:
 */

/////////////////////////////////////////////////////////////////////

#ifdef HAVE_CONFIG_H
#include <config.h>
#endif

#include "bhv_basic_move.h"
#include "strategy.h"
#include "bhv_basic_tackle.h"
#include "neck_offensive_intercept_neck.h"
#include "bhv_basic_block.h"

#include "basic_actions/basic_actions.h"
#include "basic_actions/body_go_to_point.h"
#include "basic_actions/body_intercept.h"
#include "basic_actions/neck_turn_to_ball_or_scan.h"
#include "basic_actions/neck_scan_field.h"
#include "basic_actions/neck_turn_to_low_conf_teammate.h"

#include <rcsc/player/player_agent.h>
#include <rcsc/player/debug_client.h>
#include <rcsc/player/intercept_table.h>

#include <rcsc/common/logger.h>
#include <rcsc/common/server_param.h>

#include "neck_offensive_intercept_neck.h"
#include <rcsc/player/soccer_intention.h>
#include "bhv_unmark.h"

using namespace rcsc;

/*-------------------------------------------------------------------*/
/*!

 */
bool
Bhv_BasicMove::execute( PlayerAgent * agent )
{
    dlog.addText( Logger::TEAM,
                  __FILE__": Bhv_BasicMove" );

    const WorldModel & wm = agent->world();

    //-----------------------------------------------
    // tackle
    // G2d: tackle probability
    double doTackleProb = 0.8;
    if (wm.ball().pos().x < 0.0)
    {
      doTackleProb = 0.5;
    }

    if ( Bhv_BasicTackle( doTackleProb, 80.0 ).execute( agent ) )
    {
        return true;
    }

    /*--------------------------------------------------------*/
    // chase ball
    const int self_min = wm.interceptTable().selfStep();
    const int mate_min = wm.interceptTable().teammateStep();
    const int opp_min = wm.interceptTable().opponentStep();

    const Vector2D target_point = Strategy::i().getPosition( wm.self().unum() );

    // G2d: to retrieve opp team name
    // C2D: Helios 18 Tune removed -> replace with BNN
    // bool helios2018 = false;
    // if (wm.opponentTeamName().find("HELIOS2018") != std::string::npos)
	// helios2018 = true;
//    if (std::min(self_min, mate_min) < opp_min){
//
//    }else{
//        if (Bhv_BasicBlock().execute(agent)){
//            return true;
//        }
//    }
    // G2d: role
    int role = Strategy::i().roleNumber( wm.self().unum() );

    // G2D: blocking

    Vector2D ball = wm.ball().pos();

    double block_d = -10.0;

    Vector2D me = wm.self().pos();
    Vector2D homePos = target_point;
    int num = role;

    auto opps = wm.opponentsFromBall();
    const PlayerObject * nearest_opp
            = ( opps.empty()
                ? static_cast< PlayerObject * >( 0 )
                : opps.front() );
    const double nearest_opp_dist = ( nearest_opp
                                      ? nearest_opp->distFromSelf()
                                      : 1000.0 );
    if (ball.x < block_d)
    {
        double block_line = -38.0;

    //  if (helios2018)
    //      block_line = -48.0;

    // acknowledgement: fragments of Marlik-2012 code
        if( (num == 2 || num == 3) && homePos.x < block_line &&
            !( num == 2 && ball.x < -46.0 && ball.y > -18.0 && ball.y < -6.0 &&
               opp_min <= 3 && opp_min <= mate_min && ball.dist(me) < 9.5 ) &&
            !( num == 3 && ball.x < -46.0 && ball.y <  18.0 && ball.y >  6.0  &&
               opp_min <= 3 && opp_min <= mate_min && ball.dist(me) < 9.5 ) ) // do not block in this situation
        {
            // do nothing
        }
        else if( (num == 2 || num == 3) && fabs(wm.ball().pos().y) > 22.0 )
        {
            // do nothing
        }
        else if (Bhv_BasicBlock().execute(agent)){
            return true;
        }

    } // end of block


    // G2d: pressing
    int pressing = 13;

    if ( role >= 6 && role <= 8 && wm.ball().pos().x > -30.0 && wm.self().pos().x < 10.0 )
        pressing = 7;

    if (fabs(wm.ball().pos().y) > 22.0 && wm.ball().pos().x < 0.0 && wm.ball().pos().x > -36.5 && (role == 4 || role == 5) )
        pressing = 23;

    // C2D: Helios 18 Tune removed -> replace with BNN
    // if (helios2018)
	// pressing = 4;

    if ( ! wm.kickableTeammate()
         && ( self_min <= 3
              || ( self_min <= mate_min
                   && self_min < opp_min + pressing ) // pressing
              )
         )
    {
        dlog.addText( Logger::TEAM,
                      __FILE__": intercept" );
        Body_Intercept().execute( agent );
        agent->setNeckAction( new Neck_OffensiveInterceptNeck() );

        return true;
    }



// G2D : offside trap
    double first = 0.0, second = 0.0;
    const auto t3_end = wm.teammatesFromSelf().end();
        for ( auto it = wm.teammatesFromSelf().begin();
              it != t3_end;
              ++it )
        {
            double x = (*it)->pos().x;
            if ( x < second )
            {
                second = x;
                if ( second < first )
                {
                    std::swap( first, second );
                }
            }
        }

   double buf1 = 3.5;
   double buf2 = 4.5;

   if( me.x < -37.0 && opp_min < mate_min &&
       (homePos.x > -37.5 || wm.ball().inertiaPoint(opp_min).x > -36.0 ) &&
         second + buf1 > me.x && wm.ball().pos().x > me.x + buf2)
   {
        Body_GoToPoint( rcsc::Vector2D( me.x + 15.0, me.y ),
                        0.5, ServerParam::i().maxDashPower(), // maximum dash power
                        ServerParam::i().maxDashPower(),     // preferred dash speed
                        2,                                  // preferred reach cycle
                        true,                              // save recovery
                        5.0 ).execute( agent );

        if (wm.kickableOpponent() && wm.ball().distFromSelf() < 12.0) // C2D
            agent->setNeckAction(new Neck_TurnToBall());
        else
            agent->setNeckAction(new Neck_TurnToBallOrScan(4)); // C2D
        return true;
   }

    if (std::min(self_min, mate_min) < opp_min){
        if (Bhv_Unmark().execute(agent))
            return true;
    }
    const double dash_power = Strategy::get_normal_dash_power( wm );

    double dist_thr = wm.ball().distFromSelf() * 0.1;
    if ( dist_thr < 1.0 ) dist_thr = 1.0;

    dlog.addText( Logger::TEAM,
                  __FILE__": Bhv_BasicMove target=(%.1f %.1f) dist_thr=%.2f",
                  target_point.x, target_point.y,
                  dist_thr );

    agent->debugClient().addMessage( "BasicMove%.0f", dash_power );
    agent->debugClient().setTarget( target_point );
    agent->debugClient().addCircle( target_point, dist_thr );

    if ( ! Body_GoToPoint( target_point, dist_thr, dash_power
                           ).execute( agent ) )
    {
        Body_TurnToBall().execute( agent );
    }

    if ( wm.kickableOpponent()
         && wm.ball().distFromSelf() < 18.0 )
    {
        agent->setNeckAction( new Neck_TurnToBall() );
    }
    else
    {
        agent->setNeckAction( new Neck_TurnToBallOrScan( 0 ) );
    }

    return true;
}

```

---

## 3. /src/player/bhv_basic_block.cpp

```cpp
// -*-c++-*-

/*
    Cyrus2D
    Modified by Nader Zare, Omid Amini.
*/

#ifdef HAVE_CONFIG_H
#include <config.h>
#endif
#include "bhv_basic_block.h"
#include "strategy.h"
#include "bhv_basic_tackle.h"
#include "neck_offensive_intercept_neck.h"

#include "basic_actions/body_turn_to_point.h"
#include "basic_actions/neck_turn_to_ball_or_scan.h"
#include <rcsc/player/player_agent.h>
#include <rcsc/player/intercept_table.h>
#include <rcsc/common/logger.h>
#include <rcsc/common/server_param.h>

#include "basic_actions/basic_actions.h"
#include "basic_actions/body_go_to_point.h"
#include "basic_actions/body_intercept.h"

#define DEBUG_BLOCK
using namespace rcsc;

int Bhv_BasicBlock::last_block_cycle = -1;
Vector2D Bhv_BasicBlock::last_block_pos = Vector2D::INVALIDATED;

bool Bhv_BasicBlock::execute(PlayerAgent *agent)
{
    const WorldModel &wm = agent->world();
    const int self_min = wm.interceptTable().selfStep();
    const int mate_min = wm.interceptTable().teammateStep();
    const int opp_min = wm.interceptTable().opponentStep();
    if ( ! wm.kickableTeammate()
         && ( self_min <= 3
              || ( self_min <= mate_min
                   && self_min < opp_min + 3 ) // pressing
         )
            )
    {
        dlog.addText( Logger::TEAM,
                      __FILE__": intercept" );
        Body_Intercept().execute( agent );
        agent->setNeckAction( new Neck_OffensiveInterceptNeck() );

        return true;
    }

    auto tm_blockers = get_blockers(agent);

    int self_unum = wm.self().unum();
    if (tm_blockers.empty() || std::find(tm_blockers.begin(), tm_blockers.end(), self_unum) == tm_blockers.end())
    {
        last_block_cycle = -1;
        return false;
    }

    std::pair<int, Vector2D> best_blocker_target = get_best_blocker(agent, tm_blockers);
    if (best_blocker_target.first != self_unum)
    {
        last_block_cycle = -1;
        return false;
    }
    Vector2D target_point = best_blocker_target.second;
    double safe_dist = 2;
    if (wm.self().pos().dist(target_point) > 15)
        safe_dist = 5;
    if (last_block_pos.isValid() && last_block_cycle > wm.time().cycle() - 5 && target_point.dist(last_block_pos) < safe_dist)
    {
        target_point = last_block_pos;
    }else{
        last_block_cycle = wm.time().cycle();
        last_block_pos = target_point;
    }

    dlog.addText(Logger::TEAM,
                 __FILE__ ": Bhv_BasicBlock target=(%.1f %.1f)",
                 target_point.x, target_point.y);

    agent->debugClient().addMessage("BasicBlock%.0f", 100.0);
    agent->debugClient().setTarget(target_point);

    if (!Body_GoToPoint(target_point,
                        0.5,
                        100,
                        -1,
                        100,
                        false,
                        25,
                        1.0,
                        false)
             .execute(agent))
    {
        Body_TurnToPoint(target_point).execute(agent);
    }

    if (wm.kickableOpponent() && wm.ball().distFromSelf() < 18.0)
    {
        agent->setNeckAction(new Neck_TurnToBall());
    }
    else
    {
        agent->setNeckAction(new Neck_TurnToBallOrScan(0));
    }

    return true;
}

std::vector<int> Bhv_BasicBlock::get_blockers(const PlayerAgent *agent)
{
    const WorldModel &wm = agent->world();
    int opp_min = wm.interceptTable().opponentStep();
    Vector2D ball_inertia = wm.ball().inertiaPoint(opp_min);
    std::vector<int> tm_blockers;
    for (auto tm : wm.ourPlayers())
    {
        if (tm->isGhost())
            continue;
        if (tm->goalie())
            continue;
        if (tm->isTackling())
            continue;
        if (tm->pos().dist(ball_inertia) > 40)
            continue;
        Vector2D tm_home_pos = Strategy::i().getPosition(tm->unum());
        if (tm_home_pos.dist(ball_inertia) > 40)
            continue;
        if (tm->unum() <= 5){
            double tm_defense_line_x = 0;
            for (int i = 2; i <= 5; i++){
                auto defensive_tm = wm.ourPlayer(i);
                if (defensive_tm != nullptr && defensive_tm->unum() > 0){
                    if (defensive_tm->pos().x < tm_defense_line_x){
                        tm_defense_line_x = defensive_tm->pos().x;
                    }
                }
            }
            if (ball_inertia.x > -30 && ball_inertia.x > tm_home_pos.x + 10 && ball_inertia.x > tm_defense_line_x + 10)
                continue;
        }

        tm_blockers.push_back(tm->unum());
    }

    #ifdef DEBUG_BLOCK
    for (auto & blocker: tm_blockers)
        dlog.addText(Logger::BLOCK, "- tm %d is add as blocker", blocker);
    dlog.addText(Logger::BLOCK, "================================");
    #endif
    return tm_blockers;
}

std::pair<int, Vector2D> Bhv_BasicBlock::get_best_blocker(const PlayerAgent *agent, std::vector<int> &tm_blockers)
{
    const WorldModel &wm = agent->world();
    int opp_min = wm.interceptTable().opponentStep();
    Vector2D ball_inertia = wm.ball().inertiaPoint(opp_min);
    double dribble_speed = 0.7;
    #ifdef DEBUG_BLOCK
    dlog.addText(Logger::BLOCK, "=====get best blocker=====");
    #endif
    for (int cycle = opp_min + 1; cycle <= opp_min + 40; cycle += 1)
    {
        AngleDeg dribble_dir = dribble_direction_detector(ball_inertia);
        ball_inertia += Vector2D::polar2vector(dribble_speed, dribble_dir);
        #ifdef DEBUG_BLOCK
        dlog.addText(Logger::BLOCK, "## id=%d, ball_pos=(%.1f, %.1f)", cycle, ball_inertia.x, ball_inertia.y);
        dlog.addCircle(Logger::BLOCK, ball_inertia, 0.5, 255, 0, 0, false);
        char num[8];
        snprintf( num, 8, "%d", cycle );
        dlog.addMessage(Logger::BLOCK, ball_inertia + Vector2D(0, 1), num);
        #endif
        for (auto &tm_unum : tm_blockers)
        {
            auto tm = wm.ourPlayer(tm_unum);
            Vector2D tm_pos = tm->pos() + tm->vel(); //tm->playerTypePtr()->inertiaPoint(tm_pos, tm->vel(), cycle);
            double dist = ball_inertia.dist(tm_pos);
            int dash_step = tm->playerTypePtr()->cyclesToReachDistance(dist);
            if (dash_step <= cycle)
            {
                #ifdef DEBUG_BLOCK
                dlog.addText(Logger::BLOCK, "$$$$ tm=%d, block_step=%d, can block", tm->unum(), dash_step);
                dlog.addCircle(Logger::BLOCK, ball_inertia, 0.5, 0, 0, 255, false);
                dlog.addLine(Logger::BLOCK, ball_inertia, tm_pos);
                #endif
                return std::make_pair(tm_unum, ball_inertia);
            }
            #ifdef DEBUG_BLOCK
            else
            {
                dlog.addText(Logger::BLOCK, "$$$$ tm=%d, block_step=%d, can not block", tm->unum(), dash_step);
            }
            #endif
        }
    }

    return std::make_pair(0, Vector2D::INVALIDATED);
}

AngleDeg Bhv_BasicBlock::dribble_direction_detector(Vector2D dribble_pos)
{
    AngleDeg best_dir(-180);
    double best_score = -1e9;
    double dist = 10;
    for (double dir = -180; dir < 180; dir += 10)
    {
        Vector2D target = dribble_pos + Vector2D::polar2vector(dist, AngleDeg(dir));
        if (target.absX() > ServerParam::i().pitchHalfLength())
            continue;
        if (target.absY() > ServerParam::i().pitchHalfWidth())
            continue;
        double score = -target.x + std::max(0.0, 40 - target.dist(Vector2D(-50, 0)));
        if (score > best_score)
        {
            best_score = score;
            best_dir = AngleDeg(dir);
        }
    }
    return best_dir;
}
```

---

## 4. /src/player/bhv_unmark.cpp

```cpp
/*
    Copyright:
    Cyrus2D
    Modified by Aref Sayareh, Nader Zare, Omid Amini
*/

#ifdef HAVE_CONFIG_H

#include <config.h>

#endif

#include "strategy.h"
#include "bhv_unmark.h"
#include "intention_receive.h"
#include "planner/field_analyzer.h"
#include <vector>

#include <rcsc/player/say_message_builder.h>
#include "basic_actions/basic_actions.h"
#include "basic_actions/body_go_to_point.h"
#include "basic_actions/neck_turn_to_ball_or_scan.h"
#include <rcsc/math_util.h>
#include <rcsc/player/player_agent.h>
#include <rcsc/player/intercept_table.h>
#include <rcsc/common/logger.h>
#include <rcsc/common/server_param.h>
#include <rcsc/geom/ray_2d.h>

#include "data_extractor/offensive_data_extractor.h"
#include "data_extractor/DEState.h"

using namespace std;
using namespace rcsc;


// static bool debug = false;
Bhv_Unmark::UnmarkPosition Bhv_Unmark::last_unmark_position = UnmarkPosition();
DeepNueralNetwork * Bhv_Unmark::pass_prediction = new DeepNueralNetwork();


bool Bhv_Unmark::execute(PlayerAgent *agent) {
    const WorldModel &wm = agent->world();
    int passer = find_passer_dnn(wm,agent);
    if (!can_unmarking(wm))
        return false;

    if (last_unmark_position.target.isValid()
        && last_unmark_position.last_run_cycle == wm.time().cycle() - 1
        && last_unmark_position.end_valid_cycle > wm.time().cycle()
        && last_unmark_position.target.x < wm.offsideLineX()) {
        dlog.addText(Logger::POSITIONING, "run last unmarking to (%.1f, %.1f)",
                     last_unmark_position.target.x, last_unmark_position.target.y);
        last_unmark_position.last_run_cycle = wm.time().cycle();
        if (run(agent, last_unmark_position)) {
            agent->debugClient().addMessage("Unmarking to (%.1f, %.1f)", last_unmark_position.target.x,
                                            last_unmark_position.target.y);
            return true;
        }
    }

    // int passer = passer_finder(agent);

    // std::cout << "st_____" <<  wm.time().cycle() << " " << wm.self().unum() << std::endl;

    // DEState state = DEState(wm);
    // int fastest_tm = 0;
    // if (wm.interceptTable()->fastestTeammate() != nullptr)
    //     fastest_tm = wm.interceptTable()->fastestTeammate()->unum();
    // int tm_reach_cycle = wm.interceptTable()->teammateReachCycle();
    // if (fastest_tm != 0 && !state.updateKicker(fastest_tm, wm.ball().inertiaPoint(tm_reach_cycle)))
    //     fastest_tm = 0;
    // if (fastest_tm != 0){
    //     auto features = OffensiveDataExtractor::i().get_data(state);
    //     vector<int> ignored_player;
    //     ignored_player.push_back(5);
    //     auto passes = predict_pass_dnn(features, ignored_player, fastest_tm);
    // }

    // std::cout << wm.time().cycle()  << "ed___ " << wm.self().unum() << " __ "  << passer << std::endl;
    // passer = passer_finder(agent);

    dlog.addText(Logger::POSITIONING, "Should unmarking for %d", passer);
    if (passer == 0)
        return false;
    vector<Bhv_Unmark::UnmarkPosition> unmark_positions;
    simulate_dash(agent, passer, unmark_positions);

    if (unmark_positions.empty())
        return false;

    double max_eval = 0;
    int best = -1; //-1=not 0=last other=other
    for (size_t i = 0; i < unmark_positions.size(); i++) {
        double ev = unmark_positions[i].eval;
        if (ev > max_eval) {
            best = i;
            max_eval = ev;
        }
    }
    if (best == -1)
        return false;

    last_unmark_position = unmark_positions[best];
    last_unmark_position.last_run_cycle = wm.time().cycle();
    last_unmark_position.end_valid_cycle = wm.time().cycle() + 5;
    if (run(agent, unmark_positions[best])) {
        agent->debugClient().addMessage("Unmarking to (%.1f, %.1f)", unmark_positions[best].target.x,
                                        unmark_positions[best].target.y);
        return true;
    }
    return false;
}

bool Bhv_Unmark::can_unmarking(const WorldModel &wm) {
    int mate_min = wm.interceptTable().teammateStep();
    int opp_min = wm.interceptTable().opponentStep();
    int unum = wm.self().unum();
    double stamina = wm.self().stamina();
    double dist2target = Strategy::instance().getPosition(unum).dist(wm.self().pos());
    int min_stamina_limit = 3500;
    if (wm.self().unum() >= 9) {
        if (wm.ball().pos().x > 30)
            min_stamina_limit = 2700;
        else if (wm.ball().pos().x > 10)
            min_stamina_limit = 3500;
        else if (wm.ball().pos().x > -30)
            min_stamina_limit = 5000;
        else if (wm.ball().pos().x > -55)
            min_stamina_limit = 6000;
    } else if (wm.self().unum() >= 6) {
        if (wm.ball().pos().x > 30)
            min_stamina_limit = 3000;
        else if (wm.ball().pos().x > 10)
            min_stamina_limit = 4000;
        else if (wm.ball().pos().x > -30)
            min_stamina_limit = 5000;
        else if (wm.ball().pos().x > -55)
            min_stamina_limit = 6000;
    } else {
        if (wm.ball().pos().x > 30)
            min_stamina_limit = 6000;
        else if (wm.ball().pos().x > 10)
            min_stamina_limit = 4000;
        else if (wm.ball().pos().x > -30)
            min_stamina_limit = 3500;
        else if (wm.ball().pos().x > -55)
            min_stamina_limit = 2500;
    }

    if (opp_min < mate_min || stamina < min_stamina_limit || dist2target > 10) {
        dlog.addText(Logger::POSITIONING,
                     "can not for opp cycle or stamina or dist");
        return false;
    }

    if (opp_min == mate_min)
        if (unum < 6) {
            dlog.addText(Logger::POSITIONING,
                         "can not for opp cycle or stamina or dist def");
            return false;
        }

    if (wm.self().isFrozen()) {
        dlog.addText(Logger::POSITIONING, "can not for frozen");
        return false;
    }
    if (wm.ball().inertiaPoint(mate_min).dist(wm.self().pos()) > 35)
        return false;
    Vector2D home_pos = Strategy::instance().getPosition(wm.self().unum());
    if (wm.ball().inertiaPoint(mate_min).x < 30
        && home_pos.x  > wm.offsideLineX() - 10)
        return false;
    return true;
}

int Bhv_Unmark::passer_finder(rcsc::PlayerAgent *agent) {
    const WorldModel &wm = agent->world();
    auto tm = wm.interceptTable().firstTeammate();
    if (tm != nullptr && tm->unum() > 0)
        return tm->unum();
    return 0;
}

void Bhv_Unmark::simulate_dash(rcsc::PlayerAgent *agent, int tm,
                               vector<Bhv_Unmark::UnmarkPosition> &unmark_positions) {
    const WorldModel &wm = agent->world();
    const AbstractPlayerObject *passer = wm.ourPlayer(tm);
    int mate_min = wm.interceptTable().teammateStep();

    Vector2D ball_pos = wm.ball().inertiaPoint(mate_min);
    Vector2D self_pos = wm.self().inertiaFinalPoint();
    Vector2D home_pos = Strategy::instance().getPosition(wm.self().unum());
    Vector2D passer_pos = passer->pos();
    // Vector2D self_vel = wm.self().vel();
    // AngleDeg self_body = wm.self().body().degree();

    // const PlayerType *self_type = &(wm.self().playerType());
    // double self_max_speed = self_type->realSpeedMax();
    // double self_speed = self_vel.r();
    double offside_lineX = wm.offsideLineX();

    vector<Vector2D> positions;
    if (self_pos.dist(home_pos) < 5){
        for (double dist = 2.0; dist <= 7.0; dist += 1.0){
            for (double angle = -180; angle < 180; angle += 20){
                Vector2D position = self_pos + Vector2D::polar2vector(dist, angle);
                positions.push_back(position);
            }
        }
    }else{
        for (double dist = 3.0; dist <= 8.0; dist += 1){
            double center_angle = (home_pos - self_pos).th().degree();
            for (double angle = -30; angle < 30; angle += 10){
                Vector2D position = self_pos + Vector2D::polar2vector(dist, angle + center_angle);
                positions.push_back(position);
            }
        }
    }
    int position_id = 0;
    for (auto target: positions){
        position_id += 1;
        dlog.addText(Logger::POSITIONING, "# %d ##### (%.1f,%.1f)", position_id, target.x, target.y);
        char num[8];
        snprintf(num, 8, "%d", position_id);
        dlog.addMessage(Logger::POSITIONING, target + Vector2D(0, 0), num);
        if (target.x > offside_lineX) {
            dlog.addCircle(Logger::POSITIONING, target, 0.5, 255, 0, 0);
            dlog.addText(Logger::POSITIONING, "---- more than offside");
            continue;
        }

        double home_max_dist = 7;

        if (target.dist(home_pos) > home_max_dist) {
            dlog.addCircle(Logger::POSITIONING, target, 0.5, 255, 0, 0);
            dlog.addText(Logger::POSITIONING, "---- far to home pos");
            continue;
        }

        double min_tm_dist =
                ServerParam::i().theirPenaltyArea().contains(target) ?
                5 : 8;
        if (nearest_tm_dist_to(wm, target) < min_tm_dist) {
            dlog.addCircle(Logger::POSITIONING, target, 0.5, 255, 0, 0);
            dlog.addText(Logger::POSITIONING, "---- close to tm");
            continue;
        }
        if (target.absX() > 52 || target.absY() > 31.5) {
            dlog.addCircle(Logger::POSITIONING, target, 0.5, 255, 0, 0);
            dlog.addText(Logger::POSITIONING, "---- out of field");
            continue;
        }

        vector<UnmakingPass> passes;
        lead_pass_simulator(wm, passer_pos, target, //0,
         passes);

        if (!passes.empty()) {
            double pos_eval = 0;
            UnmarkPosition new_pos(position_id, ball_pos, target, pos_eval, passes);
            pos_eval = evaluate_position(wm, new_pos);
            new_pos.eval = pos_eval;
            dlog.addCircle(Logger::POSITIONING, target, 0.5, 0, 0, 255);
            dlog.addText(Logger::POSITIONING, "---- OK (%.1f, %.1f) passes: %d eval: %.1f", target.x,
                         target.y, passes.size(), pos_eval);
            unmark_positions.push_back(new_pos);
        } else {
            dlog.addText(Logger::POSITIONING, "---- NOK no pass");
            dlog.addCircle(Logger::POSITIONING, target, 0.5, 0, 0, 0);
        }
    }
}

double Bhv_Unmark::nearest_tm_dist_to(const WorldModel &wm, Vector2D point) {

    double dist = 1000;
    for (auto &tm: wm.teammatesFromSelf()) {
        if (tm != nullptr && tm->unum() > 0) {
            if (!tm->pos().isValid())
                continue;
            if (dist > tm->pos().dist(point))
                dist = tm->pos().dist(point);
        }
    }
    return dist;
}

double passSpeed(double dist_ball_to_unmark_target, double dist_unmark_to_pass_target){
    double pass_speed = 1.5;
    if (dist_ball_to_unmark_target >= 20.0)
        pass_speed = 3.0;
    else if (dist_ball_to_unmark_target >= 8.0)
        pass_speed = 2.6;
    else if (dist_ball_to_unmark_target >= 5.0)
        pass_speed = 2.0;
    if (dist_unmark_to_pass_target < 0.1)
        pass_speed += 0.5;
    pass_speed = std::min(3.0, pass_speed);
    return pass_speed;
}
void Bhv_Unmark::lead_pass_simulator(const WorldModel &wm, Vector2D passer_pos,
                                     Vector2D unmark_target, //int n_step,
                                      vector<UnmakingPass> &passes) {

    int mate_min = wm.interceptTable().teammateStep();
    Vector2D pass_start = wm.ball().inertiaPoint(mate_min);
    // Vector2D current_self_pos = wm.self().pos();

    vector<Vector2D> pass_targets;
    for (double dist = 0; dist <= 3; dist += 3.0){
        for (double angle = -180; angle < 180; angle += 90){
            pass_targets.push_back(unmark_target + Vector2D::polar2vector(dist, angle));
            if (dist == 0)
                break;
        }
    }
    for (auto & pass_target: pass_targets){
        double pass_speed = passSpeed(passer_pos.dist(unmark_target), unmark_target.dist(pass_target));
        int pass_cycle = pass_travel_cycle(pass_start, pass_speed, pass_target);
        int min_opp_cut_cycle = opponents_cycle_intercept(wm, pass_start, pass_speed,
                                                          pass_target, pass_cycle);


        if (pass_cycle < min_opp_cut_cycle) {
            dlog.addText(Logger::POSITIONING,
                         "------pass_start(%.1f,%.1f), pass_target(%.1f,%.1f), self_cycle(%d), opp_cycle(%d) OK",
                         pass_start.x, pass_start.y, pass_target.x, pass_target.y,
                         pass_cycle, min_opp_cut_cycle);
            double pass_eval = pass_target.x + std::max(0.0, 40.0 - pass_target.dist(Vector2D(50.0, 0)));

            UnmakingPass pass_obj = UnmakingPass(pass_target, pass_speed,
                                                 pass_eval, pass_cycle);

            passes.push_back(pass_obj);
            dlog.addCircle(Logger::POSITIONING, pass_target, 0.1, 0, 0, 200);
        } else {
            dlog.addCircle(Logger::POSITIONING, pass_target, 0.1, 255, 0, 0);
            dlog.addText(Logger::POSITIONING,
                         "------pass_start(%.1f,%.1f), pass_target(%.1f,%.1f), self_cycle(%d), opp_cycle(%d) NOT OK",
                         pass_start.x, pass_start.y, pass_target.x, pass_target.y,
                         pass_cycle, min_opp_cut_cycle);
        }
    }

}

int Bhv_Unmark::pass_travel_cycle(Vector2D pass_start, double pass_speed, Vector2D &pass_target) {
    const ServerParam &SP = ServerParam::i();
    double cycle = -(pass_start.dist(pass_target) / pass_speed * ( 1 - SP.ballDecay()) - 1);
    cycle = std::log(cycle) / std::log(SP.ballDecay());
    return static_cast<int>(cycle);
}

int Bhv_Unmark::opponents_cycle_intercept(const WorldModel &wm,
                                          Vector2D pass_start, double pass_speed,
                                          Vector2D pass_target,
                                          int pass_cycle) {
    int min_cycle = 1000;
    for (auto &opp: wm.opponentsFromSelf()) {
        if (opp == nullptr)
            continue;
        int opp_cycle = opponent_cycle_intercept(opp, pass_start, pass_speed, pass_target, pass_cycle);
        if (min_cycle > opp_cycle)
            min_cycle = opp_cycle;
        if (min_cycle <= pass_cycle)
            break;
    }
    return min_cycle;

}

int Bhv_Unmark::opponent_cycle_intercept(const AbstractPlayerObject *opp, Vector2D pass_start, double pass_speed,
                                         Vector2D pass_target, int pass_cycle) {

    const ServerParam &SP = ServerParam::i();

    AngleDeg pass_angle = (pass_target - pass_start).th();

    Vector2D pass_start_vel = Vector2D::polar2vector(pass_speed, pass_angle);
    Vector2D opp_pos = (*opp).pos();

    const PlayerType *opp_type = (*opp).playerTypePtr();

    for (int cycle = 1; cycle <= pass_cycle; cycle++) {
        const Vector2D ball_pos = inertia_n_step_point(pass_start,
                                                       pass_start_vel, cycle, SP.ballDecay());

        double dash_dist = ball_pos.dist(opp_pos);
        dash_dist -= 0.5;

        int n_dash = opp_type->cyclesToReachDistance(dash_dist);
        int n_step = n_dash;
        if (n_step <= cycle) {
            return cycle;
        }
    }
    return 1000;
}

double Bhv_Unmark::evaluate_position(const WorldModel &wm, const UnmarkPosition &unmark_position) {
    double sum_eval = 0;
    double best_pass_eval = 0;
    double opp_eval = 10;
    for (auto &i: unmark_position.pass_list) {
        if (best_pass_eval < i.pass_eval)
            best_pass_eval = i.pass_eval;

        sum_eval += i.pass_eval;
    }

    for (auto &opp: wm.theirPlayers()) {
        if (opp != nullptr && opp->unum() > 0) {
            double opp_dist = opp->pos().dist(unmark_position.target);
            if (opp_dist < opp_eval)
                opp_eval = opp_dist;

        }
    }

    bool have_turn =
            ((unmark_position.target - wm.self().pos()).th() - wm.self().body()).abs() >= 15;
    bool up_pos =
            wm.self().unum() >= 6
            && (unmark_position.target - wm.self().pos()).th().abs() < 60;
    sum_eval /= unmark_position.pass_list.size();
    sum_eval += (sum_eval * unmark_position.pass_list.size() / 10);
    sum_eval += best_pass_eval;
    sum_eval += opp_eval;
    (!have_turn) ? sum_eval += 10 : sum_eval += 0;
    (up_pos) ? sum_eval += 10 : sum_eval += 0;
    return sum_eval;
}

bool Bhv_Unmark::run(PlayerAgent *agent, const UnmarkPosition &unmark_position) {

    const WorldModel &wm = agent->world();
    Vector2D target = unmark_position.target;
    Vector2D ball_pos = unmark_position.ball_pos;
    // Vector2D me = wm.self().pos();
    // Vector2D homePos = Strategy::i().getPosition(wm.self().unum());
    // const int self_min = wm.interceptTable()->selfReachCycle();
    const int mate_min = wm.interceptTable().teammateStep();
    // const int opp_min = wm.interceptTable()->opponentReachCycle();

    double thr = 0.5;
    if (agent->world().self().inertiaPoint(1).dist(unmark_position.target) < thr) {
        AngleDeg bestAngle = (ball_pos - unmark_position.target).th() + 80;
        if (abs(bestAngle.degree()) > 90)
            bestAngle = (ball_pos - unmark_position.target).th() - 80;
        Body_TurnToAngle(bestAngle).execute(agent);
        agent->setNeckAction(new Neck_TurnToBallOrScan(0));
        return true;
    }
    dlog.addCircle(Logger::POSITIONING, target, 0.5, 0, 0, 255, true);
    double dash_power = (
            ball_pos.x > 30 && wm.self().stamina() > 6000 && wm.self().unum() > 6 ?
            100 : Strategy::get_normal_dash_power(agent->world()));
    if (!Body_GoToPoint(unmark_position.target, thr, dash_power).execute(agent)){
        Body_TurnToBall().execute( agent );
    }
    if (mate_min <= 3)
        agent->setNeckAction(new Neck_TurnToBallOrScan(0));
    else
        agent->setNeckAction(new Neck_TurnToBallOrScan(1));
    return true;
}

void Bhv_Unmark::load_dnn(){
    static bool load_dnn = false;
    if(!load_dnn){
        load_dnn = true;
        pass_prediction->ReadFromKeras("./unmark_dnn_weights.txt");
    }
}

vector<pass_prob> Bhv_Unmark::predict_pass_dnn(vector<double> & features, vector<int> ignored_player, int kicker){
    load_dnn();
    MatrixXd input(290,1); // 290 12
    for (int i = 1; i <= 290; i += 1){
        input(i - 1,0) = features[i];
    }
    pass_prediction->Calculate(input);
    vector<pass_prob> predict;
    for (int i = 0; i < 12; i++){

        if (i == 0){
            dlog.addText(Logger::POSITIONING, "##### Pass from %d to %d : %.6f NOK(0)", kicker, i, pass_prediction->mOutput(i));
        }else if(std::find(ignored_player.begin(), ignored_player.end(), i) == std::end(ignored_player)){
            dlog.addText(Logger::POSITIONING, "##### Pass from %d to %d : %.6f OKKKK", kicker, i, pass_prediction->mOutput(i));
            predict.push_back(pass_prob(pass_prediction->mOutput(i), kicker, i));
        }else{
            dlog.addText(Logger::POSITIONING, "##### Pass from %d to %d : %.6f NOK(ignored)", kicker, i, pass_prediction->mOutput(i));
        }
    }
    std::sort(predict.begin(), predict.end(),pass_prob::ProbCmp);
    return predict;
}


int Bhv_Unmark::find_passer_dnn(const WorldModel & wm, PlayerAgent * agent){
    dlog.addText(Logger::POSITIONING, "############### Start Update Passer DNN ###########");
    DEState state = DEState(wm);

    int fastest_tm = 0;
    if (wm.interceptTable().firstTeammate() != nullptr)
        fastest_tm = wm.interceptTable().firstTeammate()->unum();
    if (fastest_tm < 1)
        return 0;
    int tm_reach_cycle = wm.interceptTable().teammateStep();
    if (!state.updateKicker(fastest_tm, wm.ball().inertiaPoint(tm_reach_cycle)))
        return 0;

    vector<int> ignored_player;
    string ignored = "";
    for (int i = 1; i <= 11; i++){
        if (wm.ourPlayer(i) == nullptr || wm.ourPlayer(i)->unum() < 1 || not wm.ourPlayer(i)->pos().isValid()){
            ignored_player.push_back(i);
            ignored += std::to_string(i) + ",";
        }
    }
    dlog.addText(Logger::POSITIONING, "ignored: %s", ignored.c_str());
    vector<pass_prob> best_passes;
    vector<pass_prob> all_passes;
    all_passes.push_back(pass_prob(100.0, 0, fastest_tm));

    for (int processed_player = 0; processed_player < 6 && all_passes.size() > 0; processed_player++){
        std::sort(all_passes.begin(), all_passes.end(),pass_prob::ProbCmp);
        auto best_pass = all_passes.back();
        all_passes.pop_back();

        dlog.addText(Logger::POSITIONING, "###selected best pass: %d to %d, %.5f", best_pass.pass_sender, best_pass.pass_getter, best_pass.prob);
        if (std::find(ignored_player.begin(), ignored_player.end(), best_pass.pass_getter) != ignored_player.end()){
            dlog.addText(Logger::POSITIONING, "######is in ignored");
            continue;
        }
        if (best_pass.prob < 0.01){
            dlog.addText(Logger::POSITIONING, "######is not valuable");
            continue;
        }

        if (best_pass.pass_sender != 0)
            best_passes.push_back(best_pass);
        ignored_player.push_back(best_pass.pass_getter);

        if (state.updateKicker(best_pass.pass_getter)){
            auto features = OffensiveDataExtractor::i().get_data(state);
            auto passes = predict_pass_dnn(features, ignored_player, best_pass.pass_getter);
            int max_pass = 2;
            for (int p = passes.size() - 1; p >= 0; p--){
                if (max_pass == 0)
                    break;
                all_passes.push_back(passes[p]);
                max_pass -= 1;
            }
        }
    }

    vector<unmark_passer> res;
    for (auto &p : best_passes)
    {
        Vector2D kicker_pos = wm.ourPlayer(p.pass_sender)->pos();
        Vector2D target_pos = wm.ourPlayer(p.pass_getter)->pos();
        dlog.addLine(Logger::POSITIONING,kicker_pos - Vector2D(-0.2, 0), target_pos - Vector2D(-0.2, 0));
        dlog.addLine(Logger::POSITIONING,kicker_pos - Vector2D(-0.1, 0), target_pos - Vector2D(-0.1, 0));
        dlog.addLine(Logger::POSITIONING,kicker_pos, target_pos);
        dlog.addLine(Logger::POSITIONING,kicker_pos - Vector2D(0.2, 0), target_pos - Vector2D(0.2, 0));
        dlog.addLine(Logger::POSITIONING,kicker_pos - Vector2D(0.1, 0), target_pos - Vector2D(0.1, 0));
        dlog.addCircle(Logger::POSITIONING, target_pos, 2);

        if (p.pass_getter == wm.self().unum())
            res.push_back(unmark_passer(p.pass_sender, kicker_pos, wm.interceptTable().opponentStep()));
    }
    if (!res.empty()){
        return res[0].unum;
    }
    return 0;
}
// */
```

---

## 5. /src/player/planner/strict_check_pass_generator.cpp

```cpp
// -*-c++-*-

/*!
  \file strict_check_pass_generator.cpp
  \brief strict checked pass course generator Source File
*/

/*
 *Copyright:

 Cyrus2D
 Modified by Omid Amini, Nader Zare

 Gliders2d
 Modified by Mikhail Prokopenko, Peter Wang

 Copyright (C) Hidehisa AKIYAMA

 This code is free software; you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation; either version 3, or (at your option)
 any later version.

 This code is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this code; see the file COPYING.  If not, write to
 the Free Software Foundation, 675 Mass Ave, Cambridge, MA 02139, USA.

 *EndCopyright:
 */

/////////////////////////////////////////////////////////////////////

#ifdef HAVE_CONFIG_H
#include <config.h>
#endif

#include "strict_check_pass_generator.h"

#include "pass.h"
#include "field_analyzer.h"

#include <rcsc/player/world_model.h>
#include <rcsc/player/intercept_table.h>
#include <rcsc/common/audio_memory.h>
#include <rcsc/common/logger.h>
#include <rcsc/common/server_param.h>
#include <rcsc/common/player_type.h>
#include <rcsc/math_util.h>
#include <rcsc/timer.h>

#include <algorithm>
#include <limits>
#include <sstream>
#include <cmath>

#define DEBUG_PROFILE

// #define DEBUG_PRINT_COMMON

// #define DEBUG_UPDATE_PASSER
// #define DEBUG_UPDATE_RECEIVERS
// #define DEBUG_UPDATE_OPPONENT
// #define DEBUG_DIRECT_PASS
// #define DEBUG_LEADING_PASS
// #define DEBUG_THROUGH_PASS

// #define DEBUG_PREDICT_RECEIVER
// #define DEBUG_PREDICT_OPPONENT_REACH_STEP

// #define DEBUG_PRINT_SUCCESS_PASS
// #define DEBUG_PRINT_FAILED_PASS


// #define CREATE_SEVERAL_CANDIDATES_ON_SAME_POINT

using namespace rcsc;

namespace {

inline
void
debug_paint_failed_pass( const int count,
                         const Vector2D & receive_point )
{
    dlog.addRect( Logger::PASS,
                  receive_point.x - 0.1, receive_point.y - 0.1,
                  0.2, 0.2,
                  "#ff0000" );
    if ( count >= 0 )
    {
        char num[8];
        snprintf( num, 8, "%d", count );
        dlog.addMessage( Logger::PASS,
                         receive_point, num );
    }
}

}

/*-------------------------------------------------------------------*/
/*!

 */
StrictCheckPassGenerator::Receiver::Receiver( const AbstractPlayerObject * p,
                                              const Vector2D & first_ball_pos )
    : player_( p ),
      pos_( p->seenPosCount() <= p->posCount() ? p->seenPos() : p->pos() ),
      vel_( p->seenVelCount() <= p->velCount() ? p->seenVel() : p->vel() ),
      inertia_pos_( p->playerTypePtr()->inertiaFinalPoint( pos_, vel_ ) ),
      speed_( vel_.r() ),
      penalty_distance_( FieldAnalyzer::estimate_virtual_dash_distance( p ) ),
      penalty_step_( p->playerTypePtr()->cyclesToReachDistance( penalty_distance_ ) ),
      angle_from_ball_( ( p->pos() - first_ball_pos ).th() )
{

}

/*-------------------------------------------------------------------*/
/*!

 */
StrictCheckPassGenerator::Opponent::Opponent( const AbstractPlayerObject * p )
    : player_( p ),
      pos_( p->seenPosCount() <= p->posCount() ? p->seenPos() : p->pos() ),
      vel_( p->seenVelCount() <= p->velCount() ? p->seenVel() : p->vel() ),
      speed_( vel_.r() ),
      bonus_distance_( FieldAnalyzer::estimate_virtual_dash_distance( p ) )
{

}

/*-------------------------------------------------------------------*/
/*!

 */
StrictCheckPassGenerator::StrictCheckPassGenerator()
    : M_update_time( -1, 0 ),
      M_total_count( 0 ),
      M_pass_type( '-' ),
      M_passer( static_cast< AbstractPlayerObject * >( 0 ) ),
      M_start_time( -1, 0 )
{
    M_receiver_candidates.reserve( 11 );
    M_opponents.reserve( 16 );
    M_courses.reserve( 1024 );

    clear();
}

/*-------------------------------------------------------------------*/
/*!

 */
StrictCheckPassGenerator &
StrictCheckPassGenerator::instance()
{
    static StrictCheckPassGenerator s_instance;
    return s_instance;
}

/*-------------------------------------------------------------------*/
/*!

 */
void
StrictCheckPassGenerator::clear()
{
    M_total_count = 0;
    M_pass_type = '-';
    M_passer = static_cast< AbstractPlayerObject * >( 0 );
    M_start_time.assign( -1, 0 );
    M_first_point.invalidate();
    M_receiver_candidates.clear();
    M_opponents.clear();
    M_direct_size = M_leading_size = M_through_size = 0;
    M_courses.clear();
}

/*-------------------------------------------------------------------*/
/*!

 */
void
StrictCheckPassGenerator::generate( const WorldModel & wm )
{
    if ( M_update_time == wm.time() )
    {
        return;
    }
    M_update_time = wm.time();

    clear();

    if ( wm.time().stopped() > 0
         || wm.gameMode().isPenaltyKickMode() )
    {
        return;
    }

#ifdef DEBUG_PROFILE
    Timer timer;
#endif

    updatePasser( wm );

    if ( ! M_passer
         || ! M_first_point.isValid() )
    {
        dlog.addText( Logger::PASS,
                      __FILE__" (generate) passer not found." );
        return;
    }

    updateReceivers( wm );

    if ( M_receiver_candidates.empty() )
    {
        dlog.addText( Logger::PASS,
                      __FILE__" (generate) no receiver." );
        return;
    }

    updateOpponents( wm );

    createCourses( wm );

    std::sort( M_courses.begin(), M_courses.end(),
               CooperativeAction::DistCompare( ServerParam::i().theirTeamGoalPos() ) );

#ifdef DEBUG_PROFILE
    if ( M_passer->unum() == wm.self().unum() )
    {
        dlog.addText( Logger::PASS,
                      __FILE__" (generate) PROFILE passer=self size=%d/%d D=%d L=%d T=%d elapsed %f [ms]",
                      (int)M_courses.size(),
                      M_total_count,
                      M_direct_size, M_leading_size, M_through_size,
                      timer.elapsedReal() );
    }
    else
    {
        dlog.addText( Logger::PASS,
                      __FILE__" (update) PROFILE passer=%d size=%d/%d D=%d L=%d T=%d elapsed %f [ms]",
                      M_passer->unum(),
                      (int)M_courses.size(),
                      M_total_count,
                      M_direct_size, M_leading_size, M_through_size,
                      timer.elapsedReal() );
    }
#endif
}

/*-------------------------------------------------------------------*/
/*!

 */
void
StrictCheckPassGenerator::updatePasser( const WorldModel & wm )
{
    if ( wm.self().isKickable()
         && ! wm.self().isFrozen() )
    {
        M_passer = &wm.self();
        M_start_time = wm.time();
        M_first_point = wm.ball().pos();
#ifdef DEBUG_UPDATE_PASSER
        dlog.addText( Logger::PASS,
                      __FILE__" (updatePasser) self kickable." );
#endif
        return;
    }

    int s_min = wm.interceptTable().selfStep();
    int t_min = wm.interceptTable().teammateStep();
    int o_min = wm.interceptTable().opponentStep();

    int our_min = std::min( s_min, t_min );
    if ( o_min < std::min( our_min - 4, (int)rint( our_min * 0.9 ) ) )
    {
        dlog.addText( Logger::PASS,
                      __FILE__" (updatePasser) opponent ball." );
        return;
    }

    if ( s_min <= t_min )
    {
        if ( s_min <= 2 )
        {
            M_passer = &wm.self();
            M_first_point = wm.ball().inertiaPoint( s_min );
        }
    }
    else
    {
        if ( t_min <= 2 )
        {
            M_passer = wm.interceptTable().firstTeammate();
            M_first_point = wm.ball().inertiaPoint( t_min );
        }
    }

    if ( ! M_passer )
    {
        dlog.addText( Logger::PASS,
                      __FILE__" (updatePasser) no passer." );
        return;
    }

    M_start_time = wm.time();
    if ( ! wm.gameMode().isServerCycleStoppedMode() )
    {
        M_start_time.addCycle( t_min );
    }

    if ( M_passer->unum() != wm.self().unum() )
    {
        if ( M_first_point.dist2( wm.self().pos() ) > std::pow( 30.0, 2 ) )
        {
            M_passer = static_cast< const AbstractPlayerObject * >( 0 );
            dlog.addText( Logger::PASS,
                          __FILE__" (updatePasser) passer is too far." );
            return;
        }
    }

#ifdef DEBUG_UPDATE_PASSER
    dlog.addText( Logger::PASS,
                  __FILE__" (updatePasser) passer=%d(%.1f %.1f) reachStep=%d startPos=(%.1f %.1f)",
                  M_passer->unum(),
                  M_passer->pos().x, M_passer->pos().y,
                  t_min,
                  M_first_point.x, M_first_point.y );
#endif
}

/*-------------------------------------------------------------------*/
/*!

 */
struct ReceiverAngleCompare {

    bool operator()( const StrictCheckPassGenerator::Receiver & lhs,
                     const StrictCheckPassGenerator::Receiver & rhs ) const
      {
          return lhs.angle_from_ball_.degree() < rhs.angle_from_ball_.degree();
      }
};

/*-------------------------------------------------------------------*/
/*!

 */
namespace {
struct ReceiverDistCompare {

    const Vector2D pos_;

    ReceiverDistCompare( const Vector2D & pos )
        : pos_( pos )
      { }

    bool operator()( const StrictCheckPassGenerator::Receiver & lhs,
                     const StrictCheckPassGenerator::Receiver & rhs ) const
      {
          return lhs.pos_.dist2( pos_ ) < rhs.pos_.dist2( pos_ );
      }
};
}

/*-------------------------------------------------------------------*/
/*!

 */
void
StrictCheckPassGenerator::updateReceivers( const WorldModel & wm )
{
    const ServerParam & SP = ServerParam::i();
    const double max_dist2 = std::pow( 40.0, 2 ); // Magic Number

    const bool is_self_passer = ( M_passer->unum() == wm.self().unum() );

    for ( AbstractPlayerObject::Cont::const_iterator p = wm.ourPlayers().begin(),
              end = wm.ourPlayers().end();
          p != end;
          ++p )
    {
        if ( *p == M_passer ) continue;

        if ( is_self_passer )
        {
            // if ( (*p)->isGhost() ) continue;
            if ( (*p)->unum() == Unum_Unknown ) continue;
            // if ( (*p)->unumCount() > 10 ) continue;
            if ( (*p)->posCount() > 10 ) continue;
            if ( (*p)->isTackling() ) continue;
            if ( (*p)->pos().x > wm.offsideLineX() )
            {
                dlog.addText( Logger::PASS,
                              "(updateReceiver) unum=%d (%.2f %.2f) > offside=%.2f",
                              (*p)->unum(),
                              (*p)->pos().x, (*p)->pos().y,
                              wm.offsideLineX() );
                continue;
            }
            //if ( (*p)->isTackling() ) continue;
            if ( (*p)->goalie()
                 && (*p)->pos().x < SP.ourPenaltyAreaLineX() + 15.0 )
            {
                continue;
            }
        }
        else
        {
            // ignore other players
            if ( (*p)->unum() != wm.self().unum() )
            {
                continue;
            }
        }

        if ( (*p)->pos().dist2( M_first_point ) > max_dist2 ) continue;

        M_receiver_candidates.push_back( Receiver( *p, M_first_point ) );
    }

    std::sort( M_receiver_candidates.begin(),
               M_receiver_candidates.end(),
               ReceiverDistCompare( SP.theirTeamGoalPos() ) );

    // std::sort( M_receiver_candidates.begin(),
    //            M_receiver_candidates.end(),
    //            ReceiverAngleCompare() );

#ifdef DEBUG_UPDATE_RECEIVERS
    for ( ReceiverCont::const_iterator p = M_receiver_candidates.begin();
          p != M_receiver_candidates.end();
          ++p )
    {
        dlog.addText( Logger::PASS,
                      "StrictPass receiver %d pos(%.1f %.1f) inertia=(%.1f %.1f) vel(%.2f %.2f)"
                      " penalty_dist=%.3f penalty_step=%d"
                      " angle=%.1f",
                      p->player_->unum(),
                      p->pos_.x, p->pos_.y,
                      p->inertia_pos_.x, p->inertia_pos_.y,
                      p->vel_.x, p->vel_.y,
                      p->penalty_distance_,
                      p->penalty_step_,
                      p->angle_from_ball_.degree() );
    }
#endif
}

/*-------------------------------------------------------------------*/
/*!

 */
void
StrictCheckPassGenerator::updateOpponents( const WorldModel & wm )
{
    for ( AbstractPlayerObject::Cont::const_iterator p = wm.theirPlayers().begin(),
              end = wm.theirPlayers().end();
          p != end;
          ++p )
    {
        M_opponents.push_back( Opponent( *p ) );
#ifdef DEBUG_UPDATE_OPPONENT
        const Opponent & o = M_opponents.back();
        dlog.addText( Logger::PASS,
                      "StrictPass opp %d pos(%.1f %.1f) vel(%.2f %.2f) bonus_dist=%.3f",
                      o.player_->unum(),
                      o.pos_.x, o.pos_.y,
                      o.vel_.x, o.vel_.y,
                      o.bonus_distance_ );
#endif
    }
}

/*-------------------------------------------------------------------*/
/*!

 */
void
StrictCheckPassGenerator::createCourses( const WorldModel & wm )
{
    const ReceiverCont::iterator end = M_receiver_candidates.end();

    M_pass_type = 'D';
    for ( ReceiverCont::iterator p = M_receiver_candidates.begin();
          p != end;
          ++p )
    {
        createDirectPass( wm, *p );
    }

    M_pass_type = 'L';
    for ( ReceiverCont::iterator p = M_receiver_candidates.begin();
          p != end;
          ++p )
    {
        createLeadingPass( wm, *p );
    }

    M_pass_type = 'T';
    for ( ReceiverCont::iterator p = M_receiver_candidates.begin();
          p != end;
          ++p )
    {
        createThroughPass( wm, *p );
    }
}

/*-------------------------------------------------------------------*/
/*!

 */
void
StrictCheckPassGenerator::createDirectPass( const WorldModel & wm,
                                            const Receiver & receiver )
{
    static const int MIN_RECEIVE_STEP = 3;
#ifdef CREATE_SEVERAL_CANDIDATES_ON_SAME_POINT
    static const int MAX_RECEIVE_STEP = 15; // Magic Number
#endif

    static const double MIN_DIRECT_PASS_DIST
        = ServerParam::i().defaultKickableArea() * 2.2;
    static const double MAX_DIRECT_PASS_DIST
        = 0.8 * inertia_final_distance( ServerParam::i().ballSpeedMax(),
                                        ServerParam::i().ballDecay() );
    static const double MAX_RECEIVE_BALL_SPEED
        = ServerParam::i().ballSpeedMax()
        * std::pow( ServerParam::i().ballDecay(), MIN_RECEIVE_STEP );

    const ServerParam & SP = ServerParam::i();

    //
    // check receivable area
    //
    if ( receiver.pos_.x > SP.pitchHalfLength() - 1.5
         || receiver.pos_.x < - SP.pitchHalfLength() + 5.0
         || receiver.pos_.absY() > SP.pitchHalfWidth() - 1.5 )
    {
#ifdef DEBUG_DIRECT_PASS
        dlog.addText( Logger::PASS,
                      "%d: xxx (direct) unum=%d outOfBounds pos=(%.2f %.2f)",
                      M_total_count, receiver.player_->unum(),
                      receiver.pos_.x, receiver.pos_.y );
#endif
        return;
    }

    //
    // avoid dangerous area
    //
    if ( receiver.pos_.x < M_first_point.x + 1.0
         && receiver.pos_.dist2( SP.ourTeamGoalPos() ) < std::pow( 18.0, 2 ) )
    {
#ifdef DEBUG_DIRECT_PASS
        dlog.addText( Logger::PASS,
                      "%d: xxx (direct) unum=%d dangerous pos=(%.2f %.2f)",
                      M_total_count, receiver.player_->unum(),
                      receiver.pos_.x, receiver.pos_.y );
#endif
        return;
    }

    const PlayerType * ptype = receiver.player_->playerTypePtr();

    const double max_ball_speed = ( wm.gameMode().type() == GameMode::PlayOn
                                    ? SP.ballSpeedMax()
                                    : wm.self().isKickable()
                                    ? wm.self().kickRate() * SP.maxPower()
                                    : SP.kickPowerRate() * SP.maxPower() );
    const double min_ball_speed = SP.defaultRealSpeedMax();

    const Vector2D receive_point = receiver.inertia_pos_;

    const double ball_move_dist = M_first_point.dist( receive_point );

    if ( ball_move_dist < MIN_DIRECT_PASS_DIST
         || MAX_DIRECT_PASS_DIST < ball_move_dist )
    {
#ifdef DEBUG_DIRECT_PASS
        dlog.addText( Logger::PASS,
                      "%d: xxx (direct) unum=%d overBallMoveDist=%.3f minDist=%.3f maxDist=%.3f",
                      M_total_count, receiver.player_->unum(),
                      ball_move_dist,
                      MIN_DIRECT_PASS_DIST, MAX_DIRECT_PASS_DIST );
#endif
        return;
    }

    if ( wm.gameMode().type() == GameMode::GoalKick_
         && receive_point.x < SP.ourPenaltyAreaLineX() + 1.0
         && receive_point.absY() < SP.penaltyAreaHalfWidth() + 1.0 )
    {
#ifdef DEBUG_DIRECT_PASS
        dlog.addText( Logger::PASS,
                      "%d: xxx (direct) unum=%d, goal_kick",
                      M_total_count, receiver.player_->unum() );
#endif
        return;
    }

    //
    // decide ball speed range
    //

    const double max_receive_ball_speed
        = std::min( MAX_RECEIVE_BALL_SPEED,
                    ptype->kickableArea() + ( SP.maxDashPower()
                                              * ptype->dashPowerRate()
                                              * ptype->effortMax() ) * 1.8 );
    const double min_receive_ball_speed = ptype->realSpeedMax();

    const AngleDeg ball_move_angle = ( receive_point - M_first_point ).th();

    const int min_ball_step = SP.ballMoveStep( SP.ballSpeedMax(), ball_move_dist );


#ifdef DEBUG_PRINT_SUCCESS_PASS
    std::vector< int > success_counts;
#endif

    const int start_step = std::max( std::max( MIN_RECEIVE_STEP,
                                               min_ball_step ),
                                     receiver.penalty_step_ );
#ifdef CREATE_SEVERAL_CANDIDATES_ON_SAME_POINT
    const int max_step = std::max( MAX_RECEIVE_STEP, start_step + 2 );
#else
    const int max_step = start_step + 2;
#endif

#ifdef DEBUG_DIRECT_PASS
    dlog.addText( Logger::PASS,
                  "=== (direct) unum=%d stepRange=[%d, %d]",
                  receiver.player_->unum(),
                  start_step, max_step );
#endif

    createPassCommon( wm,
                      receiver, receive_point,
                      start_step, max_step,
                      min_ball_speed, max_ball_speed,
                      min_receive_ball_speed, max_receive_ball_speed,
                      ball_move_dist, ball_move_angle,
                      "strictDirect" );
}

/*-------------------------------------------------------------------*/
/*!

 */
void
StrictCheckPassGenerator::createLeadingPass( const WorldModel & wm,
                                             const Receiver & receiver )
{
    static const double OUR_GOAL_DIST_THR2 = std::pow( 16.0, 2 );

    static const int MIN_RECEIVE_STEP = 4;
#ifdef CREATE_SEVERAL_CANDIDATES_ON_SAME_POINT
    static const int MAX_RECEIVE_STEP = 20;
#endif

    static const double MIN_LEADING_PASS_DIST = 3.0;
    static const double MAX_LEADING_PASS_DIST
        = 0.8 * inertia_final_distance( ServerParam::i().ballSpeedMax(),
                                        ServerParam::i().ballDecay() );
    static const double MAX_RECEIVE_BALL_SPEED
        = ServerParam::i().ballSpeedMax()
        * std::pow( ServerParam::i().ballDecay(), MIN_RECEIVE_STEP );

    static const int ANGLE_DIVS = 24;
    static const double ANGLE_STEP = 360.0 / ANGLE_DIVS;
    static const double DIST_DIVS = 4;
    static const double DIST_STEP = 1.1;

    const ServerParam & SP = ServerParam::i();
    const PlayerType * ptype = receiver.player_->playerTypePtr();

    const double max_ball_speed = ( wm.gameMode().type() == GameMode::PlayOn
                                    ? SP.ballSpeedMax()
                                    : wm.self().isKickable()
                                    ? wm.self().kickRate() * SP.maxPower()
                                    : SP.kickPowerRate() * SP.maxPower() );
    const double min_ball_speed = SP.defaultRealSpeedMax();

    const double max_receive_ball_speed
        = std::min( MAX_RECEIVE_BALL_SPEED,
                    ptype->kickableArea() + ( SP.maxDashPower()
                                              * ptype->dashPowerRate()
                                              * ptype->effortMax() ) * 1.5 );
    const double min_receive_ball_speed = 0.001;

    const Vector2D our_goal = SP.ourTeamGoalPos();

#ifdef DEBUG_PRINT_SUCCESS_PASS
    std::vector< int > success_counts;
    success_counts.reserve( 16 );
#endif

    //
    // distance loop
    //
    for ( int d = 1; d <= DIST_DIVS; ++d )
    {
        const double player_move_dist = DIST_STEP * d;
        const int a_step = ( player_move_dist * 2.0 * M_PI / ANGLE_DIVS < 0.6
                             ? 2
                             : 1 );
        // const int move_dist_penalty_step
        //     = static_cast< int >( std::floor( player_move_dist * 0.3 ) );

        //
        // angle loop
        //
        for ( int a = 0; a < ANGLE_DIVS; a += a_step )
        {
            ++M_total_count;

            const AngleDeg angle = receiver.angle_from_ball_ + ANGLE_STEP*a;
            const Vector2D receive_point
                = receiver.inertia_pos_
                + Vector2D::from_polar( player_move_dist, angle );

            int move_dist_penalty_step = 0;
            {
                Line2D ball_move_line( M_first_point, receive_point );
                double player_line_dist = ball_move_line.dist( receiver.pos_ );

                move_dist_penalty_step = static_cast< int >( std::floor( player_line_dist * 0.3 ) );
            }

#ifdef DEBUG_LEADING_PASS
            dlog.addText( Logger::PASS,
                          ">>>> (lead) unum=%d receivePoint=(%.1f %.1f)",
                          receiver.player_->unum(),
                          receive_point.x, receive_point.y );
#endif

            if ( receive_point.x > SP.pitchHalfLength() - 3.0
                 || receive_point.x < -SP.pitchHalfLength() + 5.0
                 || receive_point.absY() > SP.pitchHalfWidth() - 3.0 )
            {
#ifdef DEBUG_LEADING_PASS
                dlog.addText( Logger::PASS,
                              "%d: xxx (lead) unum=%d outOfBounds pos=(%.2f %.2f)",
                              M_total_count, receiver.player_->unum(),
                              receive_point.x, receive_point.y );
                debug_paint_failed_pass( M_total_count, receive_point );
#endif
                continue;
            }

            if ( receive_point.x < M_first_point.x
                 && receive_point.dist2( our_goal ) < OUR_GOAL_DIST_THR2 )
            {
#ifdef DEBUG_LEADING_PASS
                dlog.addText( Logger::PASS,
                              "%d: xxx (lead) unum=%d our goal is near pos=(%.2f %.2f)",
                              M_total_count, receiver.player_->unum(),
                              receive_point.x, receive_point.y );
                debug_paint_failed_pass( M_total_count, receive_point );
#endif
                continue;
            }

            if ( wm.gameMode().type() == GameMode::GoalKick_
                 && receive_point.x < SP.ourPenaltyAreaLineX() + 1.0
                 && receive_point.absY() < SP.penaltyAreaHalfWidth() + 1.0 )
            {
#ifdef DEBUG_LEADING_PASS
                dlog.addText( Logger::PASS,
                              "%d: xxx (lead) unum=%d, goal_kick",
                              M_total_count, receiver.player_->unum() );
#endif
                return;
            }

            const double ball_move_dist = M_first_point.dist( receive_point );

            if ( ball_move_dist < MIN_LEADING_PASS_DIST
                 || MAX_LEADING_PASS_DIST < ball_move_dist )
            {
#ifdef DEBUG_LEADING_PASS
                dlog.addText( Logger::PASS,
                              "%d: xxx (lead) unum=%d overBallMoveDist=%.3f minDist=%.3f maxDist=%.3f",
                              M_total_count, receiver.player_->unum(),
                              ball_move_dist,
                              MIN_LEADING_PASS_DIST, MAX_LEADING_PASS_DIST );
                debug_paint_failed_pass( M_total_count, receive_point );
#endif
                continue;
            }

            {
                int nearest_receiver_unum = getNearestReceiverUnum( receive_point );
                if ( nearest_receiver_unum != receiver.player_->unum() )
                {
#ifdef DEBUG_LEADING_PASS
                    dlog.addText( Logger::PASS,
                                  "%d: xxx (lead) unum=%d otherReceiver=%d pos=(%.2f %.2f)",
                                  M_total_count, receiver.player_->unum(),
                                  nearest_receiver_unum,
                                  receive_point.x, receive_point.y );
                    debug_paint_failed_pass( M_total_count, receive_point );
#endif
                    break;
                }
            }

            const int receiver_step = predictReceiverReachStep( receiver,
                                                                receive_point,
                                                                true )
                + move_dist_penalty_step;
            const AngleDeg ball_move_angle = ( receive_point - M_first_point ).th();

            const int min_ball_step = SP.ballMoveStep( SP.ballSpeedMax(), ball_move_dist );

#ifdef DEBUG_PRINT_SUCCESS_PASS
            success_counts.clear();
#endif

            const int start_step = std::max( std::max( MIN_RECEIVE_STEP,
                                                       min_ball_step ),
                                             receiver_step );

// #ifdef DEBUG_LEADING_PASS
//             dlog.addText( Logger::PASS,
//                           "=== (lead) unum=%d MIN_RECEIVE_STEP=%d"
//                           " min_ball_step=%d"
//                           " receiver_step=%d",
//                           receiver.player_->unum(),
//                           MIN_RECEIVE_STEP, min_ball_step, receiver_step );
// #endif

#ifdef CREATE_SEVERAL_CANDIDATES_ON_SAME_POINT
            const int max_step = std::max( MAX_RECEIVE_STEP, start_step + 3 );
#else
            const int max_step = start_step + 3;
#endif

#ifdef DEBUG_LEADING_PASS
            dlog.addText( Logger::PASS,
                          "=== (lead) receiver=%d"
                          " receivePos=(%.1f %.1f)",
                          receiver.player_->unum(),
                          receive_point.x, receive_point.y );
            dlog.addText( Logger::PASS,
                          "__ ballMove=%.3f moveAngle=%.1f",
                          ball_move_dist, ball_move_angle.degree() );
            dlog.addText( Logger::PASS,
                          "__ stepRange=[%d, %d] receiverStep=%d(penalty=%d)",
                          start_step, max_step, receiver_step, move_dist_penalty_step );
#endif

            createPassCommon( wm,
                              receiver, receive_point,
                              start_step, max_step,
                              min_ball_speed, max_ball_speed,
                              min_receive_ball_speed, max_receive_ball_speed,
                              ball_move_dist, ball_move_angle,
                              "strictLead" );
        }
    }
}

/*-------------------------------------------------------------------*/
/*!

 */
void
StrictCheckPassGenerator::createThroughPass( const WorldModel & wm,
                                             const Receiver & receiver )
{
    static const int MIN_RECEIVE_STEP = 6;
#ifdef CREATE_SEVERAL_CANDIDATES_ON_SAME_POINT
    static const int MAX_RECEIVE_STEP = 35;
#endif

    static const double MIN_THROUGH_PASS_DIST = 5.0;
    static const double MAX_THROUGH_PASS_DIST
        = 0.9 * inertia_final_distance( ServerParam::i().ballSpeedMax(),
                                        ServerParam::i().ballDecay() );
    static const double MAX_RECEIVE_BALL_SPEED
        = ServerParam::i().ballSpeedMax()
        * std::pow( ServerParam::i().ballDecay(), MIN_RECEIVE_STEP );

    static const int ANGLE_DIVS = 14;
    static const double MIN_ANGLE = -40.0;
    static const double MAX_ANGLE = +40.0;
    static const double ANGLE_STEP = ( MAX_ANGLE - MIN_ANGLE ) / ANGLE_DIVS;

    static const double MIN_MOVE_DIST = 6.0;
    static const double MAX_MOVE_DIST = 30.0 + 0.001;
    static const double MOVE_DIST_STEP = 2.0;

    const ServerParam & SP = ServerParam::i();
    const PlayerType * ptype = receiver.player_->playerTypePtr();
    const AngleDeg receiver_vel_angle = receiver.vel_.th();

    const double min_receive_x = std::min( std::min( std::max( 10.0, M_first_point.x + 10.0 ),
                                                     wm.offsideLineX() - 10.0 ),
                                           SP.theirPenaltyAreaLineX() - 5.0 );

    if ( receiver.pos_.x < min_receive_x - MAX_MOVE_DIST
         || receiver.pos_.x < 1.0 )
    {
#ifdef DEBUG_THROUGH_PASS
        dlog.addText( Logger::PASS,
                      "%d: xxx (through) unum=%d too back.",
                      M_total_count, receiver.player_->unum() );
#endif
        return;
    }

    //
    // initialize ball speed range
    //

    const double max_ball_speed = ( wm.gameMode().type() == GameMode::PlayOn
                                    ? SP.ballSpeedMax()
                                    : wm.self().isKickable()
                                    ? wm.self().kickRate() * SP.maxPower()
                                    : SP.kickPowerRate() * SP.maxPower() );
    const double min_ball_speed = 1.4; //SP.defaultPlayerSpeedMax();

    const double max_receive_ball_speed
        = std::min( MAX_RECEIVE_BALL_SPEED,
                    ptype->kickableArea() + ( SP.maxDashPower()
                                              * ptype->dashPowerRate()
                                              * ptype->effortMax() ) * 1.5 );
    const double min_receive_ball_speed = 0.001;

    //
    // check communication
    //

    bool pass_requested = false;
    AngleDeg requested_move_angle = 0.0;
    if ( wm.audioMemory().passRequestTime().cycle() > wm.time().cycle() - 10 ) // Magic Number
    {
        for ( std::vector< AudioMemory::PassRequest >::const_iterator it = wm.audioMemory().passRequest().begin();
              it != wm.audioMemory().passRequest().end();
              ++it )
        {
            if ( it->sender_ == receiver.player_->unum() )
            {
                pass_requested = true;
                requested_move_angle = ( it->pos_ - receiver.inertia_pos_ ).th();
#ifdef DEBUG_THROUGH_PASS
                dlog.addText( Logger::PASS,
                              "%d: (through) receiver=%d pass requested",
                              M_total_count, receiver.player_->unum() );
#endif
                break;
            }
        }
    }

    //
    //
    //
#ifdef DEBUG_PRINT_SUCCESS_PASS
    std::vector< int > success_counts;
    success_counts.reserve( 16 );
#endif

    //
    // angle loop
    //
    for ( int a = 0; a <= ANGLE_DIVS; ++a )
    {
        const AngleDeg angle = MIN_ANGLE + ( ANGLE_STEP * a );
        const Vector2D unit_rvec = Vector2D::from_polar( 1.0, angle );

        //
        // distance loop
        //
        for ( double move_dist = MIN_MOVE_DIST;
              move_dist < MAX_MOVE_DIST;
              move_dist += MOVE_DIST_STEP )
        {
            ++M_total_count;

            const Vector2D receive_point
                = receiver.inertia_pos_
                + unit_rvec * move_dist;

#ifdef DEBUG_THROUGH_PASS
            dlog.addText( Logger::PASS,
                          ">>>> (through) receiver=%d receivePoint=(%.1f %.1f)",
                          receiver.player_->unum(),
                          receive_point.x, receive_point.y );
#endif

            if ( receive_point.x < min_receive_x )
            {
#ifdef DEBUG_THROUGH_PASS
                dlog.addText( Logger::PASS,
                              "%d: xxx (through) unum=%d tooSmallX pos=(%.2f %.2f)",
                              M_total_count, receiver.player_->unum(),
                              receive_point.x, receive_point.y );
                debug_paint_failed_pass( M_total_count, receive_point );
#endif
                continue;
            }

            if ( receive_point.x > SP.pitchHalfLength() - 1.5
                 || receive_point.absY() > SP.pitchHalfWidth() - 1.5 )
            {
#ifdef DEBUG_THROUGH_PASS
                dlog.addText( Logger::PASS,
                              "%d: xxx (through) unum=%d outOfBounds pos=(%.2f %.2f)",
                              M_total_count, receiver.player_->unum(),
                              receive_point.x, receive_point.y );
                debug_paint_failed_pass( M_total_count, receive_point );
#endif
                break;
            }

            const double ball_move_dist = M_first_point.dist( receive_point );

            if ( ball_move_dist < MIN_THROUGH_PASS_DIST
                 || MAX_THROUGH_PASS_DIST < ball_move_dist )
            {
#ifdef DEBUG_THROUGH_PASS
                dlog.addText( Logger::PASS,
                              "%d: xxx (through) unum=%d overBallMoveDist=%.3f minDist=%.3f maxDist=%.3f",
                              M_total_count, receiver.player_->unum(),
                              ball_move_dist,
                              MIN_THROUGH_PASS_DIST, MAX_THROUGH_PASS_DIST );
                debug_paint_failed_pass( M_total_count, receive_point );
#endif
                continue;
            }

            {
                int nearest_receiver_unum = getNearestReceiverUnum( receive_point );
                if ( nearest_receiver_unum != receiver.player_->unum() )
                {
#ifdef DEBUG_THROUGH_PASS
                    dlog.addText( Logger::PASS,
                                  "%d: xxx (through) unum=%d otherReceiver=%d pos=(%.2f %.2f)",
                                  M_total_count, receiver.player_->unum(),
                                  nearest_receiver_unum,
                                  receive_point.x, receive_point.y );
                    debug_paint_failed_pass( M_total_count, receive_point );
#endif
                    break;
                }            }


            const int receiver_step = predictReceiverReachStep( receiver,
                                                                receive_point,
                                                                false );
            const AngleDeg ball_move_angle = ( receive_point - M_first_point ).th();

#ifdef DEBUG_PRINT_SUCCESS_PASS
            success_counts.clear();
#endif

            int start_step = receiver_step;
            if ( pass_requested
                 && ( requested_move_angle - angle ).abs() < 20.0 )
            {
#ifdef DEBUG_THROUGH_PASS
                dlog.addText( Logger::PASS,
                              "%d: matched with requested pass. angle=%.1f",
                              M_total_count, angle.degree() );
#endif
            }
            // if ( receive_point.x > wm.offsideLineX() + 5.0
            //      || ball_move_angle.abs() < 15.0 )
            else if ( receiver.speed_ > 0.2
                      && ( receiver_vel_angle - angle ).abs() < 15.0 )
            {
#ifdef DEBUG_THROUGH_PASS
                dlog.addText( Logger::PASS,
                              "%d: matched with receiver velocity. angle=%.1f",
                              M_total_count, angle.degree() );
#endif
            }
            else
            {
#ifdef DEBUG_THROUGH_PASS
                dlog.addText( Logger::PASS,
                              "%d: receiver step. one step penalty",
                              M_total_count );
#endif
                start_step += 1;
                if ( ( receive_point.x > SP.pitchHalfLength() - 5.0
                       || receive_point.absY() > SP.pitchHalfWidth() - 5.0 )
                     && ball_move_angle.abs() > 30.0
                     && start_step >= 10 )
                {
                    start_step += 1;
                }
            }

            const int min_ball_step = SP.ballMoveStep( SP.ballSpeedMax(), ball_move_dist );

            start_step = std::max( std::max( MIN_RECEIVE_STEP,
                                             min_ball_step ),
                                   start_step );

#ifdef CREATE_SEVERAL_CANDIDATES_ON_SAME_POINT
            const int max_step = std::max( MAX_RECEIVE_STEP, start_step + 3 );
#else
            const int max_step = start_step + 3;
#endif

#ifdef DEBUG_THROUGH_PASS
            dlog.addText( Logger::PASS,
                          "== (through) receiver=%d"
                          " ballPos=(%.1f %.1f) receivePos=(%.1f %.1f)",
                          receiver.player_->unum(),
                          M_first_point.x, M_first_point.y,
                          receive_point.x, receive_point.y );
            dlog.addText( Logger::PASS,
                          "== ballMove=%.3f moveAngle=%.1f",
                          ball_move_dist, ball_move_angle.degree() );
            dlog.addText( Logger::PASS,
                          "== stepRange=[%d, %d] receiverMove=%.3f receiverStep=%d",
                          start_step, max_step,
                          receiver.inertia_pos_.dist( receive_point ), receiver_step );
#endif

            createPassCommon( wm,
                              receiver, receive_point,
                              start_step, max_step,
                              min_ball_speed, max_ball_speed,
                              min_receive_ball_speed, max_receive_ball_speed,
                              ball_move_dist, ball_move_angle,
                              "strictThrough" );
        }

    }

}

/*-------------------------------------------------------------------*/
/*!

 */
void
StrictCheckPassGenerator::createPassCommon( const WorldModel & wm,
                                            const Receiver & receiver,
                                            const Vector2D & receive_point,
                                            const int min_step,
                                            const int max_step,
                                            const double & min_first_ball_speed,
                                            const double & max_first_ball_speed,
                                            const double & min_receive_ball_speed,
                                            const double & max_receive_ball_speed,
                                            const double & ball_move_dist,
                                            const AngleDeg & ball_move_angle,
                                            const char * description )
{
    const ServerParam & SP = ServerParam::i();

    int success_count = 0;
#ifdef DEBUG_PRINT_SUCCESS_PASS
    std::vector< int > success_counts;
    success_counts.reserve( max_step - min_step + 1 );
#endif

    for ( int step = min_step; step <= max_step; ++step )
    {
        ++M_total_count;

        double first_ball_speed = calc_first_term_geom_series( ball_move_dist,
                                                               SP.ballDecay(),
                                                               step );

#if (defined DEBUG_PRINT_DIRECT_PASS) || (defined DEBUG_PRINT_LEADING_PASS) || (defined DEBUG_PRINT_THROUGH_PASS) || (defined DEBUG_PRINT_FAILED_PASS)
        dlog.addText( Logger::PASS,
                      "%d: type=%c unum=%d recvPos=(%.2f %.2f) step=%d ballMoveDist=%.2f speed=%.3f",
                      M_total_count, M_pass_type,
                      receiver.player_->unum(),
                      receive_point.x, receive_point.y,
                      step,
                      ball_move_dist,
                      first_ball_speed );
#endif


        if ( first_ball_speed < min_first_ball_speed )
        {
#ifdef DEBUG_PRINT_FAILED_PASS
            dlog.addText( Logger::PASS,
                          "%d: xxx type=%c unum=%d (%.1f %.1f) step=%d firstSpeed=%.3f < min=%.3f",
                          M_total_count, M_pass_type,
                          receiver.player_->unum(),
                          receive_point.x, receive_point.y,
                          step,
                          first_ball_speed, min_first_ball_speed );
#endif
            break;
        }

        if ( max_first_ball_speed < first_ball_speed )
        {
#ifdef DEBUG_PRINT_FAILED_PASS
            dlog.addText( Logger::PASS,
                          "%d: xxx type=%c unum=%d (%.1f %.1f) step=%d firstSpeed=%.3f > max=%.3f",
                          M_total_count, M_pass_type,
                          receiver.player_->unum(),
                          receive_point.x, receive_point.y,
                          step,
                          first_ball_speed, max_first_ball_speed );
#endif

            continue;
        }

        double receive_ball_speed = first_ball_speed * std::pow( SP.ballDecay(), step );
        if ( receive_ball_speed < min_receive_ball_speed )
        {
#ifdef DEBUG_PRINT_FAILED_PASS
            dlog.addText( Logger::PASS,
                          "%d: xxx type=%c unum=%d (%.1f %.1f) step=%d recvSpeed=%.3f < min=%.3f",
                          M_total_count, M_pass_type,
                          receiver.player_->unum(),
                          receive_point.x, receive_point.y,
                          step,
                          receive_ball_speed, min_receive_ball_speed );
#endif
            break;
        }

        if ( max_receive_ball_speed < receive_ball_speed )
        {
#ifdef DEBUG_PRINT_FAILED_PASS
            dlog.addText( Logger::PASS,
                          "%d: xxx type=%c unum=%d (%.1f %.1f) step=%d recvSpeed=%.3f > max=%.3f",
                          M_total_count, M_pass_type,
                          receiver.player_->unum(),
                          receive_point.x, receive_point.y,
                          step,
                          receive_ball_speed, max_receive_ball_speed );
#endif
            continue;
        }

        int kick_count = FieldAnalyzer::predict_kick_count( wm,
                                                            M_passer,
                                                            first_ball_speed,
                                                            ball_move_angle );

        const AbstractPlayerObject * opponent = static_cast< const AbstractPlayerObject * >( 0 );
        int o_step = predictOpponentsReachStep( wm,
                                                M_first_point,
                                                first_ball_speed,
                                                ball_move_angle,
                                                receive_point,
                                                step + ( kick_count - 1 ) + 5,
                                                &opponent );

        bool failed = false;

        // G2d: risk passes
        // C2D: Helios Tune removed -> replace with BNN

        // bool heliosbase = false;
        // bool helios2018 = false;
        // if (wm.opponentTeamName().find("HELIOS_base") != std::string::npos)
        //     heliosbase = true;
        // else if (wm.opponentTeamName().find("HELIOS2018") != std::string::npos)
        //     helios2018 = true;

        int risk = 0;

        if (wm.ball().pos().x < wm.offsideLineX() && receive_point.x > wm.offsideLineX() + 3.0 && wm.offsideLineX() - receiver.player_->pos().x < 5.0)
        {
            // C2D: Helios Tune removed -> replace with BNN
            // if (heliosbase)
            //     risk = 5;
            // else if (helios2018)
            //     risk = 0;
            // else
                risk = 2;
        }

        if ( M_pass_type == 'T' )
        {
            if ( o_step + risk <= step ) // G2d: risk passess
            {
        #ifdef DEBUG_THROUGH_PASS
                        dlog.addText( Logger::PASS,
                                    "%d: ThroughPass failed???",
                                    M_total_count );
        #endif
                 failed = true;
            }

            if ( receive_point.x > 30.0
                 && step >= 15
                 && ( ! opponent
                      || ! opponent->goalie() )
                 && o_step >= step ) // Magic Number
            {
                AngleDeg receive_move_angle = ( receive_point - receiver.pos_ ).th();
                if ( ( receiver.player_->body() - receive_move_angle ).abs() < 15.0 )
                {
#ifdef DEBUG_THROUGH_PASS
                    dlog.addText( Logger::PASS,
                                  "%d: ********** ThroughPass reset failed flag",
                                  M_total_count );
#endif
                    failed = false;
                }
            }
        }
        else
        {
            if ( o_step + risk <= step + ( kick_count - 1 ) )
            {
                failed = true;
            }
        }

        if ( failed )
        {
            // opponent can reach the ball faster than the receiver.
            // then, break the loop, because ball speed is decreasing in the loop.
#ifdef DEBUG_PRINT_FAILED_PASS
            dlog.addText( Logger::PASS,
                          "%d: xxx type=%c unum=%d (%.1f %.1f) step=%d >= opp[%d]Step=%d,"
                          " firstSpeed=%.3f recvSpeed=%.3f nKick=%d",
                          M_total_count, M_pass_type,
                          receiver.player_->unum(),
                          receive_point.x, receive_point.y,
                          step,
                          ( opponent ? opponent->unum() : 0 ), o_step,
                          first_ball_speed, receive_ball_speed,
                          kick_count );
#endif
            break;
        }

        CooperativeAction::Ptr pass( new Pass( M_passer->unum(),
                                               receiver.player_->unum(),
                                               receive_point,
                                               first_ball_speed,
                                               step + kick_count,
                                               kick_count,
                                               FieldAnalyzer::to_be_final_action( wm ),
                                               description ) );
        pass->setIndex( M_total_count );

        switch ( M_pass_type ) {
        case 'D':
            M_direct_size += 1;
            break;
        case 'L':
            M_leading_size += 1;
            break;
        case 'T':
            M_through_size += 1;
        default:
            break;
        }
        // if ( M_pass_type == 'L'
        //      && success_count > 0 )
        // {
        //     M_courses.pop_back();
        // }

        M_courses.push_back( pass );

#ifdef DEBUG_PRINT_SUCCESS_PASS
        dlog.addText( Logger::PASS,
                      "%d: ok type=%c unum=%d step=%d  opp[%d]Step=%d"
                      " nKick=%d ball=(%.1f %.1f) recv=(%.1f %.1f) "
                      " speed=%.3f->%.3f dir=%.1f",
                      M_total_count, M_pass_type,
                      receiver.player_->unum(),
                      step,
                      ( opponent ? opponent->unum() : 0 ),
                      o_step,
                      kick_count,
                      M_first_point.x, M_first_point.y,
                      receive_point.x, receive_point.y,
                      first_ball_speed,
                      receive_ball_speed,
                      ball_move_angle.degree() );
        success_counts.push_back( M_total_count );
#endif

#ifndef CREATE_SEVERAL_CANDIDATES_ON_SAME_POINT
        break;
#endif

        if ( o_step <= step + 3 )
        {
#ifdef DEBUG_PRINT_SUCCESS_PASS
            dlog.addText( Logger::PASS,
                          "---- o_step(=%d) <= step+3(=%d) break...",
                          o_step, step+3 );
#endif
            break;
        }

        if ( min_step + 3 <= step )
        {
#ifdef DEBUG_PRINT_SUCCESS_PASS
            dlog.addText( Logger::PASS,
                          "---- step=%d >= min_step+?(=%d) break...",
                          step, min_step + 3 );
#endif
            break;
        }

        if ( M_passer->unum() != wm.self().unum() )
        {
            break;
        }

        ++success_count;
    }


#ifdef DEBUG_PRINT_SUCCESS_PASS
    if ( ! success_counts.empty() )
    {
        std::ostringstream ostr;
        std::vector< int >::const_iterator it = success_counts.begin();

        ostr << *it; ++it;
        for ( ; it != success_counts.end(); ++it )
        {
            ostr << ',' << *it;
        }

        dlog.addRect( Logger::PASS,
                      receive_point.x - 0.1, receive_point.y - 0.1,
                      0.2, 0.2,
                      "#00ff00" );
        dlog.addMessage( Logger::PASS,
                         receive_point,
                         ostr.str().c_str() );
    }
#ifdef DEBUG_PRINT_FAILED_PASS
    else
    {
        debug_paint_failed_pass( M_total_count, receive_point );
    }
#endif
#endif
}

/*-------------------------------------------------------------------*/
/*!

 */
int
StrictCheckPassGenerator::getNearestReceiverUnum( const Vector2D & pos )
{
    int unum = Unum_Unknown;
    double min_dist2 = std::numeric_limits< double >::max();

    for ( ReceiverCont::iterator p = M_receiver_candidates.begin();
          p != M_receiver_candidates.end();
          ++p )
    {
        double d2 = p->pos_.dist2( pos );
        if ( d2 < min_dist2 )
        {
            min_dist2 = d2;
            unum = p->player_->unum();
        }
    }

    return unum;
}

/*-------------------------------------------------------------------*/
/*!

 */
int
StrictCheckPassGenerator::predictReceiverReachStep( const Receiver & receiver,
                                                    const Vector2D & pos,
                                                    const bool use_penalty )
{
    const PlayerType * ptype = receiver.player_->playerTypePtr();
    double target_dist = receiver.inertia_pos_.dist( pos );
    int n_turn = ( receiver.player_->bodyCount() > 0
                   ? 1
                   : FieldAnalyzer::predict_player_turn_cycle( ptype,
                                                               receiver.player_->body(),
                                                               receiver.speed_,
                                                               target_dist,
                                                               ( pos - receiver.inertia_pos_ ).th(),
                                                               ptype->kickableArea(),
                                                               false ) );
    double dash_dist = target_dist;

    // if ( receiver.pos_.x < pos.x )
    // {
    //     dash_dist -= ptype->kickableArea() * 0.5;
    // }

    if ( use_penalty )
    {
        dash_dist += receiver.penalty_distance_;
    }

    // if ( M_pass_type == 'T' )
    // {
    //     dash_dist -= ptype->kickableArea() * 0.5;
    // }

    if ( M_pass_type == 'L' )
    {
        // if ( pos.x > -20.0
        //      && dash_dist < ptype->kickableArea() * 1.5 )
        // {
        //     dash_dist -= ptype->kickableArea() * 0.5;
        // }

        // if ( pos.x < 30.0 )
        // {
        //     dash_dist += 0.3;
        // }

        dash_dist *= 1.05;

        AngleDeg dash_angle = ( pos - receiver.pos_ ).th() ;

        if ( dash_angle.abs() > 90.0
             || receiver.player_->bodyCount() > 1
             || ( dash_angle - receiver.player_->body() ).abs() > 30.0 )
        {
            n_turn += 1;
        }
    }

    int n_dash = ptype->cyclesToReachDistance( dash_dist );

#ifdef DEBUG_PREDICT_RECEIVER
    dlog.addText( Logger::PASS,
                  "== receiver=%d receivePos=(%.1f %.1f) dist=%.2f dash=%.2f penalty=%.2f turn=%d dash=%d",
                  receiver.player_->unum(),
                  pos.x, pos.y,
                  target_dist, dash_dist, receiver.penalty_distance_,
                  n_turn, n_dash );
#endif
    return ( n_turn == 0
             ? n_turn + n_dash
             : n_turn + n_dash + 1 ); // 1 step penalty for observation delay.
    // if ( ! use_penalty )
    // {
    //     return n_turn + n_dash;
    // }
    // return n_turn + n_dash + 1; // 1 step penalty for observation delay.
}

/*-------------------------------------------------------------------*/
/*!

 */
int
StrictCheckPassGenerator::predictOpponentsReachStep( const WorldModel & wm,
                                                     const Vector2D & first_ball_pos,
                                                     const double & first_ball_speed,
                                                     const AngleDeg & ball_move_angle,
                                                     const Vector2D & receive_point,
                                                     const int max_cycle,
                                                     const AbstractPlayerObject ** opponent )
{
    const Vector2D first_ball_vel = Vector2D::polar2vector( first_ball_speed, ball_move_angle );

    double bonus_dist = -10000.0;
    int min_step = 1000;
    const AbstractPlayerObject * fastest_opponent = static_cast< AbstractPlayerObject * >( 0 );

    for ( OpponentCont::const_iterator o = M_opponents.begin();
          o != M_opponents.end();
          ++o )
    {
        int step = predictOpponentReachStep( wm,
                                             *o,
                                             first_ball_pos,
                                             first_ball_vel,
                                             ball_move_angle,
                                             receive_point,
                                             std::min( max_cycle, min_step ) );
        if ( step < min_step
             || ( step == min_step
                  && o->bonus_distance_ > bonus_dist ) )
        {
            bonus_dist = o->bonus_distance_;
            min_step = step;
            fastest_opponent = o->player_;
        }
    }

#ifdef DEBUG_PREDICT_OPPONENT_REACH_STEP
    dlog.addText( Logger::PASS,
                  "______ opponent=%d(%.1f %.1f) step=%d",
                  fastest_opponent->unum(),
                  fastest_opponent->pos().x, fastest_opponent->pos().y,
                  min_step );
#endif

    if ( opponent )
    {
        *opponent = fastest_opponent;
    }
    return min_step;
}

/*-------------------------------------------------------------------*/
/*!

 */
int
StrictCheckPassGenerator::predictOpponentReachStep( const WorldModel & wm,
                                                    const Opponent & opponent,
                                                    const Vector2D & first_ball_pos,
                                                    const Vector2D & first_ball_vel,
                                                    const AngleDeg & ball_move_angle,
                                                    const Vector2D & receive_point,
                                                    const int max_cycle )
{
    static const Rect2D penalty_area( Vector2D( ServerParam::i().theirPenaltyAreaLineX(),
                                                -ServerParam::i().penaltyAreaHalfWidth() ),
                                      Size2D( ServerParam::i().penaltyAreaLength(),
                                              ServerParam::i().penaltyAreaWidth() ) );
    static const double CONTROL_AREA_BUF = 0.15;

    const ServerParam & SP = ServerParam::i();

    const PlayerType * ptype = opponent.player_->playerTypePtr();
    const int min_cycle = FieldAnalyzer::estimate_min_reach_cycle( opponent.pos_,
                                                                   ptype->realSpeedMax(),
                                                                   first_ball_pos,
                                                                   ball_move_angle );
#ifdef DEBUG_PREDICT_OPPONENT_REACH_STEP
    dlog.addText( Logger::PASS,
                  "++ opponent=%d(%.1f %.1f)",
                  opponent.player_->unum(),
                  opponent.pos_.x, opponent.pos_.y );
#endif

    if ( min_cycle < 0 )
    {
#ifdef DEBUG_PREDICT_OPPONENT_REACH_STEP
        dlog.addText( Logger::PASS,
                      "__ never reach(1)",
                      opponent.player_->unum(),
                      opponent.player_->pos().x,
                      opponent.player_->pos().y );
#endif
        return 1000;
    }

    for ( int cycle = std::max( 1, min_cycle ); cycle <= max_cycle; ++cycle )
    {
        const Vector2D ball_pos = inertia_n_step_point( first_ball_pos,
                                                        first_ball_vel,
                                                        cycle,
                                                        SP.ballDecay() );
        const double control_area = ( opponent.player_->goalie()
                                      && penalty_area.contains( ball_pos )
                                      ? SP.catchableArea()
                                      : ptype->kickableArea() );

        const Vector2D inertia_pos = ptype->inertiaPoint( opponent.pos_, opponent.vel_, cycle );
        const double target_dist = inertia_pos.dist( ball_pos );

        double dash_dist = target_dist;

        if ( M_pass_type == 'T'
             && first_ball_vel.x > 2.0
             && ( receive_point.x > wm.offsideLineX()
                  || receive_point.x > 30.0 ) )
        {
#if 0
            dlog.addText( Logger::PASS,
                          "__ step=%d no bonus",
                          cycle );
#endif
        }
        else
        {
            dash_dist -= opponent.bonus_distance_;
        }

        if ( dash_dist - control_area - CONTROL_AREA_BUF < 0.001 )
        {
#ifdef DEBUG_PREDICT_OPPONENT_REACH_STEP
            dlog.addText( Logger::PASS,
                          "__ step=%d already there. dist=%.1f bonusDist=%.1f",
                          cycle,
                          target_dist, opponent.bonus_distance_ );
#endif
            return cycle;
        }

        //if ( cycle > 1 )
        {
            if ( M_pass_type == 'T'
                 && first_ball_vel.x > 2.0
                 && ( receive_point.x > wm.offsideLineX()
                      || receive_point.x > 30.0 ) )
            {
#ifdef DEBUG_PREDICT_OPPONENT_REACH_STEP
                dlog.addText( Logger::PASS,
                              "__ step=%d through pass: dash_dist=%.2f bonus=%.2f",
                              cycle,
                              dash_dist, control_area * 0.8 );
#endif
                //dash_dist -= control_area * 0.5;
                //dash_dist -= control_area * 0.8;
                dash_dist -= control_area;
            }
            else
            {
                if ( receive_point.x < 25.0 )
                {
#ifdef DEBUG_PREDICT_OPPONENT_REACH_STEP
                    dlog.addText( Logger::PASS,
                                  "__ step=%d normal(1) dash_dist=%.2f bonus=%.2f",
                                  cycle,
                                  dash_dist, control_area + 0.5 );
#endif
                    dash_dist -= control_area;
                    dash_dist -= 0.5;
                }
                else
                {
#ifdef DEBUG_PREDICT_OPPONENT_REACH_STEP
                    dlog.addText( Logger::PASS,
                                  "__ step=%d normal(2) dash_dist=%.2f bonus=%.2f",
                                  cycle,
                                  dash_dist, control_area + 0.8 + 0.2 );
#endif
                    //dash_dist -= control_area * 0.8;
                    dash_dist -= control_area;
                    dash_dist -= 0.2;
                }
            }
        }

        if ( dash_dist > ptype->realSpeedMax()
             * ( cycle + std::min( opponent.player_->posCount(), 5 ) ) )
        {
#if 0
            dlog.addText( Logger::PASS,
                          "__ step=%d dash_dist=%.1f reachable=%.1f",
                          cycle,
                          dash_dist, ptype->realSpeedMax()*cycle );
#endif
            continue;
        }

        //
        // dash
        //

        int n_dash = ptype->cyclesToReachDistance( dash_dist );

        if ( n_dash > cycle + opponent.player_->posCount() )
        {
#ifdef DEBUG_PREDICT_OPPONENT_REACH_STEP
            dlog.addText( Logger::PASS,
                          "__ step=%d dash_dist=%.1f n_dash=%d",
                          cycle,
                          dash_dist, n_dash );
#endif
            continue;
        }

        //
        // turn
        //
        int n_turn = ( opponent.player_->bodyCount() > 1
                       ? 0
                       : FieldAnalyzer::predict_player_turn_cycle( ptype,
                                                                   opponent.player_->body(),
                                                                   opponent.speed_,
                                                                   target_dist,
                                                                   ( ball_pos - inertia_pos ).th(),
                                                                   control_area,
                                                                   true ));

        // G2d: risk in opponent check
        // C2D: Helios Tune removed -> replace with BNN
        // bool heliosbase = false;
        // if (wm.opponentTeamName().find("HELIOS_base") != std::string::npos)
        //     heliosbase = true;

        double oppDir = (opponent.player_->pos() - wm.ball().pos()).dir().degree();

        double pass_cut = 10.0;
        double pass_angle = 49.0;
        double pass_depth = 3.0;
        double pass_max_x = 47.5;
        double pass_min_y = 20.0;

        int risk = 0;

        if ((receive_point.x < pass_max_x || fabs(receive_point.y) > pass_min_y) && (M_pass_type == 'T' || M_pass_type == 'L') && fabs(ball_move_angle.degree() - oppDir) > pass_cut && fabs(ball_move_angle.degree()) < pass_angle && wm.ball().pos().x < wm.offsideLineX() && receive_point.x > wm.offsideLineX() + pass_depth)
        {
            // if (heliosbase)
            //     risk = 2;
            // else
                risk = 1;
        }

        int n_step = ( n_turn == 0
                       ? n_turn + n_dash + risk
                       : n_turn + n_dash + 1 ); // 1 step penalty for observation delay

        int bonus_step = 0;
        if ( opponent.player_->isTackling() )
        {
            bonus_step = -5; // Magic Number
        }

        // if ( receive_point.x < 0.0 )
        // {
        //     bonus_step += 1;
        // }

#ifdef DEBUG_PREDICT_OPPONENT_REACH_STEP
        dlog.addText( Logger::PASS,
                      "__ step=%d oppStep=%d(t:%d,d:%d)"
                      " ballPos=(%.2f %.2f)"
                      " dist=%.2f ctrl=%.2f dash=%.2f bonus=%.1f"
                      " bonusStep=%d",
                      cycle,
                      n_step, n_turn, n_dash,
                      ball_pos.x, ball_pos.y,
                      target_dist, control_area, dash_dist, opponent.bonus_distance_,
                      bonus_step );
#endif
        if ( n_step - bonus_step <= cycle )
        {
#ifdef DEBUG_PREDICT_OPPONENT_REACH_STEP
            dlog.addText( Logger::PASS,
                          "__ can reach" );
#endif
            return cycle;
        }
    }

#ifdef DEBUG_PREDICT_OPPONENT_REACH_STEP
    dlog.addText( Logger::PASS,
                  "__ never reach(2)" );
#endif

    return 1000;
}

```

---

## 6. /src/player/planner/shoot_generator.cpp

```cpp
// -*-c++-*-

/*!
  \file shoot_generator.cpp
  \brief shoot course generator class Source File
*/

/*
 *Copyright:

 Copyright (C) Hidehisa AKIYAMA

 This code is free software; you can redistribute it and/or
 modify it under the terms of the GNU Lesser General Public
 License as published by the Free Software Foundation; either
 version 3 of the License, or (at your option) any later version.

 This library is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 Lesser General Public License for more details.

 You should have received a copy of the GNU Lesser General Public
 License along with this library; if not, write to the Free Software
 Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA

 *EndCopyright:
 */

/////////////////////////////////////////////////////////////////////

#ifdef HAVE_CONFIG_H
#include <config.h>
#endif

#include "shoot_generator.h"

#include "field_analyzer.h"

#include "basic_actions/kick_table.h"

#include <rcsc/player/player_agent.h>
#include <rcsc/player/intercept_table.h>
#include <rcsc/common/logger.h>
#include <rcsc/common/server_param.h>
#include <rcsc/math_util.h>
#include <rcsc/timer.h>

#define SEARCH_UNTIL_MAX_SPEED_AT_SAME_POINT

#define DEBUG_PROFILE
// #define DEBUG_PRINT

// #define DEBUG_PRINT_SUCCESS_COURSE
// #define DEBUG_PRINT_FAILED_COURSE

// #define DEBUG_PRINT_EVALUATE

using namespace rcsc;

/*-------------------------------------------------------------------*/
/*!

 */
ShootGenerator::ShootGenerator()
{
    M_courses.reserve( 32 );

    clear();
}

/*-------------------------------------------------------------------*/
/*!

 */
ShootGenerator &
ShootGenerator::instance()
{
    static ShootGenerator s_instance;
    return s_instance;
}

/*-------------------------------------------------------------------*/
/*!

 */
void
ShootGenerator::clear()
{
    M_total_count = 0;
    M_courses.clear();
}

/*-------------------------------------------------------------------*/
/*!

 */
void
ShootGenerator::generate( const WorldModel & wm )
{
    static GameTime s_update_time( 0, 0 );

    if ( s_update_time == wm.time() )
    {
        return;
    }
    s_update_time = wm.time();

    clear();

    if ( ! wm.self().isKickable()
         && wm.interceptTable().selfStep() > 1 )
    {
        return;
    }

    if ( wm.time().stopped() > 0
         || wm.gameMode().type() == GameMode::KickOff_
         // || wm.gameMode().type() == GameMode::KickIn_
         || wm.gameMode().type() == GameMode::IndFreeKick_ )
    {
        return;
    }

    const ServerParam & SP = ServerParam::i();

    if ( wm.self().pos().dist2( SP.theirTeamGoalPos() ) > std::pow( 30.0, 2 ) )
    {
#ifdef DEBUG_PRINT
        dlog.addText( Logger::SHOOT,
                      __FILE__": over shootable distance" );
#endif
        return;
    }

    M_first_ball_pos = ( wm.self().isKickable()
                         ? wm.ball().pos()
                         : wm.ball().pos() + wm.ball().vel() );

#ifdef DEBUG_PROFILE
    Timer timer;
#endif

    Vector2D goal_l( SP.pitchHalfLength(), -SP.goalHalfWidth() );
    Vector2D goal_r( SP.pitchHalfLength(), +SP.goalHalfWidth() );

    goal_l.y += std::min( 1.5,
                          0.6 + goal_l.dist( M_first_ball_pos ) * 0.042 );
    goal_r.y -= std::min( 1.5,
                          0.6 + goal_r.dist( M_first_ball_pos ) * 0.042 );

    if ( wm.self().pos().x > SP.pitchHalfLength() - 1.0
         && wm.self().pos().absY() < SP.goalHalfWidth() )
    {
        goal_l.x = wm.self().pos().x + 1.5;
        goal_r.x = wm.self().pos().x + 1.5;
    }

    const int DIST_DIVS = 25;
    const double dist_step = std::fabs( goal_l.y - goal_r.y ) / ( DIST_DIVS - 1 );

#ifdef DEBUG_PRINT
    dlog.addText( Logger::SHOOT,
                  __FILE__": ===== Shoot search range=(%.1f %.1f)-(%.1f %.1f) dist_step=%.1f =====",
                  goal_l.x, goal_l.y, goal_r.x, goal_r.y, dist_step );
#endif

    for ( int i = 0; i < DIST_DIVS; ++i )
    {
        ++M_total_count;

        Vector2D target_point = goal_l;
        target_point.y += dist_step * i;

#ifdef DEBUG_PRINT
        dlog.addText( Logger::SHOOT,
                      "%d: ===== shoot target(%.2f %.2f) ===== ",
                      M_total_count,
                      target_point.x, target_point.y );
#endif
        createShoot( wm, target_point );
    }


    evaluateCourses( wm );


#ifdef DEBUG_PROFILE
    dlog.addText( Logger::SHOOT,
                  __FILE__": PROFILE %d/%d. elapsed=%.3f [ms]",
                  (int)M_courses.size(),
                  DIST_DIVS,
                  timer.elapsedReal() );
#endif

}

/*-------------------------------------------------------------------*/
/*!

 */
void
ShootGenerator::createShoot( const WorldModel & wm,
                             const Vector2D & target_point )
{
    const AngleDeg ball_move_angle = ( target_point - M_first_ball_pos ).th();

    const AbstractPlayerObject * goalie = wm.getTheirGoalie();
    if ( goalie
         && 5 < goalie->posCount()
         && goalie->posCount() < 30
         && wm.dirCount( ball_move_angle ) > 3 )
    {
#ifdef DEBUG_PRINT
        dlog.addText( Logger::SHOOT,
                      "%d: __ xxx goalie_count=%d, low dir accuracy",
                      M_total_count,
                      goalie->posCount() );
#endif
        return;
    }

    const ServerParam & SP = ServerParam::i();

    const double ball_speed_max = ( wm.gameMode().type() == GameMode::PlayOn
                                    || wm.gameMode().isPenaltyKickMode()
                                    ? SP.ballSpeedMax()
                                    : wm.self().kickRate() * SP.maxPower() );

    const double ball_move_dist = M_first_ball_pos.dist( target_point );

    const Vector2D max_one_step_vel
        = ( wm.self().isKickable()
            ? KickTable::calc_max_velocity( ball_move_angle,
                                            wm.self().kickRate(),
                                            wm.ball().vel() )
            : ( target_point - M_first_ball_pos ).setLengthVector( 0.1 ) );
    const double max_one_step_speed = max_one_step_vel.r();

    double first_ball_speed
        = std::max( ( ball_move_dist + 5.0 ) * ( 1.0 - SP.ballDecay() ),
                    std::max( max_one_step_speed,
                              1.5 ) );

    bool over_max = false;
#ifdef DEBUG_PRINT_SUCCESS_COURSE
    bool success = false;
#endif

    while ( ! over_max )
    {
        if ( first_ball_speed > ball_speed_max - 0.001 )
        {
            over_max = true;
            first_ball_speed = ball_speed_max;
        }

        if ( createShoot( wm,
                          target_point,
                          first_ball_speed,
                          ball_move_angle,
                          ball_move_dist ) )
        {
            Course & course = M_courses.back();

            if ( first_ball_speed <= max_one_step_speed + 0.001 )
            {
                course.kick_step_ = 1;
            }

#ifdef DEBUG_PRINT_SUCCESS_COURSE
            dlog.addText( Logger::SHOOT,
                          "%d: ok shoot target=(%.2f %.2f)"
                          " speed=%.3f angle=%.1f",
                          M_total_count,
                          target_point.x, target_point.y,
                          first_ball_speed,
                          ball_move_angle.degree() );
            dlog.addRect( Logger::SHOOT,
                          target_point.x - 0.1, target_point.y - 0.1,
                          0.2, 0.2,
                          "#00ff00" );
            char num[8];
            snprintf( num, 8, "%d", M_total_count );
            dlog.addMessage( Logger::SHOOT,
                             target_point, num, "#ffffff" );

            success = true;
#endif

#ifdef SEARCH_UNTIL_MAX_SPEED_AT_SAME_POINT
            if ( course.goalie_never_reach_
                 && course.opponent_never_reach_ )
            {
                return;
            }
            ++M_total_count;
#else
            return;
#endif
        }

        first_ball_speed += 0.3;
    }

#ifdef DEBUG_PRINT_FAILED_COURSE
    if ( success )
    {
        return;
    }

    dlog.addText( Logger::SHOOT,
                  "%d: xxx shoot target=(%.2f %.2f)"
                  " speed=%.3f angle=%.1f",
                  M_total_count,
                  target_point.x, target_point.y,
                  first_ball_speed,
                  ball_move_angle.degree() );
    dlog.addRect( Logger::SHOOT,
                  target_point.x - 0.1, target_point.y - 0.1,
                  0.2, 0.2,
                  "#ff0000" );
    char num[8];
    snprintf( num, 8, "%d", M_total_count );
    dlog.addMessage( Logger::SHOOT,
                     target_point, num, "#ffffff" );
#endif
}

/*-------------------------------------------------------------------*/
/*!

 */
bool
ShootGenerator::createShoot( const WorldModel & wm,
                             const Vector2D & target_point,
                             const double & first_ball_speed,
                             const rcsc::AngleDeg & ball_move_angle,
                             const double & ball_move_dist )
{
    const ServerParam & SP = ServerParam::i();

    const int ball_reach_step
        = static_cast< int >( std::ceil( calc_length_geom_series( first_ball_speed,
                                                                   ball_move_dist,
                                                                   SP.ballDecay() ) ) );
#ifdef DEBUG_PRINT
    dlog.addText( Logger::SHOOT,
                  "%d: target=(%.2f %.2f) speed=%.3f angle=%.1f"
                  " ball_reach_step=%d",
                  M_total_count,
                  target_point.x, target_point.y,
                  first_ball_speed,
                  ball_move_angle.degree(),
                  ball_reach_step );
#endif

    Course course( M_total_count,
                   target_point,
                   first_ball_speed,
                   ball_move_angle,
                   ball_move_dist,
                   ball_reach_step );

    if ( ball_reach_step <= 1 )
    {
        course.ball_reach_step_ = 1;
        M_courses.push_back( course );
#ifdef DEBUG_PRINT
        dlog.addText( Logger::SHOOT,
                      "%d: one step to the goal" );
#endif
        return true;
    }

    // estimate opponent interception

    const double opponent_x_thr = SP.theirPenaltyAreaLineX() - 30.0;
    const double opponent_y_thr = SP.penaltyAreaHalfWidth();

    for ( PlayerObject::Cont::const_iterator o = wm.opponentsFromSelf().begin(),
              end = wm.opponentsFromSelf().end();
          o != end;
          ++o )
    {
        if ( (*o)->isTackling() ) continue;
        if ( (*o)->pos().x < opponent_x_thr ) continue;
        if ( (*o)->pos().absY() > opponent_y_thr ) continue;

        // behind of shoot course
        if ( ( ball_move_angle - (*o)->angleFromSelf() ).abs() > 90.0 )
        {
            continue;
        }

        if ( (*o)->goalie() )
        {
            if ( maybeGoalieCatch( *o, course ) )
            {
#ifdef DEBUG_PRINT
                dlog.addText( Logger::SHOOT,
                              "%d: maybe goalie", M_total_count );
#endif
                return false;
            }

            continue;
        }

        //
        // check field player
        //

        if ( (*o)->posCount() > 10 ) continue;
        if ( (*o)->isGhost() && (*o)->posCount() > 5 ) continue;

        if ( opponentCanReach( *o, course ) )
        {
#ifdef DEBUG_PRINT
                dlog.addText( Logger::SHOOT,
                              "%d: maybe opponent", M_total_count );
#endif
            return false;
        }
    }

    M_courses.push_back( course );
    return true;

}

/*-------------------------------------------------------------------*/
/*!

 */
bool
ShootGenerator::maybeGoalieCatch( const PlayerObject * goalie,
                                  Course & course )
{
    static const Rect2D penalty_area( Vector2D( ServerParam::i().theirPenaltyAreaLineX(),
                                                -ServerParam::i().penaltyAreaHalfWidth() ),
                                      Size2D( ServerParam::i().penaltyAreaLength(),
                                              ServerParam::i().penaltyAreaWidth() ) );
    static const double CONTROL_AREA_BUF = 0.15;  // buffer for kick table

    const ServerParam & SP = ServerParam::i();

    const PlayerType * ptype = goalie->playerTypePtr();

    const int min_cycle = FieldAnalyzer::estimate_min_reach_cycle( goalie->pos(),
                                                                   ptype->realSpeedMax(),
                                                                   M_first_ball_pos,
                                                                   course.ball_move_angle_ );
    if ( min_cycle < 0 )
    {
#ifdef DEBUG_PRINT
        dlog.addText( Logger::SHOOT,
                      "%d: (goalie) never reach" );
#endif
        return false;
    }

    const double goalie_speed = goalie->vel().r();
    const double seen_dist_noise = goalie->distFromSelf() * 0.02;

    const int max_cycle = course.ball_reach_step_;

#ifdef DEBUG_PRINT
    dlog.addText( Logger::SHOOT,
                  "%d: (goalie) minCycle=%d maxCycle=%d",
                  M_total_count,
                  min_cycle, max_cycle );
#endif

    for ( int cycle = min_cycle; cycle < max_cycle; ++cycle )
    {
        const Vector2D ball_pos = inertia_n_step_point( M_first_ball_pos,
                                                        course.first_ball_vel_,
                                                        cycle,
                                                        SP.ballDecay() );
        if ( ball_pos.x > SP.pitchHalfLength() )
        {
#ifdef DEBUG_PRINT
            dlog.addText( Logger::SHOOT,
                          "%d: (goalie) cycle=%d in the goal",
                          M_total_count, cycle );
#endif
            break;
        }

        const bool in_penalty_area = penalty_area.contains( ball_pos );

        const double control_area = ( in_penalty_area
                                      ? SP.catchableArea()
                                      : ptype->kickableArea() );

        Vector2D inertia_pos = goalie->inertiaPoint( cycle );
        double target_dist = inertia_pos.dist( ball_pos );

        if ( in_penalty_area )
        {
            target_dist -= seen_dist_noise;
        }

        if ( target_dist - control_area - CONTROL_AREA_BUF < 0.001 )
        {
#ifdef DEBUG_PRINT
            dlog.addText( Logger::SHOOT,
                          "%d: xxx (goalie) can catch. cycle=%d ball_pos(%.2f %.2f)"
                          " dist_from_goalie=%.3f",
                          M_total_count,
                          cycle,
                          ball_pos.x, ball_pos.y,
                          target_dist );
#endif
            return true;
        }

        double dash_dist = target_dist;
        if ( cycle > 1 )
        {
            //dash_dist -= control_area * 0.6;
            //dash_dist *= 0.95;
            dash_dist -= control_area * 0.9;
            dash_dist *= 0.999;
        }

        int n_dash = ptype->cyclesToReachDistance( dash_dist );

        if ( n_dash > cycle + goalie->posCount() )
        {
#ifdef DEBUG_PRINT
            dlog.addText( Logger::SHOOT,
                          "%d: (goalie) cycle=%d dash_dist=%.3f n_dash=%d posCount=%d",
                          M_total_count,
                          cycle,
                          dash_dist,
                          n_dash, goalie->posCount() );
#endif
            continue;
        }

        int n_turn = ( goalie->bodyCount() > 1
                       ? 0
                       : FieldAnalyzer::predict_player_turn_cycle( ptype,
                                                                   goalie->body(),
                                                                   goalie_speed,
                                                                   target_dist,
                                                                   ( ball_pos - inertia_pos ).th(),
                                                                   control_area + 0.1,
                                                                   true ) );
        int n_step = ( n_turn == 0
                       ? n_turn + n_dash
                       : n_turn + n_dash + 1 );

        int bonus_step = ( in_penalty_area
                           ? bound( 0, goalie->posCount(), 5 )
                           : bound( 0, goalie->posCount() - 1, 1 ) );
        if ( ! in_penalty_area )
        {
            bonus_step -= 1;
        }

        if ( n_step <= cycle + bonus_step )
        {
#ifdef DEBUG_PRINT
            dlog.addText( Logger::SHOOT,
                          "%d: xxx (goalie) can catch. cycle=%d ball_pos(%.1f %.1f)"
                          " goalie target_dist=%.3f(noise=%.3f dash=%.3f ctrl=%.3f) step=%d(t:%d,d%d) bonus=%d",
                          M_total_count,
                          cycle,
                          ball_pos.x, ball_pos.y,
                          target_dist, seen_dist_noise, dash_dist, control_area,
                          n_step, n_turn, n_dash, bonus_step );
#endif
            return true;
        }

#ifdef DEBUG_PRINT
        dlog.addText( Logger::SHOOT,
                      "%d: (goalie) cycle=%d ball_pos(%.1f %.1f)"
                      " goalieStep=%d(t:%d,d%d) bonus=%d",
                      M_total_count,
                      cycle,
                      ball_pos.x, ball_pos.y,
                      n_step, n_turn, n_dash, bonus_step );
#endif

        if ( in_penalty_area
             && n_step <= cycle + goalie->posCount() + 1 )
        {
            course.goalie_never_reach_ = false;

#ifdef DEBUG_PRINT
            dlog.addText( Logger::SHOOT,
                          "%d: (goalie) may be reach",
                          M_total_count );
#endif
        }
    }

    return false;
}


/*-------------------------------------------------------------------*/
/*!

 */
bool
ShootGenerator::opponentCanReach( const PlayerObject * opponent,
                                  Course & course )
{
    const ServerParam & SP = ServerParam::i();

    const PlayerType * ptype = opponent->playerTypePtr();
    const double control_area = ptype->kickableArea();

    const int min_cycle = FieldAnalyzer::estimate_min_reach_cycle( opponent->pos(),
                                                                   ptype->realSpeedMax(),
                                                                   M_first_ball_pos,
                                                                   course.ball_move_angle_ );
    if ( min_cycle < 0 )
    {
// #ifdef DEBUG_PRINT
//         dlog.addText( Logger::SHOOT,
//                       "%d: (opponent) [%d](%.2f %.2f) never reach",
//                       M_total_count,
//                       opponent->unum(),
//                       opponent->pos().x, opponent->pos().y );
// #endif
        return false;
    }

    const double opponent_speed = opponent->vel().r();
    const int max_cycle = course.ball_reach_step_;

    bool maybe_reach = false;
    int nearest_step_diff = 1000;
#ifdef DEBUG_PRINT
    int nearest_cycle = 1000;
#endif

    for ( int cycle = min_cycle; cycle < max_cycle; ++cycle )
    {
        Vector2D ball_pos = inertia_n_step_point( M_first_ball_pos,
                                                  course.first_ball_vel_,
                                                  cycle,
                                                  SP.ballDecay() );

        Vector2D inertia_pos = opponent->inertiaPoint( cycle );
        double target_dist = inertia_pos.dist( ball_pos );

        if ( target_dist - control_area < 0.001 )
        {
#ifdef DEBUG_PRINT
            dlog.addText( Logger::SHOOT,
                          "%d: (opponent) [%d] inertiaPos=(%.2f %.2f) can kick without dash",
                          M_total_count,
                          opponent->unum(),
                          inertia_pos.x, inertia_pos.y );
#endif
            return true;
        }

        double dash_dist = target_dist;
        if ( cycle > 1 )
        {
            dash_dist -= control_area*0.8;
        }

        int n_dash = ptype->cyclesToReachDistance( dash_dist );

        if ( n_dash > cycle + opponent->posCount() )
        {
            continue;
        }

        int n_turn = ( opponent->bodyCount() > 0
                       ? 1
                       : FieldAnalyzer::predict_player_turn_cycle( ptype,
                                                                   opponent->body(),
                                                                   opponent_speed,
                                                                   target_dist,
                                                                   ( ball_pos - inertia_pos ).th(),
                                                                   control_area,
                                                                   true ) );
        int n_step = ( n_turn == 0
                       ? n_turn + n_dash
                       : n_turn + n_dash + 1 );

        //int bonus_step = bound( 0, opponent->posCount() - 1, 1 );
        int bonus_step = bound( 0, opponent->posCount(), 1 );
        int penalty_step = -1; //-3;

        if ( opponent->isTackling() )
        {
            penalty_step -= 5;
        }

        if ( n_step <= cycle + bonus_step + penalty_step )
        {
#ifdef DEBUG_PRINT
            dlog.addText( Logger::SHOOT,
                          "%d: xxx (opponent) can reach. cycle=%d ball_pos(%.1f %.1f)"
                          " oppStep=%d(t:%d,d%d) bonus=%d",
                          M_total_count,
                          cycle,
                          ball_pos.x, ball_pos.y,
                          n_step, n_turn, n_dash, bonus_step );
#endif
            return true;
        }

        if ( n_step <= cycle + opponent->posCount() + 1 )
        {
            maybe_reach = true;
            int diff = cycle + opponent->posCount() - n_step;
            if ( diff < nearest_step_diff )
            {
#ifdef DEBUG_PRINT
                nearest_cycle = cycle;
#endif
                nearest_step_diff = diff;
            }
        }
    }

    if ( maybe_reach )
    {
#ifdef DEBUG_PRINT
        dlog.addText( Logger::SHOOT,
                      "%d: (opponent) maybe reach. nearest_step=%d diff=%d",
                      M_total_count,
                      nearest_cycle, nearest_step_diff );
#endif
        course.opponent_never_reach_ = false;
    }

    return false;
}

/*-------------------------------------------------------------------*/
/*!

 */
void
ShootGenerator::evaluateCourses( const WorldModel & wm )
{
    const double y_dist_thr2 = std::pow( 8.0, 2 );

    const ServerParam & SP = ServerParam::i();
    const AbstractPlayerObject * goalie = wm.getTheirGoalie();
    const AngleDeg goalie_angle = ( goalie
                                    ? ( goalie->pos() - M_first_ball_pos ).th()
                                    : 180.0 );

    const Container::iterator end = M_courses.end();
    for ( Container::iterator it = M_courses.begin();
          it != end;
          ++it )
    {
        double score = 1.0;

        if ( it->kick_step_ == 1 )
        {
            score += 50.0;
        }

        if ( it->goalie_never_reach_ )
        {
            score += 100.0;
        }

        if ( it->opponent_never_reach_ )
        {
            score += 100.0;
        }

        double goalie_rate = 1.0;
        if ( goalie )
        {
#if 1
            double variance2 = ( it->goalie_never_reach_
                                 ? 1.0 // 1.0*1.0
                                 : std::pow( 10.0, 2 ) );
            double angle_diff = ( it->ball_move_angle_ - goalie_angle ).abs();
            goalie_rate = 1.0 - std::exp( - std::pow( angle_diff, 2 )
                                          / ( 2.0 * variance2 ) );
#else
            double angle_diff = ( it->ball_move_angle_ - goalie_angle ).abs();
            goalie_rate = 1.0 - std::exp( - std::pow( angle_diff * 0.1, 2 )
                                          // / ( 2.0 * 90.0 * 0.1 ) );
                                          // / ( 2.0 * 40.0 * 0.1 ) ); // 2009-07
                                              // / ( 2.0 * 90.0 * 0.1 ) ); // 2009-12-13
                                          / ( 2.0 * 20.0 * 0.1 ) ); // 2010-06-09
#endif
        }

        double y_rate = 1.0;
        if ( it->target_point_.dist2( M_first_ball_pos ) > y_dist_thr2 )
        {
            double y_dist = std::max( 0.0, it->target_point_.absY() - 4.0 );
            y_rate = std::exp( - std::pow( y_dist, 2.0 )
                               / ( 2.0 * std::pow( SP.goalHalfWidth() - 1.5, 2 ) ) );
        }

#ifdef DEBUG_PRINT_EVALUATE
        dlog.addText( Logger::SHOOT,
                      "(shoot eval) %d: score=%f(%f) pos(%.2f %.2f) speed=%.3f goalie_rate=%f y_rate=%f",
                      it->index_,
                      score * goalie_rate * y_rate, score,
                      it->target_point_.x, it->target_point_.y,
                      it->first_ball_speed_,
                      goalie_rate,
                      y_rate );
#endif
        score *= goalie_rate;
        score *= y_rate;
        it->score_ = score;
    }
}

```

---

## 7. /src/player/planner/short_dribble_generator.cpp

```cpp
// -*-c++-*-

/*!
  \file short_dribble_generator.cpp
  \brief short step dribble course generator Source File
*/

/*
 *Copyright:

 Copyright (C) Hidehisa AKIYAMA

 This code is free software; you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation; either version 3, or (at your option)
 any later version.

 This code is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this code; see the file COPYING.  If not, write to
 the Free Software Foundation, 675 Mass Ave, Cambridge, MA 02139, USA.

 *EndCopyright:
 */

/////////////////////////////////////////////////////////////////////

#ifdef HAVE_CONFIG_H
#include <config.h>
#endif

#include "short_dribble_generator.h"

#include "dribble.h"
#include "field_analyzer.h"

#include <rcsc/player/world_model.h>
#include <rcsc/player/intercept_table.h>
#include <rcsc/common/server_param.h>
#include <rcsc/common/logger.h>
#include <rcsc/geom/circle_2d.h>
#include <rcsc/geom/segment_2d.h>
#include <rcsc/timer.h>

#include <algorithm>
#include <limits>

#include <cmath>

#define DEBUG_PROFILE
// #define DEBUG_PRINT
// #define DEBUG_PRINT_SIMULATE_DASHES
// #define DEBUG_PRINT_OPPONENT

// #define DEBUG_PRINT_SUCCESS_COURSE
// #define DEBUG_PRINT_FAILED_COURSE

using namespace rcsc;

namespace {

inline
void
debug_paint_failed( const int count,
                    const Vector2D & receive_point )
{
    dlog.addCircle( Logger::DRIBBLE,
                    receive_point.x, receive_point.y, 0.1,
                    "#ff0000" );
    char num[8];
    snprintf( num, 8, "%d", count );
    dlog.addMessage( Logger::DRIBBLE,
                     receive_point, num );
}

}

/*-------------------------------------------------------------------*/
/*!

 */
ShortDribbleGenerator::ShortDribbleGenerator()
    : M_queued_action_time( 0, 0 )
{
    M_courses.reserve( 128 );

    clear();
}

/*-------------------------------------------------------------------*/
/*!

 */
ShortDribbleGenerator &
ShortDribbleGenerator::instance()
{
    static ShortDribbleGenerator s_instance;
    return s_instance;
}

/*-------------------------------------------------------------------*/
/*!

 */
void
ShortDribbleGenerator::clear()
{
    M_total_count = 0;
    M_first_ball_pos = Vector2D::INVALIDATED;
    M_first_ball_vel.assign( 0.0, 0.0 );
    M_courses.clear();
}

/*-------------------------------------------------------------------*/
/*!

 */
void
ShortDribbleGenerator::generate( const WorldModel & wm )
{
    if ( M_update_time == wm.time() )
    {
        return;
    }
    M_update_time = wm.time();

    clear();

    if ( wm.gameMode().type() != GameMode::PlayOn
         && ! wm.gameMode().isPenaltyKickMode() )
    {
        return;
    }

    //
    // check queued action
    //

    if ( M_queued_action_time != wm.time() )
    {
        M_queued_action.reset();
    }
    else
    {
        M_courses.push_back( M_queued_action );
    }

    //
    // updater ball holder
    //
    if ( wm.self().isKickable()
         && ! wm.self().isFrozen() )
    {
        M_first_ball_pos = wm.ball().pos();
        M_first_ball_vel = wm.ball().vel();
    }
    // else if ( ! wm.existKickableTeammate()
    //           && ! wm.existKickableOpponent()
    //           && wm.interceptTable()->selfReachCycle() <= 1 )
    // {
    //     M_first_ball_pos = wm.ball().pos() + wm.ball()vel();
    //     M_first_ball_vel = wm.ball().vel() + ServerParam::i().ballDecay();
    // }
    else
    {
        return;
    }

#ifdef DEBUG_PROFILE
    Timer timer;
#endif

    createCourses( wm );

    std::sort( M_courses.begin(), M_courses.end(),
               CooperativeAction::DistCompare( ServerParam::i().theirTeamGoalPos() ) );

#ifdef DEBUG_PROFILE
    dlog.addText( Logger::DRIBBLE,
                  __FILE__": (generate) PROFILE size=%d/%d elapsed %.3f [ms]",
                  (int)M_courses.size(),
                  M_total_count,
                  timer.elapsedReal() );
#endif
}

/*-------------------------------------------------------------------*/
/*!

 */
void
ShortDribbleGenerator::setQueuedAction( const rcsc::WorldModel & wm,
                                        CooperativeAction::Ptr action )
{
    M_queued_action_time = wm.time();
    M_queued_action = action;
}

/*-------------------------------------------------------------------*/
/*!

 */
void
ShortDribbleGenerator::createCourses( const WorldModel & wm )
{
    static const int angle_div = 16;
    static const double angle_step = 360.0 / angle_div;

    const ServerParam & SP = ServerParam::i();

    const PlayerType & ptype = wm.self().playerType();

    const double my_first_speed = wm.self().vel().r();

    //
    // angle loop
    //

    for ( int a = 0; a < angle_div; ++a )
    {
        AngleDeg dash_angle = wm.self().body() + ( angle_step * a );

        //
        // angle filter
        //

        if ( wm.self().pos().x < 16.0
             && dash_angle.abs() > 100.0 )
        {
#ifdef DEBUG_PRINT
            dlog.addText( Logger::DRIBBLE,
                          __FILE__": (createTargetPoints) canceled(1) dash_angle=%.1f",
                          dash_angle.degree() );
#endif
            continue;
        }

        if ( wm.self().pos().x < -36.0
             && wm.self().pos().absY() < 20.0
             && dash_angle.abs() > 45.0 )
        {
#ifdef DEBUG_PRINT
            dlog.addText( Logger::DRIBBLE,
                          __FILE__": (createTargetPoints) canceled(2) dash_angle=%.1f",
                          dash_angle.degree() );
#endif
            continue;
        }

        int n_turn = 0;

        double my_speed = my_first_speed * ptype.playerDecay(); // first action is kick
        double dir_diff = AngleDeg( angle_step * a ).abs();

        while ( dir_diff > 10.0 )
        {
            dir_diff -= ptype.effectiveTurn( SP.maxMoment(), my_speed );
            if ( dir_diff < 0.0 ) dir_diff = 0.0;
            my_speed *= ptype.playerDecay();
            ++n_turn;
        }

        if ( n_turn >= 3 )
        {
#ifdef DEBUG_PRINT
            dlog.addText( Logger::DRIBBLE,
                          __FILE__": (createTargetPoints) canceled dash_angle=%.1f n_turn=%d",
                          dash_angle.degree(), n_turn );
#endif
            continue;
        }

#if 0
        if ( a == 0 )
        {
            //
            // simulate only dashes (no kick, no turn)
            //
            simulateDashes( wm );
        }
#endif

        if ( angle_step * a < 180.0 )
        {
            dash_angle -= dir_diff;
        }
        else
        {
            dash_angle += dir_diff;
        }

        simulateKickTurnsDashes( wm, dash_angle, n_turn );
    }
}

/*-------------------------------------------------------------------*/
/*!

 */
void
ShortDribbleGenerator::simulateDashes( const WorldModel & wm )
{
    const int opponent_reach_step = wm.interceptTable().opponentStep();
    if ( opponent_reach_step <= 1 )
    {
#ifdef DEBUG_PRINT_SIMULATE_DASHES
        dlog.addText( Logger::DRIBBLE,
                      __FILE__": (simulateDashes) exist reachable opponent" );
#endif
        return;
    }

    const ServerParam & SP = ServerParam::i();

    const double max_x = SP.pitchHalfLength() - 0.5;
    const double max_y = SP.pitchHalfWidth() - 0.5;

    const PlayerType & ptype = wm.self().playerType();
    const double kickable_area = ptype.kickableArea();

    const AngleDeg dash_angle = wm.self().body();

    const Vector2D first_self_pos = wm.self().pos();
    const Vector2D first_ball_pos = wm.ball().pos();

    const Vector2D unit_accel = Vector2D::polar2vector( 1.0, dash_angle );

    Vector2D self_pos = first_self_pos;
    Vector2D self_vel = wm.self().vel();
    StaminaModel stamina = wm.self().staminaModel();

    Vector2D ball_pos = first_ball_pos;
    Vector2D ball_vel = wm.ball().vel();

    for ( int n_dash = 1; n_dash <= 20; ++n_dash )
    {
        if ( opponent_reach_step <= n_dash )
        {
#ifdef DEBUG_PRINT_SIMULATE_DASHES
            dlog.addText( Logger::DRIBBLE,
                          "(simulateDashes) NG n_dash=%d <= opponent_reach_step=%d",
                          n_dash, opponent_reach_step );
#endif
            break;
        }

        ball_pos += ball_vel;

        if ( ball_pos.absX() > max_x
             || ball_pos.absY() > max_y )
        {
#ifdef DEBUG_PRINT_SIMULATE_DASHES
            dlog.addText( Logger::DRIBBLE,
                          "(simulateDashes) NG n_dash=%d ball_pos(%.2f %.2f) out of pitch",
                          n_dash,
                          ball_pos.x, ball_pos.y );
#endif
            break;
        }

        self_pos += self_vel;

        Vector2D ball_rel = ball_pos - self_pos;
        ball_rel.rotate( -dash_angle );

        if ( ball_rel.x < -kickable_area )
        {
#ifdef DEBUG_PRINT_SIMULATE_DASHES
            dlog.addText( Logger::DRIBBLE,
                          "(simulateDashes) NG n_dash=%d. ball_rel(%.2f %.2f) ball is back",
                          n_dash,
                          ball_rel.x, ball_rel.y );
#endif
            break;
        }

        if ( ball_rel.absY() > kickable_area )
        {
#ifdef DEBUG_PRINT_SIMULATE_DASHES
            dlog.addText( Logger::DRIBBLE,
                          "(simulateDashes) NG n_dash=%d. ball_rel(%.2f %.2f) y > kickable=%.3f",
                          n_dash,
                          ball_rel.x, ball_rel.y,
                          kickable_area );
#endif
            break;
        }

        //
        // check kickable area
        //

        double self_noise = std::min( 0.1, first_self_pos.dist( self_pos ) * SP.playerRand() );
        double ball_noise = std::min( 0.1, first_ball_pos.dist( ball_pos ) * SP.ballRand() );

        double dash_power = stamina.getSafetyDashPower( ptype,
                                                        SP.maxDashPower() );
        double max_accel_len = dash_power * ptype.dashPowerRate() * stamina.effort();

        if ( ball_rel.r2()
             > std::pow( max_accel_len + kickable_area - self_noise - ball_noise - 0.15, 2 ) )
        {
            // never kickable
#ifdef DEBUG_PRINT_SIMULATE_DASHES
            dlog.addText( Logger::DRIBBLE,
                          "(simulateDashes) NG n_dash=%d. ball_rel(%.2f %.2f) dist=%.3f never kickable",
                          n_dash,
                          ball_rel.x, ball_rel.y,
                          ball_rel.r() );
#endif
            break;
        }

        Vector2D max_dash_accel = unit_accel * max_accel_len;
        Segment2D accel_segment( self_pos, self_pos + max_dash_accel );

        if ( accel_segment.dist( ball_pos )
             > kickable_area - self_noise - ball_noise - 0.15 )
        {
            // never kickable
#ifdef DEBUG_PRINT_SIMULATE_DASHES
            dlog.addText( Logger::DRIBBLE,
                          "(simulateDashes) NG n_dash=%d. ball_rel(%.2f %.2f) segment_dist=%.3f never kickable",
                          n_dash,
                          ball_rel.x, ball_rel.y,
                          accel_segment.dist( ball_pos ) );
#endif
            break;
        }

        //
        // simulate next dash
        //

#ifdef DEBUG_PRINT_SIMULATE_DASHES
        dlog.addText( Logger::DRIBBLE,
                      "(simulateDashes) n_dash=%d. self=(%.2f %.2f) ball=(%.2f %.2f)",
                      n_dash,
                      self_pos.x, self_pos.y,
                      ball_pos.x, ball_pos.y );
#endif

        double dash_accel_len = -1.0;
        const double min_accel_len = std::min( 0.3, max_accel_len - 0.001 );
        for ( double len = max_accel_len; len > min_accel_len; len -= 0.05 )
        {
            Vector2D tmp_accel = unit_accel * len;
            Vector2D tmp_self_pos = self_pos + tmp_accel;

            double ball_dist = tmp_self_pos.dist( ball_pos );

#ifdef DEBUG_PRINT_SIMULATE_DASHES
            dlog.addText( Logger::DRIBBLE,
                          "____ test: accel=%.3f self=(%.2f %.2f) bdist=%.3f kickable=%.3f(%.3f s%.3f b%.3f) col=%.3f",
                          len,
                          tmp_self_pos.x, tmp_self_pos.y,
                          ball_dist,
                          kickable_area - self_noise - ball_noise - 0.15,
                          kickable_area, self_noise, ball_noise,
                          ptype.playerSize() + SP.ballSize() + 0.2 - 0.1*n_dash );
#endif

            if ( ball_dist < kickable_area - self_noise - ball_noise - 0.15
                 && ball_dist > ptype.playerSize() + SP.ballSize() + 0.2 - 0.1*n_dash )
            {
                dash_accel_len = len;
                break;
            }
        }

        if ( dash_accel_len < 0.0 )
        {
#ifdef DEBUG_PRINT_SIMULATE_DASHES
            dlog.addText( Logger::DRIBBLE,
                          "(simulateDashes) NG n_dash=%d. not found",
                          n_dash );
#endif
            break;
        }

        double adjust_dash_power = dash_accel_len / ( ptype.dashPowerRate() * stamina.effort() );
        Vector2D adjust_dash_accel = unit_accel * dash_accel_len;
        self_pos += adjust_dash_accel; // add accel
        self_vel += adjust_dash_accel;
        self_vel *= ptype.playerDecay();
        stamina.simulateDash( ptype, adjust_dash_power );

        ball_vel *= SP.ballDecay();

        CooperativeAction::Ptr ptr( new Dribble( wm.self().unum(),
                                                 ball_pos,
                                                 wm.ball().vel().r(),
                                                 0, // n_kick
                                                 0, // n_turn
                                                 n_dash,
                                                 "nokickDribble" ) );
        ptr->setIndex( M_total_count );
        ptr->setFirstDashPower( adjust_dash_power );
        M_courses.push_back( ptr );

#ifdef DEBUG_PRINT_SIMULATE_DASHES
        dlog.addText( Logger::DRIBBLE,
                      "(simulateDashes) ok n_dash=%d register dash_power=%.2f accel=(%.2f %.2f)",
                      n_dash,
                      adjust_dash_power,
                      adjust_dash_accel.x, adjust_dash_accel.y );
#endif
    }
}

/*-------------------------------------------------------------------*/
/*!

 */
void
ShortDribbleGenerator::simulateKickTurnsDashes( const WorldModel & wm,
                                                const AngleDeg & dash_angle,
                                                const int n_turn )
{
    //static const int max_dash = 5;
    static const int max_dash = 4; // 2009-06-29
    static const int min_dash = 2;
    //static const int min_dash = 1;

    static std::vector< Vector2D > self_cache;

    //
    // create self position cache
    //
    createSelfCache( wm, dash_angle, n_turn, max_dash, self_cache );

    const ServerParam & SP = ServerParam::i();
    const PlayerType & ptype = wm.self().playerType();

    const Vector2D trap_rel
        = Vector2D::polar2vector( ptype.playerSize() + ptype.kickableMargin() * 0.2 + SP.ballSize(),
                                  dash_angle );

    const double max_x = ( SP.keepawayMode()
                           ? SP.keepawayLength() * 0.5 - 1.5
                           : SP.pitchHalfLength() - 1.0 );
    const double max_y = ( SP.keepawayMode()
                           ? SP.keepawayWidth() * 0.5 - 1.5
                           : SP.pitchHalfWidth() - 1.0 );

#ifdef DEBUG_PRINT
    dlog.addText( Logger::DRIBBLE,
                  __FILE__": (simulateKickTurnsDashes) dash_angle=%.1f n_turn=%d",
                  dash_angle.degree(), n_turn );
#endif

    for ( int n_dash = max_dash; n_dash >= min_dash; --n_dash )
    {
        const Vector2D ball_trap_pos = self_cache[n_turn + n_dash] + trap_rel;

        ++M_total_count;

#ifdef DEBUG_PRINT
        dlog.addText( Logger::DRIBBLE,
                      "%d: n_turn=%d n_dash=%d ball_trap=(%.3f %.3f)",
                      M_total_count,
                      n_turn, n_dash,
                      ball_trap_pos.x, ball_trap_pos.y );
#endif
        if ( ball_trap_pos.absX() > max_x
             || ball_trap_pos.absY() > max_y )
        {
#ifdef DEBUG_PRINT_FAILED_COURSE
            dlog.addText( Logger::DRIBBLE,
                          "%d: xxx out of pitch" );
            debug_paint_failed( M_total_count, ball_trap_pos );
#endif
            continue;
        }

        const double term
            = ( 1.0 - std::pow( SP.ballDecay(), 1 + n_turn + n_dash ) )
            / ( 1.0 - SP.ballDecay() );
        const Vector2D first_vel = ( ball_trap_pos - M_first_ball_pos ) / term;
        const Vector2D kick_accel = first_vel - M_first_ball_vel;
        const double kick_power = kick_accel.r() / wm.self().kickRate();

        if ( kick_power > SP.maxPower()
             || kick_accel.r2() > std::pow( SP.ballAccelMax(), 2 )
             || first_vel.r2() > std::pow( SP.ballSpeedMax(), 2 ) )
        {
#ifdef DEBUG_PRINT_FAILED_COURSE
            dlog.addText( Logger::DRIBBLE,
                          "%d: xxx cannot kick. first_vel=(%.1f %.1f, r=%.2f) accel=(%.1f %.1f)r=%.2f power=%.1f",
                          M_total_count,
                          first_vel.x, first_vel.y, first_vel.r(),
                          kick_accel.x, kick_accel.y, kick_accel.r(),
                          kick_power );
            debug_paint_failed( M_total_count, ball_trap_pos );
#endif
            continue;
        }

        if ( ( M_first_ball_pos + first_vel ).dist2( self_cache[0] )
             < std::pow( ptype.playerSize() + SP.ballSize() + 0.1, 2 ) )
        {
#ifdef DEBUG_PRINT_FAILED_COURSE
            dlog.addText( Logger::DRIBBLE,
                          "%d: xxx collision. first_vel=(%.1f %.1f, r=%.2f) accel=(%.1f %.1f)r=%.2f power=%.1f",
                          M_total_count,
                          first_vel.x, first_vel.y, first_vel.r(),
                          kick_accel.x, kick_accel.y, kick_accel.r(),
                          kick_power );
            debug_paint_failed( M_total_count, ball_trap_pos );
#endif
            continue;
        }

        if ( checkOpponent( wm, ball_trap_pos, 1 + n_turn + n_dash ) )
        {
            CooperativeAction::Ptr ptr( new Dribble( wm.self().unum(),
                                                     ball_trap_pos,
                                                     first_vel.r(),
                                                     1, // n_kick
                                                     n_turn,
                                                     n_dash,
                                                     "shortDribble" ) );
            ptr->setIndex( M_total_count );
            M_courses.push_back( ptr );

#ifdef DEBUG_PRINT_SUCCESS_COURSE
            dlog.addText( Logger::DRIBBLE,
                          "%d: ok trap_pos=(%.2f %.2f) first_vel=(%.1f %.1f, r=%.2f) n_turn=%d n_dash=%d",
                          M_total_count,
                          ball_trap_pos.x, ball_trap_pos.y,
                          first_vel.x, first_vel.y, first_vel.r(),
                          n_turn, n_dash );
            dlog.addCircle( Logger::DRIBBLE,
                            ball_trap_pos.x, ball_trap_pos.y, 0.1,
                            "#00ff00" );
            char num[8]; snprintf( num, 8, "%d", M_total_count );
            dlog.addMessage( Logger::DRIBBLE,
                             ball_trap_pos, num );
#endif
        }
    }
}

/*-------------------------------------------------------------------*/
/*!

 */
void
ShortDribbleGenerator::createSelfCache( const WorldModel & wm,
                                        const AngleDeg & dash_angle,
                                        const int n_turn,
                                        const int n_dash,
                                        std::vector< Vector2D > & self_cache )
{
    const ServerParam & SP = ServerParam::i();
    const PlayerType & ptype = wm.self().playerType();

    self_cache.clear();

    StaminaModel stamina_model = wm.self().staminaModel();

    Vector2D my_pos = wm.self().pos();
    Vector2D my_vel = wm.self().vel();

    my_pos += my_vel;
    my_vel *= ptype.playerDecay();

    self_cache.push_back( my_pos ); // first element is next cycle just after kick

    for ( int i = 0; i < n_turn; ++i )
    {
        my_pos += my_vel;
        my_vel *= ptype.playerDecay();
        self_cache.push_back( my_pos );
    }

    stamina_model.simulateWaits( ptype, 1 + n_turn );

    const Vector2D unit_vec = Vector2D::polar2vector( 1.0, dash_angle );

    for ( int i = 0; i < n_dash; ++i )
    {
        double available_stamina = std::max( 0.0,
                                             stamina_model.stamina() - SP.recoverDecThrValue() - 300.0 );
        double dash_power = std::min( available_stamina, SP.maxDashPower() );
        Vector2D dash_accel = unit_vec.setLengthVector( dash_power * ptype.dashPowerRate() * stamina_model.effort() );

        my_vel += dash_accel;
        my_pos += my_vel;
        my_vel *= ptype.playerDecay();

        stamina_model.simulateDash( ptype, dash_power );

        self_cache.push_back( my_pos );
    }

}

/*-------------------------------------------------------------------*/
/*!

 */
bool
ShortDribbleGenerator::checkOpponent( const WorldModel & wm,
                                      const Vector2D & ball_trap_pos,
                                      const int dribble_step )
{
    const ServerParam & SP = ServerParam::i();

    //const double control_area = SP.tackleDist() - 0.2;
    const AngleDeg ball_move_angle = ( ball_trap_pos - M_first_ball_pos ).th();

    for ( PlayerObject::Cont::const_iterator o = wm.opponentsFromSelf().begin(),
              end = wm.opponentsFromSelf().end();
          o != end;
          ++o )
    {
        if ( (*o)->distFromSelf() > 20.0 ) break;

        const PlayerType * ptype = (*o)->playerTypePtr();

        const double control_area = ( (*o)->goalie()
                                      && ball_trap_pos.x > SP.theirPenaltyAreaLineX()
                                      && ball_trap_pos.absY() < SP.penaltyAreaHalfWidth() )
            ? SP.catchableArea()
            : ptype->kickableArea();

        const Vector2D opp_pos = (*o)->inertiaPoint( dribble_step );

        const Vector2D ball_to_opp_rel = ( (*o)->pos() - M_first_ball_pos ).rotatedVector( -ball_move_angle );

        if ( ball_to_opp_rel.x < -4.0 )
        {
#ifdef DEBUG_PRINT_OPPONENT
            dlog.addText( Logger::DRIBBLE,
                          "%d: opponent[%d](%.2f %.2f) relx=%.2f",
                          M_total_count,
                          (*o)->unum(),
                          (*o)->pos().x, (*o)->pos().y,
                          ball_to_opp_rel.x );
#endif
            continue;
        }


        double target_dist = opp_pos.dist( ball_trap_pos );

        if ( target_dist - control_area < 0.001 )
        {
#ifdef DEBUG_PRINT_FAILED_COURSE
            dlog.addText( Logger::DRIBBLE,
                          "%d: xxx opponent %d(%.1f %.1f) kickable.",
                          M_total_count,
                          (*o)->unum(),
                          (*o)->pos().x, (*o)->pos().y );
            debug_paint_failed( M_total_count, ball_trap_pos );
#endif
            return false;
        }

        //
        // dash
        //

        double dash_dist = target_dist;
        dash_dist -= control_area * 0.5;
        dash_dist -= 0.2;

        int n_dash = ptype->cyclesToReachDistance( dash_dist );

        //
        // turn
        //

        int n_turn = ( (*o)->bodyCount() > 1
                       ? 1
                       : FieldAnalyzer::predict_player_turn_cycle( ptype,
                                                                   (*o)->body(),
                                                                   (*o)->vel().r(),
                                                                   target_dist,
                                                                   ( ball_trap_pos - opp_pos ).th(),
                                                                   control_area,
                                                                   true ) );


        int n_step = ( n_turn == 0
                       ? n_turn + n_dash
                       : n_turn + n_dash + 1 );

        int bonus_step = 0;

        if ( ball_trap_pos.x < 30.0 )
        {
            bonus_step += 1;
        }

        if ( ball_trap_pos.x < 0.0 )
        {
            bonus_step += 1;
        }

        if ( (*o)->isTackling() )
        {
            bonus_step = -5;
        }

        if ( ball_to_opp_rel.x > 0.5 )
        {
            bonus_step += bound( 0, (*o)->posCount(), 8 );
        }
        else
        {
            bonus_step += bound( 0, (*o)->posCount(), 4 );
        }

        if ( n_step - bonus_step <= dribble_step )
        {
#ifdef DEBUG_PRINT_FAILED_COURSE
            dlog.addText( Logger::DRIBBLE,
                          "%d: xxx opponent %d(%.1f %.1f) can reach."
                          " myStep=%d oppStep=%d(t:%d,d:%d) bonus=%d",
                          M_total_count,
                          (*o)->unum(),
                          (*o)->pos().x, (*o)->pos().y,
                          dribble_step,
                          n_step,
                          n_turn,
                          n_dash,
                          bonus_step );
            debug_paint_failed( M_total_count, ball_trap_pos );
#endif
            return false;
        }

#ifdef DEBUG_PRINT_OPPONENT
        dlog.addText( Logger::DRIBBLE,
                      "%d: (opponent) myStep=%d opponent[%d](%.1f %.1f)"
                      " dashDist=%.2f oppStep=%d(t:%d,d:%d) bonus=%d",
                      M_total_count,
                      dribble_step,
                      (*o)->unum(),
                      (*o)->pos().x, (*o)->pos().y,
                      dash_dist,
                      n_step,
                      n_turn,
                      n_dash,
                      bonus_step );
#endif
    }

    return true;
}

```

---

## 8. /src/player/planner/cross_generator.cpp

```cpp
// -*-c++-*-

/*!
  \file cross_generator.cpp
  \brief cross pass generator Source File
*/

/*
 *Copyright:

 Copyright (C) Hidehisa AKIYAMA

 This code is free software; you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation; either version 3, or (at your option)
 any later version.

 This code is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this code; see the file COPYING.  If not, write to
 the Free Software Foundation, 675 Mass Ave, Cambridge, MA 02139, USA.

 *EndCopyright:
 */

/////////////////////////////////////////////////////////////////////

#ifdef HAVE_CONFIG_H
#include <config.h>
#endif

#include "cross_generator.h"

#include "field_analyzer.h"

#include <rcsc/player/world_model.h>
#include <rcsc/player/intercept_table.h>
#include <rcsc/common/server_param.h>
#include <rcsc/common/logger.h>
#include <rcsc/geom/rect_2d.h>
#include <rcsc/soccer_math.h>
#include <rcsc/timer.h>

#define USE_ONLY_MAX_ANGLE_WIDTH

#define DEBUG_PROFILE
// #define DEBUG_PRINT
// #define DEBUG_PRINT_SUCCESS_COURSE
// #define DEBUG_PRINT_FAILED_COURSE

using namespace rcsc;

namespace {

inline
void
debug_paint_failed( const int count,
                    const Vector2D & receive_point )
{
    dlog.addRect( Logger::CROSS,
                  receive_point.x - 0.1, receive_point.y - 0.1,
                  0.2, 0.2,
                  "#ff0000" );
    char num[8];
    snprintf( num, 8, "%d", count );
    dlog.addMessage( Logger::CROSS,
                     receive_point, num );
}

}

/*-------------------------------------------------------------------*/
/*!

 */
CrossGenerator::CrossGenerator()
{
    M_courses.reserve( 1024 );

    clear();
}

/*-------------------------------------------------------------------*/
/*!

 */
CrossGenerator &
CrossGenerator::instance()
{
    static CrossGenerator s_instance;
    return s_instance;
}

/*-------------------------------------------------------------------*/
/*!

 */
void
CrossGenerator::clear()
{
    M_total_count = 0;
    M_passer = static_cast< const AbstractPlayerObject * >( 0 );
    M_first_point.invalidate();
    M_receiver_candidates.clear();
    M_opponents.clear();
    M_courses.clear();
}

/*-------------------------------------------------------------------*/
/*!

 */
void
CrossGenerator::generate( const WorldModel & wm )
{
    static GameTime s_update_time( -1, 0 );
    if ( s_update_time == wm.time() )
    {
        return;
    }
    s_update_time = wm.time();

    clear();

    if ( wm.time().stopped() > 0
         || wm.gameMode().isPenaltyKickMode() )
    {
        return;
    }

#ifdef DEBUG_PROFILE
    Timer timer;
#endif

    updatePasser( wm );

    if ( ! M_passer
         || ! M_first_point.isValid() )
    {
        dlog.addText( Logger::CROSS,
                      __FILE__" (generate) passer not found." );
        return;
    }

    if ( ServerParam::i().theirTeamGoalPos().dist( M_first_point ) > 35.0 )
    {
        dlog.addText( Logger::CROSS,
                      __FILE__" (generate) first point(%.1f %.1f) is too far from the goal.",
                      M_first_point.x, M_first_point.y );
        return;
    }

    updateReceivers( wm );

    if ( M_receiver_candidates.empty() )
    {
        dlog.addText( Logger::CROSS,
                      __FILE__" (generate) no receiver." );
        return;
    }

    updateOpponents( wm );

    createCourses( wm );

#ifdef DEBUG_PROFILE
    dlog.addText( Logger::CROSS,
                  __FILE__" (generate) PROFILE course_size=%d/%d elapsed %f [ms]",
                  (int)M_courses.size(),
                  M_total_count,
                  timer.elapsedReal() );
#endif
}

/*-------------------------------------------------------------------*/
/*!

 */
void
CrossGenerator::updatePasser( const WorldModel & wm )
{
    if ( wm.self().isKickable()
         && ! wm.self().isFrozen() )
    {
        M_passer = &wm.self();
        M_first_point = wm.ball().pos();
#ifdef DEBUG_UPDATE_PASSER
        dlog.addText( Logger::CROSS,
                      __FILE__" (updatePasser) self kickable." );
#endif
        return;
    }

    int s_min = wm.interceptTable().selfStep();
    int t_min = wm.interceptTable().teammateStep();
    int o_min = wm.interceptTable().opponentStep();

    int our_min = std::min( s_min, t_min );
    if ( o_min < std::min( our_min - 4, (int)rint( our_min * 0.9 ) ) )
    {
#ifdef DEBUG_UPDATE_PASSER
        dlog.addText( Logger::CROSS,
                      __FILE__" (updatePasser) opponent ball." );
#endif
        return;
    }

    if ( s_min <= t_min )
    {
        if ( s_min <= 2 )
        {
            M_passer = &wm.self();
            M_first_point = wm.ball().inertiaPoint( s_min );
        }
    }
    else
    {
        if ( t_min <= 2 )
        {
            M_passer = wm.interceptTable().firstTeammate();
            M_first_point = wm.ball().inertiaPoint( t_min );
        }
    }

    if ( ! M_passer )
    {
#ifdef DEBUG_UPDATE_PASSER
        dlog.addText( Logger::CROSS,
                      __FILE__" (updatePasser) no passer." );
#endif
        return;
    }

    if ( M_passer->unum() != wm.self().unum() )
    {
        if ( M_first_point.dist2( wm.self().pos() ) > std::pow( 20.0, 2 ) )
        {
            M_passer = static_cast< const AbstractPlayerObject * >( 0 );
#ifdef DEBUG_UPDATE_PASSER
            dlog.addText( Logger::CROSS,
                          __FILE__" (updatePasser) passer is too far." );
#endif
            return;
        }
    }

#ifdef DEBUG_UPDATE_PASSER
    dlog.addText( Logger::CROSS,
                  __FILE__" (updatePasser) passer=%d(%.1f %.1f) reachStep=%d startPos=(%.1f %.1f)",
                  M_passer->unum(),
                  M_passer->pos().x, M_passer->pos().y,
                  t_min,
                  M_first_point.x, M_first_point.y );
#endif
}

/*-------------------------------------------------------------------*/
/*!

 */
void
CrossGenerator::updateReceivers( const WorldModel & wm )
{
    static const double shootable_dist2 = std::pow( 16.0, 2 ); // Magic Number
    static const double min_cross_dist2
        = std::pow( ServerParam::i().defaultKickableArea() * 2.2, 2 );
    static const double max_cross_dist2
        = std::pow( inertia_n_step_distance( ServerParam::i().ballSpeedMax(),
                                             9,
                                             ServerParam::i().ballDecay() ),
                    2 );

    const Vector2D goal = ServerParam::i().theirTeamGoalPos();

    const bool is_self_passer = ( M_passer->unum() == wm.self().unum() );

    for ( AbstractPlayerObject::Cont::const_iterator p = wm.ourPlayers().begin(),
              end = wm.ourPlayers().end();
          p != end;
          ++p )
    {
        if ( *p == M_passer ) continue;

        if ( is_self_passer )
        {
            if ( (*p)->isGhost() ) continue;
            if ( (*p)->posCount() >= 4 ) continue;
            if ( (*p)->pos().x > wm.offsideLineX() ) continue;
        }
        else
        {
            // ignore other players
            if ( (*p)->unum() != wm.self().unum() )
            {
                continue;
            }
        }

        if ( (*p)->pos().dist2( goal ) > shootable_dist2 ) continue;

        double d2 = (*p)->pos().dist2( M_first_point );
        if ( d2 < min_cross_dist2 ) continue;
        if ( max_cross_dist2 < d2 ) continue;

        M_receiver_candidates.push_back( *p );

#ifdef DEBUG_UPDATE_OPPONENT
        dlog.addText( Logger::CROSS,
                      "Cross receiver %d pos(%.1f %.1f)",
                      (*p)->unum(),
                      (*p)->pos().x, (*p)->pos().y );
#endif
    }
}

/*-------------------------------------------------------------------*/
/*!

 */
void
CrossGenerator::updateOpponents( const WorldModel & wm )
{
    const double opponent_dist_thr2 = std::pow( 20.0, 2 );

    const Vector2D goal = ServerParam::i().theirTeamGoalPos();
    const AngleDeg goal_angle_from_ball = ( goal - M_first_point ).th();

    for ( AbstractPlayerObject::Cont::const_iterator p = wm.theirPlayers().begin(),
              end = wm.theirPlayers().end();
          p != end;
          ++p )
    {
        AngleDeg opponent_angle_from_ball = ( (*p)->pos() - M_first_point ).th();
        if ( ( opponent_angle_from_ball - goal_angle_from_ball ).abs() > 90.0 )
        {
            continue;
        }

        if ( (*p)->pos().dist2( M_first_point ) > opponent_dist_thr2 )
        {
            continue;
        }

        M_opponents.push_back( *p );

#ifdef DEBUG_PRINT
        dlog.addText( Logger::PASS,
                      "Cross opponent %d pos(%.1f %.1f)",
                      (*p)->unum(),
                      (*p)->pos().x, (*p)->pos().y );
#endif
    }
}

/*-------------------------------------------------------------------*/
/*!

 */
void
CrossGenerator::createCourses( const WorldModel & wm )
{
    for ( AbstractPlayerObject::Cont::const_iterator p = M_receiver_candidates.begin();
          p != M_receiver_candidates.end();
          ++p )
    {
        createCross( wm, *p );
    }
}

/*-------------------------------------------------------------------*/
/*!

 */
void
CrossGenerator::createCross( const WorldModel & wm,
                             const AbstractPlayerObject * receiver )
{
    static const int MIN_RECEIVE_STEP = 2;
    static const int MAX_RECEIVE_STEP = 12; // Magic Number

    static const double MIN_RECEIVE_BALL_SPEED
        = ServerParam::i().defaultPlayerSpeedMax();
    // = std::max( ServerParam::i().defaultPlayerSpeedMax(),
    //             ServerParam::i().ballSpeedMax()
    //             * std::pow( ServerParam::i().ballDecay(), MAX_RECEIVE_STEP ) );
    // static const MAX_RECEIVE_BALL_SPEED
    //     = ServerParam::i().ballSpeedMax()
    //     * std::pow( ServerParam::i().ballDecay(), MIN_RECEIVE_STEP );

    static const double ANGLE_STEP = 3.0;
    static const double DIST_STEP = 0.9;

    const ServerParam & SP = ServerParam::i();

    const double min_first_ball_speed = SP.ballSpeedMax() * 0.67; // Magic Number
    const double max_first_ball_speed = ( wm.gameMode().type() == GameMode::PlayOn
                                          ? SP.ballSpeedMax()
                                          : wm.self().isKickable()
                                          ? wm.self().kickRate() * SP.maxPower()
                                          : SP.kickPowerRate() * SP.maxPower() );

    const PlayerType * ptype = receiver->playerTypePtr();
    const Vector2D receiver_pos = receiver->inertiaFinalPoint();
    const double receiver_dist = M_first_point.dist( receiver_pos );
    const AngleDeg receiver_angle_from_ball = ( receiver_pos - M_first_point ).th();

#ifdef USE_ONLY_MAX_ANGLE_WIDTH
    double max_angle_diff = -1.0;
    CooperativeAction::Ptr best_action;
#endif

    //
    // angle loop
    //
    for ( int a = -2; a < 3; ++a )
    {
        const AngleDeg cross_angle = receiver_angle_from_ball + ( ANGLE_STEP * a );

        //
        // distance loop
        //
        for ( int d = 0; d < 5; ++d )
        {
            const double sub_dist = DIST_STEP * d;
            const double ball_move_dist = receiver_dist - sub_dist;
            const Vector2D receive_point
                = M_first_point
                + Vector2D::from_polar( ball_move_dist, cross_angle );

#ifdef DEBUG_PRINT
            dlog.addText( Logger::CROSS,
                          "==== receiver=%d receivePos=(%.2f %.2f) loop=%d angle=%.1f",
                          receiver->unum(),
                          receive_point.x, receive_point.y,
                          a, cross_angle.degree() );
#endif

            if ( receive_point.x > SP.pitchHalfLength() - 0.5
                 || receive_point.absY() > SP.pitchHalfWidth() - 3.0 )
            {
#ifdef DEBUG_PRINT
                dlog.addText( Logger::CROSS,
                              "%d: xxx unum=%d (%.2f %.2f) outOfBounds",
                              M_total_count, receiver->unum(),
                              receive_point.x, receive_point.y );
                debug_paint_failed( M_total_count, receive_point );
#endif
                continue;
            }

            const int receiver_step = ptype->cyclesToReachDistance( sub_dist ) + 1;

            //
            // step loop
            //

            for ( int step = std::max( MIN_RECEIVE_STEP, receiver_step );
                  step <= MAX_RECEIVE_STEP;
                  ++step )
            {
                ++M_total_count;

                double first_ball_speed = calc_first_term_geom_series( ball_move_dist,
                                                                       SP.ballDecay(),
                                                                       step );
                if ( first_ball_speed < min_first_ball_speed )
                {
#ifdef DEBUG_PRINT_FAILED_COURSE
                    dlog.addText( Logger::CROSS,
                                  "%d: xxx unum=%d (%.1f %.1f) step=%d firstSpeed=%.3f < min=%.3f",
                                  M_total_count,
                                  receiver->unum(),
                                  receive_point.x, receive_point.y,
                                  step,
                                  first_ball_speed, min_first_ball_speed );
                    //debug_paint_failed( M_total_count, receive_point );
#endif
                    break;
                }

                if ( max_first_ball_speed < first_ball_speed )
                {
#ifdef DEBUG_PRINT_FAILED_COURSE
                    dlog.addText( Logger::CROSS,
                                  "%d: xxx unum=%d (%.1f %.1f) step=%d firstSpeed=%.3f > max=%.3f",
                                  M_total_count,
                                  receiver->unum(),
                                  receive_point.x, receive_point.y,
                                  step,
                                  first_ball_speed, max_first_ball_speed );
                    //debug_paint_failed( M_total_count, receive_point );
#endif
                    continue;
                }

                double receive_ball_speed = first_ball_speed * std::pow( SP.ballDecay(), step );
                if ( receive_ball_speed < MIN_RECEIVE_BALL_SPEED )
                {
#ifdef DEBUG_PRINT_FAILED_COURSE
                    dlog.addText( Logger::CROSS,
                                  "%d: xxx unum=%d (%.1f %.1f) step=%d recvSpeed=%.3f < min=%.3f",
                                  M_total_count,
                                  receiver->unum(),
                                  receive_point.x, receive_point.y,
                                  step,
                                  receive_ball_speed, min_first_ball_speed );
                    //debug_paint_failed( M_total_count, receive_point );
#endif
                    break;
                }


                int kick_count = FieldAnalyzer::predict_kick_count( wm,
                                                                    M_passer,
                                                                    first_ball_speed,
                                                                    cross_angle );

                if ( ! checkOpponent( M_first_point,
                                      receiver,
                                      receive_point,
                                      first_ball_speed,
                                      cross_angle,
                                      step + kick_count - 1 ) ) // 1 step penalty for observation delay
                {

                    break;
                }

#ifdef USE_ONLY_MAX_ANGLE_WIDTH
                double min_angle_diff = getMinimumAngleWidth( ball_move_dist, cross_angle );
                if ( min_angle_diff > max_angle_diff )
                {
                    CooperativeAction::Ptr ptr( new Pass( M_passer->unum(),
                                                          receiver->unum(),
                                                          receive_point,
                                                          first_ball_speed,
                                                          step + kick_count,
                                                          kick_count,
                                                          false,
                                                          "cross" ) );
                    ptr->setIndex( M_total_count );
                    max_angle_diff = min_angle_diff;
                    best_action = ptr;

                }
#else
                CooperativeAction::Ptr ptr( new Pass( M_passer->unum(),
                                                      receiver->unum(),
                                                      receive_point,
                                                      first_ball_speed,
                                                      step + kick_count,
                                                      kick_count,
                                                      false,
                                                      "cross" ) );
                ptr->setIndex( M_total_count );
                M_courses.push_back( ptr );
#endif
                // M_courses.push_back( ptr );
#ifdef DEBUG_PRINT_SUCCESS_COURSE
                dlog.addText( Logger::CROSS,
                              "%d: ok Cross step=%d pos=(%.1f %.1f) speed=%.3f->%.3f nKick=%d",
                              M_total_count,
                              step, kick_count,
                              receive_point.x, receive_point.y,
                              first_ball_speed, receive_ball_speed,
                              kick_count );
                char num[8];
                snprintf( num, 8, "%d", M_total_count );
                dlog.addMessage( Logger::CROSS,
                                 receive_point, num );
                dlog.addRect( Logger::CROSS,
                              receive_point.x - 0.1, receive_point.y - 0.1,
                              0.2, 0.2,
                              "#00ff00" );
#endif
                break;
            }
        }
    }

#ifdef USE_ONLY_MAX_ANGLE_WIDTH
    if ( best_action )
    {
        M_courses.push_back( best_action );
    }
#endif
}

/*-------------------------------------------------------------------*/
/*!

 */
bool
CrossGenerator::checkOpponent( const Vector2D & first_ball_pos,
                               const rcsc::AbstractPlayerObject * receiver,
                               const Vector2D & receive_pos,
                               const double & first_ball_speed,
                               const AngleDeg & ball_move_angle,
                               const int max_cycle )
{
    static const double CONTROL_AREA_BUF = 0.15;  // buffer for kick table

    const ServerParam & SP = ServerParam::i();

    const double receiver_dist = receiver->pos().dist( first_ball_pos );
    const Vector2D first_ball_vel
        = Vector2D( receive_pos - first_ball_pos ).setLength( first_ball_speed );

    for ( AbstractPlayerObject::Cont::const_iterator o = M_opponents.begin(),
              end = M_opponents.end();
          o != end;
          ++o )
    {
        const PlayerType * ptype = (*o)->playerTypePtr();
        const double control_area = ( (*o)->goalie()
                                      ? SP.catchableArea()
                                      : ptype->kickableArea() );

        const Vector2D opponent_pos = (*o)->inertiaFinalPoint();
        const int min_cycle = FieldAnalyzer::estimate_min_reach_cycle( opponent_pos,
                                                                       ptype->realSpeedMax(),
                                                                       first_ball_pos,
                                                                       ball_move_angle );


        if ( opponent_pos.dist( first_ball_pos ) > receiver_dist + 1.0 )
        {
#ifdef DEBUG_PRINT
            dlog.addText( Logger::CROSS,
                          "__ opponent[%d](%.2f %.2f) skip. distance over",
                          (*o)->unum(),
                          opponent_pos.x, opponent_pos.y );
#endif
            continue;
        }

        for ( int cycle = std::max( 1, min_cycle );
              cycle <= max_cycle;
              ++cycle )
        {
            Vector2D ball_pos = inertia_n_step_point( first_ball_pos,
                                                      first_ball_vel,
                                                      cycle,
                                                      SP.ballDecay() );
            double target_dist = opponent_pos.dist( ball_pos );

            if ( target_dist - control_area - CONTROL_AREA_BUF < 0.001 )
            {
#ifdef DEBUG_PRINT_FAILED_COURSE
                dlog.addText( Logger::CROSS,
                              "%d: xxx recvPos(%.2f %.2f) step=%d/%d"
                              " opponent(%d)(%.2f %.2f) kickable"
                              " ballPos(%.2f %.2f)",
                              M_total_count,
                              receive_pos.x, receive_pos.y,
                              cycle, max_cycle,
                              (*o)->unum(), opponent_pos.x, opponent_pos.y ,
                              ball_pos.x, ball_pos.y );
                debug_paint_failed( M_total_count, receive_pos );
#endif
                return false;
            }

            double dash_dist = target_dist;

            if ( cycle > 1 )
            {
                //dash_dist -= control_area*0.8;
                dash_dist -= control_area*0.6;
                //dash_dist -= control_area*0.5;
            }

            if ( dash_dist > ptype->realSpeedMax() * cycle )
            {
                continue;
            }

            //
            // dash
            //

            int n_dash = ptype->cyclesToReachDistance( dash_dist * 1.05 ); // add penalty

            if ( n_dash > cycle )
            {
                continue;
            }

            //
            // turn
            //
            int n_turn = ( (*o)->bodyCount() >= 3
                           ? 2
                           : FieldAnalyzer::predict_player_turn_cycle( ptype,
                                                                       (*o)->body(),
                                                                       (*o)->vel().r(),
                                                                       target_dist,
                                                                       ( ball_pos - opponent_pos ).th(),
                                                                       control_area,
                                                                       true ) );

            int n_step = n_turn + n_dash + 1; // 1 step penalty for observation delay
            if ( (*o)->isTackling() )
            {
                n_step += 5; // Magic Number
            }

            if ( n_step <= cycle )
            {
#ifdef DEBUG_PRINT_FAILED_COURSE
                dlog.addText( Logger::CROSS,
                              "%d: xxx recvPos(%.1f %.1f) step=%d/%d"
                              " opponent(%d)(%.1f %.1f) can reach"
                              " ballPos(%.2f %.2f)",
                              M_total_count,
                              receive_pos.x, receive_pos.y,
                              cycle, max_cycle,
                              (*o)->unum(), opponent_pos.x, opponent_pos.y,
                              ball_pos.x, ball_pos.y );
                debug_paint_failed( M_total_count, receive_pos );
#endif
                return false;
            }
        }
    }

    return true;
}

/*-------------------------------------------------------------------*/
/*!

 */
double
CrossGenerator::getMinimumAngleWidth( const double & target_dist,
                                      const AngleDeg & target_angle )
{
    double min_angle_diff = 180.0;

    for ( AbstractPlayerObject::Cont::const_iterator o = M_opponents.begin(),
              end = M_opponents.end();
          o != end;
          ++ o )
    {
        if ( (*o)->isGhost() ) continue;

        double opponent_dist = M_first_point.dist( (*o)->pos() );
        if ( opponent_dist > target_dist + 1.0 )
        {
            continue;
        }

        AngleDeg opponent_angle = ( (*o)->pos() - M_first_point ).th();
        double angle_diff = ( opponent_angle - target_angle ).abs();

        if ( angle_diff < min_angle_diff )
        {
            min_angle_diff = angle_diff;
        }
    }

    return min_angle_diff;
}

```

---

## 9. /src/player/bhv_goalie_basic_move.cpp

```cpp
// -*-c++-*-

/*
 *Copyright:

 Copyright (C) Hidehisa AKIYAMA

 This code is free software; you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation; either version 3, or (at your option)
 any later version.

 This code is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this code; see the file COPYING.  If not, write to
 the Free Software Foundation, 675 Mass Ave, Cambridge, MA 02139, USA.

 *EndCopyright:
 */

/////////////////////////////////////////////////////////////////////

#ifdef HAVE_CONFIG_H
#include <config.h>
#endif

#include "bhv_goalie_basic_move.h"

#include "bhv_basic_tackle.h"
#include "neck_goalie_turn_neck.h"

#include "basic_actions/basic_actions.h"
#include "basic_actions/body_go_to_point.h"
#include "basic_actions/body_stop_dash.h"
#include "basic_actions/bhv_go_to_point_look_ball.h"

#include <rcsc/player/player_agent.h>
#include <rcsc/player/intercept_table.h>
#include <rcsc/player/debug_client.h>

#include <rcsc/common/logger.h>
#include <rcsc/common/server_param.h>
#include <rcsc/geom/line_2d.h>
#include <rcsc/soccer_math.h>

using namespace rcsc;

/*-------------------------------------------------------------------*/
/*!

 */
bool
Bhv_GoalieBasicMove::execute( PlayerAgent * agent )
{
    const Vector2D move_point = getTargetPoint( agent );

    dlog.addText( Logger::TEAM,
                  __FILE__": Bhv_GoalieBasicMove. move_point(%.2f %.2f)",
                  move_point.x, move_point.y );

    //////////////////////////////////////////////////////////////////
    // tackle
    if ( Bhv_BasicTackle( 0.8, 90.0 ).execute( agent ) )
    {
        dlog.addText( Logger::TEAM,
                      __FILE__": tackle" );
        return true;
    }

    /////////////////////////////////////////////////////////////
    //----------------------------------------------------------
    if ( doPrepareDeepCross( agent, move_point ) )
    {
        // face to opponent side to wait the opponent last cross pass
        return true;
    }
    //----------------------------------------------------------
    // check distance to the move target point
    // if already there, try to stop
    if ( doStopAtMovePoint( agent, move_point ) )
    {
        // execute stop action
        return true;
    }
    //----------------------------------------------------------
    // check whether ball is in very dangerous state
    if ( doMoveForDangerousState( agent, move_point ) )
    {
        // execute emergency action
        return true;
    }
    //----------------------------------------------------------
    // check & correct X difference
    if ( doCorrectX( agent, move_point ) )
    {
        // execute x-pos adjustment action
        return true;
    }

    //----------------------------------------------------------
    if ( doCorrectBodyDir( agent, move_point, true ) ) // consider opp
    {
        // exeucte turn
        return true;
    }

    //----------------------------------------------------------
    if ( doGoToMovePoint( agent, move_point ) )
    {
        // mainly execute Y-adjustment if body direction is OK. -> only dash
        // if body direction is not good, nomal go to action is done.
        return true;
    }

    //----------------------------------------------------------
    // change my body angle to desired angle
    if ( doCorrectBodyDir( agent, move_point, false ) ) // not consider opp
    {
        return true;
    }

    dlog.addText( Logger::TEAM,
                  __FILE__": only look ball" );
    agent->debugClient().addMessage( "OnlyTurnNeck" );

    agent->doTurn( 0.0 );
    agent->setNeckAction( new Neck_GoalieTurnNeck() );

    return true;
}

/*-------------------------------------------------------------------*/
/*!

 */
Vector2D
Bhv_GoalieBasicMove::getTargetPoint( PlayerAgent * agent )
{
    const double base_move_x = -49.8;
    const double danger_move_x = -51.5;
    const WorldModel & wm = agent->world();

    int ball_reach_step = 0;
    if ( ! wm.kickableTeammate()
         && ! wm.kickableOpponent() )
    {
        ball_reach_step
            = std::min( wm.interceptTable().teammateStep(),
                        wm.interceptTable().opponentStep() );
    }
    const Vector2D base_pos = wm.ball().inertiaPoint( ball_reach_step );


    //---------------------------------------------------------//
    // angle is very dangerous
    if ( base_pos.y > ServerParam::i().goalHalfWidth() + 3.0 )
    {
        Vector2D right_pole( - ServerParam::i().pitchHalfLength(),
                             ServerParam::i().goalHalfWidth() );
        AngleDeg angle_to_pole = ( right_pole - base_pos ).th();

        if ( -140.0 < angle_to_pole.degree()
             && angle_to_pole.degree() < -90.0 )
        {
            agent->debugClient().addMessage( "RPole" );
            return Vector2D( danger_move_x, ServerParam::i().goalHalfWidth() + 0.001 );
        }
    }
    else if ( base_pos.y < -ServerParam::i().goalHalfWidth() - 3.0 )
    {
        Vector2D left_pole( - ServerParam::i().pitchHalfLength(),
                            - ServerParam::i().goalHalfWidth() );
        AngleDeg angle_to_pole = ( left_pole - base_pos ).th();

        if ( 90.0 < angle_to_pole.degree()
             && angle_to_pole.degree() < 140.0 )
        {
            agent->debugClient().addMessage( "LPole" );
            return Vector2D( danger_move_x, - ServerParam::i().goalHalfWidth() - 0.001 );
        }
    }

    //---------------------------------------------------------//
    // ball is close to goal line
    if ( base_pos.x < -ServerParam::i().pitchHalfLength() + 8.0
         && base_pos.absY() > ServerParam::i().goalHalfWidth() + 2.0 )
    {
        Vector2D target_point( base_move_x, ServerParam::i().goalHalfWidth() - 0.1 );
        if ( base_pos.y < 0.0 )
        {
            target_point.y *= -1.0;
        }

        dlog.addText( Logger::TEAM,
                      __FILE__": getTarget. target is goal pole" );
        agent->debugClient().addMessage( "Pos(1)" );

        return target_point;
    }

//---------------------------------------------------------//
    {
        const double x_back = 7.0; // tune this!!
        int ball_pred_cycle = 5; // tune this!!
        const double y_buf = 0.5; // tune this!!
        const Vector2D base_point( - ServerParam::i().pitchHalfLength() - x_back,
                                   0.0 );
        Vector2D ball_point;
        if ( wm.kickableOpponent() )
        {
            ball_point = base_pos;
            agent->debugClient().addMessage( "Pos(2)" );
        }
        else
        {
            int opp_min = wm.interceptTable().opponentStep();
            if ( opp_min < ball_pred_cycle )
            {
                ball_pred_cycle = opp_min;
                dlog.addText( Logger::TEAM,
                              __FILE__": opp may reach near future. cycle = %d",
                              opp_min );
            }

            ball_point
                = inertia_n_step_point( base_pos,
                                        wm.ball().vel(),
                                        ball_pred_cycle,
                                        ServerParam::i().ballDecay() );
            agent->debugClient().addMessage( "Pos(3)" );
        }

        if ( ball_point.x < base_point.x + 0.1 )
        {
            ball_point.x = base_point.x + 0.1;
        }

        Line2D ball_line( ball_point, base_point );
        double move_y = ball_line.getY( base_move_x );

        if ( move_y > ServerParam::i().goalHalfWidth() - y_buf )
        {
            move_y = ServerParam::i().goalHalfWidth() - y_buf;
        }
        if ( move_y < - ServerParam::i().goalHalfWidth() + y_buf )
        {
            move_y = - ServerParam::i().goalHalfWidth() + y_buf;
        }

        return Vector2D( base_move_x, move_y );
    }
}

/*-------------------------------------------------------------------*/
/*!

 */
double
Bhv_GoalieBasicMove::getBasicDashPower( PlayerAgent * agent,
                                        const Vector2D & move_point )
{
    const WorldModel & wm = agent->world();
    const PlayerType & mytype = wm.self().playerType();

    const double my_inc = mytype.staminaIncMax() * wm.self().recovery();

    if ( std::fabs( wm.self().pos().x - move_point.x ) > 3.0 )
    {
        return ServerParam::i().maxDashPower();
    }

    if ( wm.ball().pos().x > -30.0 )
    {
        if ( wm.self().stamina() < ServerParam::i().staminaMax() * 0.9 )
        {
            return my_inc * 0.5;
        }
        agent->debugClient().addMessage( "P1" );
        return my_inc;
    }
    else if ( wm.ball().pos().x > ServerParam::i().ourPenaltyAreaLineX() )
    {
        if ( wm.ball().pos().absY() > 20.0 )
        {
            // penalty area
            agent->debugClient().addMessage( "P2" );
            return my_inc;
        }
        if ( wm.ball().vel().x > 1.0 )
        {
            // ball is moving to opponent side
            agent->debugClient().addMessage( "P2.5" );
            return my_inc * 0.5;
        }

        int opp_min = wm.interceptTable().opponentStep();
        if ( opp_min <= 3 )
        {
            agent->debugClient().addMessage( "P2.3" );
            return ServerParam::i().maxDashPower();
        }

        if ( wm.self().stamina() < ServerParam::i().staminaMax() * 0.7 )
        {
            agent->debugClient().addMessage( "P2.6" );
            return my_inc * 0.7;
        }
        agent->debugClient().addMessage( "P3" );
        return ServerParam::i().maxDashPower() * 0.6;
    }
    else
    {
        if ( wm.ball().pos().absY() < 15.0
             || wm.ball().pos().y * wm.self().pos().y < 0.0 ) // opposite side
        {
            agent->debugClient().addMessage( "P4" );
            return ServerParam::i().maxDashPower();
        }
        else
        {
            agent->debugClient().addMessage( "P5" );
            return my_inc;
        }
    }
}

/*-------------------------------------------------------------------*/
/*!

 */
bool
Bhv_GoalieBasicMove::doPrepareDeepCross( PlayerAgent * agent,
                                         const Vector2D & move_point )
{
    if ( move_point.absY() < ServerParam::i().goalHalfWidth() - 0.8 )
    {
        // consider only very deep cross
        dlog.addText( Logger::TEAM,
                      __FILE__": doPrepareDeepCross no deep cross" );
        return false;
    }

    const WorldModel & wm = agent->world();

    const Vector2D goal_c( - ServerParam::i().pitchHalfLength(), 0.0 );

    Vector2D goal_to_ball = wm.ball().pos() - goal_c;

    if ( goal_to_ball.th().abs() < 60.0 )
    {
        // ball is not in side cross area
        dlog.addText( Logger::TEAM,
                      __FILE__": doPrepareDeepCross.ball is not in side cross area" );
        return false;
    }

    Vector2D my_inertia = wm.self().inertiaFinalPoint();
    double dist_thr = wm.ball().distFromSelf() * 0.1;
    if ( dist_thr < 0.5 ) dist_thr = 0.5;
    //double dist_thr = 0.5;

    if ( my_inertia.dist( move_point ) > dist_thr )
    {
        // needed to go to move target point
        double dash_power = getBasicDashPower( agent, move_point );
        dlog.addText( Logger::TEAM,
                      __FILE__": doPrepareDeepCross. need to move. power=%.1f",
                      dash_power );
        agent->debugClient().addMessage( "DeepCrossMove%.0f", dash_power );
        agent->debugClient().setTarget( move_point );
        agent->debugClient().addCircle( move_point, dist_thr );

        doGoToPointLookBall( agent,
                             move_point,
                             wm.ball().angleFromSelf(),
                             dist_thr,
                             dash_power );
        return true;
    }

    AngleDeg body_angle = ( wm.ball().pos().y < 0.0
                            ? 10.0
                            : -10.0 );
    agent->debugClient().addMessage( "PrepareCross" );
    dlog.addText( Logger::TEAM,
                  __FILE__": doPrepareDeepCross  body angle = %.1f  move_point(%.1f %.1f)",
                  body_angle.degree(),
                  move_point.x, move_point.y );
    agent->debugClient().setTarget( move_point );

    Body_TurnToAngle( body_angle ).execute( agent );
    agent->setNeckAction( new Neck_GoalieTurnNeck() );
    return true;
}

/*-------------------------------------------------------------------*/
/*!

 */
bool
Bhv_GoalieBasicMove::doStopAtMovePoint( PlayerAgent * agent,
                                        const Vector2D & move_point )
{
    //----------------------------------------------------------
    // already exist at target point
    // but inertia movement is big
    // stop dash

    const WorldModel & wm = agent->world();
    double dist_thr = wm.ball().distFromSelf() * 0.1;
    if ( dist_thr < 0.5 ) dist_thr = 0.5;

    // now, in the target area
    if ( wm.self().pos().dist( move_point ) < dist_thr )
    {
        const Vector2D my_final
            = inertia_final_point( wm.self().pos(),
                                   wm.self().vel(),
                                   wm.self().playerType().playerDecay() );
        // after inertia move, can stay in the target area
        if ( my_final.dist( move_point ) < dist_thr )
        {
            agent->debugClient().addMessage( "InertiaStay" );
            dlog.addText( Logger::TEAM,
                          __FILE__": doStopAtMovePoint. inertia stay" );
            return false;
        }

        // try to stop at the current point
        dlog.addText( Logger::TEAM,
                      __FILE__": doStopAtMovePoint. stop dash" );
        agent->debugClient().addMessage( "Stop" );
        agent->debugClient().setTarget( move_point );

        Body_StopDash( true ).execute( agent ); // save recovery
        agent->setNeckAction( new Neck_GoalieTurnNeck() );
        return true;
    }

    return false;
}

/*-------------------------------------------------------------------*/
/*!

 */
bool
Bhv_GoalieBasicMove::doMoveForDangerousState( PlayerAgent * agent,
                                              const Vector2D & move_point )
{
    const WorldModel& wm = agent->world();

    const double x_buf = 0.5;

    const Vector2D ball_next = wm.ball().pos() + wm.ball().vel();

    dlog.addText( Logger::TEAM,
                  __FILE__": doMoveForDangerousState" );

    if ( std::fabs( move_point.x - wm.self().pos().x ) > x_buf
         && ball_next.x < -ServerParam::i().pitchHalfLength() + 11.0
         && ball_next.absY() < ServerParam::i().goalHalfWidth() + 1.0 )
    {
        // x difference to the move point is over threshold
        // but ball is in very dangerous area (just front of our goal)

        // and, exist opponent close to ball
        if ( ! wm.opponentsFromBall().empty()
             && wm.opponentsFromBall().front()->distFromBall() < 2.0 )
        {
            Vector2D block_point
                = wm.opponentsFromBall().front()->pos();
            block_point.x -= 2.5;
            block_point.y = move_point.y;

            if ( wm.self().pos().x < block_point.x )
            {
                block_point.x = wm.self().pos().x;
            }

            dlog.addText( Logger::TEAM,
                          __FILE__": block opponent kickaer" );
            agent->debugClient().addMessage( "BlockOpp" );

            if ( doGoToMovePoint( agent, block_point ) )
            {
                return true;
            }

            double dist_thr = wm.ball().distFromSelf() * 0.1;
            if ( dist_thr < 0.5 ) dist_thr = 0.5;

            agent->debugClient().setTarget( block_point );
            agent->debugClient().addCircle( block_point, dist_thr );

            doGoToPointLookBall( agent,
                                 move_point,
                                 wm.ball().angleFromSelf(),
                                 dist_thr,
                                 ServerParam::i().maxDashPower() );
            return true;
        }
    }

    return false;
}

/*-------------------------------------------------------------------*/
/*!

 */
bool
Bhv_GoalieBasicMove::doCorrectX( PlayerAgent * agent,
                                 const Vector2D & move_point )
{
    const WorldModel & wm = agent->world();

    const double x_buf = 0.5;

    dlog.addText( Logger::TEAM,
                  __FILE__": doCorrectX" );
    if ( std::fabs( move_point.x - wm.self().pos().x ) < x_buf )
    {
        // x difference is already small.
        dlog.addText( Logger::TEAM,
                      __FILE__": doCorrectX. x diff is small" );
        return false;
    }

    int opp_min_cyc = wm.interceptTable().opponentStep();
    if ( ( ! wm.kickableOpponent() && opp_min_cyc >= 4 )
         || wm.ball().distFromSelf() > 18.0 )
    {
        double dash_power = getBasicDashPower( agent, move_point );

        dlog.addText( Logger::TEAM,
                      __FILE__": doCorrectX. power=%.1f",
                      dash_power );
        agent->debugClient().addMessage( "CorrectX%.0f", dash_power );
        agent->debugClient().setTarget( move_point );
        agent->debugClient().addCircle( move_point, x_buf );

        if ( ! wm.kickableOpponent()
             && wm.ball().distFromSelf() > 30.0 )
        {
            if ( ! Body_GoToPoint( move_point, x_buf, dash_power
                                   ).execute( agent ) )
            {
                AngleDeg body_angle = ( wm.self().body().degree() > 0.0
                                        ? 90.0
                                        : -90.0 );
                Body_TurnToAngle( body_angle ).execute( agent );

            }
            agent->setNeckAction( new Neck_TurnToBall() );
            return true;
        }

        doGoToPointLookBall( agent,
                             move_point,
                             wm.ball().angleFromSelf(),
                             x_buf,
                             dash_power );
        return true;
    }

    return false;
}

/*-------------------------------------------------------------------*/
/*!

 */
bool
Bhv_GoalieBasicMove::doCorrectBodyDir( PlayerAgent * agent,
                                       const Vector2D & move_point,
                                       const bool consider_opp )
{
    // adjust only body direction

    const WorldModel & wm = agent->world();

    const Vector2D ball_next = wm.ball().pos() + wm.ball().vel();

    const AngleDeg target_angle = ( ball_next.y < 0.0 ? -90.0 : 90.0 );
    const double angle_diff = ( wm.self().body() - target_angle ).abs();

    dlog.addText( Logger::TEAM,
                  __FILE__": doCorrectBodyDir" );

    if ( angle_diff < 5.0 )
    {
        return false;
    }

#if 1
    {
        const Vector2D goal_c( - ServerParam::i().pitchHalfLength(), 0.0 );
        Vector2D goal_to_ball = wm.ball().pos() - goal_c;
        if ( goal_to_ball.th().abs() >= 60.0 )
        {
            dlog.addText( Logger::TEAM,
                          __FILE__": doCorrectBodyDir. danger area" );
            return false;
        }
    }
#else
    if ( wm.ball().pos().x < -36.0
         && wm.ball().pos().absY() < 15.0
         && wm.self().pos().dist( move_point ) > 1.5 )
    {
        dlog.addText( Logger::TEAM,
                      __FILE__": doCorrectBodyDir. danger area" );
        return false;
    }
#endif

    double opp_ball_dist
        = ( wm.opponentsFromBall().empty()
            ? 100.0
            : wm.opponentsFromBall().front()->distFromBall() );
    if ( ! consider_opp
         || opp_ball_dist > 7.0
         || wm.ball().distFromSelf() > 20.0
         || ( std::fabs( move_point.y - wm.self().pos().y ) < 1.0 // y diff
              && ! wm.kickableOpponent() ) )
    {
        dlog.addText( Logger::TEAM,
                      __FILE__": body face to %.1f.  angle_diff=%.1f %s",
                      target_angle.degree(), angle_diff,
                      consider_opp ? "consider_opp" : "" );
        agent->debugClient().addMessage( "CorrectBody%s",
                                         consider_opp ? "WithOpp" : "" );
        Body_TurnToAngle( target_angle ).execute( agent );
        agent->setNeckAction( new Neck_GoalieTurnNeck() );
        return true;
    }

    return false;
}

/*-------------------------------------------------------------------*/
/*!

 */
bool
Bhv_GoalieBasicMove::doGoToMovePoint( PlayerAgent * agent,
                                      const Vector2D & move_point )
{
    // move to target point
    // check Y coordinate difference

    const WorldModel & wm = agent->world();

    double dist_thr = wm.ball().distFromSelf() * 0.08;
    if ( dist_thr < 0.5 ) dist_thr = 0.5;

    const double y_diff = std::fabs( move_point.y - wm.self().pos().y );
    if ( y_diff < dist_thr )
    {
        // already there
        dlog.addText( Logger::TEAM,
                      __FILE__": doGoToMovePoint. y_diff=%.2f < thr=%.2f",
                      y_diff, dist_thr );
        return false;
    }

    //----------------------------------------------------------//
    // dash to body direction

    double dash_power = getBasicDashPower( agent, move_point );

    // body direction is OK
    if ( std::fabs( wm.self().body().abs() - 90.0 ) < 7.0 )
    {
        // calc dash power only to reach the target point
        double required_power = y_diff / wm.self().dashRate();
        if ( dash_power > required_power )
        {
            dash_power = required_power;
        }

        if ( move_point.y > wm.self().pos().y )
        {
            if ( wm.self().body().degree() < 0.0 )
            {
                dash_power *= -1.0;
            }
        }
        else
        {
            if ( wm.self().body().degree() > 0.0 )
            {
                dash_power *= -1.0;
            }
        }

        dash_power = ServerParam::i().normalizeDashPower( dash_power );

        dlog.addText( Logger::TEAM,
                      __FILE__": doGoToMovePoint. CorrectY(1) power= %.1f",
                      dash_power );
        agent->debugClient().addMessage( "CorrectY(1)%.0f", dash_power );
        agent->debugClient().setTarget( move_point );

        agent->doDash( dash_power );
        agent->setNeckAction( new Neck_GoalieTurnNeck() );
    }
    else
    {
        dlog.addText( Logger::TEAM,
                      __FILE__": doGoToMovePoint. CorrectPos power= %.1f",
                      dash_power );
        agent->debugClient().addMessage( "CorrectPos%.0f", dash_power );
        agent->debugClient().setTarget( move_point );
        agent->debugClient().addCircle( move_point, dist_thr );

        doGoToPointLookBall( agent,
                             move_point,
                             wm.ball().angleFromSelf(),
                             dist_thr,
                             dash_power );
    }
    return true;
}

/*-------------------------------------------------------------------*/
/*!

 */
void
Bhv_GoalieBasicMove::doGoToPointLookBall( PlayerAgent * agent,
                                          const Vector2D & target_point,
                                          const AngleDeg & body_angle,
                                          const double & dist_thr,
                                          const double & dash_power,
                                          const double & back_power_rate )
{
    const WorldModel & wm = agent->world();

    if ( wm.gameMode().type() == GameMode::PlayOn
         || wm.gameMode().type() == GameMode::PenaltyTaken_ )
    {
        agent->debugClient().addMessage( "Goalie:GoToLook" );
        dlog.addText( Logger::TEAM,
                      __FILE__": doGoToPointLookBall. use GoToPointLookBall" );
        Bhv_GoToPointLookBall( target_point,
                               dist_thr,
                               dash_power,
                               back_power_rate
                               ).execute( agent );
    }
    else
    {
        agent->debugClient().addMessage( "Goalie:GoTo" );
        dlog.addText( Logger::TEAM,
                      __FILE__": doGoToPointLookBall. use GoToPoint" );
        if ( Body_GoToPoint( target_point, dist_thr, dash_power
                             ).execute( agent ) )
        {
            dlog.addText( Logger::TEAM,
                          __FILE__": doGoToPointLookBall. go" );
        }
        else
        {
            Body_TurnToAngle( body_angle ).execute( agent );
            dlog.addText( Logger::TEAM,
                          __FILE__": doGoToPointLookBall. turn to %.1f",
                          body_angle.degree() );
        }

        agent->setNeckAction( new Neck_TurnToBall() );
    }
}

```

---

## 10. /src/player/bhv_goalie_chase_ball.cpp

```cpp
// -*-c++-*-

/*
 *Copyright:

 Copyright (C) Hidehisa AKIYAMA

 This code is free software; you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation; either version 3, or (at your option)
 any later version.

 This code is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this code; see the file COPYING.  If not, write to
 the Free Software Foundation, 675 Mass Ave, Cambridge, MA 02139, USA.

 *EndCopyright:
 */

/////////////////////////////////////////////////////////////////////

#ifdef HAVE_CONFIG_H
#include <config.h>
#endif

#include "bhv_goalie_chase_ball.h"

#include "bhv_goalie_basic_move.h"
#include "bhv_basic_tackle.h"

#include "basic_actions/basic_actions.h"
#include "basic_actions/body_go_to_point.h"
#include "basic_actions/body_stop_dash.h"
#include "basic_actions/body_intercept.h"

#include <rcsc/player/player_agent.h>
#include <rcsc/player/intercept_table.h>
#include <rcsc/player/debug_client.h>

#include <rcsc/common/logger.h>
#include <rcsc/common/server_param.h>
#include <rcsc/geom/line_2d.h>

using namespace rcsc;

/*-------------------------------------------------------------------*/
/*!
  execute action
*/
bool
Bhv_GoalieChaseBall::execute( PlayerAgent * agent )
{
    dlog.addText( Logger::TEAM,
                  __FILE__": Bhv_GoalieChaseBall" );

    //////////////////////////////////////////////////////////////////
    // tackle
    if ( Bhv_BasicTackle( 0.8, 90.0 ).execute( agent ) )
    {
        dlog.addText( Logger::TEAM,
                      __FILE__": tackle" );
        return true;
    }

    const ServerParam & SP = ServerParam::i();
    const WorldModel & wm = agent->world();

    ////////////////////////////////////////////////////////////////////////
    // get active interception catch point

    Vector2D my_int_pos = wm.ball().inertiaPoint( wm.interceptTable().selfStep() );
    dlog.addText( Logger::TEAM,
                  __FILE__": execute. intercept point=(%.2f %.2f)",
                  my_int_pos.x, my_int_pos.y );

    double pen_thr = wm.ball().distFromSelf() * 0.1 + 1.0;
    if ( pen_thr < 1.0 ) pen_thr = 1.0;

    //----------------------------------------------------------
    const Line2D ball_line( wm.ball().pos(), wm.ball().vel().th() );
    const Line2D defend_line( Vector2D( wm.self().pos().x, -10.0 ),
                              Vector2D( wm.self().pos().x, 10.0 ) );

    if ( my_int_pos.x > - SP.pitchHalfLength() - 1.0
         && my_int_pos.x < SP.ourPenaltyAreaLineX() - pen_thr
         && my_int_pos.absY() < SP.penaltyAreaHalfWidth() - pen_thr )
    {
        bool save_recovery = false;
        if ( ball_line.dist( wm.self().pos() ) < SP.catchableArea() )
        {
            save_recovery = true;
        }
        dlog.addText( Logger::TEAM,
                      __FILE__": execute normal intercept" );
        agent->debugClient().addMessage( "Intercept(0)" );
        Body_Intercept( save_recovery ).execute( agent );
        agent->setNeckAction( new Neck_TurnToBall() );
        return true;
    }

    int self_goalie_min = wm.interceptTable().selfStep();
    int opp_min_cyc = wm.interceptTable().opponentStep();

    Vector2D intersection = ball_line.intersection( defend_line );
    if ( ! intersection.isValid()
         || ball_line.dist( wm.self().pos() ) < SP.catchableArea() * 0.8
         || intersection.absY() > SP.goalHalfWidth() + 3.0
         )
    {
        if ( ! wm.kickableOpponent() )
        {
            if ( self_goalie_min <= opp_min_cyc + 2
                 && my_int_pos.x > -SP.pitchHalfLength() - 2.0
                 && my_int_pos.x < SP.ourPenaltyAreaLineX() - pen_thr
                 && my_int_pos.absY() < SP.penaltyAreaHalfWidth() - pen_thr
                 )
            {
                if ( Body_Intercept( false ).execute( agent ) )
                {
                    dlog.addText( Logger::TEAM,
                                  __FILE__": execute normal interception" );
                    agent->debugClient().addMessage( "Intercept(1)" );
                    agent->setNeckAction( new Neck_TurnToBall() );
                    return true;
                }
            }

            dlog.addText( Logger::TEAM,
                          __FILE__": execute. ball vel has same slope to my body??"
                          " myvel-ang=%f body=%f. go to ball direct",
                          wm.ball().vel().th().degree(),
                          wm.self().body().degree() );
            // ball vel angle is same to my body angle
            agent->debugClient().addMessage( "GoToCatch(1)" );
            doGoToCatchPoint( agent, wm.ball().pos() );
            return true;
        }
    }

    //----------------------------------------------------------
    // body is already face to intersection
    // only dash to intersection

    // check catch point
    if ( intersection.absX() > SP.pitchHalfLength() + SP.catchableArea()
         || intersection.x > SP.ourPenaltyAreaLineX() - SP.catchableArea()
         || intersection.absY() > SP.penaltyAreaHalfWidth() - SP.catchableArea()
         )
    {
        dlog.addText( Logger::TEAM,
                      __FILE__": execute intersection(%.2f, %.2f) over range.",
                      intersection.x, intersection.y );
        if ( Body_Intercept( false ).execute( agent ) )
        {
            agent->debugClient().addMessage( "Intercept(2)" );
            agent->setNeckAction( new Neck_TurnToBall() );
            return true;
        }
        else
        {
            return Bhv_GoalieBasicMove().execute( agent );
        }
    }

    //----------------------------------------------------------
    // check already there
    const Vector2D my_inertia_final_pos
        = wm.self().pos()
        + wm.self().vel()
        / (1.0 - wm.self().playerType().playerDecay());
    double dist_thr = 0.2 + wm.ball().distFromSelf() * 0.1;
    if ( dist_thr < 0.5 ) dist_thr = 0.5;

    // if already intersection point stop dash
    if ( my_inertia_final_pos.dist( intersection ) < dist_thr )
    {
        agent->debugClient().addMessage( "StopForChase" );
        Body_StopDash( false ).execute( agent );
        agent->setNeckAction( new Neck_TurnToBall() );
        return true;
    }

    //----------------------------------------------------------
    // forward or backward

    dlog.addText( Logger::TEAM,
                  __FILE__": slide move. point=(%.1f, %.1f)",
                  intersection.x, intersection.y );
    if ( wm.ball().pos().x > -35.0 )
    {
        if ( wm.ball().pos().y * intersection.y < 0.0 ) // opposite side
        {
            intersection.y = 0.0;
        }
        else
        {
            intersection.y *= 0.5;
        }
    }

    agent->debugClient().addMessage( "GoToCatch(2)" );
    doGoToCatchPoint( agent, intersection );
    return true;
}

/*-------------------------------------------------------------------*/
/*!

 */
void
Bhv_GoalieChaseBall::doGoToCatchPoint( PlayerAgent * agent,
                                       const Vector2D & target_point )
{
    const ServerParam & SP = ServerParam::i();
    const WorldModel & wm = agent->world();

    double dash_power = 0.0;

    Vector2D rel = target_point - wm.self().pos();
    rel.rotate( - wm.self().body() );
    AngleDeg rel_angle = rel.th();
    const double angle_buf
        = std::fabs( AngleDeg::atan2_deg( SP.catchableArea() * 0.9, rel.r() ) );

    dlog.addText( Logger::TEAM,
                  __FILE__": GoToCatchPoint. (%.1f, %.1f). angle_diff=%.1f. angle_buf=%.1f",
                  target_point.x, target_point.y,
                  rel_angle.degree(), angle_buf );

    agent->debugClient().setTarget( target_point );

    // forward dash
    if ( rel_angle.abs() < angle_buf )
    {
        dash_power = std::min( wm.self().stamina() + wm.self().playerType().extraStamina(),
                               SP.maxDashPower() );
        dlog.addText( Logger::TEAM,
                      __FILE__": forward dash" );
        agent->debugClient().addMessage( "GoToCatch:Forward" );
        agent->doDash( dash_power );
    }
    // back dash
    else if ( rel_angle.abs() > 180.0 - angle_buf )
    {
        dash_power = SP.minDashPower();

        double required_stamina = ( SP.minDashPower() < 0.0
                                    ? SP.minDashPower() * -2.0
                                    : SP.minDashPower() );
        if ( wm.self().stamina() + wm.self().playerType().extraStamina()
             < required_stamina )
        {
            dash_power = wm.self().stamina() + wm.self().playerType().extraStamina();
            if ( SP.minDashPower() < 0.0 )
            {
                dash_power *= -0.5;
                if ( dash_power < SP.minDashPower() )
                {
                    dash_power = SP.minDashPower();
                }
            }
        }

        dlog.addText( Logger::TEAM,
                      __FILE__": back dash. power=%.1f",
                      dash_power );
        agent->debugClient().addMessage( "GoToCatch:Back" );
        agent->doDash( dash_power );
    }
    // forward dash turn
    else if ( rel_angle.abs() < 90.0 )
    {
        dlog.addText( Logger::TEAM,
                      __FILE__": turn %.1f for forward dash",
                      rel_angle.degree() );
        agent->debugClient().addMessage( "GoToCatch:F-Turn" );
        agent->doTurn( rel_angle );
    }
    else
    {
        rel_angle -= 180.0;
        dlog.addText( Logger::TEAM,
                      __FILE__": turn %.1f for back dash",
                      rel_angle.degree() );
        agent->debugClient().addMessage( "GoToCatch:B-Turn" );
        agent->doTurn( rel_angle );
    }

    agent->setNeckAction( new Neck_TurnToBall() );
}

/*-------------------------------------------------------------------*/
/*!

 */
bool
Bhv_GoalieChaseBall::is_ball_chase_situation( const PlayerAgent  * agent )
{
    const WorldModel & wm = agent->world();

    if ( wm.gameMode().type() != GameMode::PlayOn )
    {
        return false;
    }

    const ServerParam & SP = ServerParam::i();

    int self_min = wm.interceptTable().selfStep();
    int opp_min = wm.interceptTable().opponentStep();

    ////////////////////////////////////////////////////////////////////////
    // ball is in very dangerous area
    const Vector2D ball_next_pos = wm.ball().pos() + wm.ball().vel();
    if ( ball_next_pos.x < -SP.pitchHalfLength() + 8.0
         && ball_next_pos.absY() < SP.goalHalfWidth() + 3.0 )
    {
        // exist kickable teammate
        // avoid back pass
        if ( wm.kickableTeammate() )
        {
            dlog.addText( Logger::TEAM,
                          __FILE__": danger area. exist kickable teammate?" );
            return false;
        }
        else if ( wm.ball().distFromSelf() < 3.0
                  && self_min <= 3 )
        {
            dlog.addText( Logger::TEAM,
                          __FILE__": danger area. ball is very near." );
            return true;
        }
        else if ( self_min > opp_min + 3
                  && opp_min < 7 )
        {
            dlog.addText( Logger::TEAM,
                          __FILE__": danger area. opponent may get tha ball faster than me" );
            return false;
        }
        else
        {
            dlog.addText( Logger::TEAM,
                          __FILE__": danger area. chase ball" );
            return true;
        }
    }

    ////////////////////////////////////////////////////////////////////////
    // check shoot moving
    if ( is_ball_shoot_moving( agent )
         && self_min < opp_min )
    {
        dlog.addText( Logger::TEAM,
                      __FILE__": shoot moving. chase ball" );
        return true;
    }

    ////////////////////////////////////////////////////////////////////////
    // get active interception catch point

    const Vector2D my_int_pos = wm.ball().inertiaPoint( wm.interceptTable().selfStep() );

    double pen_thr = wm.ball().distFromSelf() * 0.1 + 1.0;
    if ( pen_thr < 1.0 ) pen_thr = 1.0;
    if ( my_int_pos.absY() > SP.penaltyAreaHalfWidth() - pen_thr
         || my_int_pos.x > SP.ourPenaltyAreaLineX() - pen_thr )
    {
        dlog.addText( Logger::TEAM,
                      __FILE__": intercept point is out of penalty" );
        return false;
    }

    ////////////////////////////////////////////////////////////////////////
    // Now, I can chase the ball
    // check the ball possessor

    if ( wm.kickableTeammate()
         && ! wm.kickableOpponent() )
    {
        dlog.addText( Logger::TEAM,
                      __FILE__": exist kickable player" );
        return false;
    }

    if ( opp_min <= self_min - 2 )
    {
        dlog.addText( Logger::TEAM,
                      __FILE__": opponent reach the ball faster than me" );
        return false;
    }

    const double my_dist_to_catch = wm.self().pos().dist( my_int_pos );

    double opp_min_dist = 10000.0;
    wm.getOpponentNearestTo( my_int_pos, 30, &opp_min_dist );

    if ( opp_min_dist < my_dist_to_catch - 2.0 )
    {
        dlog.addText( Logger::TEAM,
                      __FILE__": opponent is nearer than me. my_dist=%.2f  opp_dist=%.2f",
                      my_dist_to_catch, opp_min_dist );
        return false;
    }

    dlog.addText( Logger::TEAM,
                  __FILE__": exist interception point. try chase." );
    return true;
}

/*-------------------------------------------------------------------*/
/*!

 */
bool
Bhv_GoalieChaseBall::is_ball_shoot_moving( const PlayerAgent * agent )
{
    const ServerParam & SP = ServerParam::i();
    const WorldModel & wm = agent->world();

    if ( wm.ball().distFromSelf() > 30.0 )
    {
        return false;
    }

#if 1
    if ( wm.ball().pos().x > -34.5 )
    {
        return false;
    }
#endif

    // check opponent kicker
    if ( wm.kickableOpponent() )
    {
        dlog.addText( Logger::TEAM,
                      __FILE__": check shoot moving. opponent kickable " );
        return false;
    }
    else if ( wm.kickableTeammate() )
    {
        dlog.addText( Logger::TEAM,
                      __FILE__": check shoot moving. teammate kickable" );
        return false;
    }

    if ( wm.ball().vel().absX() < 0.1 )
    {
        if ( wm.ball().pos().x < -46.0
             && wm.ball().pos().absY() < SP.goalHalfWidth() + 2.0 )
        {
            dlog.addText( Logger::TEAM,
                          __FILE__": check shoot moving. bvel.x(%f) is ZERO. but near to goal",
                          wm.ball().vel().x );
            return true;
        }
        dlog.addText( Logger::TEAM,
                      __FILE__": check shoot moving. bvel,x is small" );
        return false;
    }


    const Line2D ball_line( wm.ball().pos(), wm.ball().vel().th() );
    const double intersection_y = ball_line.getY( -SP.pitchHalfLength() );

    if ( std::fabs( ball_line.b() ) > 0.1
         && std::fabs( intersection_y ) < SP.goalHalfWidth() + 2.0 )
    {
        if ( wm.ball().pos().x < -40.0
             && wm.ball().pos().absY() < 15.0 )
        {
            const Vector2D end_point
                = wm.ball().pos()
                + wm.ball().vel() / ( 1.0 - SP.ballDecay());
            if ( wm.ball().vel().r() > 0.5 // 1.0
                 && end_point.x < -SP.pitchHalfLength() + 2.0 )
            {
                dlog.addText( Logger::TEAM,
                              __FILE__": shoot to Y(%.1f). ball_line a=%.1f, b=%.1f, c=%.1f",
                              intersection_y,
                              ball_line.a(),
                              ball_line.b(),
                              ball_line.c() );
                return true;
            }
        }
    }


    return false;
}

```

---

## 11. /src/player/sample_field_evaluator.cpp

```cpp
// -*-c++-*-

/*
 *Copyright:

 Cyrus2D
 Modified by Omid Amini, Nader Zare

 Gliders2d
 Modified by Mikhail Prokopenko, Peter Wang

 Copyright (C) Hiroki SHIMORA

 This code is free software; you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation; either version 3, or (at your option)
 any later version.

 This code is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this code; see the file COPYING.  If not, write to
 the Free Software Foundation, 675 Mass Ave, Cambridge, MA 02139, USA.

 *EndCopyright:
 */

#ifdef HAVE_CONFIG_H
#include <config.h>
#endif

#include "sample_field_evaluator.h"

#include "field_analyzer.h"
#include "simple_pass_checker.h"

#include <rcsc/player/player_evaluator.h>
#include <rcsc/common/server_param.h>
#include <rcsc/common/logger.h>
#include <rcsc/math_util.h>

#include <rcsc/player/world_model.h>

#include <rcsc/geom/voronoi_diagram.h>

#include <iostream>
#include <algorithm>
#include <cmath>
#include <cfloat>

// #define DEBUG_PRINT

using namespace rcsc;

static const int VALID_PLAYER_THRESHOLD = 8;


/*-------------------------------------------------------------------*/
/*!

 */
static double evaluate_state( const PredictState & state , const rcsc::WorldModel & wm );


/*-------------------------------------------------------------------*/
/*!

 */
SampleFieldEvaluator::SampleFieldEvaluator()
{

}

/*-------------------------------------------------------------------*/
/*!

 */
SampleFieldEvaluator::~SampleFieldEvaluator()
{

}

/*-------------------------------------------------------------------*/
/*!

 */
double
SampleFieldEvaluator::operator()(const PredictState &state,
                                 const std::vector<ActionStatePair> & /*path*/,
                                 const rcsc::WorldModel &wm) const
{
    const double final_state_evaluation = evaluate_state( state , wm);

    //
    // ???
    //

    double result = final_state_evaluation;

    return result;
}


/*-------------------------------------------------------------------*/
/*!

 */
static
double
evaluate_state( const PredictState & state, const rcsc::WorldModel & wm )
{
    const ServerParam & SP = ServerParam::i();

    const AbstractPlayerObject * holder = state.ballHolder();

#ifdef DEBUG_PRINT
    dlog.addText( Logger::ACTION_CHAIN,
                  "========= (evaluate_state) ==========" );
#endif

    //
    // if holder is invalid, return bad evaluation
    //
    if ( ! holder )
    {
#ifdef DEBUG_PRINT
        dlog.addText( Logger::ACTION_CHAIN,
                      "(eval) XXX null holder" );
#endif
        return - DBL_MAX / 2.0;
    }

    const int holder_unum = holder->unum();


    //
    // ball is in opponent goal
    //
    if ( state.ball().pos().x > + ( SP.pitchHalfLength() - 0.1 )
         && state.ball().pos().absY() < SP.goalHalfWidth() + 2.0 )
    {
#ifdef DEBUG_PRINT
        dlog.addText( Logger::ACTION_CHAIN,
                      "(eval) *** in opponent goal" );
#endif
        return +1.0e+7;
    }

    //
    // ball is in our goal
    //
    if ( state.ball().pos().x < - ( SP.pitchHalfLength() - 0.1 )
         && state.ball().pos().absY() < SP.goalHalfWidth() )
    {
#ifdef DEBUG_PRINT
        dlog.addText( Logger::ACTION_CHAIN,
                      "(eval) XXX in our goal" );
#endif

        return -1.0e+7;
    }


    //
    // out of pitch
    //
    if ( state.ball().pos().absX() > SP.pitchHalfLength()
         || state.ball().pos().absY() > SP.pitchHalfWidth() )
    {
#ifdef DEBUG_PRINT
        dlog.addText( Logger::ACTION_CHAIN,
                      "(eval) XXX out of pitch" );
#endif

        return - DBL_MAX / 2.0;
    }


    //
    // set basic evaluation
    //

    // G2d: to retrieve opp team name
    // C2D: Helios 18 Tune removed -> replace with BNN
    // bool heliosbase = false;
    // if (wm.opponentTeamName().find("HELIOS_base") != std::string::npos)
    //     heliosbase = true;

    // G2d: number of direct opponents
        int opp_forward = 0;

        Vector2D egl (52.5, -8.0);
        Vector2D egr (52.5, 8.0);
        Vector2D left = egl - wm.self().pos();
        Vector2D right = egr - wm.self().pos();

        Sector2D sector(wm.self().pos(), 0.0, 10000.0, left.th(), right.th());

        for (auto of = wm.opponentsFromSelf().begin();
             of != wm.opponentsFromSelf().end();
             ++of)
        {
                if ( sector.contains( (*of)->pos() ) && !((*of)->goalie()) )
                opp_forward++;
        }

        double weight = 1.0;
        if (wm.ball().pos().x > 35.0)
            weight = 0.3;

	double depth = 10.0;
    // C2D: Helios 18 Tune removed -> replace with BNN
	// if (heliosbase)
	// 	depth = 0.0;

    double point = state.ball().pos().x * weight;

        Vector2D best_point = ServerParam::i().theirTeamGoalPos();

    // G2d: new eval function
    // C2D: replace PlayerPtrCont::const_iterator with auto
        if ( wm.ball().pos().x < depth || opp_forward == 0 )
	{
		// stay with best point = opp goal
	}
	else
	{

		if ( wm.ball().pos().x < 35.0 &&  state.ball().pos().x > 5.0 )
		{
                       VoronoiDiagram vd;

                        std::vector<Vector2D> vd_cont;
                        for ( auto o = wm.opponentsFromSelf().begin();
                                o != wm.opponentsFromSelf().end();
                                ++o )
                        {
                                   vd.addPoint((*o)->pos());
                        }

                        vd.compute();


			    double max_dist = -1000.0;

                            for ( VoronoiDiagram::Vector2DCont::const_iterator p = vd.vertices().begin(),
                                      end = vd.vertices().end();
                                          p != end;
                                          ++p )
                            {
						if ( (*p).x < state.ball().pos().x - 5.0 || (*p).x > 52.5 || fabs((*p).y) > 34.0 )
							continue;

						if ( ( (*p) - state.ball().pos() ).length() > 34.0 )
							continue;

						double min_dist = 1000.0;
						double our_dist = 1000.0;

                                                for ( auto of = wm.opponentsFromSelf().begin();
                                                        of != wm.opponentsFromSelf().end();
                                                        ++of )
                                                {
                                                        Vector2D tmp = (*of)->pos() - (*p);
                                                        if ( min_dist > tmp.length() )
                                                                min_dist = tmp.length();
                                                }

                                                for ( auto of = wm.teammatesFromSelf().begin();
                                                        of != wm.teammatesFromSelf().end();
                                                        ++of )
                                                {
							if ((*of)->pos().x > wm.offsideLineX() + 1.0) continue;
                                                        Vector2D tmp = (*of)->pos() - (*p);
                                                        if ( our_dist > tmp.length() )
                                                                our_dist = tmp.length();
                                                }

						Vector2D tmp = wm.self().pos() - (*p);
						if ( wm.self().pos().x < (*p).x && tmp.length() > 7.0 && our_dist > tmp.length() )
                                                        our_dist = tmp.length();

					if (max_dist < min_dist - our_dist )
					{
						max_dist = min_dist - our_dist;
						best_point = (*p);
					}

			    }

                        std::vector<Vector2D> OffsideSegm_cont;
                        std::vector<Vector2D> OffsideSegm_tmpcont;

                        Vector2D y1( wm.offsideLineX(), -34.0);
                        Vector2D y2( wm.offsideLineX(), 34.0);

                        Vector2D z1( wm.offsideLineX(), -34.0);
                        Vector2D z2( wm.offsideLineX(), 34.0);

                        if (wm.ball().pos().x > 25.0)
                        {
                                if (wm.ball().pos().y < 0.0)
                                        y2.y = 20.0;
                                if (wm.ball().pos().y > 0.0)
                                        y1.y = -20.0;
                        }
                        if (wm.ball().pos().x > 36.0)
                        {
                                if (wm.ball().pos().y < 0.0)
                                        y2.y = 8.0;
                                if (wm.ball().pos().y > 0.0)
                                        y1.y = -8.0;
                        }

                                z1.x = y1.x + 6.0;
				if (z1.x > 52.5)
					z1.x = 52.0;

                                z2.x = y2.x + 6.0;
				if (z2.x > 52.5)
					z2.x = 52.0;

                                z1.y = y1.y;
                                z2.y = y2.y;


                        Line2D offsideLine (y1, y2);
                        Line2D forwardLine (z1, z2);

                            for ( VoronoiDiagram::Segment2DCont::const_iterator p = vd.segments().begin(),
                                      end = vd.segments().end();
                                          p != end;
                                          ++p )
                            {
                                Vector2D si = (*p).intersection( offsideLine );
                                Vector2D fi = (*p).intersection( forwardLine );
                                if (si.isValid() && fabs(si.y) < 34.0 && fabs(si.x) < 52.5)
                                {
                                        OffsideSegm_tmpcont.push_back(si);
                                }
                                if (fi.isValid() && fabs(fi.y) < 34.0 && fabs(fi.x) < 52.5 && wm.ball().pos().x < 37.0)
                                {
                                        OffsideSegm_tmpcont.push_back(fi);
                                }
                            }

                            for ( std::vector<Vector2D>::iterator p = OffsideSegm_tmpcont.begin(),
                                      end = OffsideSegm_tmpcont.end();
                                          p != end;
                                          ++p )
                            {

						if ( (*p).x < state.ball().pos().x - 25.0 || (*p).x > 52.5 || fabs((*p).y) > 34.0 )
							continue;

						if ( ( (*p) - state.ball().pos() ).length() > 34.0 )
							continue;


						double min_dist = 1000.0;
						double our_dist = 1000.0;

                                                for ( auto of = wm.opponentsFromSelf().begin();
                                                        of != wm.opponentsFromSelf().end();
                                                        ++of )
                                                {
                                                        Vector2D tmp = (*of)->pos() - (*p);
                                                        if ( min_dist > tmp.length() )
                                                                min_dist = tmp.length();
                                                }

                                                for ( auto  of = wm.teammatesFromSelf().begin();
                                                        of != wm.teammatesFromSelf().end();
                                                        ++of )
                                                {
							if ((*of)->pos().x > wm.offsideLineX() + 1.0) continue;
                                                        Vector2D tmp = (*of)->pos() - (*p);
                                                        if ( our_dist > tmp.length() )
                                                                our_dist = tmp.length();
                                                }

						Vector2D tmp = wm.self().pos() - (*p);
						if ( wm.self().pos().x < (*p).x && tmp.length() > 7.0 && our_dist > tmp.length() )
                                                        our_dist = tmp.length();


					if (max_dist < min_dist - our_dist )
					{
						max_dist = min_dist - our_dist;
						best_point = (*p);
					}
			    }
		}
	}


    dlog.addText( Logger::TEAM, __FILE__": best point=(%.1f %.1f)", best_point.x, best_point.y);


    point += std::max( 0.0, 40.0 - best_point.dist( state.ball().pos() ) );

//  point += std::max( 0.0, 40.0 - ServerParam::i().theirTeamGoalPos().dist( state.ball().pos() ) );

#ifdef DEBUG_PRINT
    dlog.addText( Logger::ACTION_CHAIN,
                  "(eval) eval-center (%d) state ball pos (%f, %f)",
                  evalcenter, state.ball().pos().x, state.ball().pos().y );

    dlog.addText( Logger::ACTION_CHAIN,
                  "(eval) initial value (%f)", point );
#endif

    //
    // add bonus for goal, free situation near offside line
    //
    if ( FieldAnalyzer::can_shoot_from( holder->unum() == state.self().unum(),
                                        holder->pos(),
                                        state.getPlayers( new OpponentOrUnknownPlayerPredicate( state.ourSide() ) ),
                                        VALID_PLAYER_THRESHOLD ) )
    {
        point += 1.0e+6;
#ifdef DEBUG_PRINT
        dlog.addText( Logger::ACTION_CHAIN,
                      "(eval) bonus for goal %f (%f)", 1.0e+6, point );
#endif

        if ( holder_unum == state.self().unum() )
        {
            point += 5.0e+5;
#ifdef DEBUG_PRINT
            dlog.addText( Logger::ACTION_CHAIN,
                          "(eval) bonus for goal self %f (%f)", 5.0e+5, point );
#endif
        }
    }

    return point;
}

```

---

## 12. /src/player/planner/field_analyzer.cpp

```cpp
// -*-c++-*-

/*!
  \file field_analyzer.cpp
  \brief miscellaneous field analysis Source File
*/

/*
 *Copyright:

 Copyright (C) Hidehisa AKIYAMA, Hiroki SHIMORA

 This code is free software; you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation; either version 3, or (at your option)
 any later version.

 This code is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this code; see the file COPYING.  If not, write to
 the Free Software Foundation, 675 Mass Ave, Cambridge, MA 02139, USA.

 *EndCopyright:
 */

/////////////////////////////////////////////////////////////////////

#ifdef HAVE_CONFIG_H
#include "config.h"
#endif

#include "field_analyzer.h"
#include "predict_state.h"
#include "pass_checker.h"

#include "basic_actions/kick_table.h"

#include <rcsc/player/world_model.h>
#include <rcsc/player/player_predicate.h>
#include <rcsc/player/world_model.h>
#include <rcsc/player/player_object.h>
#include <rcsc/common/server_param.h>
#include <rcsc/common/player_type.h>
#include <rcsc/common/logger.h>
#include <rcsc/timer.h>
#include <rcsc/math_util.h>

#include <algorithm>

//#define DEBUG_PRINT
// #define DEBUG_PREDICT_PLAYER_TURN_CYCLE
// #define DEBUG_CAN_SHOOT_FROM

using namespace rcsc;

/*-------------------------------------------------------------------*/
/*!

 */
FieldAnalyzer::FieldAnalyzer()
{

}

/*-------------------------------------------------------------------*/
/*!

 */
FieldAnalyzer &
FieldAnalyzer::instance()
{
    static FieldAnalyzer s_instance;
    return s_instance;
}

/*-------------------------------------------------------------------*/
/*!

 */
double
FieldAnalyzer::estimate_virtual_dash_distance( const rcsc::AbstractPlayerObject * player )
{
    const int pos_count = std::min( 10, // Magic Number
                                    std::min( player->seenPosCount(),
                                              player->posCount() ) );
    const double max_speed = player->playerTypePtr()->realSpeedMax() * 0.8; // Magic Number

    double d = 0.0;
    for ( int i = 1; i <= pos_count; ++i ) // start_value==1 to set the initial_value<1
    {
        //d += max_speed * std::exp( - (i*i) / 20.0 ); // Magic Number
        d += max_speed * std::exp( - (i*i) / 15.0 ); // Magic Number
    }

    return d;
}

/*-------------------------------------------------------------------*/
/*!

 */
int
FieldAnalyzer::predict_player_turn_cycle( const rcsc::PlayerType * ptype,
                                          const rcsc::AngleDeg & player_body,
                                          const double & player_speed,
                                          const double & target_dist,
                                          const rcsc::AngleDeg & target_angle,
                                          const double & dist_thr,
                                          const bool use_back_dash )
{
    const ServerParam & SP = ServerParam::i();

    int n_turn = 0;

    double angle_diff = ( target_angle - player_body ).abs();

    if ( use_back_dash
         && target_dist < 5.0 // Magic Number
         && angle_diff > 90.0
         && SP.minDashPower() < -SP.maxDashPower() + 1.0 )
    {
        angle_diff = std::fabs( angle_diff - 180.0 );    // assume backward dash
    }

    double turn_margin = 180.0;
    if ( dist_thr < target_dist )
    {
        turn_margin = std::max( 15.0, // Magic Number
                                rcsc::AngleDeg::asin_deg( dist_thr / target_dist ) );
    }

    double speed = player_speed;
    while ( angle_diff > turn_margin )
    {
        angle_diff -= ptype->effectiveTurn( SP.maxMoment(), speed );
        speed *= ptype->playerDecay();
        ++n_turn;
    }

#ifdef DEBUG_PREDICT_PLAYER_TURN_CYCLE
    dlog.addText( Logger::ANALYZER,
                  "(predict_player_turn_cycle) angleDiff=%.3f turnMargin=%.3f nTurn=%d",
                  angle_diff);
#endif

    return n_turn;
}

/*-------------------------------------------------------------------*/
/*!

 */
int
FieldAnalyzer::predict_self_reach_cycle( const WorldModel & wm,
                                         const Vector2D & target_point,
                                         const double & dist_thr,
                                         const int wait_cycle,
                                         const bool save_recovery,
                                         StaminaModel * stamina )
{
    if ( wm.self().inertiaPoint( wait_cycle ).dist2( target_point ) < std::pow( dist_thr, 2 ) )
    {
        return 0;
    }

    const ServerParam & SP = ServerParam::i();
    const PlayerType & ptype = wm.self().playerType();
    const double recover_dec_thr = SP.recoverDecThrValue();

    const double first_speed = wm.self().vel().r() * std::pow( ptype.playerDecay(), wait_cycle );

    StaminaModel first_stamina_model = wm.self().staminaModel();
    if ( wait_cycle > 0 )
    {
        first_stamina_model.simulateWaits( ptype, wait_cycle );
    }

    for ( int cycle = std::max( 0, wait_cycle ); cycle < 30; ++cycle )
    {
        const Vector2D inertia_pos = wm.self().inertiaPoint( cycle );
        const double target_dist = inertia_pos.dist( target_point );

        if ( target_dist < dist_thr )
        {
            return cycle;
        }

        double dash_dist = target_dist - dist_thr * 0.5;

        if ( dash_dist > ptype.realSpeedMax() * ( cycle - wait_cycle ) )
        {
            continue;
        }

        AngleDeg target_angle = ( target_point - inertia_pos ).th();

        //
        // turn
        //

        int n_turn = predict_player_turn_cycle( &ptype,
                                                wm.self().body(),
                                                first_speed,
                                                target_dist,
                                                target_angle,
                                                dist_thr,
                                                false );
        if ( wait_cycle + n_turn >= cycle )
        {
            continue;
        }

        StaminaModel stamina_model = first_stamina_model;
        if ( n_turn > 0 )
        {
            stamina_model.simulateWaits( ptype, n_turn );
        }

        //
        // dash
        //

        int n_dash = ptype.cyclesToReachDistance( dash_dist );
        if ( wait_cycle + n_turn + n_dash > cycle )
        {
            continue;
        }

        double speed = first_speed * std::pow( ptype.playerDecay(), n_turn );
        double reach_dist = 0.0;

        n_dash = 0;
        while ( wait_cycle + n_turn + n_dash < cycle )
        {
            double dash_power = std::min( SP.maxDashPower(), stamina_model.stamina() );
            if ( save_recovery
                 && stamina_model.stamina() - dash_power < recover_dec_thr )
            {
                dash_power = std::max( 0.0, stamina_model.stamina() - recover_dec_thr );
                if ( dash_power < 1.0 )
                {
                    break;
                }
            }

            double accel = dash_power * ptype.dashPowerRate() * stamina_model.effort();
            speed += accel;
            if ( speed > ptype.playerSpeedMax() )
            {
                speed = ptype.playerSpeedMax();
            }

            reach_dist += speed;
            speed *= ptype.playerDecay();

            stamina_model.simulateDash( ptype, dash_power );

            ++n_dash;

            if ( reach_dist >= dash_dist )
            {
                break;
            }
        }

        if ( reach_dist >= dash_dist )
        {
            if ( stamina )
            {
                *stamina = stamina_model;
            }
            return wait_cycle + n_turn + n_dash;
        }
    }

    return 1000;
}

/*-------------------------------------------------------------------*/
/*!

 */
int
FieldAnalyzer::predict_player_reach_cycle( const AbstractPlayerObject * player,
                                           const Vector2D & target_point,
                                           const double & dist_thr,
                                           const double & penalty_distance,
                                           const int body_count_thr,
                                           const int default_n_turn,
                                           const int wait_cycle,
                                           const bool use_back_dash )
{
    const PlayerType * ptype = player->playerTypePtr();

    const Vector2D & first_player_pos = ( player->seenPosCount() <= player->posCount()
                                          ? player->seenPos()
                                          : player->pos() );
    const Vector2D & first_player_vel = ( player->seenVelCount() <= player->velCount()
                                          ? player->seenVel()
                                          : player->vel() );
    const double first_player_speed = first_player_vel.r() * std::pow( ptype->playerDecay(), wait_cycle );

    int final_reach_cycle = -1;
    {
        Vector2D inertia_pos = ptype->inertiaFinalPoint( first_player_pos, first_player_vel );
        double target_dist = inertia_pos.dist( target_point );

        int n_turn = ( player->bodyCount() > body_count_thr
                       ? default_n_turn
                       : predict_player_turn_cycle( ptype,
                                                    player->body(),
                                                    first_player_speed,
                                                    target_dist,
                                                    ( target_point - inertia_pos ).th(),
                                                    dist_thr,
                                                    use_back_dash ) );
        int n_dash = ptype->cyclesToReachDistance( target_dist + penalty_distance );

        final_reach_cycle = wait_cycle + n_turn + n_dash;
    }

    const int max_cycle = 6; // Magic Number

    if ( final_reach_cycle > max_cycle )
    {
        return final_reach_cycle;
    }

    for ( int cycle = std::max( 0, wait_cycle ); cycle <= max_cycle; ++cycle )
    {
        Vector2D inertia_pos = ptype->inertiaPoint( first_player_pos, first_player_vel, cycle );
        double target_dist = inertia_pos.dist( target_point ) + penalty_distance;

        if ( target_dist < dist_thr )
        {
            return cycle;
        }

        double dash_dist = target_dist - dist_thr * 0.5;

        if ( dash_dist < 0.001 )
        {
            return cycle;
        }

        if ( dash_dist > ptype->realSpeedMax() * ( cycle - wait_cycle ) )
        {
            continue;
        }

        int n_dash = ptype->cyclesToReachDistance( dash_dist );

        if ( wait_cycle + n_dash > cycle )
        {
            continue;
        }

        int n_turn = ( player->bodyCount() > body_count_thr
                       ? default_n_turn
                       : predict_player_turn_cycle( ptype,
                                                    player->body(),
                                                    first_player_speed,
                                                    target_dist,
                                                    ( target_point - inertia_pos ).th(),
                                                    dist_thr,
                                                    use_back_dash ) );

        if ( wait_cycle + n_turn + n_dash <= cycle )
        {
            return cycle;
        }

    }

    return final_reach_cycle;
}

/*-------------------------------------------------------------------*/
/*!

 */
int
FieldAnalyzer::predict_kick_count( const WorldModel & wm,
                                   const AbstractPlayerObject * kicker,
                                   const double & first_ball_speed,
                                   const AngleDeg & ball_move_angle )
{
    if ( wm.gameMode().type() != GameMode::PlayOn
         && ! wm.gameMode().isPenaltyKickMode() )
    {
        return 1;
    }

    if ( kicker->unum() == wm.self().unum()
         && wm.self().isKickable() )
    {
        Vector2D max_vel = KickTable::calc_max_velocity( ball_move_angle,
                                                         wm.self().kickRate(),
                                                         wm.ball().vel() );
        if ( max_vel.r2() >= std::pow( first_ball_speed, 2 ) )
        {
            return 1;
        }
    }

    if ( first_ball_speed > 2.5 )
    {
        return 3;
    }
    else if ( first_ball_speed > 1.5 )
    {
        return 2;
    }

    return 1;
}


/*-------------------------------------------------------------------*/
/*!

 */
Vector2D
FieldAnalyzer::get_ball_field_line_cross_point( const Vector2D & ball_from,
                                                const Vector2D & ball_to,
                                                const Vector2D & p1,
                                                const Vector2D & p2,
                                                const double field_back_offset )
{
    const Segment2D line( p1, p2 );
    const Segment2D ball_segment( ball_from, ball_to );

    const Vector2D cross_point = ball_segment.intersection( line, true );

    if ( cross_point.isValid() )
    {
        if ( Vector2D( ball_to - ball_from ).r() <= EPS )
        {
            return cross_point;
        }

        return cross_point
            + Vector2D::polar2vector
            ( field_back_offset,
              Vector2D( ball_from - ball_to ).th() );
    }

    return ball_to;
}

/*-------------------------------------------------------------------*/
/*!

 */
Vector2D
FieldAnalyzer::get_field_bound_predict_ball_pos( const WorldModel & wm,
                                                 const int predict_step,
                                                 const double field_back_offset )
{
    const ServerParam & SP = ServerParam::i();

    const Vector2D current_pos = wm.ball().pos();
    const Vector2D predict_pos = wm.ball().inertiaPoint( predict_step );

    const double wid = SP.pitchHalfWidth();
    const double len = SP.pitchHalfLength();

    const Vector2D corner_1( +len, +wid );
    const Vector2D corner_2( +len, -wid );
    const Vector2D corner_3( -len, -wid );
    const Vector2D corner_4( -len, +wid );

    const Rect2D pitch_rect = Rect2D::from_center( Vector2D( 0.0, 0.0 ),
                                                   len * 2, wid * 2 );

    if ( ! pitch_rect.contains( current_pos )
         && ! pitch_rect.contains( predict_pos ) )
    {
        const Vector2D result( bound( -len, current_pos.x, +len ),
                               bound( -wid, current_pos.y, +wid ) );

        dlog.addText( Logger::TEAM,
                      __FILE__": getBoundPredictBallPos "
                      "out of field, "
                      "current_pos = [%f, %f], predict_pos = [%f, %f], "
                      "result = [%f, %f]",
                      current_pos.x, current_pos.y,
                      predict_pos.x, predict_pos.y,
                      result.x, result.y );

        return result;
    }


    const Vector2D p0 = predict_pos;
    const Vector2D p1 = get_ball_field_line_cross_point( current_pos, p0, corner_1, corner_2, field_back_offset );
    const Vector2D p2 = get_ball_field_line_cross_point( current_pos, p1, corner_2, corner_3, field_back_offset );
    const Vector2D p3 = get_ball_field_line_cross_point( current_pos, p2, corner_3, corner_4, field_back_offset );
    const Vector2D p4 = get_ball_field_line_cross_point( current_pos, p3, corner_4, corner_1, field_back_offset );

    dlog.addText( Logger::TEAM,
                  __FILE__": getBoundPredictBallPos "
                  "current_pos = [%f, %f], predict_pos = [%f, %f], "
                  "result = [%f, %f]",
                  current_pos.x, current_pos.y,
                  predict_pos.x, predict_pos.y,
                  p4.x, p4.y );

    return p4;
}



/*-------------------------------------------------------------------*/
/*!

 */
namespace {

struct Player {
    const AbstractPlayerObject * player_;
    AngleDeg angle_from_pos_;
    double hide_angle_;

    Player( const AbstractPlayerObject * player,
            const Vector2D & pos )
        : player_( player ),
          angle_from_pos_(),
          hide_angle_( 0.0 )
      {
          Vector2D inertia_pos = player->inertiaFinalPoint();
          double control_dist = ( player->goalie()
                                  ? ServerParam::i().catchAreaLength()
                                  : player->playerTypePtr()->kickableArea() );
          double hide_angle_radian = std::asin( std::min( control_dist / inertia_pos.dist( pos ),
                                                          1.0 ) );

          angle_from_pos_ = ( inertia_pos - pos ).th();
          hide_angle_ = hide_angle_radian * AngleDeg::RAD2DEG;
      }

    struct Compare {
        bool operator()( const Player & lhs,
                         const Player & rhs ) const
          {
              return lhs.angle_from_pos_.degree() < rhs.angle_from_pos_.degree();
          }
    };
};

}

/*-------------------------------------------------------------------*/
/*!

 */
bool
FieldAnalyzer::can_shoot_from( const bool is_self,
                               const Vector2D & pos,
                               const AbstractPlayerObject::Cont & opponents,
                               const int valid_opponent_threshold )
{
    static const double SHOOT_DIST_THR2 = std::pow( 17.0, 2 );
    //static const double SHOOT_ANGLE_THRESHOLD = 20.0;
    static const double SHOOT_ANGLE_THRESHOLD = ( is_self
                                                  ? 20.0
                                                  : 15.0 );
    static const double OPPONENT_DIST_THR2 = std::pow( 20.0, 2 );

    if ( ServerParam::i().theirTeamGoalPos().dist2( pos )
         > SHOOT_DIST_THR2 )
    {
        return false;
    }

#ifdef DEBUG_CAN_SHOOT_FROM
    dlog.addText( Logger::SHOOT,
                  "===== "__FILE__": (can_shoot_from) pos=(%.1f %.1f) ===== ",
                  pos.x, pos.y );
#endif

    const Vector2D goal_minus( ServerParam::i().pitchHalfLength(),
                               -ServerParam::i().goalHalfWidth() + 0.5 );
    const Vector2D goal_plus( ServerParam::i().pitchHalfLength(),
                              +ServerParam::i().goalHalfWidth() - 0.5 );

    const AngleDeg goal_minus_angle = ( goal_minus - pos ).th();
    const AngleDeg goal_plus_angle = ( goal_plus - pos ).th();

    //
    // create opponent list
    //

    std::vector< Player > opponent_candidates;
    opponent_candidates.reserve( opponents.size() );

    for ( AbstractPlayerObject::Cont::const_iterator o = opponents.begin(),
              end = opponents.end();
          o != end;
          ++o )
    {
        if ( (*o)->posCount() > valid_opponent_threshold )
        {
            continue;
        }

        if ( (*o)->pos().dist2( pos ) > OPPONENT_DIST_THR2 )
        {
            continue;
        }

        opponent_candidates.push_back( Player( *o, pos ) );
#ifdef DEBUG_CAN_SHOOT_FROM
        dlog.addText( Logger::SHOOT,
                      "(can_shoot_from) (opponent:%d) pos=(%.1f %.1f) angleFromPos=%.1f hideAngle=%.1f",
                      opponent_candidates.back().player_->unum(),
                      opponent_candidates.back().player_->pos().x,
                      opponent_candidates.back().player_->pos().y,
                      opponent_candidates.back().angle_from_pos_.degree(),
                      opponent_candidates.back().hide_angle_ );
#endif
    }

    //
    // TODO: improve the search algorithm (e.g. consider only angle width between opponents)
    //
    // std::sort( opponent_candidates.begin(), opponent_candidates.end(),
    //            Opponent::Compare() );

    const double angle_width = ( goal_plus_angle - goal_minus_angle ).abs();
    const double angle_step = std::max( 2.0, angle_width / 10.0 );

    const std::vector< Player >::const_iterator end = opponent_candidates.end();

    double max_angle_diff = 0.0;

    for ( double a = 0.0; a < angle_width + 0.001; a += angle_step )
    {
        const AngleDeg shoot_angle = goal_minus_angle + a;

        double min_angle_diff = 180.0;
        for ( std::vector< Player >::const_iterator o = opponent_candidates.begin();
              o != end;
              ++o )
        {
            double angle_diff = ( o->angle_from_pos_ - shoot_angle ).abs();

#ifdef DEBUG_CAN_SHOOT_FROM
            dlog.addText( Logger::SHOOT,
                          "(can_shoot_from) __ opp=%d rawAngleDiff=%.1f -> %.1f",
                          o->player_->unum(),
                          angle_diff, angle_diff - o->hide_angle_*0.5 );
#endif
            if ( is_self )
            {
                angle_diff -= o->hide_angle_;
            }
            else
            {
                angle_diff -= o->hide_angle_*0.5;
            }

            if ( angle_diff < min_angle_diff )
            {
                min_angle_diff = angle_diff;

                if ( min_angle_diff < SHOOT_ANGLE_THRESHOLD )
                {
                    break;
                }
            }
        }

        if ( min_angle_diff > max_angle_diff )
        {
            max_angle_diff = min_angle_diff;
        }

#ifdef DEBUG_CAN_SHOOT_FROM
        dlog.addText( Logger::SHOOT,
                      "(can_shoot_from) shootAngle=%.1f minAngleDiff=%.1f",
                      shoot_angle.degree(),
                      min_angle_diff );
#endif
    }

#ifdef DEBUG_CAN_SHOOT_FROM
        dlog.addText( Logger::SHOOT,
                      "(can_shoot_from) maxAngleDiff=%.1f",
                      max_angle_diff );
#endif

    return max_angle_diff >= SHOOT_ANGLE_THRESHOLD;
}

/*-------------------------------------------------------------------*/
/*!

 */
bool
FieldAnalyzer::opponent_can_shoot_from( const Vector2D & pos,
                                        const AbstractPlayerObject::Cont & teammates,
                                        const int valid_teammate_threshold,
                                        const double shoot_dist_threshold,
                                        const double shoot_angle_threshold,
                                        const double teammate_dist_threshold,
                                        double * max_angle_diff_result,
                                        const bool calculate_detail )
{
    const double DEFAULT_SHOOT_DIST_THR = 40.0;
    const double DEFAULT_SHOOT_ANGLE_THR = 12.0;
    const double DEFAULT_TEAMMATE_DIST_THR2 = std::pow( 40.0, 2 );

    const double SHOOT_DIST_THR = ( shoot_dist_threshold > 0.0
                                    ? shoot_dist_threshold
                                    : DEFAULT_SHOOT_DIST_THR );
    const double SHOOT_ANGLE_THR = ( shoot_angle_threshold > 0.0
                                     ? shoot_angle_threshold
                                     : DEFAULT_SHOOT_ANGLE_THR );
    const double TEAMMATE_DIST_THR2 = ( teammate_dist_threshold > 0.0
                                        ? std::pow( teammate_dist_threshold, 2 )
                                        : DEFAULT_TEAMMATE_DIST_THR2 );

#ifdef DEBUG_CAN_SHOOT_FROM
    dlog.addText( Logger::SHOOT,
                  "===== "__FILE__": (opponent_can_shoot_from) from pos=(%.1f %.1f), n_teammates = %u ===== ",
                  pos.x, pos.y, static_cast< unsigned int >( teammates.size() ) );

    dlog.addText( Logger::SHOOT,
                  "(opponent_can_shoot_from) valid_teammate_threshold = %d",
                  valid_teammate_threshold );
    dlog.addText( Logger::SHOOT,
                  "(opponent_can_shoot_from) shoot_angle_threshold = %.2f",
                  SHOOT_ANGLE_THR );
    dlog.addText( Logger::SHOOT,
                  "(opponent_can_shoot_from) shoot_dist_threshold = %.2f",
                  SHOOT_DIST_THR );
    dlog.addText( Logger::SHOOT,
                  "(opponent_can_shoot_from) teammate_dist_threshold^2 = %.2f",
                  TEAMMATE_DIST_THR2 );
#endif

    if ( get_dist_from_our_near_goal_post( pos ) > SHOOT_DIST_THR )
    {
        if ( max_angle_diff_result )
        {
            *max_angle_diff_result = 0.0;
        }

        return false;
    }

    //
    // create teammate list
    //
    std::vector< Player > teammate_candidates;
    teammate_candidates.reserve( teammates.size() );

    for ( AbstractPlayerObject::Cont::const_iterator t = teammates.begin(),
              end = teammates.end();
          t != end;
          ++t )
    {
        if ( (*t)->posCount() > valid_teammate_threshold )
        {
#ifdef DEBUG_CAN_SHOOT_FROM
            dlog.addText( Logger::SHOOT,
                          "(opponent_can_shoot_from) skip teammate %d, too big pos count, pos count = %d",
                          (*t)->unum(), (*t)->posCount() );
#endif
            continue;
        }

        if ( (*t)->pos().dist2( pos ) > TEAMMATE_DIST_THR2 )
        {
#ifdef DEBUG_CAN_SHOOT_FROM
            dlog.addText( Logger::SHOOT,
                          "(opponent_can_shoot_from) skip teammate %d, too far from point, dist^2 = %f, pos = (%.2f, %.2f), teammate pos = (%.2f, %.2f)",
                          (*t)->unum(), (*t)->pos().dist2( pos ),
                          pos.x, pos.y, (*t) ->pos().x, (*t) ->pos().y );
#endif
            continue;
        }

        teammate_candidates.push_back( Player( *t, pos ) );
#ifdef DEBUG_CAN_SHOOT_FROM
        dlog.addText( Logger::SHOOT,
                      "(opponent_can_shoot_from) (teammate:%d) pos=(%.1f %.1f) angleFromPos=%.1f hideAngle=%.1f",
                      teammate_candidates.back().player_->unum(),
                      teammate_candidates.back().player_->pos().x,
                      teammate_candidates.back().player_->pos().y,
                      teammate_candidates.back().angle_from_pos_.degree(),
                      teammate_candidates.back().hide_angle_ );
#endif
    }

    //
    // TODO: improve the search algorithm (e.g. consider only angle width between opponents)
    //
    // std::sort( opponent_candidates.begin(), opponent_candidates.end(),
    //            Opponent::Compare() );

    const Vector2D goal_minus( -ServerParam::i().pitchHalfLength(),
                               -ServerParam::i().goalHalfWidth() + 0.5 );
    const Vector2D goal_plus( -ServerParam::i().pitchHalfLength(),
                              +ServerParam::i().goalHalfWidth() - 0.5 );

    const AngleDeg goal_minus_angle = ( goal_minus - pos ).th();
    const AngleDeg goal_plus_angle = ( goal_plus - pos ).th();

    const double angle_width = ( goal_plus_angle - goal_minus_angle ).abs();
#ifdef DEBUG_CAN_SHOOT_FROM
    dlog.addText( Logger::SHOOT,
                  "(opponent_can_shoot_from) angle_width = %.2f,"
                  " goal_plus_angle = %.2f, goal_minus_angle = %2f",
                  angle_width, goal_plus_angle.degree(), goal_minus_angle.degree() );
#endif
    const double angle_step = std::max( 2.0, angle_width / 10.0 );

    double max_angle_diff = 0.0;

    const std::vector< Player >::const_iterator begin = teammate_candidates.begin();
    const std::vector< Player >::const_iterator end = teammate_candidates.end();

    for ( double a = 0.0; a < angle_width + 0.001; a += angle_step )
    {
        const AngleDeg shoot_angle = goal_minus_angle - a;
#ifdef DEBUG_CAN_SHOOT_FROM
        dlog.addText( Logger::SHOOT,
                      "(opponent_can_shoot_from) shoot_angle = %.2f",
                      shoot_angle.degree() );
#endif

        double min_angle_diff = 180.0;
        for ( std::vector< Player >::const_iterator t = begin;
              t != end;
              ++t )
        {
            double angle_diff = ( t->angle_from_pos_ - shoot_angle ).abs();

#ifdef DEBUG_CAN_SHOOT_FROM
            dlog.addText( Logger::SHOOT,
                          "(opponent_can_shoot_from)__ teammate=%d rawAngleDiff=%.2f -> %.2f",
                          (*t).player_->unum(),
                          angle_diff, angle_diff - t->hide_angle_ );
#endif

            //angle_diff -= t->hide_angle_;
            angle_diff -= t->hide_angle_*0.5;

            if ( angle_diff < min_angle_diff )
            {
                min_angle_diff = angle_diff;

                if ( min_angle_diff < SHOOT_ANGLE_THR )
                {
                    if ( ! calculate_detail )
                    {
#ifdef DEBUG_CAN_SHOOT_FROM
                        dlog.addText( Logger::SHOOT,
                                      "(opponent_can_shoot_from)__ min_angle_diff < SHOOT_ANGLE_THR: skip other teammates" );
#endif

                        break;
                    }
                }
            }
        }

        if ( min_angle_diff > max_angle_diff )
        {
            max_angle_diff = min_angle_diff;
        }

#ifdef DEBUG_CAN_SHOOT_FROM
        dlog.addText( Logger::SHOOT,
                      "(opponent_can_shoot_from) shootAngle=%.2f minAngleDiff=%.2f",
                      shoot_angle.degree(),
                      min_angle_diff );
#endif
    }

    const bool result = ( max_angle_diff >= SHOOT_ANGLE_THR );
    if ( max_angle_diff_result )
    {
        *max_angle_diff_result = max_angle_diff;
    }

#ifdef DEBUG_CAN_SHOOT_FROM
    dlog.addText( Logger::SHOOT,
                  "(opponent_can_shoot_from) maxAngleDiff=%.2f, result = %s",
                  max_angle_diff, ( result? "true" : "false" ) );
#endif

    return result;
}

/*-------------------------------------------------------------------*/
/*!

 */
// double
// FieldAnalyzer::get_dist_player_nearest_to_point( const Vector2D & point,
//                                                  const PlayerCont & players,
//                                                  const int count_thr )
// {
//     double min_dist2 = 65535.0;

//     const PlayerCont::const_iterator end = players.end();
//     for ( PlayerCont::const_iterator it = players.begin();
//           it != end;
//           ++it )
//     {
//         if ( (*it).isGhost() )
//         {
//             continue;
//         }

//         if ( count_thr != -1 )
//         {
//             if ( (*it).posCount() > count_thr )
//             {
//                 continue;
//             }
//         }

//         double d2 = (*it).pos().dist2( point );

//         if ( d2 < min_dist2 )
//         {
//             min_dist2 = d2;
//         }
//     }

//     return std::sqrt( min_dist2 );
// }

/*-------------------------------------------------------------------*/
/*!

 */
Vector2D
FieldAnalyzer::get_our_team_near_goal_post_pos( const Vector2D & point )
{
    const ServerParam & SP = ServerParam::i();

    return Vector2D( -SP.pitchHalfLength(),
                     +sign( point.y ) * SP.goalHalfWidth() );
}

/*-------------------------------------------------------------------*/
/*!

 */
Vector2D
FieldAnalyzer::get_our_team_far_goal_post_pos( const Vector2D & point )
{
    const ServerParam & SP = ServerParam::i();

    return Vector2D( -SP.pitchHalfLength(),
                     -sign( point.y ) * SP.goalHalfWidth() );
}

/*-------------------------------------------------------------------*/
/*!

 */
Vector2D
FieldAnalyzer::get_opponent_team_near_goal_post_pos( const Vector2D & point )
{
    const ServerParam & SP = ServerParam::i();

    return Vector2D( +SP.pitchHalfLength(),
                     +sign( point.y ) * SP.goalHalfWidth() );
}

/*-------------------------------------------------------------------*/
/*!

 */
Vector2D
FieldAnalyzer::get_opponent_team_far_goal_post_pos( const Vector2D & point )
{
    const ServerParam & SP = ServerParam::i();

    return Vector2D( +SP.pitchHalfLength(),
                     -sign( point.y ) * SP.goalHalfWidth() );
}

/*-------------------------------------------------------------------*/
/*!

 */
double
FieldAnalyzer::get_dist_from_our_near_goal_post( const Vector2D & point )
{
    const ServerParam & SP = ServerParam::i();

    return std::min( point.dist( Vector2D
                                 ( - SP.pitchHalfLength(),
                                   - SP.goalHalfWidth() ) ),
                     point.dist( Vector2D
                                 ( - SP.pitchHalfLength(),
                                   + SP.goalHalfWidth() ) ) );
}

/*-------------------------------------------------------------------*/
/*!

 */
double
FieldAnalyzer::get_dist_from_opponent_near_goal_post( const Vector2D & point )
{
    const ServerParam & SP = ServerParam::i();

    return std::min( point.dist( Vector2D
                                 ( + SP.pitchHalfLength(),
                                   - SP.goalHalfWidth() ) ),
                     point.dist( Vector2D
                                 ( + SP.pitchHalfLength(),
                                   + SP.goalHalfWidth() ) ) );
}

/*-------------------------------------------------------------------*/
/*!

 */
int
FieldAnalyzer::get_pass_count( const PredictState & state,
                               const PassChecker & pass_checker,
                               const double first_ball_speed,
                               const int max_count )
{
    const AbstractPlayerObject * from = state.ballHolder();

    if ( ! from )
    {
        dlog.addText( Logger::ANALYZER,
                      "get_pass_count: invalid ball holder" );
        return 0;
    }


    int pass_count = 0;
    for ( PredictPlayerObject::Cont::const_iterator it = state.ourPlayers().begin(),
              end = state.ourPlayers().end();
          it != end;
          ++it )
    {
        if ( ! (*it)->isValid()
             || (*it)->unum() == from->unum() )
        {
            continue;
        }

        if ( pass_checker( state, *from, **it, (*it)->pos(), first_ball_speed ) )
        {
            pass_count ++;

            if ( max_count >= 0
                 && pass_count >= max_count )
            {
                return max_count;
            }
        }
    }

    return pass_count;
}

/*-------------------------------------------------------------------*/
/*!

 */
bool
FieldAnalyzer::is_ball_moving_to_our_goal( const Vector2D & ball_pos,
                                           const Vector2D & ball_vel,
                                           const double & post_buffer )
{
    const double goal_half_width = ServerParam::i().goalHalfWidth();
    const double goal_line_x = ServerParam::i().ourTeamGoalLineX();
    const Vector2D goal_plus_post( goal_line_x,
                                   +goal_half_width + post_buffer );
    const Vector2D goal_minus_post( goal_line_x,
                                    -goal_half_width - post_buffer );
    const AngleDeg ball_angle = ball_vel.th();

    return ( ( ( goal_plus_post - ball_pos ).th() - ball_angle ).degree() < 0
             && ( ( goal_minus_post - ball_pos ).th() - ball_angle ).degree() > 0 );
}

/*-------------------------------------------------------------------*/
/*!

 */
bool
FieldAnalyzer::to_be_final_action( const PredictState & state )
{
    return to_be_final_action( state.ball().pos(), state.theirDefensePlayerLineX() );
}

/*-------------------------------------------------------------------*/
/*!

 */
bool
FieldAnalyzer::to_be_final_action( const WorldModel & wm )
{
    return to_be_final_action( wm.ball().pos(), wm.theirDefensePlayerLineX() );
}

/*-------------------------------------------------------------------*/
/*!

 */
bool
FieldAnalyzer::to_be_final_action( const Vector2D & ball_pos,
                                   const double their_defense_player_line_x )
{
    // if near opponent goal, search next action such as shoot
    if ( ball_pos.x > 30.0 )
    {
        return false;
    }

    // if over offside line, final action
    if ( ball_pos.x > their_defense_player_line_x )
    {
        return true;
    }
    else
    {
        return false;
    }
}

/*-------------------------------------------------------------------*/
/*!

 */
const AbstractPlayerObject *
FieldAnalyzer::get_blocker( const WorldModel & wm,
                            const Vector2D & opponent_pos )
{
    return get_blocker( wm,
                        opponent_pos,
                        Vector2D( -ServerParam::i().pitchHalfLength()*0.6
                                  + ServerParam::i().ourPenaltyAreaLineX()*0.4,
                                  0.0 ) );
}

/*-------------------------------------------------------------------*/
/*!

 */
const AbstractPlayerObject *
FieldAnalyzer::get_blocker( const WorldModel & wm,
                            const Vector2D & opponent_pos,
                            const Vector2D & base_pos )
{
    static const double min_dist_thr2 = std::pow( 1.0, 2 );
    static const double max_dist_thr2 = std::pow( 4.0, 2 );
    static const double angle_thr = 15.0;

    const AngleDeg attack_angle = ( base_pos - opponent_pos ).th();

    for ( AbstractPlayerObject::Cont::const_iterator t = wm.ourPlayers().begin(),
              end = wm.ourPlayers().end();
          t != end;
          ++t )
    {
        if ( (*t)->goalie() ) continue;
        if ( (*t)->posCount() >= 5 ) continue;
        if ( (*t)->unumCount() >= 10 ) continue;
        if ( (*t)->ghostCount() >= 2 ) continue;

        double d2 = opponent_pos.dist2( (*t)->pos() );
        if ( d2 < min_dist_thr2
             || max_dist_thr2 < d2 )
        {
            continue;
        }

        AngleDeg teammate_angle = ( (*t)->pos() - opponent_pos ).th();

        if ( ( teammate_angle - attack_angle ).abs() < angle_thr )
        {
            return *t;
        }
    }

    return static_cast< const AbstractPlayerObject * >( 0 );
}

/*-------------------------------------------------------------------*/
/*!

 */
void
FieldAnalyzer::update( const WorldModel & wm )
{
    static GameTime s_update_time( 0, 0 );

    if ( s_update_time == wm.time() )
    {
        return;
    }
    s_update_time = wm.time();

    if ( wm.gameMode().type() == GameMode::BeforeKickOff
         || wm.gameMode().type() == GameMode::AfterGoal_
         || wm.gameMode().isPenaltyKickMode() )
    {
        return;
    }

#ifdef DEBUG_PRINT
    Timer timer;
#endif

    // updateVoronoiDiagram( wm );

#ifdef DEBUG_PRINT
    dlog.addText( Logger::TEAM,
                  "FieldAnalyzer::update() elapsed %f [ms]",
                  timer.elapsedReal() );
    writeDebugLog();
#endif

}

/*-------------------------------------------------------------------*/
/*!

 */
void
FieldAnalyzer::updateVoronoiDiagram( const WorldModel & wm )
{
    const Rect2D rect = Rect2D::from_center( 0.0, 0.0,
                                             ServerParam::i().pitchLength() - 10.0,
                                             ServerParam::i().pitchWidth() - 10.0 );

    M_all_players_voronoi_diagram.clear();
    M_teammates_voronoi_diagram.clear();
    M_pass_voronoi_diagram.clear();

    const SideID our = wm.ourSide();

    for ( AbstractPlayerObject::Cont::const_iterator p = wm.allPlayers().begin(),
              end = wm.allPlayers().end();
          p != end;
          ++p )
    {
        M_all_players_voronoi_diagram.addPoint( (*p)->pos() );

        if ( (*p)->side() == our )
        {
            M_teammates_voronoi_diagram.addPoint( (*p)->pos() );
        }
        else
        {
            M_pass_voronoi_diagram.addPoint( (*p)->pos() );
        }
    }

    // our goal
    M_pass_voronoi_diagram.addPoint( Vector2D( - ServerParam::i().pitchHalfLength() + 5.5, 0.0 ) );
    //     M_pass_voronoi_diagram.addPoint( Vector2D( - ServerParam::i().pitchHalfLength() + 5.5,
    //                                                - ServerParam::i().goalHalfWidth() ) );
    //     M_pass_voronoi_diagram.addPoint( Vector2D( - ServerParam::i().pitchHalfLength() + 5.5,
    //                                                + ServerParam::i().goalHalfWidth() ) );

    // opponent side corners
    M_pass_voronoi_diagram.addPoint( Vector2D( + ServerParam::i().pitchHalfLength() + 10.0,
                                               - ServerParam::i().pitchHalfWidth() - 10.0 ) );
    M_pass_voronoi_diagram.addPoint( Vector2D( + ServerParam::i().pitchHalfLength() + 10.0,
                                               + ServerParam::i().pitchHalfWidth() + 10.0 ) );

    M_pass_voronoi_diagram.setBoundingRect( rect );

    M_all_players_voronoi_diagram.compute();
    M_teammates_voronoi_diagram.compute();
    M_pass_voronoi_diagram.compute();
}

/*-------------------------------------------------------------------*/
/*!

 */
void
FieldAnalyzer::writeDebugLog()
{

    if ( dlog.isEnabled( Logger::PASS ) )
    {
        const VoronoiDiagram::Segment2DCont::const_iterator s_end = M_pass_voronoi_diagram.resultSegments().end();
        for ( VoronoiDiagram::Segment2DCont::const_iterator s = M_pass_voronoi_diagram.resultSegments().begin();
              s != s_end;
              ++s )
        {
            dlog.addLine( Logger::PASS,
                          s->origin(), s->terminal(),
                          "#0000ff" );
        }

        const VoronoiDiagram::Ray2DCont::const_iterator r_end = M_pass_voronoi_diagram.resultRays().end();
        for ( VoronoiDiagram::Ray2DCont::const_iterator r = M_pass_voronoi_diagram.resultRays().begin();
              r != r_end;
              ++r )
        {
            dlog.addLine( Logger::PASS,
                          r->origin(), r->origin() + Vector2D::polar2vector( 20.0, r->dir() ),
                          "#0000ff" );
        }
    }
}

```
