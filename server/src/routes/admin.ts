import { Router, Request, Response, NextFunction } from 'express';
import { GameResult } from '../models/GameResult';
import { getGlobalConfig, updateGlobalConfig } from '../models/GlobalConfig';
import { logger } from '../config/logger';

const router = Router();

/**
 * Middleware de autenticación simple para admin
 */
const adminAuth = (req: Request, res: Response, next: NextFunction): void => {
  const password = req.headers['x-admin-password'] as string;

  if (!process.env.ADMIN_PASSWORD) {
    logger.warn('ADMIN_PASSWORD not configured in environment');
    res.status(500).json({ error: 'Admin authentication not configured' });
    return;
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
};

/**
 * GET /api/admin/verify
 * Verifica que la contraseña de admin es correcta
 */
router.get('/verify', adminAuth, (req: Request, res: Response) => {
  res.json({ success: true, message: 'Authentication successful' });
});

/**
 * GET /api/admin/games
 * Lista paginada de partidas con filtros opcionales
 * Query params:
 *   - page: número de página (default: 1)
 *   - limit: resultados por página (default: 20, max: 100)
 *   - mode: filtrar por modo ('sequential' | 'simultaneous')
 *   - playerType: filtrar por tipo de jugador ('human' | 'llm')
 *   - fromDate: fecha inicio (ISO string)
 *   - toDate: fecha fin (ISO string)
 */
router.get('/games', adminAuth, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    // Construir filtro
    const filter: Record<string, unknown> = {};

    if (req.query.mode) {
      filter.mode = req.query.mode;
    }

    if (req.query.playerType) {
      filter.playerTypes = req.query.playerType;
    }

    if (req.query.fromDate || req.query.toDate) {
      filter.timestamp = {};
      if (req.query.fromDate) {
        (filter.timestamp as Record<string, Date>).$gte = new Date(req.query.fromDate as string);
      }
      if (req.query.toDate) {
        (filter.timestamp as Record<string, Date>).$lte = new Date(req.query.toDate as string);
      }
    }

    // Ejecutar queries en paralelo
    const [games, total] = await Promise.all([
      GameResult.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      GameResult.countDocuments(filter)
    ]);

    res.json({
      games,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

/**
 * GET /api/admin/games/export
 * Exporta todas las partidas en JSON (con filtros opcionales)
 */
router.get('/games/export', adminAuth, async (req: Request, res: Response) => {
  try {
    // Construir filtro
    const filter: Record<string, unknown> = {};

    if (req.query.mode) {
      filter.mode = req.query.mode;
    }

    if (req.query.playerType) {
      filter.playerTypes = req.query.playerType;
    }

    if (req.query.fromDate || req.query.toDate) {
      filter.timestamp = {};
      if (req.query.fromDate) {
        (filter.timestamp as Record<string, Date>).$gte = new Date(req.query.fromDate as string);
      }
      if (req.query.toDate) {
        (filter.timestamp as Record<string, Date>).$lte = new Date(req.query.toDate as string);
      }
    }

    const games = await GameResult.find(filter)
      .sort({ timestamp: -1 })
      .lean();

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="bank-run-games-${new Date().toISOString().split('T')[0]}.json"`);

    res.json({
      exportDate: new Date().toISOString(),
      totalGames: games.length,
      filters: {
        mode: req.query.mode || 'all',
        playerType: req.query.playerType || 'all',
        fromDate: req.query.fromDate || null,
        toDate: req.query.toDate || null
      },
      games
    });
  } catch (error) {
    logger.error('Error exporting games:', error);
    res.status(500).json({ error: 'Failed to export games' });
  }
});

/**
 * GET /api/admin/games/:gameId
 * Obtiene el detalle de una partida específica
 */
router.get('/games/:gameId', adminAuth, async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;

    const game = await GameResult.findOne({ gameId }).lean();

    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    res.json(game);
  } catch (error) {
    logger.error('Error fetching game detail:', error);
    res.status(500).json({ error: 'Failed to fetch game detail' });
  }
});

/**
 * GET /api/admin/stats
 * Obtiene estadísticas agregadas
 */
router.get('/stats', adminAuth, async (req: Request, res: Response) => {
  try {
    const [
      totalGames,
      gamesByMode,
      gamesByPlayerType,
      recentGames
    ] = await Promise.all([
      GameResult.countDocuments(),
      GameResult.aggregate([
        { $group: { _id: '$mode', count: { $sum: 1 } } }
      ]),
      GameResult.aggregate([
        { $unwind: '$playerTypes' },
        { $group: { _id: '$playerTypes', count: { $sum: 1 } } }
      ]),
      GameResult.find()
        .sort({ timestamp: -1 })
        .limit(5)
        .select('gameId roomCode mode timestamp')
        .lean()
    ]);

    // Calcular estadísticas de bank runs
    const bankRunStats = await GameResult.aggregate([
      { $unwind: '$rounds' },
      {
        $group: {
          _id: null,
          totalRounds: { $sum: 1 },
          bankRunRounds: {
            $sum: { $cond: ['$rounds.bankRun', 1, 0] }
          }
        }
      }
    ]);

    const bankRunRate = bankRunStats.length > 0
      ? (bankRunStats[0].bankRunRounds / bankRunStats[0].totalRounds * 100).toFixed(1)
      : '0';

    res.json({
      totalGames,
      gamesByMode: gamesByMode.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
      gamesByPlayerType: gamesByPlayerType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
      bankRunStats: {
        totalRounds: bankRunStats[0]?.totalRounds || 0,
        bankRunRounds: bankRunStats[0]?.bankRunRounds || 0,
        bankRunRate: `${bankRunRate}%`
      },
      recentGames
    });
  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/admin/config
 * Obtiene la configuración global del juego
 */
router.get('/config', adminAuth, async (req: Request, res: Response) => {
  try {
    const config = await getGlobalConfig();
    res.json(config);
  } catch (error) {
    logger.error('Error fetching global config:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

/**
 * PUT /api/admin/config
 * Actualiza la configuración global del juego
 */
router.put('/config', adminAuth, async (req: Request, res: Response) => {
  try {
    const { opponentType, gameMode, totalRounds } = req.body;

    // Validar valores
    if (opponentType && !['ai', 'human'].includes(opponentType)) {
      res.status(400).json({ error: 'Invalid opponentType. Must be "ai" or "human"' });
      return;
    }

    if (gameMode && !['sequential', 'simultaneous'].includes(gameMode)) {
      res.status(400).json({ error: 'Invalid gameMode. Must be "sequential" or "simultaneous"' });
      return;
    }

    if (totalRounds !== undefined && (totalRounds < 1 || totalRounds > 20)) {
      res.status(400).json({ error: 'Invalid totalRounds. Must be between 1 and 20' });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (opponentType) updates.opponentType = opponentType;
    if (gameMode) updates.gameMode = gameMode;
    if (totalRounds !== undefined) updates.totalRounds = totalRounds;

    const config = await updateGlobalConfig(updates);

    logger.info(`Global config updated: ${JSON.stringify(config)}`);

    res.json(config);
  } catch (error) {
    logger.error('Error updating global config:', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

export default router;
