// components/admin/GameDetail.tsx - Vista de detalle de una partida

import React from 'react';
import { Button } from '../ui/Button';
import type { GameData } from '../../services/adminApi';

interface GameDetailProps {
  game: GameData;
  onBack: () => void;
}

export const GameDetail: React.FC<GameDetailProps> = ({ game, onBack }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatTime = (ms: number | undefined) => {
    if (ms === undefined || ms === 0) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getDecisionStyle = (decision: string) => {
    return decision === 'WITHDRAW'
      ? 'bg-red-100 text-red-800'
      : 'bg-green-100 text-green-800';
  };

  const bankRunCount = game.rounds.filter((r) => r.bankRun).length;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBack}>
              Volver
            </Button>
            <h1 className="text-2xl font-bold text-gray-800">
              Detalle de Partida
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Info general */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Informacion General</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Game ID</p>
              <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded mt-1">
                {game.gameId}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Sala</p>
              <p className="font-mono text-lg font-bold text-primary mt-1">{game.roomCode}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Fecha</p>
              <p className="text-sm mt-1">{formatDate(game.timestamp)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Modo</p>
              <span
                className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${
                  game.mode === 'simultaneous'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-purple-100 text-purple-800'
                }`}
              >
                {game.mode === 'simultaneous' ? 'Simultaneo' : 'Secuencial'}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Jugadores</p>
              <p className="text-sm mt-1">
                {game.playerTypes.includes('llm') ? 'Humano vs IA' : 'Humano vs Humano'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Rondas</p>
              <p className="text-2xl font-bold text-gray-800">{game.rounds.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Bank Runs</p>
              <span
                className={`inline-block px-2 py-1 text-sm font-medium rounded-full mt-1 ${
                  bankRunCount > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}
              >
                {bankRunCount} / {game.rounds.length}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Tasa Bank Run</p>
              <p className="text-2xl font-bold text-red-600">
                {((bankRunCount / game.rounds.length) * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>

        {/* Payoffs totales */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Ganancias Totales (ECUs)</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Player 1 (Humano)</p>
              <p className="text-3xl font-bold text-blue-600">{game.totalPayoffs.player1}</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">
                Player 2 ({game.playerTypes.includes('llm') ? 'IA' : 'Humano'})
              </p>
              <p className="text-3xl font-bold text-purple-600">{game.totalPayoffs.player2}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Automaton</p>
              <p className="text-3xl font-bold text-gray-600">{game.totalPayoffs.automaton}</p>
            </div>
          </div>
        </div>

        {/* Detalle por rondas */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Detalle por Ronda</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ronda
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Bank Run
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Decision P1
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Tiempo P1
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Decision P2
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Tiempo P2
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Automaton
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Payoff P1
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Payoff P2
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Payoff Auto
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {game.rounds.map((round) => (
                  <tr key={round.round} className={round.bankRun ? 'bg-red-50' : ''}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {round.round}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {round.bankRun ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          SI
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          NO
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getDecisionStyle(
                          round.decisions.player1
                        )}`}
                      >
                        {round.decisions.player1}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-600">
                      {formatTime(round.decisionTimes?.player1)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getDecisionStyle(
                          round.decisions.player2
                        )}`}
                      >
                        {round.decisions.player2}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-600">
                      {formatTime(round.decisionTimes?.player2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        WITHDRAW
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium text-blue-600">
                      {round.payoffs.player1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium text-purple-600">
                      {round.payoffs.player2}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium text-gray-600">
                      {round.payoffs.automaton}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Perfil LLM si aplica */}
        {game.sessionMetadata?.playerProfiles?.player2 && game.playerTypes.includes('llm') && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Perfil del LLM (Player 2)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Genero</p>
                <p className="font-medium">{game.sessionMetadata.playerProfiles.player2.gender}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Edad</p>
                <p className="font-medium">{game.sessionMetadata.playerProfiles.player2.age_band}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Educacion</p>
                <p className="font-medium">{game.sessionMetadata.playerProfiles.player2.education}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Confianza institucional</p>
                <p className="font-medium">
                  {game.sessionMetadata.playerProfiles.player2.institutional_trust_0_10}/10
                </p>
              </div>
            </div>
            {game.sessionMetadata.llmModel && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">Modelo LLM</p>
                <p className="font-mono text-sm">{game.sessionMetadata.llmModel}</p>
              </div>
            )}
          </div>
        )}

        {/* Trazas secuenciales si aplica */}
        {game.mode === 'sequential' && game.rounds.some((r) => r.seqTrace) && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Trazas Secuenciales</h2>
            <div className="space-y-2">
              {game.rounds.map((round) => (
                <div key={round.round} className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-1">Ronda {round.round}</p>
                  <p className="font-mono text-xs text-gray-600 break-all">
                    {round.seqTrace || 'Sin traza'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
