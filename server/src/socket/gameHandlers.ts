import { Server, Socket } from 'socket.io';
import Joi from 'joi';
import { gameService } from '../services/GameService';
import { matchmakingService } from '../services/MatchmakingService';
import { llmService, LLMService } from '../services/LLMService';
import { logger } from '../config/logger';
import { getGlobalConfig } from '../models/GlobalConfig';
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
  }),

  sendChatMessage: Joi.object({
    gameId: Joi.string().required(),
    message: Joi.string().min(1).max(500).required()
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

        // Añadir al creador como jugador automáticamente
        const playerInfo: PlayerInfo = {
          playerId: 'player1' as PlayerId,
          playerName: 'Player',
          socketId: socket.id,
          connected: true,
          isLLM: false
        };

        matchmakingService.joinRoom(roomCode, playerInfo);

        logger.info(`Room ${roomCode} created by ${socket.id}, creator joined as player1`);

        const response = { roomCode, playerId: 'player1' };

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
          const newPlayer = updatedRoom.players[updatedRoom.players.length - 1];

          // Emitir a todos en la sala
          io.to(roomCode).emit('room-joined', {
            roomCode,
            players: updatedRoom.players,
            mode: updatedRoom.mode
          });

          // Emitir específicamente al nuevo jugador su playerId
          socket.emit('your-player-id', { playerId: newPlayer.playerId });

          // Emitir a todos que un jugador se unió
          io.to(roomCode).emit('player-joined', {
            player: newPlayer
          });

          if (callback) callback({ success: true, roomCode, playerId: newPlayer.playerId });

          logger.info(`Player ${playerName} joined room ${roomCode} as ${newPlayer.playerId}`);
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

        // Obtener configuración global (incluye chat settings)
        const globalConfig = await getGlobalConfig();
        logger.info(`[CHAT DEBUG] Raw globalConfig from DB: ${JSON.stringify(globalConfig)}`);

        const mergedConfig: Partial<GameConfig> = {
          ...config,
          chatEnabled: globalConfig.chatEnabled,
          chatDuration: globalConfig.chatDuration,
          chatFrequency: globalConfig.chatFrequency,
          totalRounds: globalConfig.totalRounds
        };

        logger.info(`[CHAT DEBUG] mergedConfig to pass to createGame: chatEnabled=${mergedConfig.chatEnabled}, chatDuration=${mergedConfig.chatDuration}, chatFrequency=${mergedConfig.chatFrequency}`);
        logger.info(`Global config loaded: chatEnabled=${globalConfig.chatEnabled}, chatDuration=${globalConfig.chatDuration}, chatFrequency=${globalConfig.chatFrequency}`);

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
          mergedConfig
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

        // Debug logging para identificar el problema
        logger.info(`[DECISION DEBUG] Received decision: ${decision} for game: ${gameId}`);
        logger.info(`[DECISION DEBUG] Incoming socket.id: ${socket.id}`);
        logger.info(`[DECISION DEBUG] Player1 socket: ${game.players.player1.socketId}, connected: ${game.players.player1.connected}`);
        logger.info(`[DECISION DEBUG] Player2 socket: ${game.players.player2.socketId}, connected: ${game.players.player2.connected}, isLLM: ${game.players.player2.isLLM}`);

        // Determinar quién es este jugador
        let playerId: PlayerId | null = null;
        if (game.players.player1.socketId === socket.id) playerId = 'player1';
        else if (game.players.player2.socketId === socket.id) playerId = 'player2';

        logger.info(`[DECISION DEBUG] Matched playerId: ${playerId}`);

        if (!playerId) {
          logger.error(`[DECISION DEBUG] No matching playerId found for socket ${socket.id}`);
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

    // ====== SEND CHAT MESSAGE ======
    socket.on('send-chat-message', async (data) => {
      try {
        const { gameId, message } = validate<{ gameId: string; message: string }>(
          schemas.sendChatMessage,
          data
        );

        const game = gameService.getGame(gameId);
        if (!game) {
          socket.emit('error', { code: 'GAME_NOT_FOUND', message: 'Game not found' });
          return;
        }

        if (game.status !== 'ROUND_CHAT') {
          socket.emit('error', { code: 'NOT_CHAT_PHASE', message: 'Not in chat phase' });
          return;
        }

        // Determinar quien es este jugador
        let playerId: 'player1' | 'player2' | null = null;
        if (game.players.player1.socketId === socket.id) playerId = 'player1';
        else if (game.players.player2.socketId === socket.id) playerId = 'player2';

        if (!playerId) {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Not a player' });
          return;
        }

        // Agregar mensaje
        const chatMessage = gameService.addChatMessage(gameId, playerId, message);

        // Broadcast a la sala
        io.to(game.roomCode).emit('chat-message', {
          playerId,
          message: chatMessage.message,
          timestamp: chatMessage.timestamp
        });

        // Si juega vs LLM y el humano envio mensaje, generar respuesta del LLM
        if (playerId === 'player1' && game.players.player2.isLLM) {
          // Delay para respuesta natural
          setTimeout(async () => {
            try {
              const currentGame = gameService.getGame(gameId);
              if (!currentGame || currentGame.status !== 'ROUND_CHAT') return;

              const llmResponse = await llmService.generateChatResponse(
                gameId,
                currentGame,
                currentGame.currentRound.chatMessages,
                message
              );

              // Verificar que no sea [SILENT] y que tenga contenido
              if (llmResponse && llmResponse.trim() !== '' && !llmResponse.includes('[SILENT]')) {
                const llmMessage = gameService.addChatMessage(gameId, 'player2', llmResponse);
                io.to(game.roomCode).emit('chat-message', {
                  playerId: 'player2',
                  message: llmMessage.message,
                  timestamp: llmMessage.timestamp
                });
              }
            } catch (error) {
              logger.error('Error generating LLM chat response:', error);
            }
          }, 1000 + Math.random() * 2000);  // 1-3 segundos de delay
        }

      } catch (error) {
        logger.error('Error sending chat message:', error);
        socket.emit('error', {
          code: 'CHAT_ERROR',
          message: (error as Error).message
        });
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

/**
 * Inicia una ronda - verifica si debe haber chat primero
 */
async function startRound(io: Server, gameId: string): Promise<void> {
  const game = gameService.getGame(gameId);
  if (!game) {
    logger.error(`[CHAT DEBUG] startRound: game not found for ${gameId}`);
    return;
  }

  logger.info(`[CHAT DEBUG] startRound called for game ${gameId}, round ${game.currentRound.roundNumber}`);

  // Verificar si debe haber chat en esta ronda
  const shouldChat = gameService.shouldHaveChat(gameId);
  logger.info(`[CHAT DEBUG] shouldHaveChat returned: ${shouldChat}`);

  if (shouldChat) {
    logger.info(`[CHAT DEBUG] Starting chat phase for game ${gameId}`);
    await startChatPhase(io, gameId);
  } else {
    logger.info(`[CHAT DEBUG] Starting decision phase directly for game ${gameId}`);
    await startDecisionPhase(io, gameId);
  }
}

/**
 * Inicia la fase de chat pre-decision
 */
async function startChatPhase(io: Server, gameId: string): Promise<void> {
  const game = gameService.getGame(gameId);
  if (!game) {
    logger.error(`[CHAT DEBUG] startChatPhase: game not found for ${gameId}`);
    return;
  }

  logger.info(`[CHAT DEBUG] startChatPhase: Starting chat phase for game ${gameId}`);

  gameService.startChatPhase(gameId);

  const roundNumber = game.currentRound.roundNumber;
  const duration = game.config.chatDuration;

  logger.info(`[CHAT DEBUG] Emitting 'chat-starting' to room ${game.roomCode} with roundNumber=${roundNumber}, duration=${duration}`);
  io.to(game.roomCode).emit('chat-starting', { roundNumber, duration });

  // Iniciar timer de chat
  startChatTimer(io, gameId);

  // Si player2 es LLM, posiblemente enviar mensaje inicial
  if (game.players.player2.isLLM) {
    setTimeout(async () => {
      try {
        const currentGame = gameService.getGame(gameId);
        if (!currentGame || currentGame.status !== 'ROUND_CHAT') return;

        const message = await llmService.generateProactiveChatMessage(
          gameId,
          currentGame,
          currentGame.currentRound.chatMessages
        );

        if (message && message.trim() !== '' && !message.includes('[SILENT]')) {
          const chatMsg = gameService.addChatMessage(gameId, 'player2', message);
          io.to(game.roomCode).emit('chat-message', {
            playerId: 'player2',
            message: chatMsg.message,
            timestamp: chatMsg.timestamp
          });
        }
      } catch (error) {
        logger.error('Error generating proactive LLM chat message:', error);
      }
    }, 2000);  // Esperar 2 segundos antes de que el LLM hable
  }

  logger.info(`Chat phase started for round ${roundNumber} in game ${gameId} (${duration}s)`);
}

/**
 * Inicia el timer de la fase de chat
 */
function startChatTimer(io: Server, gameId: string): void {
  const game = gameService.getGame(gameId);
  if (!game) return;

  const startTime = Date.now();
  const durationMs = game.config.chatDuration * 1000;

  const interval = setInterval(() => {
    const currentGame = gameService.getGame(gameId);
    if (!currentGame) {
      clearInterval(interval);
      return;
    }

    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, durationMs - elapsed);

    io.to(game.roomCode).emit('timer-update', {
      startTime,
      durationMs,
      remainingMs: remaining,
      phase: 'chat'
    });

    if (remaining === 0) {
      clearInterval(interval);
      handleChatTimeout(io, gameId);
    }
  }, 1000);

  game.currentRound.chatTimerInterval = interval;
}

/**
 * Maneja el fin del timer de chat
 */
async function handleChatTimeout(io: Server, gameId: string): Promise<void> {
  const game = gameService.getGame(gameId);
  if (!game) return;

  logger.info(`Chat phase ended for game ${gameId}`);

  io.to(game.roomCode).emit('chat-ending', {
    roundNumber: game.currentRound.roundNumber,
    totalMessages: game.currentRound.chatMessages.length
  });

  gameService.endChatPhase(gameId);

  // Transicionar a fase de decision
  await startDecisionPhase(io, gameId);
}

/**
 * Inicia la fase de decision (logica original de startRound)
 */
async function startDecisionPhase(io: Server, gameId: string): Promise<void> {
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

    // Enviar evento solo al jugador cuyo turno es
    const playerSocket = pid === 'player1' ? game.players.player1.socketId : game.players.player2.socketId;
    io.to(playerSocket).emit('next-player-turn', {
      playerId: pid,
      position,
      priorActions
    });

    logger.info(`Notified ${pid} (socket ${playerSocket}) that it's their turn in sequential mode`);

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
      remainingMs: remaining,
      phase: 'decision'
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

  // Auto-avanzar después de 8 segundos (tiempo para leer resultados)
  setTimeout(async () => {
    const hasNext = gameService.nextRound(gameId);
    if (hasNext) {
      await startRound(io, gameId);
    } else {
      await endGame(io, gameId);
    }
  }, 8000);
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
