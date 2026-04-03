import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AttendanceModule } from './attendance/attendance.module';
import { PayrollModule } from './payroll/payroll.module';
import { TariffRatesModule } from './tariff-rates/tariff-rates.module';
import { VigilanceModule } from './vigilance/vigilance.module';
import { GovernanceModule } from './governance/governance.module';
import { FinancialModule } from './financial/financial.module';
import { VigileModule } from './vigile/vigile.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FormationsModule } from './formations/formations.module';
import { FinanceModule } from './finance/finance.module';
import { GradesModule } from './grades/grades.module';
import { InscriptionsModule } from './inscriptions/inscriptions.module';
import { CoursesModule } from './courses/courses.module';
import { StudentsModule } from './students/students.module';
import { PersonsModule } from './persons/persons.module';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { SallesModule } from './salles/salles.module';
import { CampusModule } from './campus/campus.module';
import { EncadrementsModule } from './encadrements/encadrements.module';
import { DeviceTokenModule } from './device-token/device-token.module';
import { AppearanceModule } from './appearance/appearance.module';

@Module({
  imports: [
    PrismaModule,
    DeviceTokenModule,
    AuthModule,
    AppearanceModule,
    UsersModule,
    FormationsModule,
    CampusModule,
    SallesModule,
    PersonsModule,
    InscriptionsModule,
    FinanceModule,
    StudentsModule,
    CoursesModule,
    EncadrementsModule,
    GradesModule,
    AttendanceModule,
    PayrollModule,
    TariffRatesModule,
    VigilanceModule,
    GovernanceModule,
    FinancialModule,
    VigileModule,
    AuditModule,
    NotificationsModule,
    ReportsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
