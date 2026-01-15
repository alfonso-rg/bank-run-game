// stores/adminStore.ts - Zustand store para el panel de administración

import { create } from 'zustand';
import type { GameData, GameFilters, PaginationInfo, StatsResponse } from '../services/adminApi';

interface AdminStore {
  // Estado de autenticación
  isAuthenticated: boolean;

  // Lista de partidas
  games: GameData[];
  pagination: PaginationInfo | null;
  loading: boolean;
  error: string | null;

  // Filtros
  filters: GameFilters;

  // Partida seleccionada para ver detalle
  selectedGame: GameData | null;
  loadingDetail: boolean;

  // Estadísticas
  stats: StatsResponse | null;
  loadingStats: boolean;

  // Acciones de autenticación
  setAuthenticated: (value: boolean) => void;

  // Acciones de partidas
  setGames: (games: GameData[], pagination: PaginationInfo) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Acciones de filtros
  setFilters: (filters: GameFilters) => void;
  clearFilters: () => void;

  // Acciones de detalle
  setSelectedGame: (game: GameData | null) => void;
  setLoadingDetail: (loading: boolean) => void;

  // Acciones de estadísticas
  setStats: (stats: StatsResponse | null) => void;
  setLoadingStats: (loading: boolean) => void;

  // Reset
  reset: () => void;
}

const initialFilters: GameFilters = {
  page: 1,
  limit: 20
};

export const useAdminStore = create<AdminStore>((set) => ({
  // Estado inicial
  isAuthenticated: false,
  games: [],
  pagination: null,
  loading: false,
  error: null,
  filters: initialFilters,
  selectedGame: null,
  loadingDetail: false,
  stats: null,
  loadingStats: false,

  // Acciones
  setAuthenticated: (value) => set({ isAuthenticated: value }),

  setGames: (games, pagination) => set({ games, pagination, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters, page: filters.page || 1 }
  })),
  clearFilters: () => set({ filters: initialFilters }),

  setSelectedGame: (game) => set({ selectedGame: game }),
  setLoadingDetail: (loading) => set({ loadingDetail: loading }),

  setStats: (stats) => set({ stats }),
  setLoadingStats: (loading) => set({ loadingStats: loading }),

  reset: () => set({
    isAuthenticated: false,
    games: [],
    pagination: null,
    loading: false,
    error: null,
    filters: initialFilters,
    selectedGame: null,
    loadingDetail: false,
    stats: null,
    loadingStats: false
  })
}));
