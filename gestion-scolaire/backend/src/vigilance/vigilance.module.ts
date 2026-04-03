import { Module } from '@nestjs/common';
import { VigilanceController } from './vigilance.controller';
import { VigilanceService } from './vigilance.service';

@Module({
  controllers: [VigilanceController],
  providers: [VigilanceService],
})
export class VigilanceModule {}
