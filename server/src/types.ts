// types.ts - Tipos compartidos para todo el proyecto

export type GameMode = 'sequential' | 'simultaneous';
export type Decision = 'KEEP' | 'WITHDRAW';
export type PlayerId = 'player1' | 'player2' | 'automaton';
export type PaidWhen = 'immediate' | 'deferred';

export type GameStatus =
  | 'LOBBY'            // Sala de espera
  | 'STARTING'         // Iniciando juego
  | 'ROUND_CHAT'       // Fase de chat pre-decision
  | 'ROUND_DECISION'   // Jugadores decidiendo
  | 'ROUND_REVEALING'  // Solo secuencial: revelando decisiones
  | 'ROUND_RESULTS'    // Mostrando resultados de ronda
  | 'GAME_OVER';       // Juego terminado

export type ChatFrequency = 'once' | 'every-round';

export interface ChatMessage {
  playerId: 'player1' | 'player2';
  message: string;
  timestamp: number;  // ms desde inicio de la fase de chat
}

export interface Payoffs {
  success: number;    // 70 ECUs cuando ambos pacientes KEEP
  withdraw: number;   // 50 ECUs para primeros 2 retiros
  failure: number;    // 20 ECUs para el resto
}

export const DEFAULT_PAYOFFS: Payoffs = {
  success: 70,
  withdraw: 50,
  failure: 20
};

export interface PlayerInfo {
  playerId: PlayerId;
  playerName: string;
  socketId: string;
  connected: boolean;
  isLLM: boolean;  // true si este jugador es controlado por LLM (solo player2 en modo vs IA)
  profile?: PlayerProfile;  // Para LLM roleplay
}

export interface PlayerProfile {
  gender: string;
  age_band: string;
  education: string;
  institutional_trust_0_10: number;
}

// El automaton es simple - siempre retira, no necesita perfil
export interface AutomatonInfo {
  playerId: 'automaton';
  alwaysWithdraws: true;
}

export interface GameConfig {
  payoffs: Payoffs;
  totalRounds: number;
  decisionTimeoutMs: number;
  mode: GameMode;
  chatEnabled: boolean;
  chatDuration: number;  // segundos (0-60)
  chatFrequency: ChatFrequency;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  payoffs: DEFAULT_PAYOFFS,
  totalRounds: 5,
  decisionTimeoutMs: 30000,  // 30 segundos
  mode: 'simultaneous',
  chatEnabled: false,
  chatDuration: 30,  // 30 segundos por defecto
  chatFrequency: 'every-round'
};

export interface RoundDecision {
  playerId: PlayerId;
  decision: Decision | null;
  timestamp: Date;
  raw?: string;  // Respuesta raw del LLM
}

export interface RoundPayoff {
  player1: number;
  player2: number;
  automaton: number;
}

export interface DecisionTimes {
  player1: number;  // ms desde inicio de ronda
  player2: number;
  automaton: number;
}

export interface RoundResult {
  round: number;
  decisions: {
    player1: Decision;
    player2: Decision;
    automaton: Decision;  // Siempre WITHDRAW
  };
  payoffs: RoundPayoff;
  decisionOrder: PlayerId[];  // Orden en que decidieron
  decisionTimes?: DecisionTimes;  // ms desde inicio de ronda
  bankRun: boolean;  // true si al menos un paciente (player1 o player2) retiró
  paidWhen?: {
    player1: PaidWhen;
    player2: PaidWhen;
    automaton: PaidWhen;
  };
  seqTrace?: string;  // Traza del flujo secuencial
  chatMessages?: ChatMessage[];  // Mensajes del chat pre-decision
}

export interface CurrentRound {
  roundNumber: number;
  decisions: Map<PlayerId, Decision | null>;
  decisionTimestamps: Map<PlayerId, number>;  // Timestamp (Date.now()) de cada decisión
  decisionOrder: PlayerId[];       // Orden aleatorio (importante para secuencial)
  revealedDecisions: PlayerId[];   // Solo modo secuencial
  timerStartedAt: Date | null;
  timerInterval?: NodeJS.Timeout;  // Para limpiar el interval
  // Chat-related fields
  chatMessages: ChatMessage[];
  chatStartedAt: Date | null;
  chatTimerInterval?: NodeJS.Timeout;
}

export interface GameState {
  gameId: string;
  roomCode: string;
  mode: GameMode;
  status: GameStatus;

  players: {
    player1: PlayerInfo;      // Siempre paciente (humano o LLM en modo singleplayer)
    player2: PlayerInfo;      // Siempre paciente (humano o LLM)
    automaton: AutomatonInfo; // Impaciente - siempre retira
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

// Tipos para MongoDB Schemas

export interface RoomDocument {
  code: string;
  mode: GameMode;
  players: {
    playerId: string;
    playerName: string;
    socketId: string;
    joinedAt: Date;
  }[];
  status: 'LOBBY' | 'IN_PROGRESS' | 'FINISHED';
  gameId?: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface GameResultDocument {
  gameId: string;
  roomCode: string;
  mode: GameMode;
  timestamp: Date;
  chatEnabled?: boolean;  // Si el juego tuvo chat habilitado

  rounds: {
    round: number;
    decisions: {
      player1: Decision;
      player2: Decision;
      automaton: Decision;  // Siempre WITHDRAW
    };
    payoffs: RoundPayoff;
    decisionOrder: string[];
    decisionTimes?: DecisionTimes;  // ms desde inicio de ronda
    bankRun: boolean;  // true si al menos un paciente retiró
    paidWhen?: {
      player1: PaidWhen;
      player2: PaidWhen;
      automaton: PaidWhen;
    };
    seqTrace?: string;
    chatMessages?: ChatMessage[];  // Mensajes del chat pre-decision
  }[];

  totalPayoffs: RoundPayoff;
  playerTypes: ('human' | 'llm')[];  // player1 y player2 solo (automaton es siempre automaton)

  sessionMetadata: {
    roomCode?: string;
    llmModel?: string;      // Solo si se usó LLM
    llmResponses: string[]; // Respuestas del LLM si player2 era LLM
    playerProfiles?: {
      player1?: PlayerProfile;
      player2?: PlayerProfile;
    };
  };

  reconnectionTokens: {
    [key: string]: string;
  };
}

// Tipos para eventos Socket.io

export interface SocketEvents {
  // Cliente → Servidor
  'create-room': (data: { mode: GameMode }) => void;
  'join-room': (data: { roomCode: string; playerName: string }) => void;
  'leave-room': (data: { roomCode: string }) => void;
  'start-game': (data: { roomCode: string; config?: Partial<GameConfig> }) => void;
  'submit-decision': (data: { gameId: string; decision: Decision }) => void;
  'ready-next-round': (data: { gameId: string }) => void;
  'request-reconnect': (data: { gameId: string; playerId: string }) => void;
  'send-chat-message': (data: { gameId: string; message: string }) => void;  // Chat

  // Servidor → Cliente
  'room-created': (data: { roomCode: string; playerId: string }) => void;
  'room-joined': (data: { roomCode: string; players: PlayerInfo[] }) => void;
  'room-full': (data: { roomCode: string }) => void;
  'player-joined': (data: { player: PlayerInfo }) => void;
  'player-left': (data: { playerId: string }) => void;
  'player-disconnected': (data: { playerId: string }) => void;
  'player-reconnected': (data: { playerId: string; gameState: GameState }) => void;

  'game-starting': (data: { gameState: GameState }) => void;
  'round-starting': (data: { roundNumber: number; decisionOrder?: string[] }) => void;
  'timer-update': (data: { startTime: number; durationMs: number; remainingMs: number; phase?: 'decision' | 'chat' }) => void;
  'decision-received': (data: { playerId: string }) => void;

  // Chat mode specific
  'chat-starting': (data: { roundNumber: number; duration: number }) => void;
  'chat-message': (data: { playerId: string; message: string; timestamp: number }) => void;
  'chat-ending': (data: { roundNumber: number; totalMessages: number }) => void;

  // Sequential mode specific
  'next-player-turn': (data: { position: number; priorActions: string[] }) => void;
  'decision-revealed': (data: { decision: Decision; position: number }) => void;

  'round-complete': (data: { results: RoundResult }) => void;
  'game-over': (data: { finalResults: GameResultDocument }) => void;

  'error': (data: { code: string; message: string }) => void;
}

// Constantes útiles

export const PLAYER_IDS: PlayerId[] = ['player1', 'player2', 'automaton'];

export const GAME_STATUSES: GameStatus[] = [
  'LOBBY',
  'STARTING',
  'ROUND_CHAT',
  'ROUND_DECISION',
  'ROUND_REVEALING',
  'ROUND_RESULTS',
  'GAME_OVER'
];

// Funciones helper de tipos

export function isValidDecision(value: any): value is Decision {
  return value === 'KEEP' || value === 'WITHDRAW';
}

export function isValidGameMode(value: any): value is GameMode {
  return value === 'sequential' || value === 'simultaneous';
}

export function isValidPlayerId(value: any): value is PlayerId {
  return PLAYER_IDS.includes(value);
}
