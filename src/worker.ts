import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { WorkerModule } from './worker.module';

/**
 * Worker entrypoint. Boots an application *context* (no HTTP listener) — the
 * BullMQ worker created inside TaskProcessor keeps the process alive and pulls
 * jobs off the queue. Separate from the API's `main.ts` on purpose: this is the
 * process you can kill and restart independently while the API keeps queuing.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  new Logger('Worker').log('Task worker started — waiting for jobs');
}

bootstrap().catch((error) => {
  new Logger('Worker').error(error);
  process.exit(1);
});
