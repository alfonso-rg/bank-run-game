// hooks/useSocket.ts - Hook principal para Socket.io

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../types/socketEvents';
import { useGameStore } from '../stores/gameStore';
import toast from 'react-hot-toast';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export const useSocket = () => {
  const socketRef = useRef<TypedSocket | null>(null);
  const { setConnected, setGameState, setError, updateRoundResult, updateGameStatus } = useGameStore();

  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

    // Crear conexión Socket.io
    const socket: TypedSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Eventos de conexión
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
      toast.error('Desconectado del servidor');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnected(false);
      setError('Error de conexión con el servidor');
      toast.error('No se pudo conectar al servidor');
    });

    // Eventos de sala
    socket.on('room-created', (data) => {
      console.log('Room created:', data);
      useGameStore.setState({ roomCode: data.roomCode, myPlayerId: data.playerId as any });
      toast.success('Sala creada correctamente');
    });

    socket.on('room-joined', (data) => {
      console.log('Room joined:', data);
      useGameStore.setState({ roomCode: data.roomCode });
      toast.success('Te has unido a la sala');
    });

    socket.on('room-full', (data) => {
      console.log('Room full:', data);
      toast.error('La sala está llena');
    });

    socket.on('player-joined', (data) => {
      console.log('Player joined:', data);
      toast.success(`${data.player.playerName} se ha unido`);
    });

    socket.on('player-left', (data) => {
      console.log('Player left:', data);
      toast('Un jugador ha salido');
    });

    socket.on('player-disconnected', (data) => {
      console.log('Player disconnected:', data);
      toast('Un jugador se ha desconectado', { icon: '⚠️' });
    });

    socket.on('player-reconnected', (data) => {
      console.log('Player reconnected:', data);
      setGameState(data.gameState);
      toast.success('Reconectado al juego');
    });

    // Eventos de juego
    socket.on('game-starting', (data) => {
      console.log('Game starting:', data);
      setGameState(data.gameState);
      toast.success('¡El juego comienza!');
    });

    socket.on('round-starting', (data) => {
      console.log('Round starting:', data);
      toast(`Ronda ${data.roundNumber} comenzando`, { icon: 'ℹ️' });
    });

    socket.on('timer-update', (data) => {
      console.log('Timer update:', data);
      // El componente RoundTimer manejará esto
    });

    socket.on('decision-received', (data) => {
      console.log('Decision received:', data);
    });

    // Modo secuencial
    socket.on('next-player-turn', (data) => {
      console.log('Next player turn:', data);
      toast('Es tu turno de decidir', { icon: '👉' });
    });

    socket.on('decision-revealed', (data) => {
      console.log('Decision revealed:', data);
    });

    // Resultados
    socket.on('round-complete', (data) => {
      console.log('Round complete:', data);
      updateRoundResult(data.results);
      updateGameStatus('ROUND_RESULTS');
    });

    socket.on('game-over', (data) => {
      console.log('Game over:', data);
      updateGameStatus('GAME_OVER');
      toast.success('¡Juego completado!');
    });

    // Errores
    socket.on('error', (data) => {
      console.error('Socket error:', data);
      setError(data.message);
      toast.error(data.message);
    });

    // Cleanup
    return () => {
      socket.disconnect();
    };
  }, []);

  return socketRef.current;
};

// Hook para obtener el socket actual
export const useSocketInstance = () => {
  return useSocket();
};
