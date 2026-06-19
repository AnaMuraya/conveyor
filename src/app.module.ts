import { BullModule } from '@nestjs/bullmq';
import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './auth/auth.module';
import { dataSourceOptions } from './config/data-source';
import { redisConnection } from './config/redis';
import { HealthModule } from './health/health.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';

/**
 * Composition root for the API process. Accepts tasks over HTTP and enqueues
 * them; the LLM call happens in the worker (see WorkerModule), not here.
 */
@Module({
  imports: [
    TypeOrmModule.forRoot(dataSourceOptions),
    BullModule.forRoot({ connection: redisConnection }),
    HealthModule,
    AuthModule,
    UsersModule,
    TasksModule,
  ],
  providers: [
    {
      // Validate and sanitize every request body at the edge (ADR-0008).
      // Registered via APP_PIPE rather than main.ts's useGlobalPipes so it is
      // part of the module — it applies wherever AppModule is bootstrapped,
      // including the e2e tests.
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true, // strip properties not declared on the DTO
        forbidNonWhitelisted: true, // reject bodies that carry unknown properties
        transform: true, // hand the handler a real DTO instance
      }),
    },
  ],
})
export class AppModule {}
