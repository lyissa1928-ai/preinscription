import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { FarmerModule } from './farmer/farmer.module';
import { RegionsModule } from './regions/regions.module';
import { WeatherModule } from './weather/weather.module';
import { CropsModule } from './crops/crops.module';
import { CropRequirementsModule } from './crop-requirements/crop-requirements.module';
import { SoilModule } from './soil/soil.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { AlertsModule } from './alerts/alerts.module';
import { AuditModule } from './audit/audit.module';
import { IotModule } from './iot/iot.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        serializers: {
          req: (req) => ({ method: req.method, url: req.url }),
          res: (res) => ({ statusCode: res.statusCode }),
        },
      },
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    AdminModule,
    FarmerModule,
    RegionsModule,
    WeatherModule,
    CropsModule,
    CropRequirementsModule,
    SoilModule,
    RecommendationsModule,
    AlertsModule,
    AuditModule,
    IotModule,
  ],
})
export class AppModule {}
