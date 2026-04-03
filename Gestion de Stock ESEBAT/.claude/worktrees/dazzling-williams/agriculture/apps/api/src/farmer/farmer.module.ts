import { Module } from '@nestjs/common';
import { FarmController } from './farm.controller';
import { ParcelsController } from './parcels.controller';
import { DashboardController } from './dashboard.controller';
import { FarmService } from './farm.service';
import { ParcelsService } from './parcels.service';

@Module({
  controllers: [FarmController, ParcelsController, DashboardController],
  providers: [FarmService, ParcelsService],
  exports: [FarmService, ParcelsService],
})
export class FarmerModule {}
