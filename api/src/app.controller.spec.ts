import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  const healthResult = {
    status: 'ok' as const,
    timestamp: '2026-08-16T18:00:00.000Z',
    uptimeSeconds: 10,
    checks: {
      database: 'up' as const,
      redis: 'up' as const,
    },
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: { getHealth: jest.fn().mockResolvedValue(healthResult) },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('returns health state with HTTP 200', async () => {
      const response = { status: jest.fn() };

      await expect(appController.getHealth(response as never)).resolves.toEqual(
        healthResult,
      );
      expect(response.status).toHaveBeenCalledWith(HttpStatus.OK);
    });
  });
});
