import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SessionService } from './session.service';

export const sampleDto = (
  extra: Partial<CreateSessionDto> = {},
): CreateSessionDto => ({
  userId: 'user-1',
  clientId: '1730714400000-abc123',
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
  ...extra,
});

const row = {
  id: 'db-1',
  userId: 'user-1',
  clientId: '1730714400000-abc123',
  startedAt: new Date('2026-11-04T10:00:00.000Z'),
  duration: 60000,
  stabilityAvg: 80,
  inwardRatio: 0.12,
  balanceScore: 84,
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
  createdAt: new Date('2026-11-04T10:01:00.000Z'),
  updatedAt: new Date('2026-11-04T10:01:00.000Z'),
};

describe('SessionService', () => {
  let service: SessionService;
  const prisma = {
    user: { upsert: jest.fn() },
    session: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [SessionService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(SessionService);
  });

  it('creates the anonymous user and upserts by (userId, clientId)', async () => {
    prisma.session.upsert.mockResolvedValue(row);
    const view = await service.upsertSession(sampleDto());

    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      update: {},
      create: { id: 'user-1' },
    });
    const [args] = prisma.session.upsert.mock.calls[0] as [
      { where: unknown; create: unknown },
    ];
    expect(args.where).toEqual({
      userId_clientId: { userId: 'user-1', clientId: '1730714400000-abc123' },
    });
    expect(args.create).toMatchObject({
      duration: 60000,
      inwardRatio: 0.12,
      startedAt: new Date('2026-11-04T10:00:00.000Z'),
    });
    expect(view).toMatchObject({
      clientId: '1730714400000-abc123',
      inwardPercent: 12,
      durationMs: 60000,
      steps: 120,
    });
  });

  it('lists sessions newest first', async () => {
    prisma.session.findMany.mockResolvedValue([row]);
    const list = await service.getSessions('user-1');
    expect(prisma.session.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { startedAt: 'desc' },
    });
    expect(list[0].startedAt).toBe('2026-11-04T10:00:00.000Z');
  });

  it('404s when deleting an unknown session', async () => {
    prisma.session.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.deleteSession('user-1', 'nope')).rejects.toThrow(
      NotFoundException,
    );
  });
});
