// stores/gameStore.ts - Zustand store para el estado global del juego

import { create } from 'zustand';
import type { GameState, RoundResult, PlayerId, GameMode, ChatMessage } from '../types/game';

interface GameStore {
  // Estado del juego
  gameState: GameState | null;
  roomCode: string | null;
  myPlayerId: PlayerId | null;

  // Estado de sala de espera (antes de que exista gameState)
  waitingRoomMode: GameMode | null;
  isMultiplayerRoom: boolean;
  waitingPlayers: Array<{ playerName: string; playerId: string }>;
  waitingRoomRounds: number;

  // Estado de conexión
  connected: boolean;
  error: string | null;

  // Estado de turno en modo secuencial
  isMyTurnInSequential: boolean;
  sequentialPriorActions: string[];

  // Estado de chat
  chatMessages: ChatMessage[];
  isChatPhase: boolean;
  chatTimeRemaining: number;

  // Acciones
  setGameState: (state: GameState) => void;
  setRoomCode: (code: string) => void;
  setMyPlayerId: (id: PlayerId) => void;
  setConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
  setMyTurnInSequential: (isMyTurn: boolean, priorActions?: string[]) => void;
  setWaitingRoom: (mode: GameMode, isMultiplayer: boolean, rounds?: number) => void;
  setWaitingPlayers: (players: Array<{ playerName: string; playerId: string }>) => void;
  addWaitingPlayer: (player: { playerName: string; playerId: string }) => void;

  // Actualizaciones de ronda
  updateRoundResult: (result: RoundResult) => void;
  updateGameStatus: (status: GameState['status']) => void;

  // Acciones de chat
  addChatMessage: (message: ChatMessage) => void;
  setChatPhase: (isChat: boolean) => void;
  setChatTimeRemaining: (time: number) => void;
  clearChatMessages: () => void;

  // Reset
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  roomCode: null,
  myPlayerId: null,
  waitingRoomMode: null,
  isMultiplayerRoom: false,
  waitingPlayers: [],
  waitingRoomRounds: 5,
  connected: false,
  error: null,
  isMyTurnInSequential: false,
  sequentialPriorActions: [],
  chatMessages: [],
  isChatPhase: false,
  chatTimeRemaining: 0,

  setGameState: (state) => set({ gameState: state }),
  setRoomCode: (code) => set({ roomCode: code }),
  setMyPlayerId: (id) => set({ myPlayerId: id }),
  setConnected: (connected) => set({ connected }),
  setError: (error) => set({ error }),
  setMyTurnInSequential: (isMyTurn, priorActions = []) => set({
    isMyTurnInSequential: isMyTurn,
    sequentialPriorActions: priorActions
  }),
  setWaitingRoom: (mode, isMultiplayer, rounds = 5) => set({
    waitingRoomMode: mode,
    isMultiplayerRoom: isMultiplayer,
    waitingRoomRounds: rounds
  }),
  setWaitingPlayers: (players) => set({ waitingPlayers: players }),
  addWaitingPlayer: (player) => set((state) => ({
    waitingPlayers: [...state.waitingPlayers, player]
  })),

  updateRoundResult: (result) => set((state) => {
    if (!state.gameState) return state;
    return {
      gameState: {
        ...state.gameState,
        roundHistory: [...state.gameState.roundHistory, result],
      },
    };
  }),

  updateGameStatus: (status) => set((state) => {
    if (!state.gameState) return state;
    return {
      gameState: {
        ...state.gameState,
        status,
      },
    };
  }),

  // Acciones de chat
  addChatMessage: (message) => set((state) => ({
    chatMessages: [...state.chatMessages, message]
  })),

  setChatPhase: (isChat) => set({ isChatPhase: isChat }),

  setChatTimeRemaining: (time) => set({ chatTimeRemaining: time }),

  clearChatMessages: () => set({ chatMessages: [] }),

  reset: () => set({
    gameState: null,
    roomCode: null,
    myPlayerId: null,
    waitingRoomMode: null,
    isMultiplayerRoom: false,
    waitingPlayers: [],
    waitingRoomRounds: 5,
    connected: false,
    error: null,
    isMyTurnInSequential: false,
    sequentialPriorActions: [],
    chatMessages: [],
    isChatPhase: false,
    chatTimeRemaining: 0,
  }),
}));
