import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SallesService } from './salles.service';

const CAN_MANAGE = [
  'SERVICE_PEDAGOGIQUE',
  'RESPONSABLE_PEDAGOGIQUE',
  'ADMIN',
  'SUPER_ADMIN',
];

@Controller('salles')
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
export class SallesController {
  constructor(private service: SallesService) {}

  @Get('template')
  @Roles(...CAN_MANAGE)
  getTemplate(@Res({ passthrough: false }) res: Response) {
    const buffer = this.service.getTemplateExcel();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=template-salles.xlsx',
    );
    res.send(buffer);
  }

  @Post('bulk')
  @Roles(...CAN_MANAGE)
  bulkCreate(
    @Body()
    body: {
      campusId: string;
      items: Array<{
        nom: string;
        code?: string;
        capacite?: number;
        campusCode?: string;
        typeSalle?: string;
        equipements?: string;
      }>;
    },
  ) {
    return this.service.bulkCreate(body.campusId, body.items ?? []);
  }

  @Patch('bulk')
  @Roles(...CAN_MANAGE)
  bulkUpdate(
    @Body()
    body: {
      items: Array<
        { id: string } & Partial<{
          nom: string;
          code: string;
          capacite: number;
          campusId: string;
          typeSalle: string;
          equipements: string;
        }>
      >;
    },
  ) {
    return this.service.bulkUpdate(body.items ?? []);
  }

  @Delete('bulk')
  @Roles(...CAN_MANAGE)
  bulkDelete(@Body() body: { ids: string[] }) {
    return this.service.bulkDelete(body.ids ?? []);
  }

  @Get()
  findAll(@Query('campusId') campusId?: string) {
    return this.service.findAll(campusId);
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
      nom: string;
      code?: string;
      capacite?: number;
      campusId?: string;
      typeSalle?: string;
      equipements?: string;
    },
  ) {
    return this.service.create(body);
  }

  @Patch(':id')
  @Roles(...CAN_MANAGE)
  update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      nom: string;
      code: string;
      capacite: number;
      campusId: string;
      typeSalle: string;
      equipements: string;
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
