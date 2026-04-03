import { Module } from '@nestjs/common';
import { VigileController } from './vigile.controller';
import { VigileService } from './vigile.service';
import { FinanceModule } from '../finance/finance.module';
import { DeviceTokenModule } from '../device-token/device-token.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [FinanceModule, DeviceTokenModule, AuditModule],
  controllers: [VigileController],
  providers: [VigileService],
})
export class VigileModule {}
