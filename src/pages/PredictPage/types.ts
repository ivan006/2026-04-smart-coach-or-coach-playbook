export type SquadRole = "defence" | "relay" | "right-wing" | "left-wing";
export type TeamId = "home" | "away";

export type PlayerAction =
  | "hold"
  | "advance"
  | "pass"
  | "shoot"
  | "move-to-space"
  | "move-to-take"
  | "defend"
  | "tackle";

export type SquadAction = "move-to-shoot" | "move-to-space" | "move-to-take";

export interface Vec2 {
  x: number;
  y: number;
}

export interface Player {
  id: number;
  teamId: TeamId;
  squadRole: SquadRole;
  pos: Vec2;
  angle: number;
  hasBall: boolean;
  pressure: number;
  action: PlayerAction;
  homePos: Vec2;
}

export interface Squad {
  role: SquadRole;
  teamId: TeamId;
  playerIds: number[];
  hasBall: boolean;
  pressure: number;
  action: SquadAction;
}

export interface Ball {
  pos: Vec2;
  vel: Vec2;
  loose: boolean;
  ownerId: string | null; // "teamId-playerId"
}

export interface Team {
  id: TeamId;
  hasBall: boolean;
  score: number;
}

export interface GameState {
  players: Player[];
  squads: Squad[];
  ball: Ball;
  teams: Team[];
  tick: number;
}
