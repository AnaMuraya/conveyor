import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { dataSourceOptions } from './config/data-source';
import { redisConnection } from './config/redis';
import { HealthModule } from './health/health.module';
import { TasksModule } from './tasks/tasks.module';

/**
 * Composition root for the API process. Accepts tasks over HTTP and enqueues
 * them; the LLM call happens in the worker (see WorkerModule), not here.
 */
@Module({
  imports: [
    TypeOrmModule.forRoot(dataSourceOptions),
    BullModule.forRoot({ connection: redisConnection }),
    HealthModule,
    TasksModule,
  ],
})
export class AppModule {}
