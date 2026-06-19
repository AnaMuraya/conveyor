import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from './../src/app.module';

interface TokenBody {
  accessToken: string;
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  const username = () => `user-${randomUUID().slice(0, 8)}`;
  const password = 'a-strong-pass';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/register issues a token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: username(), password })
      .expect(201);

    expect(typeof (res.body as TokenBody).accessToken).toBe('string');
  });

  it('POST /auth/register rejects a duplicate username (409)', async () => {
    const name = username();
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: name, password })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: name, password })
      .expect(409);
  });

  it('POST /auth/register rejects a too-short password (400)', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: username(), password: 'short' })
      .expect(400);
  });

  it('POST /auth/login returns a token for valid credentials', async () => {
    const name = username();
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: name, password })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: name, password })
      .expect(200);

    expect(typeof (res.body as TokenBody).accessToken).toBe('string');
  });

  it('POST /auth/login rejects a wrong password (401)', async () => {
    const name = username();
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: name, password })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: name, password: 'wrong-password' })
      .expect(401);
  });
});
