import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { dataSourceOptions } from './config/data-source';
import { redisConnection } from './config/redis';
import { TasksProcessingModule } from './tasks/tasks-processing.module';

/**
 * Composition root for the worker process. Shares Postgres and Redis with the
 * API but has no HTTP surface — it only consumes task jobs and processes them.
 * Run it separately from the API so it can be scaled, restarted, or killed on
 * its own; jobs wait in Redis until it comes back.
 */
@Module({
  imports: [
    TypeOrmModule.forRoot(dataSourceOptions),
    BullModule.forRoot({ connection: redisConnection }),
    TasksProcessingModule,
  ],
})
export class WorkerModule {}
