import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { AppearanceController } from './appearance.controller';
import { AppearanceService } from './appearance.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AppearanceController],
  providers: [AppearanceService],
  exports: [AppearanceService],
})
export class AppearanceModule {}
