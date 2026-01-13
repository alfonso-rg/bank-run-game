// types/socketEvents.ts - Tipos de eventos Socket.io

import type { Decision, GameState, PlayerInfo, RoundResult, GameResultDocument, GameMode, GameConfig } from './game';

// Eventos del cliente → servidor
export interface ClientToServerEvents {
  'create-room': (data: { mode: GameMode }) => void;
  'join-room': (data: { roomCode: string; playerName: string }) => void;
  'leave-room': (data: { roomCode: string }) => void;
  'start-game': (data: { roomCode: string; config?: Partial<GameConfig> }) => void;
  'submit-decision': (data: { gameId: string; decision: Decision }) => void;
  'ready-next-round': (data: { gameId: string }) => void;
  'request-reconnect': (data: { gameId: string; playerId: string }) => void;
}

// Eventos del servidor → cliente
export interface ServerToClientEvents {
  // Room management
  'room-created': (data: { roomCode: string; playerId: string }) => void;
  'room-joined': (data: { roomCode: string; players: PlayerInfo[] }) => void;
  'room-full': (data: { roomCode: string }) => void;
  'player-joined': (data: { player: PlayerInfo }) => void;
  'player-left': (data: { playerId: string }) => void;
  'player-disconnected': (data: { playerId: string }) => void;
  'player-reconnected': (data: { playerId: string; gameState: GameState }) => void;

  // Game flow
  'game-starting': (data: { gameState: GameState }) => void;
  'round-starting': (data: { roundNumber: number; decisionOrder?: string[] }) => void;
  'timer-update': (data: { startTime: number; durationMs: number; remainingMs: number }) => void;
  'decision-received': (data: { playerId: string }) => void;

  // Sequential mode specific
  'next-player-turn': (data: { position: number; priorActions: string[] }) => void;
  'decision-revealed': (data: { decision: Decision; position: number }) => void;

  // Results
  'round-complete': (data: { results: RoundResult }) => void;
  'game-over': (data: { finalResults: GameResultDocument }) => void;

  // Errors
  'error': (data: { code: string; message: string }) => void;
}
