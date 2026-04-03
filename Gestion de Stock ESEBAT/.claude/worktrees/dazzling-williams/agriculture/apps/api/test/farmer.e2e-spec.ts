import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Farmer (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let farmerToken: string;
  let farmerId: string;
  let farmId: string;
  let regionId: string;
  let parcelId: string;
  let otherUserToken: string;

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

    const farmerEmail = `farmer-${Date.now()}@test.com`;
    const otherEmail = `other-${Date.now()}@test.com`;
    const password = 'TestPass123';

    const [farmerRes, otherRes] = await Promise.all([
      request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: farmerEmail, password, role: 'FARMER' }),
      request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: otherEmail, password, role: 'FARMER' }),
    ]);

    farmerToken = farmerRes.body.accessToken;
    otherUserToken = otherRes.body.accessToken;
    farmerId = farmerRes.body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /farmer/farm - create farm', async () => {
    const res = await request(app.getHttpServer())
      .post('/farmer/farm')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        name: 'Ma Ferme',
        regionId,
        farmingType: 'RAINFED',
        description: 'Test farm',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Ma Ferme');
    expect(res.body.userId).toBe(farmerId);
    farmId = res.body.id;
  });

  it('GET /farmer/farm - get farm', async () => {
    const res = await request(app.getHttpServer())
      .get('/farmer/farm')
      .set('Authorization', `Bearer ${farmerToken}`)
      .expect(200);

    expect(res.body.id).toBe(farmId);
    expect(res.body.name).toBe('Ma Ferme');
  });

  it('POST /farmer/parcels - create parcel', async () => {
    const res = await request(app.getHttpServer())
      .post('/farmer/parcels')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        name: 'Parcelle A',
        area: 5.5,
        regionId,
        soilType: 'LOAMY',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Parcelle A');
    expect(res.body.area).toBe(5.5);
    parcelId = res.body.id;
  });

  it('GET /farmer/parcels - list parcels', async () => {
    const res = await request(app.getHttpServer())
      .get('/farmer/parcels')
      .set('Authorization', `Bearer ${farmerToken}`)
      .expect(200);

    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /farmer/parcels/:id - get parcel', async () => {
    const res = await request(app.getHttpServer())
      .get(`/farmer/parcels/${parcelId}`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .expect(200);

    expect(res.body.id).toBe(parcelId);
    expect(res.body.name).toBe('Parcelle A');
  });

  it('PATCH /farmer/parcels/:id - update parcel', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/farmer/parcels/${parcelId}`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ name: 'Parcelle A modifiée' })
      .expect(200);

    expect(res.body.name).toBe('Parcelle A modifiée');
  });

  it('ownership: other user cannot access parcel', async () => {
    await request(app.getHttpServer())
      .get(`/farmer/parcels/${parcelId}`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .expect(404);
  });

  it('DELETE /farmer/parcels/:id - soft delete', async () => {
    await request(app.getHttpServer())
      .delete(`/farmer/parcels/${parcelId}`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .expect(200);
  });

  it('list excludes deleted parcels', async () => {
    const res = await request(app.getHttpServer())
      .get('/farmer/parcels')
      .set('Authorization', `Bearer ${farmerToken}`)
      .expect(200);

    const found = res.body.data.find((p: { id: string }) => p.id === parcelId);
    expect(found).toBeUndefined();
  });
});
