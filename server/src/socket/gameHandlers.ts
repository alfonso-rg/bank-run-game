import { Server, Socket } from 'socket.io';
import Joi from 'joi';
import { gameService } from '../services/GameService';
import { matchmakingService } from '../services/MatchmakingService';
import { llmService, LLMService } from '../services/LLMService';
import { logger } from '../config/logger';
import {
  GameMode,
  PlayerId,
  Decision,
  PlayerInfo,
  GameConfig,
  DEFAULT_GAME_CONFIG
} from '../types';

// Schemas de validación con Joi
const schemas = {
  createRoom: Joi.object({
    mode: Joi.string().valid('sequential', 'simultaneous').required()
  }),

  joinRoom: Joi.object({
    roomCode: Joi.string().length(6).required(),
    playerName: Joi.string().min(1).max(50).required()
  }),

  startGame: Joi.object({
    roomCode: Joi.string().length(6).required(),
    config: Joi.object({
      totalRounds: Joi.number().min(1).max(20),
      decisionTimeoutMs: Joi.number().min(10000).max(120000)
    }).optional()
  }),

  submitDecision: Joi.object({
    gameId: Joi.string().required(),
    decision: Joi.string().valid('KEEP', 'WITHDRAW').required()
  })
};

function validate<T>(schema: Joi.Schema, data: any): T {
  const { error, value } = schema.validate(data);
  if (error) {
    throw new Error(`Validation error: ${error.details[0].message}`);
  }
  return value;
}

export function setupGameHandlers(io: Server): void {
  logger.info('Setting up Socket.io game handlers...');

  io.on('connection', (socket: Socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // ====== CREATE ROOM ======
    socket.on('create-room', (data, callback) => {
      try {
        const { mode } = validate<{ mode: GameMode }>(schemas.createRoom, data);

        const roomCode = matchmakingService.createRoom(mode);
        socket.join(roomCode);

        logger.info(`Room ${roomCode} created by ${socket.id}`);

        const response = { roomCode, playerId: 'creator' };

        if (callback) callback(response);
        else socket.emit('room-created', response);

      } catch (error) {
        logger.error('Error creating room:', error);
        socket.emit('error', {
          code: 'CREATE_ROOM_FAILED',
          message: (error as Error).message
        });
      }
    });

    // ====== JOIN ROOM ======
    socket.on('join-room', (data, callback) => {
      try {
        const { roomCode, playerName } = validate<{ roomCode: string; playerName: string }>(
          schemas.joinRoom,
          data
        );

        const room = matchmakingService.getRoom(roomCode);
        if (!room) {
          socket.emit('error', {
            code: 'ROOM_NOT_FOUND',
            message: `Room ${roomCode} does not exist`
          });
          return;
        }

        if (matchmakingService.isRoomFull(roomCode)) {
          socket.emit('room-full', { roomCode });
          return;
        }

        const playerInfo: PlayerInfo = {
          playerId: 'player1' as PlayerId, // Se asignará correctamente en joinRoom
          playerName,
          socketId: socket.id,
          connected: true,
          isLLM: false
        };

        const joined = matchmakingService.joinRoom(roomCode, playerInfo);

        if (joined) {
          socket.join(roomCode);

          const updatedRoom = matchmakingService.getRoom(roomCode)!;

          // Emitir a todos en la sala
          io.to(roomCode).emit('room-joined', {
            roomCode,
            players: updatedRoom.players
          });

          // Emitir específicamente al nuevo jugador
          io.to(roomCode).emit('player-joined', {
            player: updatedRoom.players[updatedRoom.players.length - 1]
          });

          if (callback) callback({ success: true, roomCode });

          logger.info(`Player ${playerName} joined room ${roomCode}`);
        }

      } catch (error) {
        logger.error('Error joining room:', error);
        socket.emit('error', {
          code: 'JOIN_ROOM_FAILED',
          message: (error as Error).message
        });
      }
    });

    // ====== LEAVE ROOM ======
    socket.on('leave-room', (data) => {
      try {
        const { roomCode } = data;
        matchmakingService.leaveRoom(roomCode, socket.id);
        socket.leave(roomCode);

        io.to(roomCode).emit('player-left', { playerId: socket.id });
        logger.info(`Player ${socket.id} left room ${roomCode}`);

      } catch (error) {
        logger.error('Error leaving room:', error);
      }
    });

    // ====== START GAME ======
    socket.on('start-game', async (data, callback) => {
      try {
        const { roomCode, config } = validate<{
          roomCode: string;
          config?: Partial<GameConfig>;
        }>(schemas.startGame, data);

        const room = matchmakingService.getRoom(roomCode);
        if (!room) {
          socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room does not exist' });
          return;
        }

        // Determinar modo: vs IA o multijugador
        const isVsAI = room.players.length === 1;
        const isMultiplayer = room.players.length === 2;

        if (!isVsAI && !isMultiplayer) {
          socket.emit('error', { code: 'INVALID_PLAYER_COUNT', message: 'Need 1 player (vs AI) or 2 players (multiplayer)' });
          return;
        }

        let player1: PlayerInfo;
        let player2: PlayerInfo;

        if (isVsAI) {
          // Modo vs IA: player1 = humano, player2 = LLM
          player1 = room.players[0];

          const llmProfile = LLMService.generateRandomProfile();
          player2 = {
            playerId: 'player2',
            playerName: 'AI Opponent',
            socketId: 'llm-socket',  // Socket ficticio
            connected: true,
            isLLM: true,
            profile: llmProfile
          };

          // Inicializar perfil del LLM
          llmService.initializeProfile(
            room.code,  // Usamos roomCode como ID temporal
            llmProfile,
            'Human',
            config?.payoffs?.success || 70,
            config?.payoffs?.withdraw || 50,
            config?.payoffs?.failure || 20
          );

          logger.info(`Starting game in vs AI mode for room ${roomCode}`);
        } else {
          // Modo multijugador: ambos jugadores son humanos
          player1 = room.players[0];
          player2 = room.players[1];

          logger.info(`Starting game in multiplayer mode for room ${roomCode}`);
        }

        // Crear juego (automaton se crea automáticamente)
        const game = gameService.createGame(
          roomCode,
          room.mode,
          player1,
          player2,
          config
        );

        // Marcar sala como en progreso
        matchmakingService.markRoomInProgress(roomCode, game.gameId);

        // Emitir a todos que el juego comenzó
        io.to(roomCode).emit('game-starting', { gameState: game });

        logger.info(`Game ${game.gameId} started in room ${roomCode}`);

        // Iniciar primera ronda
        setTimeout(async () => {
          await startRound(io, game.gameId);
        }, 2000);

        if (callback) callback({ success: true, gameId: game.gameId });

      } catch (error) {
        logger.error('Error starting game:', error);
        socket.emit('error', {
          code: 'START_GAME_FAILED',
          message: (error as Error).message
        });
      }
    });

    // ====== SUBMIT DECISION ======
    socket.on('submit-decision', async (data) => {
      try {
        const { gameId, decision } = validate<{ gameId: string; decision: Decision }>(
          schemas.submitDecision,
          data
        );

        const game = gameService.getGame(gameId);
        if (!game) {
          socket.emit('error', { code: 'GAME_NOT_FOUND', message: 'Game does not exist' });
          return;
        }

        // Determinar quién es este jugador
        let playerId: PlayerId | null = null;
        if (game.players.player1.socketId === socket.id) playerId = 'player1';
        else if (game.players.player2.socketId === socket.id) playerId = 'player2';

        if (!playerId) {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Not a player in this game' });
          return;
        }

        // En modo secuencial, verificar que sea su turno
        if (game.mode === 'sequential') {
          const nextPlayer = gameService.getNextPlayerInSequence(gameId);
          if (nextPlayer !== playerId) {
            socket.emit('error', { code: 'NOT_YOUR_TURN', message: 'Not your turn yet' });
            return;
          }
        }

        // Registrar decisión
        gameService.submitDecision(gameId, playerId, decision);

        // Confirmar al jugador
        socket.emit('decision-received', { playerId });

        logger.info(`${playerId} submitted decision: ${decision}`);

        // Modo SECUENCIAL: revelar y continuar con processSequentialDecisions
        if (game.mode === 'sequential') {
          const position = game.currentRound.decisionOrder.indexOf(playerId);

          // Revelar decisión (sin identidad)
          io.to(game.roomCode).emit('decision-revealed', { decision, position });

          // Continuar con el siguiente jugador en secuencia
          await processSequentialDecisions(io, gameId, game.currentRound.decisionOrder);
        }
        // Modo SIMULTÁNEO: esperar a que todos decidan
        else {
          if (gameService.allDecisionsMade(gameId)) {
            await finalizeRound(io, gameId);
          }
        }

      } catch (error) {
        logger.error('Error submitting decision:', error);
        socket.emit('error', {
          code: 'SUBMIT_DECISION_FAILED',
          message: (error as Error).message
        });
      }
    });

    // ====== READY NEXT ROUND ======
    socket.on('ready-next-round', async (data) => {
      try {
        const { gameId } = data;
        const game = gameService.getGame(gameId);

        if (!game) return;

        // Por simplicidad, avanzar inmediatamente (en producción: esperar a que todos estén ready)
        const hasNextRound = gameService.nextRound(gameId);

        if (hasNextRound) {
          await startRound(io, gameId);
        } else {
          // Juego terminado
          await endGame(io, gameId);
        }

      } catch (error) {
        logger.error('Error advancing to next round:', error);
      }
    });

    // ====== DISCONNECT ======
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);

      // TODO: Implementar reconexión y auto-decisión después de timeout
      const game = gameService.findGameBySocket(socket.id);
      if (game) {
        io.to(game.roomCode).emit('player-disconnected', { playerId: socket.id });
      }
    });
  });

  logger.info('✓ Socket.io handlers configured');
}

// ====== HELPER FUNCTIONS ======

async function startRound(io: Server, gameId: string): Promise<void> {
  const game = gameService.getGame(gameId);
  if (!game) return;

  gameService.startRound(gameId);

  const roundNumber = game.currentRound.roundNumber;
  const decisionOrder = game.currentRound.decisionOrder;

  io.to(game.roomCode).emit('round-starting', {
    roundNumber,
    decisionOrder: game.mode === 'sequential' ? decisionOrder : undefined
  });

  // Iniciar timer
  startTimer(io, gameId);

  // El automaton SIEMPRE decide WITHDRAW inmediatamente
  gameService.submitDecision(gameId, 'automaton', 'WITHDRAW');
  logger.info(`Automaton decided WITHDRAW for round ${roundNumber} (automatic)`);

  // Si es modo secuencial, procesar jugadores en orden
  if (game.mode === 'sequential') {
    await processSequentialDecisions(io, gameId, decisionOrder);
  }
  // Si es modo simultáneo
  else {
    // Si player2 es LLM, obtener su decisión
    if (game.players.player2.isLLM) {
      const { decision } = await llmService.getLLMDecision(gameId, game, []);
      gameService.submitDecision(gameId, 'player2', decision);
      logger.info(`LLM (player2) decided ${decision} for round ${roundNumber}`);
    }

    // Verificar si todos decidieron
    if (gameService.allDecisionsMade(gameId)) {
      await finalizeRound(io, gameId);
    }
  }
}

/**
 * Procesa decisiones en modo secuencial
 */
async function processSequentialDecisions(io: Server, gameId: string, decisionOrder: PlayerId[]): Promise<void> {
  const game = gameService.getGame(gameId);
  if (!game) return;

  for (const pid of decisionOrder) {
    // Si ya decidió (automaton), skip
    if (game.currentRound.decisions.has(pid)) {
      const decision = game.currentRound.decisions.get(pid)!;
      const position = decisionOrder.indexOf(pid);
      io.to(game.roomCode).emit('decision-revealed', { decision, position });
      continue;
    }

    // Si es automaton (nunca debería llegar aquí porque ya decidió)
    if (pid === 'automaton') {
      gameService.submitDecision(gameId, 'automaton', 'WITHDRAW');
      io.to(game.roomCode).emit('decision-revealed', { decision: 'WITHDRAW', position: decisionOrder.indexOf(pid) });
      continue;
    }

    // Si es player2 y es LLM
    if (pid === 'player2' && game.players.player2.isLLM) {
      const priorActions = gameService.getPriorActionsMasked(gameId);
      const { decision } = await llmService.getLLMDecision(gameId, game, priorActions);
      gameService.submitDecision(gameId, 'player2', decision);

      const position = decisionOrder.indexOf(pid);
      io.to(game.roomCode).emit('decision-revealed', { decision, position });
      logger.info(`LLM (player2) decided ${decision} in sequential mode`);
      continue;
    }

    // Si es jugador humano, esperar a que decida
    const priorActions = gameService.getPriorActionsMasked(gameId);
    const position = decisionOrder.indexOf(pid);
    io.to(game.roomCode).emit('next-player-turn', {
      position,
      priorActions
    });

    // Salir del loop - esperamos a que el jugador humano decida (se maneja en submit-decision)
    return;
  }

  // Si llegamos aquí, todos decidieron
  await finalizeRound(io, gameId);
}

function startTimer(io: Server, gameId: string): void {
  const game = gameService.getGame(gameId);
  if (!game) return;

  const startTime = Date.now();
  const durationMs = game.config.decisionTimeoutMs;

  const interval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, durationMs - elapsed);

    io.to(game.roomCode).emit('timer-update', {
      startTime,
      durationMs,
      remainingMs: remaining
    });

    if (remaining === 0) {
      clearInterval(interval);
      handleRoundTimeout(io, gameId);
    }
  }, 1000);

  game.currentRound.timerInterval = interval;
}

async function handleRoundTimeout(io: Server, gameId: string): Promise<void> {
  const game = gameService.getGame(gameId);
  if (!game) return;

  logger.warn(`Round timeout for game ${gameId}`);

  // Auto-decidir KEEP para jugadores que no decidieron
  for (const pid of ['player1', 'player2'] as PlayerId[]) {
    if (!game.currentRound.decisions.has(pid)) {
      gameService.submitDecision(gameId, pid, 'KEEP');
      logger.info(`Auto-decided KEEP for ${pid} due to timeout`);
    }
  }

  await finalizeRound(io, gameId);
}

async function finalizeRound(io: Server, gameId: string): Promise<void> {
  const game = gameService.getGame(gameId);
  if (!game) return;

  // Limpiar timer
  if (game.currentRound.timerInterval) {
    clearInterval(game.currentRound.timerInterval);
  }

  const result = gameService.finalizeRound(gameId);

  // Informar al LLM del resultado
  const outcomeText = `Round ${result.round}: Player1 chose ${result.decisions.player1}, Player2 chose ${result.decisions.player2}, Auto chose WITHDRAW. ` +
                      `Payoffs => Player1:${result.payoffs.player1}, Player2:${result.payoffs.player2}, Auto:${result.payoffs.automaton}.`;
  llmService.informOutcome(gameId, outcomeText);

  // Emitir resultados a todos
  io.to(game.roomCode).emit('round-complete', { results: result });

  logger.info(`Round ${result.round} complete in game ${gameId}`);

  // Auto-avanzar después de 5 segundos
  setTimeout(async () => {
    const hasNext = gameService.nextRound(gameId);
    if (hasNext) {
      await startRound(io, gameId);
    } else {
      await endGame(io, gameId);
    }
  }, 5000);
}

async function endGame(io: Server, gameId: string): Promise<void> {
  const game = gameService.getGame(gameId);
  if (!game) return;

  logger.info(`Game ${gameId} ended`);

  // Guardar resultados en DB
  try {
    await gameService.saveGameResults(gameId);
  } catch (error) {
    logger.error('Failed to save game results:', error);
  }

  // Emitir fin de juego
  io.to(game.roomCode).emit('game-over', { finalResults: game });

  // Limpiar recursos
  llmService.clearHistory(gameId);

  // Eliminar juego después de un tiempo
  setTimeout(() => {
    gameService.deleteGame(gameId);
    matchmakingService.deleteRoom(game.roomCode);
  }, 60000); // 1 minuto
}
