// components/admin/AdminPanel.tsx - Panel principal de administración

import React, { useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { useAdminStore } from '../../stores/adminStore';
import {
  fetchGames,
  fetchStats,
  exportGames,
  logoutAdmin,
  type GameData
} from '../../services/adminApi';
import { GameDetail } from './GameDetail';

interface AdminPanelProps {
  onLogout: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout }) => {
  const {
    games,
    pagination,
    loading,
    error,
    filters,
    selectedGame,
    stats,
    loadingStats,
    setGames,
    setLoading,
    setError,
    setFilters,
    clearFilters,
    setSelectedGame,
    setStats,
    setLoadingStats,
    reset
  } = useAdminStore();

  const loadGames = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchGames(filters);
      setGames(response.games, response.pagination);
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        handleLogout();
      } else {
        setError('Error al cargar las partidas');
      }
    } finally {
      setLoading(false);
    }
  }, [filters, setGames, setLoading, setError]);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const response = await fetchStats();
      setStats(response);
    } catch {
      console.error('Error loading stats');
    } finally {
      setLoadingStats(false);
    }
  }, [setStats, setLoadingStats]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleLogout = () => {
    logoutAdmin();
    reset();
    onLogout();
  };

  const handleExport = async () => {
    try {
      await exportGames(filters);
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        handleLogout();
      } else {
        alert('Error al exportar los datos');
      }
    }
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const handleViewGame = (game: GameData) => {
    setSelectedGame(game);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Si hay una partida seleccionada, mostrar el detalle
  if (selectedGame) {
    return <GameDetail game={selectedGame} onBack={() => setSelectedGame(null)} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Panel de Administrador</h1>
          <Button variant="outline" onClick={handleLogout}>
            Cerrar sesion
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Estadisticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-500">Total Partidas</h3>
              <p className="text-3xl font-bold text-primary">{stats.totalGames}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-500">Modo Simultaneo</h3>
              <p className="text-3xl font-bold text-blue-600">
                {stats.gamesByMode?.simultaneous || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-500">Modo Secuencial</h3>
              <p className="text-3xl font-bold text-purple-600">
                {stats.gamesByMode?.sequential || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-500">Tasa Bank Run</h3>
              <p className="text-3xl font-bold text-red-600">
                {stats.bankRunStats?.bankRunRate || '0%'}
              </p>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modo</label>
              <select
                value={filters.mode || ''}
                onChange={(e) =>
                  setFilters({
                    mode: e.target.value as 'sequential' | 'simultaneous' | undefined || undefined
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="">Todos</option>
                <option value="simultaneous">Simultaneo</option>
                <option value="sequential">Secuencial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de jugador
              </label>
              <select
                value={filters.playerType || ''}
                onChange={(e) =>
                  setFilters({
                    playerType: e.target.value as 'human' | 'llm' | undefined || undefined
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="">Todos</option>
                <option value="human">Humano vs Humano</option>
                <option value="llm">Humano vs IA</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
              <input
                type="date"
                value={filters.fromDate || ''}
                onChange={(e) => setFilters({ fromDate: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
              <input
                type="date"
                value={filters.toDate || ''}
                onChange={(e) => setFilters({ toDate: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={clearFilters}>
              Limpiar filtros
            </Button>
            <Button onClick={handleExport}>Exportar JSON</Button>
          </div>
        </div>

        {/* Tabla de partidas */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              Partidas {pagination && `(${pagination.total} total)`}
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Cargando...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">{error}</div>
          ) : games.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No hay partidas registradas</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sala
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Modo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Jugadores
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rondas
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bank Runs
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {games.map((game) => {
                      const bankRunCount = game.rounds.filter((r) => r.bankRun).length;
                      return (
                        <tr key={game.gameId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(game.timestamp)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                              {game.roomCode}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                game.mode === 'simultaneous'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {game.mode === 'simultaneous' ? 'Simultaneo' : 'Secuencial'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {game.playerTypes.includes('llm') ? 'Humano vs IA' : 'Humano vs Humano'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {game.rounds.length}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                bankRunCount > 0
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {bankRunCount} / {game.rounds.length}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              onClick={() => handleViewGame(game)}
                              className="text-primary hover:text-primary-dark font-medium text-sm"
                            >
                              Ver detalle
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginacion */}
              {pagination && pagination.totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Pagina {pagination.page} de {pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => handlePageChange(pagination.page - 1)}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => handlePageChange(pagination.page + 1)}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};
