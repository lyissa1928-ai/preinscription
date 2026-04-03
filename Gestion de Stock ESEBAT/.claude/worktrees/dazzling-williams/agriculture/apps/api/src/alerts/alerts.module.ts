import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AlertsController } from './alerts.controller';
import { AdminAlertsController } from './admin-alerts.controller';
import { AlertRulesController } from './alert-rules.controller';
import { AlertsService } from './alerts.service';
import { AlertRulesService } from './alert-rules.service';
import { AlertsRepository } from './alerts.repository';
import { AlertsEngine } from './alerts.engine';
import { AlertsCronService } from './alerts.cron';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AlertsController, AdminAlertsController, AlertRulesController],
  providers: [AlertsService, AlertRulesService, AlertsRepository, AlertsEngine, AlertsCronService],
  exports: [AlertsService],
})
export class AlertsModule {}
