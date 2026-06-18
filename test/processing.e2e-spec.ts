import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Queue } from 'bullmq';
import request from 'supertest';
import { App } from 'supertest/types';

import { dataSourceOptions } from './../src/config/data-source';
import { redisConnection } from './../src/config/redis';
import type { Task } from './../src/tasks/task.entity';
import { TASKS_QUEUE } from './../src/tasks/tasks.constants';
import { TasksModule } from './../src/tasks/tasks.module';
import { TasksProcessingModule } from './../src/tasks/tasks-processing.module';

/**
 * End-to-end across the queue: this app runs BOTH the producer (TasksModule)
 * and the consumer (TasksProcessingModule), so a submitted task is actually
 * processed — proving the asynchronous round-trip, not just enqueuing.
 */
describe('Task processing (e2e)', () => {
  let app: INestApplication<App>;
  let queue: Queue;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(dataSourceOptions),
        BullModule.forRoot({ connection: redisConnection }),
        TasksModule,
        TasksProcessingModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    queue = app.get<Queue>(getQueueToken(TASKS_QUEUE));
  });

  afterAll(async () => {
    await queue.obliterate({ force: true });
    await app.close();
  });

  it('processes a submitted task to done with the generated result', async () => {
    const created = await request(app.getHttpServer())
      .post('/tasks')
      .send({ type: 'summarize', payload: { text: 'hello world' } })
      .expect(201);

    const id = (created.body as Task).id;
    expect((created.body as Task).status).toBe('pending');

    const task = await pollUntilSettled(id);

    expect(task.status).toBe('done');
    expect(task.result).toBe('hello world'); // echo provider returns the prompt
  });

  /** Poll the task until it leaves the pending/running states (or time out). */
  async function pollUntilSettled(id: string): Promise<Task> {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const res = await request(app.getHttpServer())
        .get(`/tasks/${id}`)
        .expect(200);
      const task = res.body as Task;
      if (task.status === 'done' || task.status === 'failed') {
        return task;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Task ${id} did not settle within the timeout`);
  }
});
