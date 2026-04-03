import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/http-exception.filter';

describe('RBAC (e2e)', () => {
  let app: INestApplication;

  async function login(email: string, password: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect((r) => {
        if (r.status !== 200 && r.status !== 201 && r.status !== 401)
          throw new Error(`Unexpected ${r.status}`);
      });
    if (res.status === 401) return '';
    return (res.body as { access_token?: string }).access_token ?? '';
  }

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('1) TEACHER peut appeler POST /grades (pas 401) - 200/400/403 selon données', async () => {
    const token = await login('teacher@test.com', 'password123');
    expect(token).toBeTruthy();
    const res = await request(app.getHttpServer())
      .post('/grades')
      .set('Authorization', `Bearer ${token}`)
      .send({
        personId: 'any',
        ecId: 'any',
        session: 1,
        anneeUniv: 2024,
        note: 10,
      });
    expect(res.status).not.toBe(401);
    expect([200, 201, 400, 403]).toContain(res.status);
  });

  it('2) STUDENT ne peut pas saisir de note (POST /grades) - 403', async () => {
    const token = await login('student@test.com', 'password123');
    expect(token).toBeTruthy();
    await request(app.getHttpServer())
      .post('/grades')
      .set('Authorization', `Bearer ${token}`)
      .send({
        personId: 'any',
        ecId: 'any',
        session: 1,
        anneeUniv: 2024,
        note: 10,
      })
      .expect(403);
  });

  it('3) TEACHER ne peut pas approve modification note (PATCH modification-requests/:id/approve) - 403', async () => {
    const token = await login('teacher@test.com', 'password123');
    expect(token).toBeTruthy();
    await request(app.getHttpServer())
      .patch('/grades/modification-requests/non-existent-id/approve')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('4) SERVICE_PEDAGOGIQUE peut accéder à approve (PATCH modification-requests/:id/approve) - 404 ou 200', async () => {
    const token = await login('service_pedagogique@test.com', 'password123');
    expect(token).toBeTruthy();
    const res = await request(app.getHttpServer())
      .patch('/grades/modification-requests/non-existent-id/approve')
      .set('Authorization', `Bearer ${token}`);
    expect([200, 404]).toContain(res.status);
  });

  it('5) CAISSIER peut créer un paiement (POST /finance/payments) - 400/404 sans données valides, pas 403', async () => {
    const token = await login('caissier@test.com', 'password123');
    expect(token).toBeTruthy();
    const res = await request(app.getHttpServer())
      .post('/finance/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        personId: 'any',
        inscriptionId: 'any',
        montant: 100,
        type: 'MENSUALITE',
        mois: 1,
        annee: 2024,
      });
    expect([201, 400, 404]).toContain(res.status);
    if (res.status === 403)
      throw new Error('CAISSIER devrait pouvoir créer un paiement');
  });

  it('6) SCOLARITE ne peut pas valider un paiement (PATCH payments/:id/validate) - 403', async () => {
    const token = await login('scolarite@test.com', 'password123');
    expect(token).toBeTruthy();
    await request(app.getHttpServer())
      .patch('/finance/payments/some-id/validate')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('7) CHEF_COMPTABLE peut valider (PATCH payments/:id/validate) - 404 ou 200', async () => {
    const token = await login('chef_comptable@test.com', 'password123');
    expect(token).toBeTruthy();
    const res = await request(app.getHttpServer())
      .patch('/finance/payments/non-existent-id/validate')
      .set('Authorization', `Bearer ${token}`);
    expect([200, 404, 400]).toContain(res.status);
  });

  it('8) STUDENT ne peut pas accéder à check-conflicts (GET /courses/check-conflicts) - 403', async () => {
    const token = await login('student@test.com', 'password123');
    expect(token).toBeTruthy();
    await request(app.getHttpServer())
      .get(
        '/courses/check-conflicts?salleId=x&teacherId=y&jour=1&heureDebut=8&heureFin=10',
      )
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('9) AUDITOR ne peut pas écrire (POST /grades) - 403', async () => {
    const token = await login('auditor@test.com', 'password123');
    expect(token).toBeTruthy();
    await request(app.getHttpServer())
      .post('/grades')
      .set('Authorization', `Bearer ${token}`)
      .send({
        personId: 'any',
        ecId: 'any',
        session: 1,
        anneeUniv: 2024,
        note: 10,
      })
      .expect(403);
  });

  it('10) /vigile/check-in sans X-DEVICE-TOKEN - 403', async () => {
    await request(app.getHttpServer())
      .post('/vigile/check-in')
      .send({ matricule: 'TCH-2024-0001' })
      .expect(403);
  });

  it('11) /vigile/check-in avec token valide - 200/201 et corps authorized/message', async () => {
    const res = await request(app.getHttpServer())
      .post('/vigile/check-in')
      .set('X-DEVICE-TOKEN', 'dev-token-vigile-badge-12345')
      .send({ matricule: 'TCH-2024-0001' })
      .expect((r) => {
        if (r.status !== 200 && r.status !== 201)
          throw new Error(`Expected 200 or 201, got ${r.status}`);
      });
    expect(res.body).toHaveProperty('authorized');
    expect(res.body).toHaveProperty('message');
  });
});
