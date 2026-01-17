import mongoose, { Schema, Document } from 'mongoose';

export type GameLanguage = 'es' | 'en';

export interface IGlobalConfig {
  opponentType: 'ai' | 'human';  // IA o Multijugador
  gameMode: 'sequential' | 'simultaneous';
  totalRounds: number;
  chatEnabled: boolean;  // Si el chat pre-decision esta habilitado
  chatDuration: number;  // Duracion del chat en segundos (0-60)
  chatFrequency: 'once' | 'every-round';  // Frecuencia del chat
  defaultLanguage: GameLanguage;  // Idioma por defecto del juego
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
  chatEnabled: {
    type: Boolean,
    required: true,
    default: false
  },
  chatDuration: {
    type: Number,
    required: true,
    min: 0,
    max: 60,
    default: 30
  },
  chatFrequency: {
    type: String,
    enum: ['once', 'every-round'],
    required: true,
    default: 'every-round'
  },
  defaultLanguage: {
    type: String,
    enum: ['es', 'en'],
    required: true,
    default: 'es'
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
  chatEnabled: false,
  chatDuration: 30,
  chatFrequency: 'every-round',
  defaultLanguage: 'es',
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
        totalRounds: 5,
        chatEnabled: false,
        chatDuration: 30,
        chatFrequency: 'every-round',
        defaultLanguage: 'es'
      });
    }

    return {
      opponentType: config.opponentType,
      gameMode: config.gameMode,
      totalRounds: config.totalRounds,
      chatEnabled: config.chatEnabled ?? false,
      chatDuration: config.chatDuration ?? 30,
      chatFrequency: config.chatFrequency ?? 'every-round',
      defaultLanguage: (config.defaultLanguage as GameLanguage) ?? 'es',
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
  try {
    const config = await GlobalConfig.findOneAndUpdate(
      {},
      { ...updates, updatedAt: new Date() },
      { new: true, upsert: true, maxTimeMS: 5000 }
    );

    if (!config) {
      throw new Error('Failed to update config');
    }

    return {
      opponentType: config.opponentType,
      gameMode: config.gameMode,
      totalRounds: config.totalRounds,
      chatEnabled: config.chatEnabled ?? false,
      chatDuration: config.chatDuration ?? 30,
      chatFrequency: config.chatFrequency ?? 'every-round',
      defaultLanguage: (config.defaultLanguage as GameLanguage) ?? 'es',
      updatedAt: config.updatedAt
    };
  } catch (error) {
    console.error('Error updating GlobalConfig:', error);
    throw error;
  }
}
