import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CampusService } from './campus.service';
import { REGIONS_SENEGAL } from './senegal-regions-communes';

const CAN_MANAGE = [
  'SERVICE_PEDAGOGIQUE',
  'RESPONSABLE_PEDAGOGIQUE',
  'ADMIN',
  'SUPER_ADMIN',
];

@Controller('campuses')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(
  'SCOLARITE',
  'SERVICE_PEDAGOGIQUE',
  'RESPONSABLE_PEDAGOGIQUE',
  'AGENT_PEDAGOGIQUE',
  'ADMIN',
  'SUPER_ADMIN',
  'DEPT_HEAD',
  'TEACHER',
)
export class CampusController {
  constructor(private service: CampusService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  /** Référentiel des 14 régions du Sénégal et de leurs communes. Déclaré avant :id pour que /campuses/regions ne soit pas capté par :id. */
  @Get('regions')
  getRegions() {
    return { regions: REGIONS_SENEGAL };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(...CAN_MANAGE)
  create(
    @Body()
    body: {
      code: string;
      nom: string;
      adresse?: string;
      region?: string;
      departement?: string;
      commune?: string;
      telDirection?: string;
    },
  ) {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Données du campus manquantes.');
    }
    return this.service.create(body);
  }

  @Patch(':id')
  @Roles(...CAN_MANAGE)
  update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      code: string;
      nom: string;
      adresse: string;
      region: string;
      departement: string;
      commune: string;
      telDirection: string;
      responsablePedagogiqueId: string | null;
      agentPedagogiqueId: string | null;
    }>,
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @Roles(...CAN_MANAGE)
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
