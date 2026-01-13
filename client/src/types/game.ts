// types/game.ts - Tipos compartidos del cliente

export type GameMode = 'sequential' | 'simultaneous';
export type Decision = 'KEEP' | 'WITHDRAW';
export type PlayerId = 'player1' | 'player2' | 'automaton';
export type PaidWhen = 'immediate' | 'deferred';

export type GameStatus =
  | 'LOBBY'
  | 'STARTING'
  | 'ROUND_DECISION'
  | 'ROUND_REVEALING'
  | 'ROUND_RESULTS'
  | 'GAME_OVER';

export interface Payoffs {
  success: number;
  withdraw: number;
  failure: number;
}

export interface PlayerProfile {
  gender: string;
  age_band: string;
  education: string;
  institutional_trust_0_10: number;
}

export interface PlayerInfo {
  playerId: PlayerId;
  playerName: string;
  socketId: string;
  connected: boolean;
  isLLM: boolean;
  profile?: PlayerProfile;
}

export interface AutomatonInfo {
  playerId: 'automaton';
  alwaysWithdraws: true;
}

export interface GameConfig {
  payoffs: Payoffs;
  totalRounds: number;
  decisionTimeoutMs: number;
  mode: GameMode;
}

export interface RoundPayoff {
  player1: number;
  player2: number;
  automaton: number;
}

export interface RoundResult {
  round: number;
  decisions: {
    player1: Decision;
    player2: Decision;
    automaton: Decision;
  };
  payoffs: RoundPayoff;
  decisionOrder: PlayerId[];
  paidWhen?: {
    player1: PaidWhen;
    player2: PaidWhen;
    automaton: PaidWhen;
  };
  seqTrace?: string;
}

export interface CurrentRound {
  roundNumber: number;
  decisions: Map<PlayerId, Decision | null>;
  decisionOrder: PlayerId[];
  revealedDecisions: PlayerId[];
  timerStartedAt: Date | null;
}

export interface GameState {
  gameId: string;
  roomCode: string;
  mode: GameMode;
  status: GameStatus;

  players: {
    player1: PlayerInfo;
    player2: PlayerInfo;
    automaton: AutomatonInfo;
  };

  config: GameConfig;
  currentRound: CurrentRound;
  roundHistory: RoundResult[];

  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;

  reconnectionTokens: {
    [key in PlayerId]?: string;
  };
}

export interface GameResultDocument {
  gameId: string;
  roomCode: string;
  mode: GameMode;
  timestamp: Date;

  rounds: {
    round: number;
    decisions: {
      player1: Decision;
      player2: Decision;
      automaton: Decision;
    };
    payoffs: RoundPayoff;
    decisionOrder: string[];
    paidWhen?: {
      player1: PaidWhen;
      player2: PaidWhen;
      automaton: PaidWhen;
    };
    seqTrace?: string;
  }[];

  totalPayoffs: RoundPayoff;
  playerTypes: ('human' | 'llm')[];

  sessionMetadata: {
    roomCode?: string;
    llmModel?: string;
    llmResponses: string[];
    playerProfiles?: {
      player1?: PlayerProfile;
      player2?: PlayerProfile;
    };
  };

  reconnectionTokens: {
    [key: string]: string;
  };
}
