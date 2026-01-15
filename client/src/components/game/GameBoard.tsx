// components/game/GameBoard.tsx - Tablero principal del juego

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { useGameStore } from '../../stores/gameStore';
import { useSocketInstance } from '../../hooks/useSocket';
import type { Decision } from '../../types/game';

export const GameBoard: React.FC = () => {
  const socket = useSocketInstance();
  const { gameState, myPlayerId, isMyTurnInSequential, setMyTurnInSequential } = useGameStore();
  const [hasDecided, setHasDecided] = useState(false);
  const [myDecision, setMyDecision] = useState<Decision | null>(null);
  const [remainingTime, setRemainingTime] = useState(30);

  // Log crítico para debug
  console.log('🔍 GameBoard myPlayerId:', myPlayerId);
  console.log('🔍 GameBoard gameState:', gameState);

  useEffect(() => {
    if (!gameState || gameState.status !== 'ROUND_DECISION') {
      setHasDecided(false);
      setMyDecision(null);
      return;
    }

    // Resetear estado local al iniciar nueva ronda
    setHasDecided(false);
    setMyDecision(null);

    // Timer countdown
    const interval = setInterval(() => {
      setRemainingTime((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState?.status, gameState?.currentRound.roundNumber]);

  if (!gameState || !myPlayerId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <p className="text-xl text-gray-600">Cargando juego...</p>
      </div>
    );
  }

  const handleDecision = (decision: Decision) => {
    if (!socket || hasDecided) return;

    console.log('📤 [CLIENT DEBUG] Sending decision:', decision);
    console.log('📤 [CLIENT DEBUG] GameId:', gameState.gameId);
    console.log('📤 [CLIENT DEBUG] Socket ID:', socket.id);
    console.log('📤 [CLIENT DEBUG] My Player ID:', myPlayerId);

    socket.emit('submit-decision', {
      gameId: gameState.gameId,
      decision,
    });

    setHasDecided(true);
    setMyDecision(decision);

    // En modo secuencial, resetear el flag de turno después de decidir
    if (gameState.mode === 'sequential') {
      setMyTurnInSequential(false, []);
    }

    console.log('✅ [CLIENT DEBUG] Decision sent successfully');
  };

  // Determinar si es mi turno
  const isMyTurn = gameState.mode === 'simultaneous' ||
    (gameState.mode === 'sequential' && isMyTurnInSequential);

  const isDecisionPhase = gameState.status === 'ROUND_DECISION';

  // Debug logs
  console.log('GameBoard Debug:', {
    status: gameState.status,
    isDecisionPhase,
    isMyTurn,
    hasDecided,
    myPlayerId,
    mode: gameState.mode,
    decisionOrder: gameState.currentRound.decisionOrder,
    revealedDecisions: gameState.currentRound.revealedDecisions
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-primary">
                Ronda {gameState.currentRound.roundNumber} / {gameState.config.totalRounds}
              </h1>
              <p className="text-gray-600">
                Modo: {gameState.mode === 'simultaneous' ? 'Simultáneo' : 'Secuencial'}
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-1">
                {remainingTime}s
              </div>
              <p className="text-sm text-gray-600">Tiempo restante</p>
            </div>
          </div>
        </div>

        {/* Main Game Area */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column - Decision Panel */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Tu Decisión
            </h2>

            {!isDecisionPhase && (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">
                  {gameState.status === 'ROUND_RESULTS' && 'Viendo resultados...'}
                  {gameState.status === 'GAME_OVER' && 'Juego terminado'}
                  {gameState.status === 'ROUND_REVEALING' && 'Revelando decisiones...'}
                </p>
              </div>
            )}

            {/* Mostrar decisiones reveladas en modo secuencial */}
            {isDecisionPhase && gameState.mode === 'sequential' && gameState.currentRound.revealedDecisions.length > 0 && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-bold text-gray-800 mb-3">Decisiones previas:</h3>
                <div className="space-y-2">
                  {gameState.currentRound.revealedDecisions.map((decision, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-white rounded">
                      <span className="text-sm text-gray-600">Jugador {index + 1}:</span>
                      <span className={`font-semibold ${decision === 'KEEP' ? 'text-green-600' : 'text-red-600'}`}>
                        {decision === 'KEEP' ? 'ESPERÓ' : 'RETIRÓ'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isDecisionPhase && !isMyTurn && gameState.mode === 'sequential' && (
              <div className="text-center py-12">
                <div className="animate-pulse mb-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto"></div>
                </div>
                <p className="text-gray-600">Esperando tu turno...</p>
                <p className="text-sm text-gray-500 mt-2">
                  {gameState.currentRound.revealedDecisions.length} de 3 jugadores han decidido
                </p>
              </div>
            )}

            {isDecisionPhase && isMyTurn && !hasDecided && (
              <div className="space-y-4">
                {gameState.mode === 'sequential' && gameState.currentRound.revealedDecisions.length === 0 && (
                  <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-yellow-800 font-semibold text-center">
                      Eres el primero en decidir esta ronda
                    </p>
                  </div>
                )}
                <p className="text-gray-600 mb-4">
                  ¡Es tu turno! Elige tu acción:
                </p>

                <Button
                  onClick={() => handleDecision('KEEP')}
                  variant="secondary"
                  size="lg"
                  fullWidth
                  className="h-24 text-xl"
                >
                  <div className="flex flex-col items-center">
                    <img src="/images/icon-wait.svg" alt="Keep" className="w-12 h-12 mb-2" />
                    <span>ESPERAR</span>
                    <span className="text-sm font-normal">70 ECUs si ambos esperan</span>
                  </div>
                </Button>

                <Button
                  onClick={() => handleDecision('WITHDRAW')}
                  variant="danger"
                  size="lg"
                  fullWidth
                  className="h-24 text-xl"
                >
                  <div className="flex flex-col items-center">
                    <img src="/images/icon-withdraw.svg" alt="Withdraw" className="w-12 h-12 mb-2" />
                    <span>RETIRAR</span>
                    <span className="text-sm font-normal">50 ECUs si eres primero</span>
                  </div>
                </Button>
              </div>
            )}

            {hasDecided && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-3xl">✓</span>
                </div>
                <p className="text-gray-800 font-semibold mb-2">
                  Decisión enviada: {myDecision === 'KEEP' ? 'ESPERAR' : 'RETIRAR'}
                </p>
                <p className="text-sm text-gray-600">
                  Esperando a los demás jugadores...
                </p>
              </div>
            )}
          </div>

          {/* Right Column - Game Info */}
          <div className="space-y-6">
            {/* Payoff Matrix */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Tabla de Pagos
              </h2>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-50 p-3 rounded text-center">
                  <div className="font-bold text-secondary text-lg">70</div>
                  <div className="text-xs text-gray-600">Ambos esperan</div>
                </div>
                <div className="bg-yellow-50 p-3 rounded text-center">
                  <div className="font-bold text-yellow-600 text-lg">50</div>
                  <div className="text-xs text-gray-600">Primeros 2 retiros</div>
                </div>
                <div className="bg-red-50 p-3 rounded text-center">
                  <div className="font-bold text-danger text-lg">20</div>
                  <div className="text-xs text-gray-600">Retiros tardíos</div>
                </div>
              </div>
            </div>

            {/* Player Status */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Estado de Jugadores
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded">
                  <img src="/images/avatar-player.svg" alt="Player 1" className="w-10 h-10" />
                  <div className="flex-1">
                    <p className="font-semibold">Jugador 1</p>
                    <p className="text-xs text-gray-600">Paciente</p>
                  </div>
                  <span className={`w-3 h-3 rounded-full ${
                    gameState.players.player1.connected ? 'bg-green-500' : 'bg-gray-300'
                  }`}></span>
                </div>

                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded">
                  <img src="/images/avatar-player.svg" alt="Player 2" className="w-10 h-10" />
                  <div className="flex-1">
                    <p className="font-semibold">
                      {gameState.players.player2.isLLM ? 'IA' : 'Jugador 2'}
                    </p>
                    <p className="text-xs text-gray-600">Paciente</p>
                  </div>
                  <span className={`w-3 h-3 rounded-full ${
                    gameState.players.player2.connected ? 'bg-green-500' : 'bg-gray-300'
                  }`}></span>
                </div>

                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded">
                  <img src="/images/avatar-llm.svg" alt="Automaton" className="w-10 h-10" />
                  <div className="flex-1">
                    <p className="font-semibold">Autómata</p>
                    <p className="text-xs text-yellow-700">Siempre retira</p>
                  </div>
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                </div>
              </div>
            </div>

            {/* Round History */}
            {gameState.roundHistory.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Historial
                </h2>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {gameState.roundHistory.map((round) => {
                    const myDecisionRound = myPlayerId === 'player1' ? round.decisions.player1 : round.decisions.player2;
                    const otherDecisionRound = myPlayerId === 'player1' ? round.decisions.player2 : round.decisions.player1;
                    const myPayoffRound = myPlayerId === 'player1' ? round.payoffs.player1 : round.payoffs.player2;

                    return (
                      <div key={round.round} className="text-sm border border-gray-200 rounded p-3 bg-gray-50">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-gray-800">Ronda {round.round}</span>
                          <span className="text-primary font-bold">{myPayoffRound} ECUs</span>
                        </div>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tú:</span>
                            <span className={`font-semibold ${myDecisionRound === 'KEEP' ? 'text-green-600' : 'text-red-600'}`}>
                              {myDecisionRound === 'KEEP' ? 'ESPERASTE' : 'RETIRASTE'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">{gameState.players.player2.isLLM ? 'IA' : 'Otro jugador'}:</span>
                            <span className={`font-semibold ${otherDecisionRound === 'KEEP' ? 'text-green-600' : 'text-red-600'}`}>
                              {otherDecisionRound === 'KEEP' ? 'ESPERÓ' : 'RETIRÓ'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Autómata:</span>
                            <span className="font-semibold text-red-600">RETIRÓ</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
