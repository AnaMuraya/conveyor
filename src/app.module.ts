import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { dataSourceOptions } from './config/data-source';
import { redisConnection } from './config/redis';
import { TasksModule } from './tasks/tasks.module';

/**
 * Composition root for the API process. Accepts tasks over HTTP and enqueues
 * them; the LLM call happens in the worker (see WorkerModule), not here.
 */
@Module({
  imports: [
    TypeOrmModule.forRoot(dataSourceOptions),
    BullModule.forRoot({ connection: redisConnection }),
    TasksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
