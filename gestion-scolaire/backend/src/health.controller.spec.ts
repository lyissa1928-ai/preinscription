import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from './prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: { $connect: jest.Mock };

  beforeEach(async () => {
    prisma = { $connect: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return ok and database connected when DB is up', async () => {
    const result = await controller.check();

    expect(result).toMatchObject({
      status: 'ok',
      database: 'connected',
    });
    expect(result).toHaveProperty('timestamp');
  });

  it('should return degraded when DB connection fails', async () => {
    prisma.$connect.mockRejectedValueOnce(new Error('Connection refused'));

    const result = await controller.check();

    expect(result).toMatchObject({
      status: 'degraded',
      database: 'error',
    });
  });
});
