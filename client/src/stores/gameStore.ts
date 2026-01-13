// stores/gameStore.ts - Zustand store para el estado global del juego

import { create } from 'zustand';
import type { GameState, RoundResult, PlayerId } from '../types/game';

interface GameStore {
  // Estado del juego
  gameState: GameState | null;
  roomCode: string | null;
  myPlayerId: PlayerId | null;

  // Estado de conexión
  connected: boolean;
  error: string | null;

  // Acciones
  setGameState: (state: GameState) => void;
  setRoomCode: (code: string) => void;
  setMyPlayerId: (id: PlayerId) => void;
  setConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;

  // Actualizaciones de ronda
  updateRoundResult: (result: RoundResult) => void;
  updateGameStatus: (status: GameState['status']) => void;

  // Reset
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  roomCode: null,
  myPlayerId: null,
  connected: false,
  error: null,

  setGameState: (state) => set({ gameState: state }),
  setRoomCode: (code) => set({ roomCode: code }),
  setMyPlayerId: (id) => set({ myPlayerId: id }),
  setConnected: (connected) => set({ connected }),
  setError: (error) => set({ error }),

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

  reset: () => set({
    gameState: null,
    roomCode: null,
    myPlayerId: null,
    connected: false,
    error: null,
  }),
}));
