// Servicio API para el panel de administración

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface GameFilters {
  mode?: 'sequential' | 'simultaneous';
  playerType?: 'human' | 'llm';
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface DecisionTimes {
  player1: number;
  player2: number;
  automaton: number;
}

export interface RoundData {
  round: number;
  decisions: {
    player1: 'KEEP' | 'WITHDRAW';
    player2: 'KEEP' | 'WITHDRAW';
    automaton: 'KEEP' | 'WITHDRAW';
  };
  payoffs: {
    player1: number;
    player2: number;
    automaton: number;
  };
  decisionOrder: string[];
  decisionTimes?: DecisionTimes;
  bankRun: boolean;
  paidWhen?: {
    player1: 'immediate' | 'deferred';
    player2: 'immediate' | 'deferred';
    automaton: 'immediate' | 'deferred';
  };
  seqTrace?: string;
}

export interface GameData {
  _id: string;
  gameId: string;
  roomCode: string;
  mode: 'sequential' | 'simultaneous';
  timestamp: string;
  rounds: RoundData[];
  totalPayoffs: {
    player1: number;
    player2: number;
    automaton: number;
  };
  playerTypes: ('human' | 'llm')[];
  sessionMetadata?: {
    roomCode?: string;
    llmModel?: string;
    llmResponses?: string[];
    playerProfiles?: {
      player1?: {
        gender: string;
        age_band: string;
        education: string;
        institutional_trust_0_10: number;
      };
      player2?: {
        gender: string;
        age_band: string;
        education: string;
        institutional_trust_0_10: number;
      };
    };
  };
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GamesResponse {
  games: GameData[];
  pagination: PaginationInfo;
}

export interface StatsResponse {
  totalGames: number;
  gamesByMode: Record<string, number>;
  gamesByPlayerType: Record<string, number>;
  bankRunStats: {
    totalRounds: number;
    bankRunRounds: number;
    bankRunRate: string;
  };
  recentGames: {
    gameId: string;
    roomCode: string;
    mode: string;
    timestamp: string;
  }[];
}

function getAuthHeaders(): HeadersInit {
  const password = sessionStorage.getItem('adminPassword');
  return {
    'Content-Type': 'application/json',
    'x-admin-password': password || ''
  };
}

/**
 * Verifica que la contraseña de admin es correcta
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/admin/verify`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': password
      }
    });

    if (response.ok) {
      sessionStorage.setItem('adminPassword', password);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error verifying admin password:', error);
    return false;
  }
}

/**
 * Obtiene lista paginada de partidas
 */
export async function fetchGames(filters: GameFilters = {}): Promise<GamesResponse> {
  const params = new URLSearchParams();

  if (filters.mode) params.set('mode', filters.mode);
  if (filters.playerType) params.set('playerType', filters.playerType);
  if (filters.fromDate) params.set('fromDate', filters.fromDate);
  if (filters.toDate) params.set('toDate', filters.toDate);
  if (filters.page) params.set('page', filters.page.toString());
  if (filters.limit) params.set('limit', filters.limit.toString());

  const response = await fetch(`${API_URL}/api/admin/games?${params}`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    if (response.status === 401) {
      sessionStorage.removeItem('adminPassword');
      throw new Error('Unauthorized');
    }
    throw new Error('Failed to fetch games');
  }

  return response.json();
}

/**
 * Obtiene detalle de una partida específica
 */
export async function fetchGameDetail(gameId: string): Promise<GameData> {
  const response = await fetch(`${API_URL}/api/admin/games/${gameId}`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    if (response.status === 401) {
      sessionStorage.removeItem('adminPassword');
      throw new Error('Unauthorized');
    }
    if (response.status === 404) {
      throw new Error('Game not found');
    }
    throw new Error('Failed to fetch game detail');
  }

  return response.json();
}

/**
 * Obtiene estadísticas agregadas
 */
export async function fetchStats(): Promise<StatsResponse> {
  const response = await fetch(`${API_URL}/api/admin/stats`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    if (response.status === 401) {
      sessionStorage.removeItem('adminPassword');
      throw new Error('Unauthorized');
    }
    throw new Error('Failed to fetch stats');
  }

  return response.json();
}

/**
 * Exporta partidas en JSON
 */
export async function exportGames(filters: GameFilters = {}): Promise<void> {
  const params = new URLSearchParams();

  if (filters.mode) params.set('mode', filters.mode);
  if (filters.playerType) params.set('playerType', filters.playerType);
  if (filters.fromDate) params.set('fromDate', filters.fromDate);
  if (filters.toDate) params.set('toDate', filters.toDate);

  const response = await fetch(`${API_URL}/api/admin/games/export?${params}`, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    if (response.status === 401) {
      sessionStorage.removeItem('adminPassword');
      throw new Error('Unauthorized');
    }
    throw new Error('Failed to export games');
  }

  // Descargar el archivo
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bank-run-games-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Cierra la sesión de admin
 */
export function logoutAdmin(): void {
  sessionStorage.removeItem('adminPassword');
}

/**
 * Verifica si hay una sesión de admin activa
 */
export function isAdminLoggedIn(): boolean {
  return !!sessionStorage.getItem('adminPassword');
}
