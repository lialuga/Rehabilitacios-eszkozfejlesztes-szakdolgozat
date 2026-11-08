import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/main';
import { PrismaService } from './../src/prisma/prisma.service';

const userId = `e2e-${Date.now()}`;
const payload = {
  userId,
  clientId: 'rec-1',
  startedAt: '2026-11-04T10:00:00.000Z',
  durationMs: 60000,
  avgStability: 80,
  inwardPercent: 12,
  balance: 84,
  motorActivations: 3,
  outwardEvents: 1,
  avgCorrectionMs: 420,
  peakAngle: 11.5,
  avgAngle: 1.2,
  inwardThreshold: 8,
  outwardThreshold: 10,
  steps: 120,
  cadence: 110,
  source: 'ble',
  trace: [0, 1, 2],
};

describe('Ashi API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.get(PrismaService).user.deleteMany({ where: { id: userId } });
    await app.close();
  });

  it('GET /health', () =>
    request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', db: true }));

  it('rejects malformed uploads', () =>
    request(app.getHttpServer())
      .post('/session')
      .send({ ...payload, avgStability: 'high', source: 'other' })
      .expect(400));

  it('upserts idempotently, lists and deletes', async () => {
    const server = app.getHttpServer();
    await request(server).post('/session').send(payload).expect(201);
    await request(server)
      .post('/session')
      .send({ ...payload, steps: 130 })
      .expect(201);

    const list = await request(server).get(`/session/${userId}`).expect(200);
    const rows = list.body as Record<string, unknown>[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      clientId: 'rec-1',
      steps: 130,
      inwardPercent: 12,
      outwardEvents: 1,
      trace: [0, 1, 2],
    });

    await request(server).delete(`/session/${userId}/rec-1`).expect(204);
    await request(server).delete(`/session/${userId}/rec-1`).expect(404);
    const after = await request(server).get(`/session/${userId}`).expect(200);
    expect(after.body).toHaveLength(0);
  });
});
