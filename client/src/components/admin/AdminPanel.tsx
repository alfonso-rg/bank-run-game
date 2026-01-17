// components/admin/AdminPanel.tsx - Panel principal de administración

import React, { useEffect, useCallback, useState } from 'react';
import { Button } from '../ui/Button';
import { useAdminStore } from '../../stores/adminStore';
import {
  fetchGames,
  fetchStats,
  exportGames,
  logoutAdmin,
  fetchGlobalConfig,
  updateGlobalConfig,
  type GameData,
  type GlobalGameConfig
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

  // Estado para la configuración global
  const [globalConfig, setGlobalConfig] = useState<GlobalGameConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);

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

  // Cargar configuración global
  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const config = await fetchGlobalConfig();
      console.log('[CONFIG DEBUG] Loaded config:', config);
      console.log('[CONFIG DEBUG] chatEnabled value:', config.chatEnabled, 'type:', typeof config.chatEnabled);
      setGlobalConfig(config);
    } catch (err) {
      console.error('Error loading config:', err);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Guardar configuración global
  const handleSaveConfig = async () => {
    if (!globalConfig) return;

    const configToSave = {
      opponentType: globalConfig.opponentType,
      gameMode: globalConfig.gameMode,
      totalRounds: globalConfig.totalRounds,
      chatEnabled: globalConfig.chatEnabled,
      chatDuration: globalConfig.chatDuration,
      chatFrequency: globalConfig.chatFrequency,
      defaultLanguage: globalConfig.defaultLanguage
    };

    console.log('[CONFIG DEBUG] Saving config:', configToSave);
    console.log('[CONFIG DEBUG] chatEnabled being sent:', configToSave.chatEnabled, 'type:', typeof configToSave.chatEnabled);

    setConfigSaving(true);
    try {
      const updated = await updateGlobalConfig(configToSave);
      console.log('[CONFIG DEBUG] Received after save:', updated);
      console.log('[CONFIG DEBUG] chatEnabled after save:', updated.chatEnabled, 'type:', typeof updated.chatEnabled);
      setGlobalConfig(updated);
      alert('Configuracion guardada correctamente');
    } catch (err) {
      console.error('[CONFIG DEBUG] Error saving:', err);
      alert('Error al guardar la configuracion');
    } finally {
      setConfigSaving(false);
    }
  };

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

        {/* Configuracion Global del Juego */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Configuracion del Modo de Juego
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Esta configuracion se aplica a todos los jugadores que accedan a jugar.
          </p>

          {configLoading ? (
            <div className="text-center text-gray-500 py-4">Cargando configuracion...</div>
          ) : globalConfig ? (
            <div className="space-y-6">
              {/* Primera fila: Oponente, Modo, Rondas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de oponente
                  </label>
                  <select
                    value={globalConfig.opponentType}
                    onChange={(e) =>
                      setGlobalConfig({
                        ...globalConfig,
                        opponentType: e.target.value as 'ai' | 'human'
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    <option value="ai">Inteligencia Artificial</option>
                    <option value="human">Multijugador (Humano)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modo de juego
                  </label>
                  <select
                    value={globalConfig.gameMode}
                    onChange={(e) =>
                      setGlobalConfig({
                        ...globalConfig,
                        gameMode: e.target.value as 'sequential' | 'simultaneous'
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    <option value="simultaneous">Simultaneo</option>
                    <option value="sequential">Secuencial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numero de rondas
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={globalConfig.totalRounds}
                      onChange={(e) =>
                        setGlobalConfig({
                          ...globalConfig,
                          totalRounds: Number(e.target.value)
                        })
                      }
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-xl font-bold text-primary w-8 text-center">
                      {globalConfig.totalRounds}
                    </span>
                  </div>
                </div>
              </div>

              {/* Segunda fila: Configuracion de Chat */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">
                  Configuracion del Chat Pre-Decision
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={globalConfig.chatEnabled}
                        onChange={(e) =>
                          setGlobalConfig({
                            ...globalConfig,
                            chatEnabled: e.target.checked
                          })
                        }
                        className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">
                        Habilitar chat
                      </span>
                    </label>
                  </div>
                  <div className={!globalConfig.chatEnabled ? 'opacity-50 pointer-events-none' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duracion del chat (segundos)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="5"
                        max="60"
                        value={globalConfig.chatDuration}
                        onChange={(e) =>
                          setGlobalConfig({
                            ...globalConfig,
                            chatDuration: Number(e.target.value)
                          })
                        }
                        disabled={!globalConfig.chatEnabled}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-xl font-bold text-primary w-10 text-center">
                        {globalConfig.chatDuration}s
                      </span>
                    </div>
                  </div>
                  <div className={!globalConfig.chatEnabled ? 'opacity-50 pointer-events-none' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frecuencia del chat
                    </label>
                    <select
                      value={globalConfig.chatFrequency}
                      onChange={(e) =>
                        setGlobalConfig({
                          ...globalConfig,
                          chatFrequency: e.target.value as 'once' | 'every-round'
                        })
                      }
                      disabled={!globalConfig.chatEnabled}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                    >
                      <option value="once">Solo antes de la primera ronda</option>
                      <option value="every-round">Antes de cada ronda</option>
                    </select>
                  </div>
                </div>
                {globalConfig.chatEnabled && (
                  <p className="mt-2 text-xs text-gray-500">
                    Los jugadores pacientes podran chatear durante {globalConfig.chatDuration} segundos
                    {globalConfig.chatFrequency === 'once' ? ' solo antes de la primera ronda' : ' antes de cada ronda'}.
                  </p>
                )}
              </div>

              {/* Tercera fila: Idioma */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">
                  Idioma del Juego
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Idioma por defecto
                    </label>
                    <select
                      value={globalConfig.defaultLanguage || 'es'}
                      onChange={(e) =>
                        setGlobalConfig({
                          ...globalConfig,
                          defaultLanguage: e.target.value as 'es' | 'en'
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                    >
                      <option value="es">Espanol</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Los jugadores veran la interfaz en {globalConfig.defaultLanguage === 'en' ? 'ingles' : 'espanol'} por defecto, pero pueden cambiar el idioma en la pantalla de inicio.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center text-red-500 py-4">Error al cargar configuracion</div>
          )}

          {globalConfig && (
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
              <p className="text-xs text-gray-500">
                Ultima actualizacion:{' '}
                {globalConfig.updatedAt
                  ? new Date(globalConfig.updatedAt).toLocaleString('es-ES')
                  : 'Nunca'}
              </p>
              <Button onClick={handleSaveConfig} disabled={configSaving}>
                {configSaving ? 'Guardando...' : 'Guardar configuracion'}
              </Button>
            </div>
          )}
        </div>

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
