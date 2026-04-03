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
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FilieresService } from './filieres.service';
import { FormationsService } from './formations.service';
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
/** Verrouiller / déverrouiller : admin et responsable pédagogique (mêmes droits sur filières). */
const CAN_VERROUILLER_FILIERE = [
  'ADMIN',
  'SUPER_ADMIN',
  'RESPONSABLE_PEDAGOGIQUE',
];

@Controller('filieres')
@UseGuards(AuthGuard('jwt'))
export class FilieresController {
  constructor(
    private filieresService: FilieresService,
    private formationsService: FormationsService,
  ) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...CAN_READ)
  findAll(@Query('includePending') includePending?: string) {
    return this.filieresService.findAll(includePending === 'true');
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(...CAN_READ)
  findOne(@Param('id') id: string) {
    return this.filieresService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_STRUCTURE_ACADEMIQUE)
  create(
    @Body() body: { code: string; nom: string },
    @CurrentUser() user: { sub: string; role: string },
  ) {
    return this.filieresService.create(body, {
      userId: user.sub,
      role: user.role,
    });
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_STRUCTURE_ACADEMIQUE)
  update(
    @Param('id') id: string,
    @Body() body: Partial<{ code: string; nom: string }>,
  ) {
    return this.filieresService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_STRUCTURE_ACADEMIQUE)
  delete(@Param('id') id: string) {
    return this.filieresService.delete(id);
  }

  @Patch(':id/verrouiller')
  @UseGuards(RolesGuard)
  @Roles(...CAN_VERROUILLER_FILIERE)
  toggleVerrouille(@Param('id') id: string) {
    return this.filieresService.toggleVerrouille(id);
  }

  @Post(':filiereId/formations')
  @UseGuards(RolesGuard)
  @Roles(...STRUCTURE_MANUAL_FORMATION)
  createFormation(
    @Param('filiereId') filiereId: string,
    @Body()
    body: { code: string; nom: string; cycle: string; dureeSemestres: number },
    @CurrentUser() user: { sub: string; role: string },
  ) {
    return this.formationsService.createFormation(
      { ...body, filiereId },
      { userId: user.sub, role: user.role },
    );
  }

  /** Ajoute Licence (L1–L3) ou Master (M1–M2) avec semestres 1–2 et maquettes pour l’année courante. */
  @Post(':id/structure/diplome-type')
  @UseGuards(RolesGuard)
  @Roles(...CAN_MANAGE_STRUCTURE_ACADEMIQUE)
  addDiplomaStructure(
    @Param('id') id: string,
    @Body() body: { type: 'LICENCE' | 'MASTER' },
    @CurrentUser() user: { sub: string; role: string },
  ) {
    if (body?.type !== 'LICENCE' && body?.type !== 'MASTER') {
      throw new BadRequestException(
        'Le champ « type » doit valoir LICENCE ou MASTER.',
      );
    }
    return this.formationsService.addDiplomaStructureToFiliere(id, body.type, {
      userId: user.sub,
      role: user.role,
    });
  }
}
