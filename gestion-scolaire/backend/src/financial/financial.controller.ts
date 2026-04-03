import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EncaissementService } from './encaissement.service';
import { ComptabiliteService } from './comptabilite.service';
import { DafService } from './daf.service';
import { CompteComptableService } from './compte-comptable.service';
import { BudgetService } from './budget.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('financial')
@UseGuards(AuthGuard('jwt'))
export class FinancialController {
  constructor(
    private encaissement: EncaissementService,
    private comptabilite: ComptabiliteService,
    private daf: DafService,
    private comptes: CompteComptableService,
    private budgets: BudgetService,
  ) {}

  // ========== CAISSIER ==========
  @Post('encaissements')
  @UseGuards(RolesGuard)
  @Roles('CAISSIER', 'CHEF_COMPTABLE', 'ADMIN')
  enregistrerEncaissement(
    @Body()
    body: {
      montant: number;
      libelle: string;
      typePaiement?: string;
      referenceExterne?: string;
    },
    @CurrentUser() user: { sub: string },
  ) {
    return this.encaissement.enregistrerEncaissement(
      {
        montant: body.montant,
        libelle: body.libelle,
        typePaiement: body.typePaiement || 'ESPECES',
        referenceExterne: body.referenceExterne,
      },
      user.sub,
    );
  }

  @Get('brouillard')
  @UseGuards(RolesGuard)
  @Roles('CAISSIER', 'CHEF_COMPTABLE', 'DAF', 'ADMIN')
  getBrouillardDeCaisse(@Query('date') date?: string) {
    const d = date ? new Date(date) : undefined;
    return this.encaissement.getBrouillardDeCaisse(d);
  }

  @Post('cloture-journaliere')
  @UseGuards(RolesGuard)
  @Roles('CAISSIER', 'CHEF_COMPTABLE', 'ADMIN')
  clotureJournaliere(
    @Body() body: { date: string },
    @CurrentUser() user: { sub: string },
  ) {
    const d = body.date ? new Date(body.date) : new Date();
    return this.encaissement.clotureJournaliere(d, user.sub);
  }

  // ========== CHEF COMPTABLE ==========
  @Get('transactions-sans-ecritures')
  @UseGuards(RolesGuard)
  @Roles('CHEF_COMPTABLE', 'ADMIN')
  getTransactionsSansEcritures() {
    return this.comptabilite.getTransactionsSansEcritures();
  }

  @Post('ecritures/generer/:transactionId')
  @UseGuards(RolesGuard)
  @Roles('CHEF_COMPTABLE', 'ADMIN')
  genererEcritures(
    @Param('transactionId') id: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.comptabilite.genererEcritures(id, user.sub);
  }

  @Get('transactions-a-rapprocher')
  @UseGuards(RolesGuard)
  @Roles('CHEF_COMPTABLE', 'ADMIN')
  getTransactionsARapprocher() {
    return this.comptabilite.getTransactionsARapprocher();
  }

  @Patch('transactions/:id/rapprocher')
  @UseGuards(RolesGuard)
  @Roles('CHEF_COMPTABLE', 'ADMIN')
  rapprochement(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.comptabilite.rapprochement(id, user.sub);
  }

  @Get('balance')
  @UseGuards(RolesGuard)
  @Roles('CHEF_COMPTABLE', 'DAF', 'ADMIN')
  getBalanceComptes(
    @Query('dateDebut') dateDebut?: string,
    @Query('dateFin') dateFin?: string,
  ) {
    return this.comptabilite.getBalanceComptes(
      dateDebut ? new Date(dateDebut) : undefined,
      dateFin ? new Date(dateFin) : undefined,
    );
  }

  @Get('grand-livre')
  @UseGuards(RolesGuard)
  @Roles('CHEF_COMPTABLE', 'DAF', 'ADMIN')
  getGrandLivre(
    @Query('compteId') compteId?: string,
    @Query('dateDebut') dateDebut?: string,
    @Query('dateFin') dateFin?: string,
  ) {
    return this.comptabilite.getGrandLivre(
      compteId,
      dateDebut ? new Date(dateDebut) : undefined,
      dateFin ? new Date(dateFin) : undefined,
    );
  }

  @Post('demandes-decaissement')
  @UseGuards(RolesGuard)
  @Roles('CHEF_COMPTABLE', 'ADMIN')
  initierDemandeDecaissement(
    @Body()
    body: {
      budgetId: string;
      montant: number;
      libelle: string;
      typePaiement?: string;
    },
    @CurrentUser() user: { sub: string },
  ) {
    return this.comptabilite.initierDemandeDecaissement(body, user.sub);
  }

  // ========== DAF ==========
  @Get('daf/tableau-de-bord')
  @UseGuards(RolesGuard)
  @Roles('DAF', 'ADMIN')
  getTableauDeBord(@Query('exercice') exercice?: string) {
    return this.daf.getTableauDeBord(exercice ? +exercice : undefined);
  }

  @Get('daf/demandes-en-attente')
  @UseGuards(RolesGuard)
  @Roles('DAF', 'ADMIN')
  getDemandesEnAttente() {
    return this.daf.getDemandesEnAttente();
  }

  @Patch('daf/demandes/:id/approver')
  @UseGuards(RolesGuard)
  @Roles('DAF', 'ADMIN')
  approuverDepense(
    @Param('id') id: string,
    @Body() body: { decision: 'APPROUVEE' | 'REJETEE'; motifRejet?: string },
    @CurrentUser() user: { sub: string },
  ) {
    return this.daf.approuverDepense(
      id,
      body.decision,
      user.sub,
      body.motifRejet,
    );
  }

  // ========== Comptes & Budgets (CHEF_COMPTABLE, DAF) ==========
  @Get('comptes')
  @UseGuards(RolesGuard)
  @Roles('CHEF_COMPTABLE', 'DAF', 'ADMIN')
  getComptes() {
    return this.comptes.findAll();
  }

  @Post('comptes')
  @UseGuards(RolesGuard)
  @Roles('CHEF_COMPTABLE', 'ADMIN')
  createCompte(
    @Body() body: { numeroCompte: string; intitule: string; type: string },
  ) {
    return this.comptes.create(body);
  }

  @Get('budgets')
  @UseGuards(RolesGuard)
  @Roles('CHEF_COMPTABLE', 'DAF', 'ADMIN')
  getBudgets(@Query('exercice') exercice?: string) {
    return this.budgets.findAll(exercice ? +exercice : undefined);
  }

  @Post('budgets')
  @UseGuards(RolesGuard)
  @Roles('CHEF_COMPTABLE', 'DAF', 'ADMIN')
  upsertBudget(
    @Body()
    body: {
      exercice: number;
      departement: string;
      montantAlloue: number;
    },
  ) {
    return this.budgets.upsert(body);
  }
}
