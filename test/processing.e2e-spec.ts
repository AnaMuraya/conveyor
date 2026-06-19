import { randomUUID } from 'node:crypto';
import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Queue } from 'bullmq';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import type { Task } from './../src/tasks/task.entity';
import { TASKS_QUEUE } from './../src/tasks/tasks.constants';
import { TasksProcessingModule } from './../src/tasks/tasks-processing.module';

/**
 * End-to-end across the queue: this app runs the full API (AppModule) plus the
 * consumer (TasksProcessingModule), so a submitted task is actually processed —
 * proving the asynchronous round-trip, not just enqueuing.
 */
describe('Task processing (e2e)', () => {
  let app: INestApplication<App>;
  let queue: Queue;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, TasksProcessingModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    queue = app.get<Queue>(getQueueToken(TASKS_QUEUE));

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: `user-${randomUUID().slice(0, 8)}`,
        password: 'a-strong-pass',
      })
      .expect(201);
    token = (res.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await queue.obliterate({ force: true });
    await app.close();
  });

  it('processes a submitted task to done with the generated result', async () => {
    const created = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
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
        .set('Authorization', `Bearer ${token}`)
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
