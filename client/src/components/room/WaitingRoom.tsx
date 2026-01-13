// components/room/WaitingRoom.tsx - Sala de espera multijugador

import React from 'react';
import { Button } from '../ui/Button';
import { useSocketInstance } from '../../hooks/useSocket';
import type { GameMode } from '../../types/game';

interface WaitingRoomProps {
  roomCode: string;
  players: Array<{ playerName: string; playerId: string }>;
  mode: GameMode;
  isCreator: boolean;
}

export const WaitingRoom: React.FC<WaitingRoomProps> = ({
  roomCode,
  players,
  mode,
  isCreator,
}) => {
  const socket = useSocketInstance();

  const handleStartGame = () => {
    if (!socket) return;
    socket.emit('start-game', { roomCode });
  };

  const canStart = players.length === 2 && isCreator;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold text-primary mb-2 text-center">
          Sala de Espera
        </h1>
        <p className="text-gray-600 text-center mb-6">
          Modo: <span className="font-semibold">{mode === 'simultaneous' ? 'Simultáneo' : 'Secuencial'}</span>
        </p>

        {/* Código de sala */}
        <div className="bg-blue-50 rounded-lg p-6 mb-8 text-center">
          <p className="text-sm text-gray-600 mb-2">Código de sala</p>
          <div className="flex items-center justify-center gap-4">
            <span className="text-4xl font-bold text-primary tracking-widest">
              {roomCode}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(roomCode)}
            >
              Copiar
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Comparte este código con otro jugador
          </p>
        </div>

        {/* Lista de jugadores */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Jugadores ({players.length}/2)
          </h2>
          <div className="space-y-3">
            {players.map((player, index) => (
              <div
                key={player.playerId}
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg"
              >
                <img
                  src="/images/avatar-player.svg"
                  alt="Player"
                  className="w-12 h-12"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">
                    {player.playerName}
                  </p>
                  <p className="text-sm text-gray-500">
                    Jugador {index + 1}
                  </p>
                </div>
                <span className="text-green-500 text-sm font-medium">
                  Conectado
                </span>
              </div>
            ))}

            {/* Slot vacío */}
            {players.length < 2 && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-2xl text-gray-400">?</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-400">
                    Esperando jugador...
                  </p>
                  <p className="text-sm text-gray-400">
                    Jugador 2
                  </p>
                </div>
                <span className="text-gray-400 text-sm font-medium">
                  Esperando
                </span>
              </div>
            )}

            {/* Automaton */}
            <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
              <img
                src="/images/avatar-llm.svg"
                alt="Automaton"
                className="w-12 h-12"
              />
              <div className="flex-1">
                <p className="font-semibold text-gray-800">
                  Autómata
                </p>
                <p className="text-sm text-yellow-700">
                  Siempre retira inmediatamente
                </p>
              </div>
              <span className="text-yellow-600 text-sm font-medium">
                Automático
              </span>
            </div>
          </div>
        </div>

        {/* Información del juego */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-2">Recuerda:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• El autómata siempre retira, cuenta como uno de los primeros retiros</li>
            <li>• Si ambos jugadores esperan: 70 ECUs cada uno</li>
            <li>• Primeros 2 retiros: 50 ECUs</li>
            <li>• Retiros tardíos: 20 ECUs</li>
          </ul>
        </div>

        {/* Botón iniciar */}
        {isCreator && (
          <Button
            onClick={handleStartGame}
            disabled={!canStart}
            fullWidth
            size="lg"
          >
            {canStart ? 'Iniciar Juego' : 'Esperando segundo jugador...'}
          </Button>
        )}

        {!isCreator && (
          <div className="text-center text-gray-500">
            Esperando a que el creador inicie el juego...
          </div>
        )}
      </div>
    </div>
  );
};
