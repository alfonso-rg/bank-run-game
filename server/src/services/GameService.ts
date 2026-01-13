import { nanoid } from 'nanoid';
import {
  GameState,
  GameMode,
  PlayerId,
  Decision,
  RoundResult,
  RoundPayoff,
  GameConfig,
  DEFAULT_GAME_CONFIG,
  PlayerInfo,
  PLAYER_IDS,
  PaidWhen
} from '../types';
import { GameResult } from '../models/GameResult';
import { logger } from '../config/logger';

export class GameService {
  private games: Map<string, GameState> = new Map();
  private playerGameMap: Map<string, string> = new Map(); // socketId -> gameId

  /**
   * Crea un nuevo juego
   */
  createGame(
    roomCode: string,
    mode: GameMode,
    player1: PlayerInfo,
    player2: PlayerInfo,
    llmPlayer: PlayerInfo,
    config: Partial<GameConfig> = {}
  ): GameState {
    const gameId = nanoid();
    const gameConfig = { ...DEFAULT_GAME_CONFIG, ...config, mode };

    const game: GameState = {
      gameId,
      roomCode,
      mode,
      status: 'STARTING',
      players: {
        player1,
        player2,
        llm: { ...llmPlayer, isLLM: true }
      },
      config: gameConfig,
      currentRound: {
        roundNumber: 1,
        decisions: new Map(),
        decisionOrder: [],
        revealedDecisions: [],
        timerStartedAt: null
      },
      roundHistory: [],
      createdAt: new Date(),
      reconnectionTokens: {
        player1: nanoid(),
        player2: nanoid(),
        llm: nanoid()
      }
    };

    this.games.set(gameId, game);
    this.playerGameMap.set(player1.socketId, gameId);
    this.playerGameMap.set(player2.socketId, gameId);

    logger.info(`Game created: ${gameId} in room ${roomCode} (${mode} mode)`);

    return game;
  }

  /**
   * Obtiene un juego por su ID
   */
  getGame(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  /**
   * Encuentra un juego por socketId del jugador
   */
  findGameBySocket(socketId: string): GameState | undefined {
    const gameId = this.playerGameMap.get(socketId);
    if (!gameId) return undefined;
    return this.games.get(gameId);
  }

  /**
   * Inicia una nueva ronda
   */
  startRound(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) throw new Error('Game not found');

    // Shuffle del orden de decisión (crítico para modo secuencial)
    const shuffledOrder = this.shuffleArray([...PLAYER_IDS]);

    game.currentRound = {
      roundNumber: game.currentRound.roundNumber,
      decisions: new Map(),
      decisionOrder: shuffledOrder,
      revealedDecisions: [],
      timerStartedAt: new Date()
    };

    game.status = 'ROUND_DECISION';

    logger.info(`Round ${game.currentRound.roundNumber} started in game ${gameId}. Order: ${shuffledOrder.join(' → ')}`);
  }

  /**
   * Registra una decisión de un jugador
   */
  submitDecision(gameId: string, playerId: PlayerId, decision: Decision): void {
    const game = this.games.get(gameId);
    if (!game) throw new Error('Game not found');
    if (game.status !== 'ROUND_DECISION' && game.status !== 'ROUND_REVEALING') {
      throw new Error(`Cannot submit decision in status: ${game.status}`);
    }

    game.currentRound.decisions.set(playerId, decision);
    logger.info(`${playerId} decided ${decision} in game ${gameId}`);
  }

  /**
   * Verifica si todos los jugadores han decidido
   */
  allDecisionsMade(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;

    return PLAYER_IDS.every(pid => game.currentRound.decisions.has(pid));
  }

  /**
   * Calcula los payoffs para modo SIMULTÁNEO
   * Replica la lógica de run_round_simultaneous del Python (líneas 283-323)
   */
  private calculatePayoffsSimultaneous(
    decisions: Map<PlayerId, Decision>,
    config: GameConfig
  ): { payoffs: RoundPayoff; paidWhen?: Record<PlayerId, PaidWhen> } {
    const d1 = decisions.get('player1')!;
    const d2 = decisions.get('player2')!;
    const dllm = decisions.get('llm')!;

    const { success, withdraw, failure } = config.payoffs;

    // Caso éxito: ambos pacientes hacen KEEP
    if (d1 === 'KEEP' && d2 === 'KEEP') {
      return {
        payoffs: {
          player1: success,
          player2: success,
          llm: withdraw  // El LLM siempre retira
        }
      };
    }

    // Caso con retiros: determinar quién retira primero (aleatorio en simultáneo)
    const withdrawQueue = this.shuffleArray<PlayerId>([...PLAYER_IDS]);
    const actionsMap: Record<PlayerId, Decision> = {
      player1: d1,
      player2: d2,
      llm: dllm
    };

    const payoffs: RoundPayoff = {
      player1: failure,
      player2: failure,
      llm: failure
    };

    let paidCount = 0;

    for (const pid of withdrawQueue) {
      if (actionsMap[pid] === 'WITHDRAW') {
        if (paidCount < 2) {
          payoffs[pid] = withdraw;
          paidCount++;
        } else {
          payoffs[pid] = failure;
        }
      }
    }

    return { payoffs };
  }

  /**
   * Calcula los payoffs para modo SECUENCIAL
   * Replica la lógica de run_round_sequential del Python (líneas 325-423)
   */
  private calculatePayoffsSequential(
    decisions: Map<PlayerId, Decision>,
    decisionOrder: PlayerId[],
    config: GameConfig
  ): { payoffs: RoundPayoff; paidWhen: Record<PlayerId, PaidWhen>; seqTrace: string } {
    const { success, withdraw, failure } = config.payoffs;

    const payoffs: RoundPayoff = {
      player1: failure,
      player2: failure,
      llm: failure
    };

    const paidWhen: Record<PlayerId, PaidWhen> = {
      player1: 'deferred',
      player2: 'deferred',
      llm: 'deferred'
    };

    const trace: string[] = [];
    let withdrawCount = 0;

    // Procesar decisiones en orden
    for (const pid of decisionOrder) {
      const decision = decisions.get(pid)!;

      if (decision === 'WITHDRAW') {
        withdrawCount++;

        // Pago inmediato si es uno de los primeros 2 retiros
        if (withdrawCount <= 2) {
          payoffs[pid] = withdraw;
          paidWhen[pid] = 'immediate';
          trace.push(`${pid}:WITHDRAW=>${withdraw} (immediate)`);
        } else {
          payoffs[pid] = failure;
          paidWhen[pid] = 'immediate';
          trace.push(`${pid}:WITHDRAW=>${failure} (immediate)`);
        }
      } else {
        // KEEP - pago diferido
        trace.push(`${pid}:KEEP (deferred)`);
      }
    }

    // Resolver pagos diferidos
    const d1 = decisions.get('player1')!;
    const d2 = decisions.get('player2')!;

    if (d1 === 'KEEP' && d2 === 'KEEP') {
      // Éxito: ambos pacientes cooperaron
      payoffs.player1 = success;
      payoffs.player2 = success;
    } else {
      // Fracaso: al menos un paciente retiró
      for (const pid of ['player1', 'player2'] as PlayerId[]) {
        if (paidWhen[pid] === 'deferred') {
          payoffs[pid] = failure;
        }
      }
    }

    const seqTrace = trace.join(' → ');

    return { payoffs, paidWhen, seqTrace };
  }

  /**
   * Finaliza la ronda actual y calcula resultados
   */
  finalizeRound(gameId: string): RoundResult {
    const game = this.games.get(gameId);
    if (!game) throw new Error('Game not found');

    const roundNumber = game.currentRound.roundNumber;
    const decisions = game.currentRound.decisions;
    const decisionOrder = game.currentRound.decisionOrder;

    // Extraer decisiones
    const d1 = decisions.get('player1')!;
    const d2 = decisions.get('player2')!;
    const dllm = decisions.get('llm')!;

    // Crear Map sin nulls para pasar a funciones de cálculo
    const decisionsClean = new Map<PlayerId, Decision>([
      ['player1', d1],
      ['player2', d2],
      ['llm', dllm]
    ]);

    // Calcular payoffs según el modo
    let result: RoundResult;

    if (game.mode === 'simultaneous') {
      const { payoffs } = this.calculatePayoffsSimultaneous(decisionsClean, game.config);

      result = {
        round: roundNumber,
        decisions: {
          player1: d1,
          player2: d2,
          llm: dllm
        },
        payoffs,
        decisionOrder
      };
    } else {
      // Modo secuencial
      const { payoffs, paidWhen, seqTrace } = this.calculatePayoffsSequential(
        decisionsClean,
        decisionOrder,
        game.config
      );

      result = {
        round: roundNumber,
        decisions: {
          player1: d1,
          player2: d2,
          llm: dllm
        },
        payoffs,
        decisionOrder,
        paidWhen,
        seqTrace
      };
    }

    game.roundHistory.push(result);
    game.status = 'ROUND_RESULTS';

    logger.info(`Round ${roundNumber} finalized. Payoffs: P1=${result.payoffs.player1}, P2=${result.payoffs.player2}, LLM=${result.payoffs.llm}`);

    return result;
  }

  /**
   * Avanza a la siguiente ronda o termina el juego
   */
  nextRound(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) throw new Error('Game not found');

    if (game.currentRound.roundNumber >= game.config.totalRounds) {
      // Juego terminado
      game.status = 'GAME_OVER';
      game.endedAt = new Date();
      logger.info(`Game ${gameId} finished after ${game.currentRound.roundNumber} rounds`);
      return false;
    }

    // Siguiente ronda
    game.currentRound.roundNumber++;
    game.status = 'ROUND_DECISION';
    logger.info(`Game ${gameId} advancing to round ${game.currentRound.roundNumber}`);
    return true;
  }

  /**
   * Guarda los resultados del juego en MongoDB
   */
  async saveGameResults(gameId: string): Promise<void> {
    const game = this.games.get(gameId);
    if (!game) throw new Error('Game not found');

    try {
      // Calcular payoffs totales
      const totalPayoffs = game.roundHistory.reduce(
        (acc, round) => ({
          player1: acc.player1 + round.payoffs.player1,
          player2: acc.player2 + round.payoffs.player2,
          llm: acc.llm + round.payoffs.llm
        }),
        { player1: 0, player2: 0, llm: 0 }
      );

      const gameResult = new GameResult({
        gameId: game.gameId,
        roomCode: game.roomCode,
        mode: game.mode,
        timestamp: game.createdAt,
        rounds: game.roundHistory,
        totalPayoffs,
        playerTypes: ['human', 'human'],
        sessionMetadata: {
          roomCode: game.roomCode,
          llmModel: 'gpt-4o-mini',
          llmResponses: [],
          playerProfiles: {
            player1: game.players.player1.profile,
            player2: game.players.player2.profile
          }
        },
        reconnectionTokens: game.reconnectionTokens
      });

      await gameResult.save();
      logger.info(`Game results saved to database: ${gameId}`);
    } catch (error) {
      logger.error(`Failed to save game results for ${gameId}:`, error);
      throw error;
    }
  }

  /**
   * Elimina un juego de la memoria
   */
  deleteGame(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;

    // Limpiar mappings de jugadores
    this.playerGameMap.delete(game.players.player1.socketId);
    this.playerGameMap.delete(game.players.player2.socketId);

    // Limpiar timer si existe
    if (game.currentRound.timerInterval) {
      clearInterval(game.currentRound.timerInterval);
    }

    this.games.delete(gameId);
    logger.info(`Game ${gameId} deleted from memory`);
  }

  /**
   * Utility: shuffle array (Fisher-Yates)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Obtiene el siguiente jugador en turno (modo secuencial)
   */
  getNextPlayerInSequence(gameId: string): PlayerId | null {
    const game = this.games.get(gameId);
    if (!game || game.mode !== 'sequential') return null;

    const { decisionOrder, decisions } = game.currentRound;

    // Encontrar el primer jugador que no ha decidido
    for (const pid of decisionOrder) {
      if (!decisions.has(pid)) {
        return pid;
      }
    }

    return null; // Todos han decidido
  }

  /**
   * Obtiene las acciones previas enmascaradas (sin identidades)
   * Para modo secuencial
   */
  getPriorActionsMasked(gameId: string): Decision[] {
    const game = this.games.get(gameId);
    if (!game) return [];

    const { decisionOrder, decisions } = game.currentRound;
    const priorActions: Decision[] = [];

    for (const pid of decisionOrder) {
      const decision = decisions.get(pid);
      if (decision) {
        priorActions.push(decision);
      } else {
        break; // Detenerse cuando llegamos a quien no ha decidido
      }
    }

    return priorActions;
  }
}

// Singleton
export const gameService = new GameService();
