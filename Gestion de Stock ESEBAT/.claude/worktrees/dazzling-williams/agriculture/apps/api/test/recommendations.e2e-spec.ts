import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Recommendations (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let farmerToken: string;
  let parcelId: string;
  let regionId: string;
  let otherUserToken: string;
  let otherParcelId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const regions = await prisma.region.findMany({ take: 1 });
    regionId = regions[0]!.id;

    const farmerEmail = `reco-farmer-${Date.now()}@test.com`;
    const otherEmail = `reco-other-${Date.now()}@test.com`;

    const [farmerRes, otherRes] = await Promise.all([
      request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: farmerEmail, password: 'TestPass123', role: 'FARMER' }),
      request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: otherEmail, password: 'TestPass123', role: 'FARMER' }),
    ]);

    farmerToken = farmerRes.body.accessToken;
    otherUserToken = otherRes.body.accessToken;

    const farmRes = await request(app.getHttpServer())
      .post('/farmer/farm')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ name: 'Test Farm Reco', regionId, farmingType: 'RAINFED' });

    const otherFarmRes = await request(app.getHttpServer())
      .post('/farmer/farm')
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({ name: 'Other Farm', regionId, farmingType: 'RAINFED' });

    const parcelRes = await request(app.getHttpServer())
      .post('/farmer/parcels')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        name: 'Parcel Reco',
        area: 5,
        regionId,
        soilType: 'LOAMY',
      });
    parcelId = parcelRes.body.id;

    const otherParcelRes = await request(app.getHttpServer())
      .post('/farmer/parcels')
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({
        name: 'Other Parcel',
        area: 3,
        regionId,
        soilType: 'SANDY',
      });
    otherParcelId = otherParcelRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('ownership: other user cannot run recommendation on parcel', () => {
    return request(app.getHttpServer())
      .post(`/farmer/parcels/${parcelId}/recommendations/run`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({})
      .expect(403);
  });

  it('POST run returns results with score and explanations', async () => {
    const res = await request(app.getHttpServer())
      .post(`/farmer/parcels/${parcelId}/recommendations/run`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ historyDays: 30 });

    expect(res.status).toBe(201);
    expect(res.body.recommendationId).toBeDefined();
    expect(res.body.results).toBeInstanceOf(Array);
    expect(res.body.season).toMatch(/DRY|RAINY/);
    if (res.body.results.length > 0) {
      const first = res.body.results[0];
      expect(first).toHaveProperty('cropName');
      expect(first).toHaveProperty('score');
      expect(first).toHaveProperty('positiveReasons');
      expect(first).toHaveProperty('negativeReasons');
      expect(first).toHaveProperty('missingData');
    }
  });

  it('GET parcel recommendations returns paginated list', async () => {
    const res = await request(app.getHttpServer())
      .get(`/farmer/parcels/${parcelId}/recommendations?page=1&limit=5`)
      .set('Authorization', `Bearer ${farmerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.meta).toHaveProperty('total');
    expect(res.body.meta).toHaveProperty('page', 1);
  });
});
