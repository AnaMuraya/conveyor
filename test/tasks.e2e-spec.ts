import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import type { Task } from './../src/tasks/task.entity';

describe('Tasks (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /tasks creates a pending task', async () => {
    const res = await request(app.getHttpServer())
      .post('/tasks')
      .send({ type: 'summarize', payload: { text: 'hello' } })
      .expect(201);

    const task = res.body as Task;
    expect(typeof task.id).toBe('string');
    expect(task.type).toBe('summarize');
    expect(task.status).toBe('pending');
    expect(task.result).toBeNull();
  });

  it('GET /tasks/:id returns a previously created task', async () => {
    const created = await request(app.getHttpServer())
      .post('/tasks')
      .send({ type: 'summarize', payload: { text: 'hello' } })
      .expect(201);
    const createdId = (created.body as Task).id;

    await request(app.getHttpServer())
      .get(`/tasks/${createdId}`)
      .expect(200)
      .expect((res) => {
        expect((res.body as Task).id).toBe(createdId);
      });
  });

  // Failure path is the headline test.
  it('GET /tasks/:id returns 404 for an unknown (but valid) id', () => {
    return request(app.getHttpServer())
      .get('/tasks/00000000-0000-0000-0000-000000000000')
      .expect(404);
  });

  it('GET /tasks/:id returns 400 for a malformed id', () => {
    return request(app.getHttpServer()).get('/tasks/not-a-uuid').expect(400);
  });
});
