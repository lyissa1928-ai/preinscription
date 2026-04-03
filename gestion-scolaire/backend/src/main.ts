import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/http-exception.filter';

function ensureProductionSecrets() {
  if (process.env.NODE_ENV !== 'production') return;
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error(
      'En production, JWT_SECRET doit être défini et faire au moins 32 caractères.',
    );
    process.exit(1);
  }
}

async function bootstrap() {
  ensureProductionSecrets();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  const allowedOrigins = [
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    process.env.FRONTEND_URL,
  ].filter(Boolean) as string[];
  if (allowedOrigins.length === 0) allowedOrigins.push('http://localhost:3001');
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      try {
        const u = new URL(origin);
        const ok =
          u.hostname === 'localhost' ||
          u.hostname === '127.0.0.1' ||
          allowedOrigins.includes(origin);
        return cb(null, ok);
      } catch {
        return cb(null, false);
      }
    },
    credentials: true,
  });
  const uploadsDir = join(process.cwd(), 'uploads', 'appearance');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  const config = new DocumentBuilder()
    .setTitle('Gestion Scolaire API')
    .setDescription(
      'API REST pour la gestion scolaire (formations, inscriptions, finances, notes, paie, etc.)',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`API disponible sur http://localhost:${port}`);
}
bootstrap();
