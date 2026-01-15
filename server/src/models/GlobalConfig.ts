import mongoose, { Schema, Document } from 'mongoose';

export interface IGlobalConfig {
  opponentType: 'ai' | 'human';  // IA o Multijugador
  gameMode: 'sequential' | 'simultaneous';
  totalRounds: number;
  updatedAt: Date;
}

export interface IGlobalConfigDocument extends IGlobalConfig, Document {}

const GlobalConfigSchema = new Schema<IGlobalConfigDocument>({
  opponentType: {
    type: String,
    enum: ['ai', 'human'],
    required: true,
    default: 'ai'
  },
  gameMode: {
    type: String,
    enum: ['sequential', 'simultaneous'],
    required: true,
    default: 'simultaneous'
  },
  totalRounds: {
    type: Number,
    required: true,
    min: 1,
    max: 20,
    default: 5
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export const GlobalConfig = mongoose.model<IGlobalConfigDocument>('GlobalConfig', GlobalConfigSchema);

// Función para obtener o crear la configuración global (singleton)
export async function getGlobalConfig(): Promise<IGlobalConfig> {
  let config = await GlobalConfig.findOne();

  if (!config) {
    // Crear configuración por defecto
    config = await GlobalConfig.create({
      opponentType: 'ai',
      gameMode: 'simultaneous',
      totalRounds: 5
    });
  }

  return {
    opponentType: config.opponentType,
    gameMode: config.gameMode,
    totalRounds: config.totalRounds,
    updatedAt: config.updatedAt
  };
}

// Función para actualizar la configuración global
export async function updateGlobalConfig(
  updates: Partial<Omit<IGlobalConfig, 'updatedAt'>>
): Promise<IGlobalConfig> {
  const config = await GlobalConfig.findOneAndUpdate(
    {},
    { ...updates, updatedAt: new Date() },
    { new: true, upsert: true }
  );

  return {
    opponentType: config.opponentType,
    gameMode: config.gameMode,
    totalRounds: config.totalRounds,
    updatedAt: config.updatedAt
  };
}
