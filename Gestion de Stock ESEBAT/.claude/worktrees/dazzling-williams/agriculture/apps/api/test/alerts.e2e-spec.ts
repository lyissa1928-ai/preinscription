import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Alerts (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let farmerToken: string;
  let otherFarmerToken: string;
  let farmerId: string;
  let parcelId: string;
  let alertId: string;
  let ruleId: string;
  let regionId: string;

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

    const regions = await prisma.region.findMany({ take: 1 });
    regionId = regions[0]!.id;

    const adminEmail = `admin-${Date.now()}@test.com`;
    const farmerEmail = `farmer-${Date.now()}@test.com`;
    const otherEmail = `other-${Date.now()}@test.com`;
    const password = 'TestPass123';

    const [adminRes, farmerRes, otherRes] = await Promise.all([
      request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: adminEmail, password, role: 'ADMIN' }),
      request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: farmerEmail, password, role: 'FARMER' }),
      request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: otherEmail, password, role: 'FARMER' }),
    ]);

    adminToken = adminRes.body.accessToken;
    farmerToken = farmerRes.body.accessToken;
    otherFarmerToken = otherRes.body.accessToken;
    farmerId = farmerRes.body.user.id;

    const rule = await prisma.alertRule.findFirst({
      where: { type: 'SOIL_MOISTURE_LOW', isActive: true },
    });
    if (!rule) {
      const created = await prisma.alertRule.create({
        data: {
          scope: 'GLOBAL',
          type: 'SOIL_MOISTURE_LOW',
          severity: 'WARNING',
          conditions: { metric: 'soilMoisture', operator: '<', value: 35 },
          windowDays: null,
          cooldownHours: 24,
          messageTemplate: 'Humidite faible: {{soilMoisture}}%',
        },
      });
      ruleId = created.id;
    } else {
      ruleId = rule.id;
    }

    const farmRes = await request(app.getHttpServer())
      .post('/farmer/farm')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        name: 'Ferme Test',
        regionId,
        farmingType: 'RAINFED',
        description: 'Test',
      })
      .expect(201);

    const parcelRes = await request(app.getHttpServer())
      .post('/farmer/parcels')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        name: 'Parcelle Alerte',
        area: 2,
        regionId,
        soilType: 'LOAMY',
      })
      .expect(201);

    parcelId = parcelRes.body.id;

    await request(app.getHttpServer())
      .put(`/farmer/parcels/${parcelId}/soil`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ soilMoisture: 30, ph: 6, salinity: 2 })
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /admin/alerts/run-now - creates alert when condition met', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/alerts/run-now')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    expect(res.body.message).toBeDefined();

    const listRes = await request(app.getHttpServer())
      .get('/farmer/alerts')
      .set('Authorization', `Bearer ${farmerToken}`)
      .expect(200);

    expect(listRes.body.data).toBeInstanceOf(Array);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
    const alert = listRes.body.data.find(
      (a: { type: string; parcelId: string }) =>
        a.type === 'SOIL_MOISTURE_LOW' && a.parcelId === parcelId,
    );
    expect(alert).toBeDefined();
    expect(alert.status).toBe('OPEN');
    alertId = alert.id;
  });

  it('run-now twice: deduplication - no duplicate alert', async () => {
    await request(app.getHttpServer())
      .post('/admin/alerts/run-now')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    const listRes = await request(app.getHttpServer())
      .get('/farmer/alerts')
      .set('Authorization', `Bearer ${farmerToken}`)
      .expect(200);

    const sameAlerts = listRes.body.data.filter(
      (a: { type: string; parcelId: string }) =>
        a.type === 'SOIL_MOISTURE_LOW' && a.parcelId === parcelId,
    );
    expect(sameAlerts.length).toBe(1);
  });

  it('POST /farmer/alerts/:id/ack - ack updates status', async () => {
    const res = await request(app.getHttpServer())
      .post(`/farmer/alerts/${alertId}/ack`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .expect(201);

    expect(res.body.status).toBe('ACKED');
    expect(res.body.ackedAt).toBeDefined();
  });

  it('ownership: other farmer cannot ack alert', async () => {
    const newParcelRes = await request(app.getHttpServer())
      .post('/farmer/parcels')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        name: 'Parcelle 2',
        area: 1,
        regionId,
        soilType: 'LOAMY',
      })
      .expect(201);

    await request(app.getHttpServer())
      .put(`/farmer/parcels/${newParcelRes.body.id}/soil`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ soilMoisture: 25 })
      .expect(200);

    await request(app.getHttpServer())
      .post('/admin/alerts/run-now')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    const listRes = await request(app.getHttpServer())
      .get('/farmer/alerts')
      .set('Authorization', `Bearer ${farmerToken}`)
      .expect(200);

    const openAlert = listRes.body.data.find(
      (a: { status: string }) => a.status === 'OPEN',
    );
    if (openAlert) {
      await request(app.getHttpServer())
        .post(`/farmer/alerts/${openAlert.id}/ack`)
        .set('Authorization', `Bearer ${otherFarmerToken}`)
        .expect(403);
    }
  });

  it('POST /farmer/alerts/:id/resolve - resolve updates status', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/farmer/alerts?status=ACKED')
      .set('Authorization', `Bearer ${farmerToken}`)
      .expect(200);

    const acked = listRes.body.data.find(
      (a: { id: string }) => a.id === alertId,
    );
    if (acked) {
      const res = await request(app.getHttpServer())
        .post(`/farmer/alerts/${alertId}/resolve`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .expect(201);

      expect(res.body.status).toBe('RESOLVED');
      expect(res.body.resolvedAt).toBeDefined();
    }
  });

  it('POST /farmer/alerts/:id/mute - mute updates status', async () => {
    await request(app.getHttpServer())
      .post('/admin/alerts/run-now')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    const listRes = await request(app.getHttpServer())
      .get('/farmer/alerts?status=OPEN')
      .set('Authorization', `Bearer ${farmerToken}`)
      .expect(200);

    const openAlert = listRes.body.data[0];
    if (openAlert) {
      const res = await request(app.getHttpServer())
        .post(`/farmer/alerts/${openAlert.id}/mute`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({ hours: 6 })
        .expect(201);

      expect(res.body.status).toBe('MUTED');
      expect(res.body.mutedUntil).toBeDefined();
    }
  });

  it('GET /farmer/alerts/summary - returns counts', async () => {
    const res = await request(app.getHttpServer())
      .get('/farmer/alerts/summary')
      .set('Authorization', `Bearer ${farmerToken}`)
      .expect(200);

    expect(typeof res.body.open).toBe('number');
    expect(typeof res.body.critical).toBe('number');
    expect(typeof res.body.warning).toBe('number');
  });
});
