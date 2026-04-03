import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('regions')
@Controller('regions')
export class RegionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Liste des régions actives' })
  async list() {
    const regions = await this.prisma.region.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return regions.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      zone: r.zone,
    }));
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Détail région' })
  async getOne(@Param('id') id: string) {
    const region = await this.prisma.region.findUnique({
      where: { id },
    });
    if (!region) {
      throw new NotFoundException({
        code: 'REGION_NOT_FOUND',
        message: 'Région non trouvée',
      });
    }
    return { id: region.id, name: region.name, zone: region.zone };
  }
}
