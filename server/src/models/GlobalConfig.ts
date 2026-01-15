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

// Configuración por defecto
const DEFAULT_CONFIG: IGlobalConfig = {
  opponentType: 'ai',
  gameMode: 'simultaneous',
  totalRounds: 5,
  updatedAt: new Date()
};

// Función para obtener o crear la configuración global (singleton)
export async function getGlobalConfig(): Promise<IGlobalConfig> {
  try {
    let config = await GlobalConfig.findOne().maxTimeMS(5000);

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
  } catch (error) {
    // Si hay error de DB, devolver configuración por defecto
    console.error('Error fetching GlobalConfig, using defaults:', error);
    return DEFAULT_CONFIG;
  }
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
