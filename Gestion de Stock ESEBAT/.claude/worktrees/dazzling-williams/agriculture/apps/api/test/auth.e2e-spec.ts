import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPass123';

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

  it('POST /auth/register - creates user', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: testEmail, password: testPassword })
      .expect(201)
      .expect((res: { body: { accessToken?: string; refreshToken?: string; user?: { email: string } } }) => {
        expect(res.body.accessToken).toBeDefined();
        expect(res.body.refreshToken).toBeDefined();
        expect(res.body.user?.email).toBe(testEmail);
      });
  });

  it('POST /auth/login - returns tokens', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(201)
      .expect((res: { body: { accessToken?: string; refreshToken?: string; user?: { email: string } } }) => {
        expect(res.body.accessToken).toBeDefined();
        expect(res.body.user?.email).toBe(testEmail);
      });
  });
});
