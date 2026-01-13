import mongoose from 'mongoose';
import { logger } from './logger';

export async function connectDatabase(): Promise<void> {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      logger.warn('MONGODB_URI not set. Running without database connection.');
      logger.warn('Game results will not be persisted. Set MONGODB_URI in .env to enable persistence.');
      return;
    }

    await mongoose.connect(mongoUri);

    logger.info('✓ Connected to MongoDB Atlas');

    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    logger.warn('Running without database. Game results will not be persisted.');
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
  }
}
