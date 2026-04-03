import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'fs';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PersonsService } from './persons.service';
import {
  CAN_ADD_PERSONNEL,
  CAN_WRITE_TEACHER_RECORD,
} from '../common/rbac.constants';

const CAN_READ = [
  'SCOLARITE',
  'SERVICE_PEDAGOGIQUE',
  'RESPONSABLE_PEDAGOGIQUE',
  'AGENT_PEDAGOGIQUE',
  'ADMIN',
  'SUPER_ADMIN',
  'DEPT_HEAD',
  'TEACHER',
  'CAISSIER',
];
const CAN_WRITE = ['SCOLARITE', 'SERVICE_PEDAGOGIQUE', 'ADMIN', 'SUPER_ADMIN'];
const SCOLARITE_ONLY = ['SCOLARITE', 'ADMIN', 'SUPER_ADMIN'];

@Controller('persons')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(...CAN_READ)
export class PersonsController {
  constructor(private service: PersonsService) {}

  @Delete('bulk')
  @Roles(...CAN_WRITE)
  async bulkDelete(
    @Body() body: { ids: string[] },
    @CurrentUser() user: { role?: string },
  ) {
    await this.service.assertScolariteMayDeletePersons(
      user?.role,
      body.ids ?? [],
    );
    return this.service.bulkDeletePersons(body.ids ?? []);
  }

  @Get()
  findAll(@Query('type') type?: 'STUDENT' | 'TEACHER' | 'STAFF') {
    return this.service.findAll(type);
  }

  @Get('students')
  findAllStudents(
    @Query('search') search?: string,
    @Query('filiereId') filiereId?: string,
    @Query('formationId') formationId?: string,
    @Query('cohortId') cohortId?: string,
    @Query('anneeUniv') anneeUniv?: string,
    @Query('statut') statut?: string,
  ) {
    return this.service.findAllStudents({
      search,
      filiereId,
      formationId,
      cohortId,
      anneeUniv: anneeUniv ? +anneeUniv : undefined,
      statut,
    });
  }

  @Patch('students/bulk')
  @Roles(...SCOLARITE_ONLY)
  bulkUpdateStudentStatus(
    @Body() body: { personIds: string[]; statutInscription: string },
  ) {
    return this.service.bulkUpdateStudentStatus(
      body.personIds ?? [],
      body.statutInscription,
    );
  }

  @Post('students/bulk-transfer')
  @Roles(...SCOLARITE_ONLY)
  bulkTransferToCohort(
    @Body() body: { personIds: string[]; cohortId: string; anneeUniv?: number },
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.bulkTransferToCohort(
      body.personIds ?? [],
      body.cohortId,
      body.anneeUniv,
      user?.sub,
    );
  }

  @Post('students/export')
  @Roles(...SCOLARITE_ONLY)
  async exportStudents(
    @Body() body: { personIds: string[]; format: 'excel' | 'pdf' },
    @Res({ passthrough: false }) res: Response,
  ) {
    const buffer = await this.service.exportStudents(
      body.personIds ?? [],
      body.format ?? 'excel',
    );
    const contentType =
      body.format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const ext = body.format === 'pdf' ? 'pdf' : 'xlsx';
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=etudiants-export.${ext}`,
    );
    res.send(buffer);
  }

  @Get('students/:personId/attestation')
  @Roles(...SCOLARITE_ONLY)
  async getAttestation(
    @Param('personId') personId: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    const buffer = await this.service.generateAttestationPdf(personId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=attestation-scolarite.pdf',
    );
    res.send(buffer);
  }

  @Get('students/:personId/carte')
  @Roles(...SCOLARITE_ONLY)
  async getCarteEtudiant(
    @Param('personId') personId: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    const buffer = await this.service.generateCarteEtudiantPdf(personId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=carte-etudiant.pdf',
    );
    res.send(buffer);
  }

  /** Fiche d'inscription PDF (logo établissement, photo étudiant, données du dossier). */
  @Get('students/:personId/fiche-inscription')
  @Roles(...SCOLARITE_ONLY)
  async getFicheInscription(
    @Param('personId') personId: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    const buffer = await this.service.generateFicheInscriptionPdf(personId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=fiche-inscription.pdf',
    );
    res.send(buffer);
  }

  @Get('students/:personId/documents/:type')
  @Roles(...SCOLARITE_ONLY)
  async getStudentDocument(
    @Param('personId') personId: string,
    @Param('type') type: 'photo' | 'justificatif_bac' | 'justificatif_cni',
  ): Promise<StreamableFile> {
    const { filePath, fileName } = await this.service.getStudentDocumentPath(
      personId,
      type,
    );
    const stream = createReadStream(filePath);
    return new StreamableFile(stream, {
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @Patch('students/:personId/valider-dossier')
  @Roles(...SCOLARITE_ONLY)
  validateDossier(
    @Param('personId') personId: string,
    @CurrentUser() user: { sub?: string },
  ) {
    return this.service.validateDossier(personId, user?.sub);
  }

  @Patch('students/:personId')
  @Roles(...SCOLARITE_ONLY)
  updateStudent(
    @Param('personId') personId: string,
    @Body()
    body: {
      statutInscription?: string;
      telephone?: string;
      adresse?: string;
      nomTuteur?: string;
      telephoneParent?: string;
      telephoneTuteur?: string;
      lienParente?: string;
      groupeSanguin?: string;
      antecedentsMedicaux?: string;
      maladiesSignalees?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
    },
  ) {
    return this.service.updateStudent(personId, body);
  }

  /** Badge PDF (tous rôles) : modèle carte d’identité, QR + code-barres — régénéré à chaque téléchargement. */
  @Get('me/badge-pdf')
  @Roles()
  async downloadUserBadge(
    @Res({ passthrough: false }) res: Response,
    @CurrentUser() user: { sub: string },
  ) {
    const buf = await this.service.buildUserBadgePdf(user.sub);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="badge-utilisateur.pdf"; filename*=UTF-8\'\'badge-utilisateur.pdf',
    );
    res.send(buf);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  private handleUploadStudentDocument(
    file: {
      buffer?: Buffer;
      originalname?: string;
      mimetype?: string;
      size?: number;
    },
    type: string,
  ) {
    if (!file?.buffer) throw new BadRequestException('Fichier requis');
    if ((file.size ?? file.buffer.length) > 2 * 1024 * 1024) {
      throw new BadRequestException('Taille maximale 2 Mo.');
    }
    const typeVal = type || 'document';
    const allowedPhoto = ['image/jpeg', 'image/png'];
    const allowedDoc = ['image/jpeg', 'image/png', 'application/pdf'];
    const isPhoto = typeVal === 'photo';
    const allowed = isPhoto ? allowedPhoto : allowedDoc;
    if (!allowed.includes(file.mimetype || '')) {
      throw new BadRequestException(
        isPhoto
          ? 'Photo : JPEG ou PNG uniquement.'
          : 'Document : image (JPG/PNG) ou PDF.',
      );
    }
    return this.service.uploadStudentDocument(typeVal, {
      buffer: file.buffer,
      originalname: file.originalname,
    });
  }

  @Post('students/upload')
  @Roles(...SCOLARITE_ONLY)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }),
  )
  uploadStudentDocument(
    @UploadedFile()
    file: {
      buffer?: Buffer;
      originalname?: string;
      mimetype?: string;
      size?: number;
    },
    @Body() body: { type: string },
  ) {
    return this.handleUploadStudentDocument(file, body?.type || 'document');
  }

  @Post('students/inscription')
  @Roles(...SCOLARITE_ONLY)
  createStudentWithInscription(
    @Body()
    body: {
      nom: string;
      prenom: string;
      cinOuPasseport: string;
      formationId: string;
      cohortId: string;
      campusId?: string | null;
      anneeUniv: number;
      dateNaissance?: string;
      lieuNaissance?: string;
      nationalite?: string;
      genre?: string;
      telephone?: string;
      adresse?: string;
      photoProfil?: string;
      dernierDiplome?: string;
      anneeObtention?: number;
      mention?: string;
      etablissementOrigine?: string;
      typeBac?: string;
      nomTuteur?: string;
      telephoneParent?: string;
      telephoneTuteur?: string;
      lienParente?: string;
      groupeSanguin?: string;
      antecedentsMedicaux?: string;
      maladiesSignalees?: string;
      justificatifBac?: string;
      justificatifCni?: string;
      email?: string;
    },
  ) {
    return this.service.createStudentWithInscription(body);
  }

  /** @deprecated Préférer POST /persons/students/inscription pour les nouvelles inscriptions. Route conservée pour compatibilité. */
  @Post('students/full')
  @Roles(...CAN_WRITE)
  createStudentFull(
    @Body()
    body: {
      nom: string;
      prenom: string;
      dateNaissance?: string;
      lieuNaissance?: string;
      numeroCarteEtudiant: string;
      cinOuPasseport?: string;
      telephone?: string;
      adresse?: string;
      telephoneParent?: string;
      telephoneTuteur?: string;
      typeBac?: string;
      groupeSanguin?: string;
      antecedentsMedicaux?: string;
      maladiesSignalees?: string;
      email?: string;
      password?: string;
    },
  ) {
    return this.service.createStudentFull(body);
  }

  @Post('teachers')
  @Roles(...CAN_ADD_PERSONNEL)
  createTeacher(
    @CurrentUser() user: { sub: string; role: string },
    @Body()
    body: {
      email: string;
      firstName: string;
      lastName: string;
      password?: string;
      typeContrat?: string;
      niveauEtude?: string;
      articlesPublies?: number;
      rangGrade?: string;
      address?: string;
      phone?: string;
      dateNaissance?: string;
    },
  ) {
    if (user?.role === 'SCOLARITE') {
      throw new ForbiddenException(
        "Le rôle Scolarité n'est pas autorisé à ajouter des enseignants.",
      );
    }
    return this.service.createTeacher({
      ...body,
      dateNaissance: body.dateNaissance
        ? new Date(body.dateNaissance)
        : undefined,
    });
  }

  @Patch('teachers/:personId')
  @Roles(...CAN_WRITE_TEACHER_RECORD)
  updateTeacher(
    @Param('personId') personId: string,
    @Body()
    body: {
      typeContrat?: string;
      niveauEtude?: string;
      articlesPublies?: number;
      rangGrade?: string;
      bioAcademique?: string;
      dateFin?: string;
    },
  ) {
    return this.service.updateTeacher(personId, {
      ...body,
      dateFin: body.dateFin ? new Date(body.dateFin) : undefined,
    });
  }

  /** Photo de profil enseignant (visible sur le badge PDF) — scolarité / pédagogie / admin. */
  @Post('teachers/:personId/photo')
  @Roles(...CAN_WRITE_TEACHER_RECORD)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }),
  )
  uploadTeacherPhoto(
    @Param('personId') personId: string,
    @UploadedFile()
    file: {
      buffer?: Buffer;
      originalname?: string;
      mimetype?: string;
      size?: number;
    },
  ) {
    if (!file?.buffer) throw new BadRequestException('Fichier requis');
    return this.service.uploadTeacherProfilePhoto(personId, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
    });
  }

  /** Mise à jour de la bio par l'enseignant connecté (espace personnel). */
  @Get('teachers/me')
  @Roles('TEACHER')
  getTeacherMe(@CurrentUser() user: { sub: string }) {
    return this.service.getTeacherMe(user.sub);
  }

  @Patch('teachers/me/bio')
  @Roles('TEACHER')
  updateTeacherMeBio(
    @CurrentUser() user: { sub: string },
    @Body() body: { bioAcademique?: string },
  ) {
    return this.service.updateTeacherMe(user.sub, body);
  }

  @Delete(':id')
  @Roles(...CAN_WRITE)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: { role?: string },
  ) {
    await this.service.assertScolariteMayDeletePersons(user?.role, [id]);
    return this.service.delete(id);
  }
}
