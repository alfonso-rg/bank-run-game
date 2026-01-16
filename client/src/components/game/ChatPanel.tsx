// components/game/ChatPanel.tsx - Panel de chat pre-decision

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';
import { useGameStore } from '../../stores/gameStore';
import { useSocketInstance } from '../../hooks/useSocket';

export const ChatPanel: React.FC = () => {
  const socket = useSocketInstance();
  const { gameState, myPlayerId, chatMessages, chatTimeRemaining, isChatPhase } = useGameStore();
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al fondo cuando llegan nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  if (!gameState || !isChatPhase) return null;

  const handleSendMessage = () => {
    if (!socket || !inputMessage.trim() || !gameState) return;

    socket.emit('send-chat-message', {
      gameId: gameState.gameId,
      message: inputMessage.trim()
    });

    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isOpponentLLM = gameState.players.player2.isLLM;
  const opponentLabel = isOpponentLLM ? 'IA' : 'Otro jugador';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-primary">
                Chat Pre-Decision
              </h1>
              <p className="text-gray-600">
                Ronda {gameState.currentRound.roundNumber} / {gameState.config.totalRounds}
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-1">
                {chatTimeRemaining}s
              </div>
              <p className="text-sm text-gray-600">Tiempo restante</p>
            </div>
          </div>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-4">
            <p className="text-gray-600 text-sm">
              Puedes discutir estrategia con {opponentLabel} antes de tomar tu decision.
              El automata no participa en el chat.
            </p>
          </div>

          {/* Messages area */}
          <div className="h-80 overflow-y-auto border rounded-lg p-4 mb-4 bg-gray-50">
            {chatMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-400 text-center">
                  No hay mensajes aun...<br />
                  <span className="text-sm">Se el primero en escribir!</span>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {chatMessages.map((msg, index) => {
                  const isMe = msg.playerId === myPlayerId;
                  return (
                    <div
                      key={index}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[75%]`}>
                        <div className={`text-xs mb-1 ${isMe ? 'text-right' : 'text-left'} text-gray-500`}>
                          {isMe ? 'Tu' : (isOpponentLLM ? 'IA' : 'Otro jugador')}
                        </div>
                        <div
                          className={`p-3 rounded-lg ${
                            isMe
                              ? 'bg-primary text-white rounded-br-none'
                              : 'bg-gray-200 text-gray-800 rounded-bl-none'
                          }`}
                        >
                          {msg.message}
                        </div>
                        <div className={`text-xs mt-1 ${isMe ? 'text-right' : 'text-left'} text-gray-400`}>
                          {Math.floor(msg.timestamp / 1000)}s
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="flex gap-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe un mensaje..."
              maxLength={500}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              size="lg"
            >
              Enviar
            </Button>
          </div>

          {/* Info box */}
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-yellow-800 text-sm">
              <strong>Nota:</strong> Lo que digas aqui NO afecta tu decision final.
              Despues del chat, elegiras si ESPERAR o RETIRAR.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
