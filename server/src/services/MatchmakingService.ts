import { nanoid } from 'nanoid';
import { Room } from '../models/Room';
import { GameMode, PlayerInfo } from '../types';
import { logger } from '../config/logger';

interface RoomState {
  code: string;
  mode: GameMode;
  players: PlayerInfo[];
  createdAt: Date;
  timeout?: NodeJS.Timeout;
}

export class MatchmakingService {
  private rooms: Map<string, RoomState> = new Map();
  private readonly ROOM_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos

  /**
   * Crea una nueva sala
   */
  createRoom(mode: GameMode): string {
    const code = this.generateRoomCode();

    const room: RoomState = {
      code,
      mode,
      players: [],
      createdAt: new Date()
    };

    // Configurar timeout para auto-eliminar sala inactiva
    const timeout = setTimeout(() => {
      this.deleteRoom(code);
    }, this.ROOM_TIMEOUT_MS);

    room.timeout = timeout;

    this.rooms.set(code, room);
    logger.info(`Room created: ${code} (${mode} mode)`);

    // Guardar en MongoDB también (opcional, para persistencia)
    this.saveRoomToDB(room).catch(err => {
      logger.error('Failed to save room to DB:', err);
    });

    return code;
  }

  /**
   * Un jugador se une a una sala
   */
  joinRoom(roomCode: string, playerInfo: PlayerInfo): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) {
      logger.warn(`Attempt to join non-existent room: ${roomCode}`);
      return false;
    }

    if (room.players.length >= 2) {
      logger.warn(`Room ${roomCode} is full`);
      return false;
    }

    // Asignar playerId según orden
    const playerId = room.players.length === 0 ? 'player1' : 'player2';
    const player: PlayerInfo = {
      ...playerInfo,
      playerId: playerId as any,
      connected: true,
      isLLM: false
    };

    room.players.push(player);
    logger.info(`Player ${player.playerName} joined room ${roomCode} as ${playerId}`);

    return true;
  }

  /**
   * Obtiene información de una sala
   */
  getRoom(roomCode: string): RoomState | undefined {
    return this.rooms.get(roomCode);
  }

  /**
   * Verifica si una sala está llena
   */
  isRoomFull(roomCode: string): boolean {
    const room = this.rooms.get(roomCode);
    return room ? room.players.length >= 2 : false;
  }

  /**
   * Elimina una sala
   */
  deleteRoom(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    // Limpiar timeout
    if (room.timeout) {
      clearTimeout(room.timeout);
    }

    this.rooms.delete(roomCode);
    logger.info(`Room ${roomCode} deleted`);

    // Actualizar en DB
    this.updateRoomStatusInDB(roomCode, 'FINISHED').catch(err => {
      logger.error('Failed to update room status in DB:', err);
    });
  }

  /**
   * Un jugador sale de la sala
   */
  leaveRoom(roomCode: string, socketId: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    room.players = room.players.filter(p => p.socketId !== socketId);
    logger.info(`Player with socket ${socketId} left room ${roomCode}`);

    // Si la sala queda vacía, eliminarla
    if (room.players.length === 0) {
      this.deleteRoom(roomCode);
    }
  }

  /**
   * Genera un código único de sala (6 caracteres alfanuméricos)
   */
  private generateRoomCode(): string {
    let code: string;
    do {
      code = nanoid(6).toUpperCase();
    } while (this.rooms.has(code)); // Asegurar unicidad

    return code;
  }

  /**
   * Guarda sala en MongoDB
   */
  private async saveRoomToDB(room: RoomState): Promise<void> {
    try {
      const roomDoc = new Room({
        code: room.code,
        mode: room.mode,
        players: room.players.map(p => ({
          playerId: p.playerId,
          playerName: p.playerName,
          socketId: p.socketId,
          joinedAt: new Date()
        })),
        status: 'LOBBY',
        createdAt: room.createdAt,
        expiresAt: new Date(Date.now() + this.ROOM_TIMEOUT_MS)
      });

      await roomDoc.save();
    } catch (error) {
      // No crítico, solo logging
      logger.error('Failed to save room to DB:', error);
    }
  }

  /**
   * Actualiza estado de sala en MongoDB
   */
  private async updateRoomStatusInDB(
    roomCode: string,
    status: 'LOBBY' | 'IN_PROGRESS' | 'FINISHED'
  ): Promise<void> {
    try {
      await Room.findOneAndUpdate(
        { code: roomCode },
        { status },
        { new: true }
      );
    } catch (error) {
      logger.error('Failed to update room status in DB:', error);
    }
  }

  /**
   * Marca sala como "en progreso" cuando el juego inicia
   */
  markRoomInProgress(roomCode: string, gameId: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    this.updateRoomStatusInDB(roomCode, 'IN_PROGRESS').catch(err => {
      logger.error('Failed to mark room in progress:', err);
    });

    // Actualizar con gameId en DB
    Room.findOneAndUpdate(
      { code: roomCode },
      { gameId }
    ).catch(err => {
      logger.error('Failed to set gameId in room:', err);
    });
  }

  /**
   * Obtiene todas las salas activas (para debugging/admin)
   */
  getAllRooms(): RoomState[] {
    return Array.from(this.rooms.values());
  }
}

// Singleton
export const matchmakingService = new MatchmakingService();
