import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Queue } from 'bullmq';
import type { Repository } from 'typeorm';

import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateTaskDto } from './dto/create-task.dto';
import { Task } from './task.entity';
import {
  PROCESS_TASK_JOB,
  ProcessTaskJob,
  TASKS_QUEUE,
} from './tasks.constants';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasks: Repository<Task>,
    @InjectQueue(TASKS_QUEUE)
    private readonly queue: Queue<ProcessTaskJob>,
  ) {}

  async create(dto: CreateTaskDto, ownerId: string): Promise<Task> {
    const task = this.tasks.create({
      type: dto.type,
      payload: dto.payload,
      status: 'pending',
      result: null,
      ownerId,
    });
    const saved = await this.tasks.save(task);

    // Hand off to the worker. The job id is the task id, so re-enqueuing the
    // same task is a no-op (BullMQ dedupes by job id) — the API can't create
    // two jobs for one task. The row is the source of truth; the job carries
    // only the id and acts as a trigger.
    await this.queue.add(
      PROCESS_TASK_JOB,
      { taskId: saved.id },
      {
        jobId: saved.id,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    );

    return saved;
  }

  async findOne(id: string, requester: AuthenticatedUser): Promise<Task> {
    const task = await this.tasks.findOneBy({ id });
    // A task the caller may not see is reported as missing, not forbidden, so we
    // don't leak that it exists (ADR-0009). Admins may read any task.
    const isAdmin = requester.roles.includes('admin');
    if (!task || (!isAdmin && task.ownerId !== requester.userId)) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    return task;
  }
}
