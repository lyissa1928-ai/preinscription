import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminRegionsController } from './admin-regions.controller';
import { AdminAuditLogsController } from './admin-audit-logs.controller';
import { AdminSensorsController } from './admin-sensors.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminRegionsService } from './admin-regions.service';
import { AdminAuditLogsService } from './admin-audit-logs.service';
import { AdminStatsService } from './admin-stats.service';
import { AdminSensorsService } from './admin-sensors.service';

@Module({
  controllers: [
    AdminController,
    AdminUsersController,
    AdminRegionsController,
    AdminAuditLogsController,
    AdminSensorsController,
  ],
  providers: [
    AdminUsersService,
    AdminRegionsService,
    AdminAuditLogsService,
    AdminStatsService,
    AdminSensorsService,
  ],
  exports: [AdminSensorsService],
})
export class AdminModule {}
