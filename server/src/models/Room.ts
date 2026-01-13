import mongoose, { Schema, Document } from 'mongoose';
import { RoomDocument, GameMode } from '../types';

export interface IRoomDocument extends RoomDocument, Document {}

const RoomSchema = new Schema<IRoomDocument>({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    length: 6
  },
  mode: {
    type: String,
    enum: ['sequential', 'simultaneous'],
    required: true
  },
  players: [{
    playerId: { type: String, required: true },
    playerName: { type: String, required: true },
    socketId: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['LOBBY', 'IN_PROGRESS', 'FINISHED'],
    default: 'LOBBY'
  },
  gameId: {
    type: String,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 30 * 60 * 1000), // 30 minutos
    index: { expires: 0 } // TTL index - auto-delete after expiresAt
  }
});

// Índices
RoomSchema.index({ code: 1 }, { unique: true });
RoomSchema.index({ status: 1 });
RoomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Room = mongoose.model<IRoomDocument>('Room', RoomSchema);
