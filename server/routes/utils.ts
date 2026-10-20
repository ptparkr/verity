import { Router, Request, Response } from 'express';
import { getCurrentTimeInfo } from '../utils/time';

const router = Router();

/**
 * GET /api/utils/time
 * Returns standardized time information from the server.
 * This can be used to synchronize clients and ensure consistent "Today" definitions.
 */
router.get('/time', (_req: Request, res: Response) => {
  try {
    const timeInfo = getCurrentTimeInfo();
    res.json(timeInfo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve time information' });
  }
});

export default router;
