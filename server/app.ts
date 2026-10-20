import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { initDb } from './db';
import habitsRouter from './routes/habits';
import dashboardRouter from './routes/dashboard';
import areasRouter from './routes/areas';
import utilsRouter from './routes/utils';
import healthRouter from './routes/health';

let dbInitPromise: Promise<unknown> | null = null;

export async function ensureDbReady(): Promise<void> {
  if (!dbInitPromise) {
    dbInitPromise = initDb();
  }
  await dbInitPromise;
}

function asyncHandler(handler: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res, next);
  };
}

export function createServerApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(asyncHandler(async (_req, _res, next) => {
    try {
      await ensureDbReady();
      next();
    } catch (error) {
      next(error);
    }
  }));

  app.use('/api/habits', habitsRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/areas', areasRouter);
  app.use('/api/utils', utilsRouter);
  app.use('/api/health', healthRouter);

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    res.status(500).json({ error: message });
  });

  return app;
}

export const app = createServerApp();