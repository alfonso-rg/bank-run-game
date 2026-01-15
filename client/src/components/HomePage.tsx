// components/HomePage.tsx - Página principal

import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { useSocketInstance } from '../hooks/useSocket';
import { useGameStore } from '../stores/gameStore';
import type { GameMode } from '../types/game';

export const HomePage: React.FC = () => {
  const socket = useSocketInstance();
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GameMode>('simultaneous');
  const [totalRounds, setTotalRounds] = useState(5);
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [waitingForRoomCreation, setWaitingForRoomCreation] = useState(false);

  // Escuchar cuando se crea una sala y auto-iniciar si es vs IA
  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = (data: { roomCode: string; playerId: string }) => {
      console.log('Room created, waiting flag:', waitingForRoomCreation);
      if (waitingForRoomCreation && !isMultiplayer) {
        console.log('Auto-starting game for room:', data.roomCode);
        // Iniciar juego automáticamente en modo vs IA
        socket.emit('start-game', { roomCode: data.roomCode, config: { totalRounds } });
        setWaitingForRoomCreation(false);
      }
    };

    socket.on('room-created', handleRoomCreated);

    return () => {
      socket.off('room-created', handleRoomCreated);
    };
  }, [socket, waitingForRoomCreation, isMultiplayer, totalRounds]);

  const handleCreateVsAI = () => {
    setIsMultiplayer(false);
    setShowModeSelection(true);
  };

  const handleStartGame = () => {
    if (!socket) return;

    // Marcar que estamos esperando la creación de sala
    if (!isMultiplayer) {
      setWaitingForRoomCreation(true);
    } else {
      // Guardar info para mostrar WaitingRoom en multijugador
      const store = useGameStore.getState();
      store.setWaitingRoom(selectedMode, true, totalRounds);
      store.setWaitingPlayers([{ playerName: 'Tú', playerId: 'player1' }]);
    }

    // Crear sala
    socket.emit('create-room', { mode: selectedMode });

    setShowModeSelection(false);
  };

  const handleJoinMultiplayer = () => {
    setShowJoinRoom(true);
  };

  const handleJoinRoom = () => {
    if (!socket || !roomCode || !playerName) return;
    socket.emit('join-room', { roomCode: roomCode.toUpperCase(), playerName });
  };

  const handleCreateMultiplayer = () => {
    if (!socket) return;
    setIsMultiplayer(true);
    setShowModeSelection(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <img
            src="/images/hero-bank.png"
            alt="Bank"
            className="mx-auto mb-6 w-full max-w-xs rounded-lg shadow-xl"
          />
          <h1 className="text-5xl md:text-6xl font-bold text-primary mb-4">
            Bank Run Game
          </h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Juego de coordinación económica.
            Eres un depositante en un banco con dos opciones: retirar tu dinero ahora o esperar.
          </p>
        </div>

        {/* Game Info */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">¿Cómo funciona?</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <img src="/images/icon-vault.svg" alt="Success" className="w-16 h-16 mx-auto mb-2" />
              <h3 className="font-bold text-secondary text-lg mb-1">70 ECUs</h3>
              <p className="text-sm text-gray-600">Si ambos pacientes esperan</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <img src="/images/icon-withdraw.svg" alt="Withdraw" className="w-16 h-16 mx-auto mb-2" />
              <h3 className="font-bold text-yellow-600 text-lg mb-1">50 ECUs</h3>
              <p className="text-sm text-gray-600">Primeros 2 retiros</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <img src="/images/icon-wait.svg" alt="Failure" className="w-16 h-16 mx-auto mb-2" />
              <h3 className="font-bold text-danger text-lg mb-1">20 ECUs</h3>
              <p className="text-sm text-gray-600">Si llegas tarde</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-4 text-center">
            Recuerda: Hay 3 depositantes. Uno de ellos (el autómata) siempre retira inmediatamente.
          </p>
        </div>

        {/* Mode Selection Modal */}
        {showModeSelection && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Elige el modo de juego</h2>

              <div className="space-y-4 mb-6">
                <button
                  onClick={() => setSelectedMode('simultaneous')}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    selectedMode === 'simultaneous'
                      ? 'border-primary bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <h3 className="font-bold text-lg mb-1">Simultáneo</h3>
                  <p className="text-sm text-gray-600">
                    Todos los jugadores deciden al mismo tiempo
                  </p>
                </button>

                <button
                  onClick={() => setSelectedMode('sequential')}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    selectedMode === 'sequential'
                      ? 'border-primary bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <h3 className="font-bold text-lg mb-1">Secuencial</h3>
                  <p className="text-sm text-gray-600">
                    Los jugadores deciden en orden, viendo decisiones previas
                  </p>
                </button>
              </div>

              {/* Selector de número de rondas */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de rondas
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={totalRounds}
                    onChange={(e) => setTotalRounds(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-2xl font-bold text-primary w-12 text-center">
                    {totalRounds}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Selecciona entre 1 y 20 rondas
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowModeSelection(false)}
                  fullWidth
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleStartGame}
                  fullWidth
                >
                  Comenzar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Join Room Modal */}
        {showJoinRoom && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Unirse a una sala</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tu nombre
                  </label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Ingresa tu nombre"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    maxLength={20}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código de sala
                  </label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="Ej: ABC123"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent uppercase text-center text-2xl font-bold tracking-widest"
                    maxLength={6}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowJoinRoom(false)}
                  fullWidth
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleJoinRoom}
                  fullWidth
                  disabled={!roomCode || !playerName}
                >
                  Unirse
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-center mb-4">
              <img src="/images/avatar-llm.svg" alt="AI" className="w-20 h-20" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">
              Jugar contra IA
            </h3>
            <p className="text-gray-600 mb-4 text-center">
              Juega contra un oponente controlado por inteligencia artificial
            </p>
            <Button onClick={handleCreateVsAI} fullWidth size="lg">
              Comenzar
            </Button>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-center mb-4">
              <img src="/images/avatar-player.svg" alt="Multiplayer" className="w-20 h-20" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">
              Multijugador
            </h3>
            <p className="text-gray-600 mb-4 text-center">
              Juega contra otro jugador humano en tiempo real
            </p>
            <div className="space-y-2">
              <Button onClick={handleCreateMultiplayer} fullWidth size="lg" variant="secondary">
                Crear sala
              </Button>
              <Button onClick={handleJoinMultiplayer} fullWidth size="lg" variant="outline">
                Unirse a sala
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
