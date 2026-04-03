import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { InscriptionsController } from './inscriptions.controller';
import { InscriptionsService } from './inscriptions.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [InscriptionsController],
  providers: [InscriptionsService],
  exports: [InscriptionsService],
})
export class InscriptionsModule {}
