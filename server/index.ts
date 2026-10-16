import { app, ensureDbReady } from './app';

const PORT = Number(process.env.PORT || 3001);

async function start() {
  await ensureDbReady();
  app.listen(PORT, () => {
    console.log(`[verity] server running on http://localhost:${PORT}`);
  });
}

void start();