import { randomUUID } from 'node:crypto';
import { NotFoundException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { Repository } from 'typeorm';

import type { AuthenticatedUser } from '../auth/auth.types';
import { Task } from './task.entity';
import { PROCESS_TASK_JOB } from './tasks.constants';
import { TasksService } from './tasks.service';

const OWNER_ID = randomUUID();
const owner: AuthenticatedUser = {
  userId: OWNER_ID,
  username: 'owner',
  roles: ['user'],
};

/**
 * Minimal in-memory stand-in for the TypeORM repository, so the service can be
 * unit-tested without a database. Mirrors the three methods the service uses.
 */
function createRepositoryMock(): Repository<Task> {
  const store = new Map<string, Task>();
  const mock = {
    create: (partial: Partial<Task>): Task => ({ ...partial }) as Task,
    save: (task: Task): Promise<Task> => {
      task.id ||= randomUUID();
      const now = new Date();
      task.createdAt ??= now;
      task.updatedAt = now;
      store.set(task.id, task);
      return Promise.resolve(task);
    },
    findOneBy: ({ id }: { id: string }): Promise<Task | null> =>
      Promise.resolve(store.get(id) ?? null),
  };
  return mock as unknown as Repository<Task>;
}

/** Queue mock capturing enqueued jobs, no Redis required. */
function createQueueMock(): { add: jest.Mock } & Queue {
  return { add: jest.fn().mockResolvedValue(undefined) } as unknown as {
    add: jest.Mock;
  } & Queue;
}

describe('TasksService', () => {
  let service: TasksService;
  let queue: { add: jest.Mock } & Queue;

  beforeEach(() => {
    queue = createQueueMock();
    service = new TasksService(createRepositoryMock(), queue);
  });

  describe('create', () => {
    it('returns a pending task with an id, owner, and timestamps', async () => {
      const task = await service.create(
        { type: 'summarize', payload: { text: 'hi' } },
        OWNER_ID,
      );

      expect(typeof task.id).toBe('string');
      expect(task.status).toBe('pending');
      expect(task.result).toBeNull();
      expect(task.type).toBe('summarize');
      expect(task.payload).toEqual({ text: 'hi' });
      expect(task.ownerId).toBe(OWNER_ID);
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toBeInstanceOf(Date);
    });

    it('assigns a distinct id to each task', async () => {
      const a = await service.create(
        { type: 'summarize', payload: {} },
        OWNER_ID,
      );
      const b = await service.create(
        { type: 'summarize', payload: {} },
        OWNER_ID,
      );

      expect(a.id).not.toBe(b.id);
    });

    it('enqueues a job keyed by the task id (so re-enqueue is idempotent)', async () => {
      const task = await service.create(
        { type: 'summarize', payload: {} },
        OWNER_ID,
      );

      expect(queue.add).toHaveBeenCalledTimes(1);
      const [jobName, data, opts] = queue.add.mock.calls[0] as [
        string,
        { taskId: string },
        { jobId: string },
      ];
      expect(jobName).toBe(PROCESS_TASK_JOB);
      expect(data).toEqual({ taskId: task.id });
      expect(opts.jobId).toBe(task.id);
    });
  });

  describe('findOne', () => {
    it('returns the task to its owner', async () => {
      const created = await service.create(
        { type: 'summarize', payload: {} },
        OWNER_ID,
      );

      expect(await service.findOne(created.id, owner)).toEqual(created);
    });

    // Failure path is the headline test.
    it('throws NotFoundException for an unknown id', async () => {
      await expect(service.findOne(randomUUID(), owner)).rejects.toThrow(
        NotFoundException,
      );
    });

    // Ownership: another user can't see it, and the 404 doesn't reveal it exists.
    it('hides a task from a non-owner (404, not 403)', async () => {
      const created = await service.create(
        { type: 'summarize', payload: {} },
        OWNER_ID,
      );
      const other: AuthenticatedUser = {
        userId: randomUUID(),
        username: 'other',
        roles: ['user'],
      };

      await expect(service.findOne(created.id, other)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lets an admin read any task', async () => {
      const created = await service.create(
        { type: 'summarize', payload: {} },
        OWNER_ID,
      );
      const admin: AuthenticatedUser = {
        userId: randomUUID(),
        username: 'root',
        roles: ['admin'],
      };

      expect(await service.findOne(created.id, admin)).toEqual(created);
    });
  });
});
