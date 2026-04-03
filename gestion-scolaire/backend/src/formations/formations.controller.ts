import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { UseInterceptors } from '@nestjs/common';
import type { Response } from 'express';
import { FormationsService } from './formations.service';
import {
  FormationsImportService,
  ImportRow,
} from './formations-import.service';
import {
  MaquetteImportService,
  MaquetteImportRow,
} from './maquette-import.service';
import { DemandeDeverrouillageService } from './demande-deverrouillage.service';
import { DemandeValidationService } from './demande-validation.service';
import { AdmissionDocumentsService } from './admission-documents.service';
import { AdmissionRequiredDocumentsQueryDto } from './dto/admission-required-documents.query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CAN_MANAGE_STRUCTURE_ACADEMIQUE,
  STRUCTURE_MANUAL_FORMATION,
} from '../common/rbac.constants';

const CAN_READ = [
  'SCOLARITE',
  'SERVICE_PEDAGOGIQUE',
  'RESPONSABLE_PEDAGOGIQUE',
  'ADMIN',
  'SUPER_ADMIN',
  'DEPT_HEAD',
  'TEACHER',
  'STUDENT',
  'CAISSIER',
  'CHEF_COMPTABLE',
  'DAF',
  'AUDITOR',
];
/** Droits admin sur formations : validation, déverrouillage, verrouillage (responsable pédagogique = même niveau qu’admin). */
const ADMIN_OR_RESP_PEDAGOGIQUE = [
  'ADMIN',
  'SUPER_ADMIN',
  'RESPONSABLE_PEDAGOGIQUE',
];
const SUPER_ADMIN_ONLY = ['SUPER_ADMIN'];

@Controller('formations')
@UseGuards(AuthGuard('jwt'))
export class FormationsController {
  constructor(
    private service: FormationsService,
    private importService: FormationsImportService,
    private maquetteImportService: MaquetteImportService,
    private demandeDeverrouillageService: DemandeDeverrouillageService,
    private demandeValidationService: DemandeValidationService,
    private admissionDocumentsService: AdmissionDocumentsService,
  ) {}

  @Get('import/template')
  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_STRUCTURE_ACADEMIQUE)
  async downloadTemplate(@Res() res: Response) {
    const buffer = this.importService.generateTemplateBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=template-formations.xlsx',
    );
    res.send(buffer);
  }

  @Post('import/preview')
  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_STRUCTURE_ACADEMIQUE)
  @UseInterceptors(FileInterceptor('file'))
  previewImport(@UploadedFile() file: { buffer?: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Fichier requis');
    return this.importService.parseFile(file.buffer);
  }

  @Post('import/confirm')
  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_STRUCTURE_ACADEMIQUE)
  async confirmImport(@Body() body: { rows: ImportRow[] }) {
    if (!body.rows?.length)
      throw new BadRequestException('Aucune donnée à importer');
    const hasErrors = body.rows.some((r) => r.errors?.length > 0);
    if (hasErrors)
      throw new BadRequestException('Corrigez les erreurs avant de valider');
    return this.importService.importFromPreview(body.rows);
  }

  @Get('hierarchy')
  @UseGuards(RolesGuard)
  @Roles(...CAN_READ)
  getHierarchy(@Query('includePending') includePending?: string) {
    return this.service.getHierarchy(includePending === 'true');
  }

  /** Pièces attendues par cycle d’admission (préinscription) — doit rester avant @Get(':id'). */
  @Get('admission-required-documents')
  @UseGuards(RolesGuard)
  @Roles(...CAN_READ)
  getAdmissionRequiredDocuments(
    @Query() query: AdmissionRequiredDocumentsQueryDto,
  ) {
    return this.admissionDocumentsService.getRequiredDocuments({
      cycleCode: query.cycleCode,
      formationId: query.formationId,
      isForeigner: query.isForeigner,
    });
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...CAN_READ)
  findAll(
    @Query('filiereId') filiereId?: string,
    @Query('includePending') includePending?: string,
  ) {
    return this.service.findAllFormations(filiereId, includePending === 'true');
  }

  @Get('maquettes/:maquetteId/import/template')
  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_STRUCTURE_ACADEMIQUE)
  async downloadMaquetteTemplate(
    @Param('maquetteId') maquetteId: string,
    @Query('format') format: string | undefined,
    @Res() res: Response,
  ) {
    if (format?.toLowerCase() === 'csv') {
      const buffer =
        await this.maquetteImportService.generateTemplateCsv(maquetteId);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=template-maquette.csv',
      );
      return res.send(buffer);
    }
    const buffer =
      await this.maquetteImportService.generateTemplateBuffer(maquetteId);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=template-maquette.xlsx',
    );
    return res.send(buffer);
  }

  @Post('maquettes/:maquetteId/import/preview')
  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_STRUCTURE_ACADEMIQUE)
  @UseInterceptors(FileInterceptor('file'))
  maquettePreviewImport(
    @Param('maquetteId') maquetteId: string,
    @UploadedFile() file: { buffer: Buffer; originalname?: string } | undefined,
  ) {
    if (!file?.buffer) throw new BadRequestException('Fichier requis');
    return this.maquetteImportService.parseFile(
      file.buffer,
      maquetteId,
      file.originalname,
    );
  }

  @Post('maquettes/:maquetteId/import/confirm')
  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_STRUCTURE_ACADEMIQUE)
  async maquetteConfirmImport(
    @Param('maquetteId') maquetteId: string,
    @Body() body: { rows: MaquetteImportRow[] },
  ) {
    if (!body.rows?.length)
      throw new BadRequestException('Aucune donnée à importer');
    const hasErrors = body.rows.some((r) => r.errors?.length > 0);
    if (hasErrors)
      throw new BadRequestException('Corrigez les erreurs avant de valider');
    return this.maquetteImportService.importFromPreview(maquetteId, body.rows);
  }

  @Get('demandes-deverrouillage/pending')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_OR_RESP_PEDAGOGIQUE)
  getDemandesPending() {
    return this.demandeDeverrouillageService.findAllPending();
  }

  @Patch('demandes-deverrouillage/:id/approve')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_OR_RESP_PEDAGOGIQUE)
  approveDemandeDeverrouillage(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.demandeDeverrouillageService.approve(id, user.sub);
  }

  @Patch('demandes-deverrouillage/:id/reject')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_OR_RESP_PEDAGOGIQUE)
  rejectDemandeDeverrouillage(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.demandeDeverrouillageService.reject(id, user.sub);
  }

  @Get('demandes-validation/pending')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_OR_RESP_PEDAGOGIQUE)
  getDemandesValidationPending() {
    return this.demandeValidationService.findAllPending();
  }

  @Patch('demandes-validation/filieres/:id/approve')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_OR_RESP_PEDAGOGIQUE)
  approveFiliere(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.demandeValidationService.approveFiliere(id, user.sub);
  }

  @Patch('demandes-validation/filieres/:id/reject')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_OR_RESP_PEDAGOGIQUE)
  rejectFiliere(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.demandeValidationService.rejectFiliere(id, user.sub);
  }

  @Patch('demandes-validation/formations/:id/approve')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_OR_RESP_PEDAGOGIQUE)
  approveFormation(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.demandeValidationService.approveFormation(id, user.sub);
  }

  @Patch('demandes-validation/formations/:id/reject')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_OR_RESP_PEDAGOGIQUE)
  rejectFormation(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.demandeValidationService.rejectFormation(id, user.sub);
  }

  @Patch('demandes-validation/semestres/:id/approve')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_OR_RESP_PEDAGOGIQUE)
  approveSemestre(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.demandeValidationService.approveSemestre(id, user.sub);
  }

  @Patch('demandes-validation/semestres/:id/reject')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_OR_RESP_PEDAGOGIQUE)
  rejectSemestre(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.demandeValidationService.rejectSemestre(id, user.sub);
  }

  @Patch('demandes-validation/maquettes/:id/approve')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_OR_RESP_PEDAGOGIQUE)
  approveMaquette(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.demandeValidationService.approveMaquette(id, user.sub);
  }

  @Patch('demandes-validation/maquettes/:id/reject')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_OR_RESP_PEDAGOGIQUE)
  rejectMaquette(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.demandeValidationService.rejectMaquette(id, user.sub);
  }

  @Patch('demandes-validation/ues/:id/approve')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_OR_RESP_PEDAGOGIQUE)
  approveUE(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.demandeValidationService.approveUE(id, user.sub);
  }

  @Patch('demandes-validation/ues/:id/reject')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_OR_RESP_PEDAGOGIQUE)
  rejectUE(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.demandeValidationService.rejectUE(id, user.sub);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(...CAN_READ)
  findOne(@Param('id') id: string) {
    return this.service.findFormation(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...STRUCTURE_MANUAL_FORMATION)
  create(
    @Body()
    body: {
      code: string;
      nom: string;
      cycle: string;
      dureeSemestres: number;
      filiereId: string;
    },
    @CurrentUser() user: { sub: string; role: string },
  ) {
    return this.service.createFormation(body, {
      userId: user.sub,
      role: user.role,
    });
  }

  @Patch(':id/verrouiller')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_OR_RESP_PEDAGOGIQUE)
  toggleFormationVerrouille(@Param('id') id: string) {
    return this.service.toggleFormationVerrouille(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_STRUCTURE_ACADEMIQUE)
  update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      code: string;
      nom: string;
      cycle: string;
      dureeSemestres: number;
      admissionCycleCode: string | null;
    }>,
  ) {
    return this.service.updateFormation(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_STRUCTURE_ACADEMIQUE)
  delete(@Param('id') id: string) {
    return this.service.deleteFormation(id);
  }

  @Post(':formationId/semestres')
  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_STRUCTURE_ACADEMIQUE)
  createSemestre(
    @Param('formationId') formationId: string,
    @Body() body: { numero: number },
    @CurrentUser() user: { sub: string; role: string },
  ) {
    return this.service.createSemestre(formationId, body, {
      userId: user.sub,
      role: user.role,
    });
  }

  @Post('semestres/:semestreId/maquettes')
  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_STRUCTURE_ACADEMIQUE)
  createMaquette(
    @Param('semestreId') semestreId: string,
    @Body()
    body: { code: string; anneeRef: number; statut?: 'active' | 'archivee' },
    @CurrentUser() user: { sub: string; role: string },
  ) {
    return this.service.createMaquette(semestreId, body, {
      userId: user.sub,
      role: user.role,
    });
  }

  @Patch('maquettes/:id')
  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_STRUCTURE_ACADEMIQUE)
  updateMaquette(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      code: string;
      anneeRef: number;
      statut: string;
      verrouille: boolean;
    }>,
  ) {
    return this.service.updateMaquette(id, body);
  }

  @Patch('maquettes/:id/verrouiller')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_OR_RESP_PEDAGOGIQUE)
  toggleMaquetteVerrouille(@Param('id') id: string) {
    return this.service.toggleMaquetteVerrouille(id);
  }

  @Post('maquettes/:maquetteId/demande-deverrouillage')
  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_STRUCTURE_ACADEMIQUE)
  createDemandeDeverrouillage(
    @Param('maquetteId') maquetteId: string,
    @CurrentUser() user: { sub: string },
    @Body() body?: { motif?: string },
  ) {
    return this.demandeDeverrouillageService.create(
      maquetteId,
      user.sub,
      body?.motif,
    );
  }

  @Get('maquettes/:maquetteId/demandes-deverrouillage')
  @UseGuards(RolesGuard)
  @Roles(...CAN_READ)
  getDemandesByMaquette(@Param('maquetteId') maquetteId: string) {
    return this.demandeDeverrouillageService.findByMaquette(maquetteId);
  }

  @Delete('maquettes/:id')
  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_STRUCTURE_ACADEMIQUE)
  deleteMaquette(@Param('id') id: string) {
    return this.service.deleteMaquette(id);
  }

  @Patch('semestres/:id')
  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_STRUCTURE_ACADEMIQUE)
  updateSemestre(
    @Param('id') id: string,
    @Body() body: Partial<{ numero: number; creditsEcts: number }>,
  ) {
    return this.service.updateSemestre(id, body);
  }

  @Patch('semestres/:id/verrouiller')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_OR_RESP_PEDAGOGIQUE)
  toggleSemestreVerrouille(@Param('id') id: string) {
    return this.service.toggleSemestreVerrouille(id);
  }

  @Delete('semestres/:id')
  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_STRUCTURE_ACADEMIQUE)
  deleteSemestre(@Param('id') id: string) {
    return this.service.deleteSemestre(id);
  }

  @Post('maquettes/:maquetteId/ues')
  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_STRUCTURE_ACADEMIQUE)
  createUE(
    @Param('maquetteId') maquetteId: string,
    @Body()
    body: {
      code: string;
      nom: string;
      coefficient?: number;
      creditsEcts?: number;
    },
    @CurrentUser() user: { sub: string; role: string },
  ) {
    return this.service.createUE(maquetteId, body, {
      userId: user.sub,
      role: user.role,
    });
  }

  @Patch('ues/:id')
  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_STRUCTURE_ACADEMIQUE)
  updateUE(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      code: string;
      nom: string;
      coefficient: number;
      creditsEcts: number;
    }>,
  ) {
    return this.service.updateUE(id, body);
  }

  @Delete('ues/:id')
  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_STRUCTURE_ACADEMIQUE)
  deleteUE(@Param('id') id: string) {
    return this.service.deleteUE(id);
  }

  @Post('ues/:ueId/ecs')
  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_STRUCTURE_ACADEMIQUE)
  createEC(
    @Param('ueId') ueId: string,
    @Body()
    body: {
      code: string;
      nom: string;
      vhCm?: number;
      vhTd?: number;
      vhTp?: number;
      vhTpe?: number;
      coefficient?: number;
      creditsEcts?: number;
    },
  ) {
    return this.service.createEC(ueId, body);
  }

  @Patch('ecs/:id')
  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_STRUCTURE_ACADEMIQUE)
  updateEC(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      code: string;
      nom: string;
      vhCm: number;
      vhTd: number;
      vhTp: number;
      vhTpe: number;
      coefficient: number;
      creditsEcts: number;
    }>,
  ) {
    return this.service.updateEC(id, body);
  }

  @Delete('ecs/:id')
  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_STRUCTURE_ACADEMIQUE)
  deleteEC(@Param('id') id: string) {
    return this.service.deleteEC(id);
  }
}
