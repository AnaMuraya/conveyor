import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import type { Task } from './../src/tasks/task.entity';

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('Tasks (e2e)', () => {
  let app: INestApplication<App>;
  let ownerToken: string;
  let otherToken: string;
  let adminToken: string;

  /** Registers a fresh user over HTTP and returns its bearer token. */
  async function registerUser(): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: `user-${randomUUID().slice(0, 8)}`,
        password: 'a-strong-pass',
      })
      .expect(201);
    return (res.body as { accessToken: string }).accessToken;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    ownerToken = await registerUser();
    otherToken = await registerUser();
    // An admin isn't reachable via registration (user-only); mint one directly.
    adminToken = app.get(JwtService).sign({
      sub: randomUUID(),
      username: 'root',
      roles: ['admin'],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  // Authentication is the first gate.
  it('POST /tasks rejects an unauthenticated request', () => {
    return request(app.getHttpServer())
      .post('/tasks')
      .send({ type: 'summarize', payload: { text: 'hello' } })
      .expect(401);
  });

  it('POST /tasks creates a pending task for the caller', async () => {
    const res = await request(app.getHttpServer())
      .post('/tasks')
      .set(bearer(ownerToken))
      .send({ type: 'summarize', payload: { text: 'hello' } })
      .expect(201);

    const task = res.body as Task;
    expect(typeof task.id).toBe('string');
    expect(task.type).toBe('summarize');
    expect(task.status).toBe('pending');
    expect(task.result).toBeNull();
  });

  it('GET /tasks/:id returns a task to its owner', async () => {
    const created = await request(app.getHttpServer())
      .post('/tasks')
      .set(bearer(ownerToken))
      .send({ type: 'summarize', payload: { text: 'hello' } })
      .expect(201);
    const createdId = (created.body as Task).id;

    await request(app.getHttpServer())
      .get(`/tasks/${createdId}`)
      .set(bearer(ownerToken))
      .expect(200)
      .expect((res) => {
        expect((res.body as Task).id).toBe(createdId);
      });
  });

  // Ownership: a non-owner can't see it, and the 404 doesn't reveal it exists.
  it("GET /tasks/:id hides another user's task (404)", async () => {
    const created = await request(app.getHttpServer())
      .post('/tasks')
      .set(bearer(ownerToken))
      .send({ type: 'summarize', payload: { text: 'secret' } })
      .expect(201);
    const createdId = (created.body as Task).id;

    await request(app.getHttpServer())
      .get(`/tasks/${createdId}`)
      .set(bearer(otherToken))
      .expect(404);
  });

  it('GET /tasks/:id lets an admin read any task', async () => {
    const created = await request(app.getHttpServer())
      .post('/tasks')
      .set(bearer(ownerToken))
      .send({ type: 'summarize', payload: { text: 'hello' } })
      .expect(201);
    const createdId = (created.body as Task).id;

    await request(app.getHttpServer())
      .get(`/tasks/${createdId}`)
      .set(bearer(adminToken))
      .expect(200);
  });

  // Failure path is the headline test.
  it('GET /tasks/:id returns 404 for an unknown (but valid) id', () => {
    return request(app.getHttpServer())
      .get('/tasks/00000000-0000-0000-0000-000000000000')
      .set(bearer(ownerToken))
      .expect(404);
  });

  it('GET /tasks/:id returns 400 for a malformed id', () => {
    return request(app.getHttpServer())
      .get('/tasks/not-a-uuid')
      .set(bearer(ownerToken))
      .expect(400);
  });

  // Input validation (global ValidationPipe) — the "garbage in" failure paths.
  it('POST /tasks rejects a body missing required fields', () => {
    return request(app.getHttpServer())
      .post('/tasks')
      .set(bearer(ownerToken))
      .send({ payload: { text: 'no type' } })
      .expect(400);
  });

  it('POST /tasks rejects a wrong-typed field', () => {
    return request(app.getHttpServer())
      .post('/tasks')
      .set(bearer(ownerToken))
      .send({ type: 123, payload: {} })
      .expect(400);
  });

  it('POST /tasks rejects unknown properties (forbidNonWhitelisted)', () => {
    return request(app.getHttpServer())
      .post('/tasks')
      .set(bearer(ownerToken))
      .send({ type: 'summarize', payload: {}, sneaky: 'nope' })
      .expect(400);
  });
});
