import './src/config/env.js'; // Validate env vars before anything else
import { connectDb } from './src/config/db.js';
import app from './src/app.js';
import { env } from './src/config/env.js';

const start = async () => {
  await connectDb();
  app.listen(env.port, () => {
    console.log(`[server] AI Interview Backend running on port ${env.port}`);
    console.log(`[server] Environment: ${env.nodeEnv}`);
  });
};

start().catch((err) => {
  console.error('[server] Fatal startup error:', err);
  process.exit(1);
});
