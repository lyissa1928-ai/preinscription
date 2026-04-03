import { Module, OnModuleInit } from '@nestjs/common';
import { FinancialController } from './financial.controller';
import { EncaissementService } from './encaissement.service';
import { ComptabiliteService } from './comptabilite.service';
import { DafService } from './daf.service';
import { CompteComptableService } from './compte-comptable.service';
import { BudgetService } from './budget.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { PrismaService } from '../prisma/prisma.service';
import { seedPlanComptable } from './financial.seed';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [FinancialController],
  providers: [
    EncaissementService,
    ComptabiliteService,
    DafService,
    CompteComptableService,
    BudgetService,
  ],
  exports: [EncaissementService, ComptabiliteService, DafService],
})
export class FinancialModule implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await seedPlanComptable(this.prisma);
  }
}
