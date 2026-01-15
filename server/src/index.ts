import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { logger } from './config/logger';
import { setupGameHandlers } from './socket/gameHandlers';
import adminRoutes from './routes/admin';
import path from 'path';
import fs from 'fs';

// Cargar variables de entorno
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Configurar CORS
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));

app.use(express.json());

// Socket.io con CORS
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Crear carpeta de logs si no existe
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Rutas básicas
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Bank Run Game API',
    version: '1.0.0',
    status: 'running'
  });
});

// Rutas de administración
app.use('/api/admin', adminRoutes);

// Setup Socket.io handlers
setupGameHandlers(io);

// Iniciar servidor
const PORT = process.env.PORT || 3001;

async function start() {
  try {
    // Conectar a MongoDB
    await connectDatabase();

    // Iniciar servidor HTTP
    httpServer.listen(PORT, () => {
      logger.info('='.repeat(50));
      logger.info(`🏦 Bank Run Game Server started`);
      logger.info(`📡 Server listening on port ${PORT}`);
      logger.info(`🌐 Client URL: ${CLIENT_URL}`);
      logger.info(`🔌 Socket.io ready for connections`);
      logger.info(`📊 MongoDB: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured (running without DB)'}`);
      logger.info('='.repeat(50));
    });

    // Manejo de cierre graceful
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function shutdown() {
  logger.info('Shutting down server...');

  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force exit después de 10 segundos
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

start();
