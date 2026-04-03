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
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TariffRatesService } from './tariff-rates.service';

@Controller('tariff-rates')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN', 'CHEF_COMPTABLE')
export class TariffRatesController {
  constructor(private service: TariffRatesService) {}

  @Get()
  findAll(@Query('formationId') formationId?: string) {
    return this.service.findAll(formationId || undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(
    @Body()
    body: {
      formationId?: string;
      tauxCm?: number;
      tauxTd?: number;
      tauxTp?: number;
      tauxTpe?: number;
    },
  ) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      tauxCm?: number;
      tauxTd?: number;
      tauxTp?: number;
      tauxTpe?: number;
    },
  ) {
    return this.service.update(id, body);
  }
}
