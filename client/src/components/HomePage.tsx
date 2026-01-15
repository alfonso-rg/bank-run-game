// components/HomePage.tsx - Página principal

import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { useSocketInstance } from '../hooks/useSocket';
import { useGameStore } from '../stores/gameStore';
import { fetchPublicConfig, type GlobalGameConfig } from '../services/adminApi';
import type { GameMode } from '../types/game';

export const HomePage: React.FC = () => {
  const socket = useSocketInstance();
  const [config, setConfig] = useState<GlobalGameConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [waitingForRoomCreation, setWaitingForRoomCreation] = useState(false);

  // Cargar configuración global
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const data = await fetchPublicConfig();
        setConfig(data);
      } catch (err) {
        setError('Error al cargar la configuracion del juego');
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  // Escuchar cuando se crea una sala y auto-iniciar si es vs IA
  useEffect(() => {
    if (!socket || !config) return;

    const handleRoomCreated = (data: { roomCode: string; playerId: string }) => {
      if (waitingForRoomCreation && config.opponentType === 'ai') {
        // Iniciar juego automáticamente en modo vs IA
        socket.emit('start-game', { roomCode: data.roomCode, config: { totalRounds: config.totalRounds } });
        setWaitingForRoomCreation(false);
      }
    };

    socket.on('room-created', handleRoomCreated);

    return () => {
      socket.off('room-created', handleRoomCreated);
    };
  }, [socket, waitingForRoomCreation, config]);

  const handleStartGame = () => {
    if (!socket || !config) return;

    if (config.opponentType === 'ai') {
      // Modo vs IA: crear sala y auto-iniciar
      setWaitingForRoomCreation(true);
      socket.emit('create-room', { mode: config.gameMode });
    } else {
      // Modo multijugador: guardar info y crear sala
      const store = useGameStore.getState();
      store.setWaitingRoom(config.gameMode as GameMode, true, config.totalRounds);
      store.setWaitingPlayers([{ playerName: 'Tu', playerId: 'player1' }]);
      socket.emit('create-room', { mode: config.gameMode });
    }
  };

  const handleJoinRoom = () => {
    if (!socket || !roomCode || !playerName) return;
    socket.emit('join-room', { roomCode: roomCode.toUpperCase(), playerName });
  };

  // Generar descripción del modo actual
  const getModeDescription = () => {
    if (!config) return '';

    const opponent = config.opponentType === 'ai' ? 'una Inteligencia Artificial' : 'otro jugador humano';
    const mode = config.gameMode === 'simultaneous'
      ? 'Todos los jugadores deciden al mismo tiempo sin saber lo que hacen los demas.'
      : 'Los jugadores deciden en orden, pudiendo ver las decisiones anteriores.';

    return `Jugaras contra ${opponent} en modo ${config.gameMode === 'simultaneous' ? 'simultaneo' : 'secuencial'} durante ${config.totalRounds} ronda${config.totalRounds > 1 ? 's' : ''}. ${mode}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Cargando...</div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-xl text-red-600">{error || 'Error al cargar configuracion'}</div>
      </div>
    );
  }

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
            Juego de coordinacion economica.
            Eres un depositante en un banco con dos opciones: retirar tu dinero ahora o esperar.
          </p>
        </div>

        {/* Game Info */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">¿Como funciona?</h2>
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
            Recuerda: Hay 3 depositantes. Uno de ellos (el automata) siempre retira inmediatamente.
          </p>
        </div>

        {/* Modo de Juego Actual */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                config.opponentType === 'ai'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {config.opponentType === 'ai' ? 'vs Inteligencia Artificial' : 'Multijugador'}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                config.gameMode === 'simultaneous'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-orange-100 text-orange-800'
              }`}>
                {config.gameMode === 'simultaneous' ? 'Simultaneo' : 'Secuencial'}
              </span>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                {config.totalRounds} ronda{config.totalRounds > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-gray-600 max-w-xl mx-auto mb-6">
              {getModeDescription()}
            </p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <Button onClick={handleStartGame} size="lg" className="w-full max-w-md">
              {config.opponentType === 'ai' ? 'Comenzar a Jugar' : 'Crear Sala'}
            </Button>

            {config.opponentType === 'human' && (
              <Button
                onClick={() => setShowJoinRoom(true)}
                variant="outline"
                size="lg"
                className="w-full max-w-md"
              >
                Unirse a una Sala
              </Button>
            )}
          </div>
        </div>

        {/* Join Room Modal (solo multijugador) */}
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
                    Codigo de sala
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
      </div>
    </div>
  );
};
