// components/results/RoundResults.tsx - Resultados de la ronda

import React from 'react';
import { Button } from '../ui/Button';
import { useGameStore } from '../../stores/gameStore';
import { useSocketInstance } from '../../hooks/useSocket';
import type { RoundResult } from '../../types/game';

interface RoundResultsProps {
  result: RoundResult;
  isLastRound: boolean;
}

export const RoundResults: React.FC<RoundResultsProps> = ({ result, isLastRound }) => {
  const socket = useSocketInstance();
  const { gameState, myPlayerId } = useGameStore();

  const handleNextRound = () => {
    if (!socket || !gameState) return;
    socket.emit('ready-next-round', { gameId: gameState.gameId });
  };

  if (!myPlayerId) return null;

  const myPayoff = myPlayerId === 'player1' ? result.payoffs.player1 : result.payoffs.player2;
  const myDecision = myPlayerId === 'player1' ? result.decisions.player1 : result.decisions.player2;
  const otherDecision = myPlayerId === 'player1' ? result.decisions.player2 : result.decisions.player1;

  // Determinar el resultado
  const bothCooperated = result.decisions.player1 === 'KEEP' && result.decisions.player2 === 'KEEP';
  const resultType = bothCooperated ? 'success' : myDecision === 'WITHDRAW' ? 'neutral' : 'failure';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-4xl font-bold text-primary mb-2 text-center">
          Resultados Ronda {result.round}
        </h1>

        {/* Resultado principal */}
        <div className={`rounded-lg p-8 mb-8 text-center ${
          resultType === 'success' ? 'bg-green-50 border-2 border-green-200' :
          resultType === 'failure' ? 'bg-red-50 border-2 border-red-200' :
          'bg-yellow-50 border-2 border-yellow-200'
        }`}>
          <div className="text-6xl font-bold mb-2 ${
            resultType === 'success' ? 'text-secondary' :
            resultType === 'failure' ? 'text-danger' :
            'text-yellow-600'
          }">
            {myPayoff} ECUs
          </div>
          <p className="text-xl text-gray-700">
            {bothCooperated && '¡Éxito! Ambos esperaron'}
            {!bothCooperated && myDecision === 'WITHDRAW' && otherDecision === 'KEEP' && 'Retiraste a tiempo'}
            {!bothCooperated && myDecision === 'KEEP' && otherDecision === 'WITHDRAW' && 'El otro jugador retiró primero'}
            {!bothCooperated && myDecision === 'WITHDRAW' && otherDecision === 'WITHDRAW' && 'Ambos retiraron'}
          </p>
        </div>

        {/* Decisiones de todos */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <img src="/images/avatar-player.svg" alt="Player 1" className="w-16 h-16 mx-auto mb-2" />
            <p className="font-semibold text-gray-800 mb-1">
              {myPlayerId === 'player1' ? 'Tú' : 'Jugador 1'}
            </p>
            <div className={`text-lg font-bold mb-1 ${
              result.decisions.player1 === 'KEEP' ? 'text-secondary' : 'text-danger'
            }`}>
              {result.decisions.player1 === 'KEEP' ? 'ESPERÓ' : 'RETIRÓ'}
            </div>
            <p className="text-sm text-gray-600">{result.payoffs.player1} ECUs</p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <img
              src={gameState?.players.player2.isLLM ? '/images/avatar-llm.svg' : '/images/avatar-player.svg'}
              alt="Player 2"
              className="w-16 h-16 mx-auto mb-2"
            />
            <p className="font-semibold text-gray-800 mb-1">
              {myPlayerId === 'player2' ? 'Tú' : gameState?.players.player2.isLLM ? 'IA' : 'Jugador 2'}
            </p>
            <div className={`text-lg font-bold mb-1 ${
              result.decisions.player2 === 'KEEP' ? 'text-secondary' : 'text-danger'
            }`}>
              {result.decisions.player2 === 'KEEP' ? 'ESPERÓ' : 'RETIRÓ'}
            </div>
            <p className="text-sm text-gray-600">{result.payoffs.player2} ECUs</p>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <img src="/images/avatar-llm.svg" alt="Automaton" className="w-16 h-16 mx-auto mb-2" />
            <p className="font-semibold text-gray-800 mb-1">Autómata</p>
            <div className="text-lg font-bold text-danger mb-1">
              RETIRÓ
            </div>
            <p className="text-sm text-gray-600">{result.payoffs.automaton} ECUs</p>
          </div>
        </div>

        {/* Orden de decisiones (Secuencial) */}
        {result.seqTrace && (
          <div className="bg-gray-50 rounded-lg p-4 mb-8">
            <h3 className="font-semibold text-gray-800 mb-2">Orden de decisiones:</h3>
            <p className="text-sm text-gray-600 font-mono">{result.seqTrace}</p>
          </div>
        )}

        {/* Totales acumulados */}
        {gameState && gameState.roundHistory.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-4 mb-8">
            <h3 className="font-semibold text-gray-800 mb-2 text-center">Total Acumulado</h3>
            <div className="text-3xl font-bold text-primary text-center">
              {gameState.roundHistory.reduce((sum, r) =>
                sum + (myPlayerId === 'player1' ? r.payoffs.player1 : r.payoffs.player2), 0
              )} ECUs
            </div>
          </div>
        )}

        {/* Botón siguiente ronda */}
        {!isLastRound && (
          <Button onClick={handleNextRound} fullWidth size="lg">
            Siguiente Ronda
          </Button>
        )}

        {isLastRound && (
          <div className="text-center">
            <p className="text-xl font-semibold text-gray-800 mb-4">
              ¡Juego completado!
            </p>
            <Button onClick={() => window.location.reload()} fullWidth size="lg">
              Volver al Inicio
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
