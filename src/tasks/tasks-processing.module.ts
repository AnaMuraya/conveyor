import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LlmModule } from '../llm/llm.module';
import { Task } from './task.entity';
import { TaskProcessor } from './task.processor';
import { TASKS_QUEUE } from './tasks.constants';

/**
 * Consumer side of tasks: the worker. Registers the {@link TASKS_QUEUE} and
 * provides the {@link TaskProcessor}, which pulls jobs and runs them through the
 * LLM provider. Imported only by WorkerModule, so the BullMQ worker is created
 * in the worker process alone — the API never consumes.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    BullModule.registerQueue({ name: TASKS_QUEUE }),
    LlmModule,
  ],
  providers: [TaskProcessor],
})
export class TasksProcessingModule {}
