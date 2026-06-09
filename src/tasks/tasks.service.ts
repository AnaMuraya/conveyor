import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateTaskDto } from './dto/create-task.dto';
import { Task } from './task.entity';

@Injectable()
export class TasksService {
  /**
   * In-memory store, intentionally trivial for now. Swapped for a Postgres
   * repository later — see docs/adr/0004-in-memory-task-store.md.
   */
  private readonly tasks = new Map<string, Task>();

  create(dto: CreateTaskDto): Task {
    const now = new Date();
    const task: Task = {
      id: randomUUID(),
      type: dto.type,
      payload: dto.payload,
      status: 'pending',
      result: null,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  findOne(id: string): Task {
    const task = this.tasks.get(id);
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    return task;
  }
}
