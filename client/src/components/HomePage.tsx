// components/HomePage.tsx - Página principal

import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { LanguageSelector } from './ui/LanguageSelector';
import { useSocketInstance } from '../hooks/useSocket';
import { useGameStore } from '../stores/gameStore';
import { useTranslation } from '../stores/languageStore';
import { fetchPublicConfig, type GlobalGameConfig } from '../services/adminApi';
import type { GameMode } from '../types/game';
import type { Language } from '../i18n';

export const HomePage: React.FC = () => {
  const socket = useSocketInstance();
  const { t, language, setLanguage } = useTranslation();
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
        // Establecer el idioma por defecto desde la configuración del servidor
        if (data.defaultLanguage && !localStorage.getItem('bank-run-language')) {
          setLanguage(data.defaultLanguage as Language);
        }
      } catch (err) {
        setError(t.home.loadingConfig);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, [setLanguage, t.home.loadingConfig]);

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

    const opponent = config.opponentType === 'ai' ? t.home.modeDescAI : t.home.modeDescHuman;
    const modeDesc = config.gameMode === 'simultaneous'
      ? t.home.modeDescSimultaneous
      : t.home.modeDescSequential;
    const modeName = config.gameMode === 'simultaneous' ? t.home.simultaneous.toLowerCase() : t.home.sequential.toLowerCase();
    const roundWord = config.totalRounds > 1 ? t.home.roundsPlural : t.home.rounds;

    return t.home.modeDescTemplate
      .replace('{opponent}', opponent)
      .replace('{mode}', modeName)
      .replace('{rounds}', config.totalRounds.toString())
      .replace('{roundWord}', roundWord)
      .replace('{modeDesc}', modeDesc);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">{t.loading}</div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-xl text-red-600">{error || t.home.loadingConfigError}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col items-center justify-center p-4">
      {/* Language Selector - Fixed position */}
      <div className="absolute top-4 right-4">
        <LanguageSelector variant="flags" />
      </div>

      <div className="max-w-4xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <img
            src="/images/hero-bank.png"
            alt="Bank"
            className="mx-auto mb-6 w-full max-w-xs rounded-lg shadow-xl"
          />
          <h1 className="text-5xl md:text-6xl font-bold text-primary mb-4">
            {t.home.title}
          </h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            {t.home.subtitle}
          </p>
        </div>

        {/* Game Info */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">{t.home.howItWorks}</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <img src="/images/icon-vault.svg" alt="Success" className="w-16 h-16 mx-auto mb-2" />
              <h3 className="font-bold text-secondary text-lg mb-1">{t.home.payoff70}</h3>
              <p className="text-sm text-gray-600">{t.home.payoff70Desc}</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <img src="/images/icon-withdraw.svg" alt="Withdraw" className="w-16 h-16 mx-auto mb-2" />
              <h3 className="font-bold text-yellow-600 text-lg mb-1">{t.home.payoff50}</h3>
              <p className="text-sm text-gray-600">{t.home.payoff50Desc}</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <img src="/images/icon-wait.svg" alt="Failure" className="w-16 h-16 mx-auto mb-2" />
              <h3 className="font-bold text-danger text-lg mb-1">{t.home.payoff20}</h3>
              <p className="text-sm text-gray-600">{t.home.payoff20Desc}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-4 text-center">
            {t.home.automatonNote}
          </p>
        </div>

        {/* Modo de Juego Actual */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 mb-4 flex-wrap justify-center">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                config.opponentType === 'ai'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {config.opponentType === 'ai' ? t.home.vsAI : t.home.multiplayer}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                config.gameMode === 'simultaneous'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-orange-100 text-orange-800'
              }`}>
                {config.gameMode === 'simultaneous' ? t.home.simultaneous : t.home.sequential}
              </span>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                {config.totalRounds} {config.totalRounds > 1 ? t.home.roundsPlural : t.home.rounds}
              </span>
            </div>
            <p className="text-gray-600 max-w-xl mx-auto mb-6">
              {getModeDescription()}
            </p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <Button onClick={handleStartGame} size="lg" className="w-full max-w-md">
              {config.opponentType === 'ai' ? t.home.startPlaying : t.home.createRoom}
            </Button>

            {config.opponentType === 'human' && (
              <Button
                onClick={() => setShowJoinRoom(true)}
                variant="outline"
                size="lg"
                className="w-full max-w-md"
              >
                {t.home.joinRoom}
              </Button>
            )}
          </div>
        </div>

        {/* Join Room Modal (solo multijugador) */}
        {showJoinRoom && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">{t.joinModal.title}</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.joinModal.yourName}
                  </label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder={t.joinModal.namePlaceholder}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    maxLength={20}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.joinModal.roomCode}
                  </label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder={t.joinModal.roomCodePlaceholder}
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
                  {t.cancel}
                </Button>
                <Button
                  onClick={handleJoinRoom}
                  fullWidth
                  disabled={!roomCode || !playerName}
                >
                  {t.joinModal.join}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
