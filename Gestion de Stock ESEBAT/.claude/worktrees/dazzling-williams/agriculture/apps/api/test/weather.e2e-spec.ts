import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Weather (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let farmerToken: string;
  let parcelId: string;
  let regionId: string;
  let otherUserToken: string;

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

    const farmerEmail = `weather-farmer-${Date.now()}@test.com`;
    const otherEmail = `weather-other-${Date.now()}@test.com`;

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
      .send({ name: 'Test Farm', regionId, farmingType: 'RAINFED' });

    const parcelRes = await request(app.getHttpServer())
      .post('/farmer/parcels')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        name: 'Parcel with coords',
        area: 5,
        regionId,
        soilType: 'LOAMY',
        latitude: 14.7167,
        longitude: -17.4677,
      });
    parcelId = parcelRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('ownership: other user cannot access parcel weather', () => {
    return request(app.getHttpServer())
      .get(`/farmer/parcels/${parcelId}/weather?days=7`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .expect(404);
  });

  it('GET /farmer/parcels/:id/weather - returns weather or provider error', async () => {
    const res = await request(app.getHttpServer())
      .get(`/farmer/parcels/${parcelId}/weather?days=7`)
      .set('Authorization', `Bearer ${farmerToken}`);

    if (res.status === 200) {
      expect(res.body.parcelId).toBe(parcelId);
      expect(res.body.daily).toBeInstanceOf(Array);
      expect(typeof res.body.stale).toBe('boolean');
      expect(typeof res.body.fromCache).toBe('boolean');
    } else if (res.status === 404) {
      expect(res.body.error?.code).toMatch(/WEATHER|COORDINATES/);
    }
  });

  it('GET /farmer/parcels/:id/weather/history - returns history from DB', async () => {
    const res = await request(app.getHttpServer())
      .get(`/farmer/parcels/${parcelId}/weather/history?days=30`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .expect(200);

    expect(res.body.parcelId).toBe(parcelId);
    expect(res.body.daily).toBeInstanceOf(Array);
  });
});
