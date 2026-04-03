import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Admin (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let farmerToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const adminEmail = `admin-${Date.now()}@test.com`;
    const farmerEmail = `farmer-${Date.now()}@test.com`;
    const password = 'TestPass123';

    const [adminRes, farmerRes] = await Promise.all([
      request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: adminEmail, password, role: 'ADMIN' }),
      request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: farmerEmail, password, role: 'FARMER' }),
    ]);

    adminToken = adminRes.body.accessToken;
    farmerToken = farmerRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('admin can create user', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `newuser-${Date.now()}@test.com`,
        password: 'TestPass123',
        role: 'FARMER',
        isActive: true,
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.email).toBeDefined();
    expect(res.body.role).toBe('FARMER');
  });

  it('non-admin receives 403 on admin users', async () => {
    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${farmerToken}`)
      .expect(403);
  });

  it('admin can disable user', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `disable-${Date.now()}@test.com`,
        password: 'TestPass123',
        role: 'FARMER',
      })
      .expect(201);

    const userId = createRes.body.id;

    const res = await request(app.getHttpServer())
      .post(`/admin/users/${userId}/disable`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    expect(res.body.isActive).toBe(false);
  });

  it('admin can enable user', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `enable-${Date.now()}@test.com`,
        password: 'TestPass123',
        role: 'FARMER',
        isActive: false,
      })
      .expect(201);

    const userId = createRes.body.id;

    const res = await request(app.getHttpServer())
      .post(`/admin/users/${userId}/enable`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    expect(res.body.isActive).toBe(true);
  });

  it('admin action creates audit log', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `audit-${Date.now()}@test.com`,
        password: 'TestPass123',
        role: 'FARMER',
      })
      .expect(201);

    const logsRes = await request(app.getHttpServer())
      .get('/admin/audit-logs?entity=User&action=CREATE')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(logsRes.body.items).toBeInstanceOf(Array);
    const found = logsRes.body.items.find(
      (l: { entityId: string }) => l.entityId === createRes.body.id,
    );
    expect(found).toBeDefined();
    expect(found.action).toBe('CREATE');
    expect(found.entity).toBe('User');
  });

  it('audit logs pagination works', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/audit-logs?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.items).toBeInstanceOf(Array);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.limit).toBe(5);
  });
});
