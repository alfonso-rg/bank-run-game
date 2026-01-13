import mongoose, { Schema, Document } from 'mongoose';
import { GameResultDocument } from '../types';

export interface IGameResultDocument extends GameResultDocument, Document {}

const GameResultSchema = new Schema<IGameResultDocument>({
  gameId: {
    type: String,
    required: true,
    unique: true
  },
  roomCode: {
    type: String,
    required: true,
    index: true
  },
  mode: {
    type: String,
    enum: ['sequential', 'simultaneous'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  rounds: [{
    round: { type: Number, required: true },
    decisions: {
      player1: { type: String, enum: ['KEEP', 'WITHDRAW'], required: true },
      player2: { type: String, enum: ['KEEP', 'WITHDRAW'], required: true },
      automaton: { type: String, enum: ['KEEP', 'WITHDRAW'], required: true }  // Siempre WITHDRAW
    },
    payoffs: {
      player1: { type: Number, required: true },
      player2: { type: Number, required: true },
      automaton: { type: Number, required: true }
    },
    decisionOrder: [{ type: String, required: true }],
    paidWhen: {
      player1: { type: String, enum: ['immediate', 'deferred'] },
      player2: { type: String, enum: ['immediate', 'deferred'] },
      automaton: { type: String, enum: ['immediate', 'deferred'] }
    },
    seqTrace: { type: String }
  }],
  totalPayoffs: {
    player1: { type: Number, required: true },
    player2: { type: Number, required: true },
    automaton: { type: Number, required: true }
  },
  playerTypes: [{
    type: String,
    enum: ['human', 'llm'],
    required: true
  }],
  sessionMetadata: {
    roomCode: { type: String },
    llmModel: { type: String },  // Solo si player2 era LLM
    llmResponses: [{ type: String }],  // Respuestas del LLM
    playerProfiles: {
      player1: {
        gender: { type: String },
        age_band: { type: String },
        education: { type: String },
        institutional_trust_0_10: { type: Number }
      },
      player2: {
        gender: { type: String },
        age_band: { type: String },
        education: { type: String },
        institutional_trust_0_10: { type: Number }
      }
    }
  },
  reconnectionTokens: {
    type: Map,
    of: String
  }
});

// Índices para queries eficientes
GameResultSchema.index({ gameId: 1 }, { unique: true });
GameResultSchema.index({ roomCode: 1 });
GameResultSchema.index({ timestamp: -1 }); // Para queries ordenadas por fecha
GameResultSchema.index({ mode: 1 });

export const GameResult = mongoose.model<IGameResultDocument>('GameResult', GameResultSchema);
