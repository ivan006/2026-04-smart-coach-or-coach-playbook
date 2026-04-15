export type SquadRole = "defence" | "relay" | "right-wing" | "left-wing";
export type TeamId = "home" | "away";

export type PlayerAction =
  | "hold"
  | "advance"
  | "pass"
  | "shoot"
  | "receive"
  | "prep-shoot"
  | "prep-receive"
  | "prep-pass"
  | "prep-intercept"
  | "intercept"
  | "prep-tackle"
  | "tackle"
  | "keep-distance"
  | "move-to-space"
  | "move-to-take"
  | "defend";

export type WingerSquadAction =
  | "move-to-shoot"
  | "move-to-support"
  | "move-to-space"
  | "move-to-take";
export type DefenceSquadAction = "defend-goal" | "choose-worthy-squad";
export type RelaySquadAction = "choose-worthy-squad" | "keep-position";
export type SquadAction =
  | WingerSquadAction
  | DefenceSquadAction
  | RelaySquadAction;

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
  tackleCooldown: number;
  deferring: boolean;
  scanAngle: number; // current scan rotation, independent of movement
  targetSquadRole?: SquadRole; // cached worthy squad target for relay/defence
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
  ownerId: string | null;
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
