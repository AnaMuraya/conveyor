import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Task } from './task.entity';
import { TASKS_QUEUE } from './tasks.constants';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

/**
 * Producer side of tasks: the HTTP API. Owns the controller and service, and
 * registers the {@link TASKS_QUEUE} so the service can enqueue jobs. The
 * consumer (TaskProcessor) lives in TasksProcessingModule and runs only in the
 * worker process — never here.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    BullModule.registerQueue({ name: TASKS_QUEUE }),
  ],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
