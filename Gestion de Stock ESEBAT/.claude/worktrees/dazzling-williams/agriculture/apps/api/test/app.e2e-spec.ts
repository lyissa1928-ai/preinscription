import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

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

  describe('GET /health', () => {
    it('returns ok status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res: { body: { status: string; env?: string } }) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.env).toBeDefined();
        });
    });
  });
});
