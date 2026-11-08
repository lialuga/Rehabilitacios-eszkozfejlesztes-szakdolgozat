import { Injectable, NotFoundException } from '@nestjs/common';
import type { Session } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';

export type SessionView = Omit<CreateSessionDto, 'userId'> & {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

const toData = (dto: CreateSessionDto) => ({
  startedAt: new Date(dto.startedAt),
  duration: dto.durationMs,
  stabilityAvg: dto.avgStability,
  inwardRatio: dto.inwardPercent / 100,
  balanceScore: dto.balance,
  motorActivations: dto.motorActivations,
  outwardEvents: dto.outwardEvents,
  avgCorrectionMs: dto.avgCorrectionMs,
  peakAngle: dto.peakAngle,
  avgAngle: dto.avgAngle,
  inwardThreshold: dto.inwardThreshold,
  outwardThreshold: dto.outwardThreshold ?? null,
  steps: dto.steps ?? null,
  cadence: dto.cadence ?? null,
  source: dto.source,
  trace: dto.trace,
});

export const toView = (row: Session): SessionView => ({
  id: row.id,
  userId: row.userId,
  clientId: row.clientId ?? row.id,
  startedAt: row.startedAt.toISOString(),
  durationMs: row.duration,
  avgStability: row.stabilityAvg,
  inwardPercent: Math.round(row.inwardRatio * 1000) / 10,
  balance: row.balanceScore,
  motorActivations: row.motorActivations,
  outwardEvents: row.outwardEvents,
  avgCorrectionMs: row.avgCorrectionMs,
  peakAngle: row.peakAngle,
  avgAngle: row.avgAngle,
  inwardThreshold: row.inwardThreshold,
  outwardThreshold: row.outwardThreshold,
  steps: row.steps,
  cadence: row.cadence,
  source: row.source === 'demo' ? 'demo' : 'ble',
  trace: row.trace,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

@Injectable()
export class SessionService {
  constructor(private prisma: PrismaService) {}

  async upsertSession(dto: CreateSessionDto): Promise<SessionView> {
    await this.prisma.user.upsert({
      where: { id: dto.userId },
      update: {},
      create: { id: dto.userId },
    });

    const data = toData(dto);
    const row = await this.prisma.session.upsert({
      where: {
        userId_clientId: { userId: dto.userId, clientId: dto.clientId },
      },
      create: { ...data, userId: dto.userId, clientId: dto.clientId },
      update: data,
    });
    return toView(row);
  }

  async getSessions(userId: string): Promise<SessionView[]> {
    const rows = await this.prisma.session.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
    });
    return rows.map(toView);
  }

  async deleteSession(userId: string, clientId: string): Promise<void> {
    const { count } = await this.prisma.session.deleteMany({
      where: { userId, clientId },
    });
    if (count === 0) {
      throw new NotFoundException('Session not found');
    }
  }
}
