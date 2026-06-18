import 'dotenv/config';

/**
 * Redis connection shared by the BullMQ queue (API side, producing jobs) and
 * the worker (consuming them). Both processes must point at the same Redis for
 * the queue to be the single hand-off point between them.
 *
 * Env-driven with local defaults so `docker compose up` + the committed
 * `.env.example` work out of the box.
 */
export const redisConnection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
};
