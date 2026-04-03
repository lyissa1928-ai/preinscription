import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { AdminSensorsService } from '../admin/admin-sensors.service';
import { IotIngestDto } from '../admin/dto/sensor.dto';

@ApiTags('iot')
@Controller('iot/ingest')
@Public()
export class IotIngestController {
  constructor(private readonly sensorsService: AdminSensorsService) {}

  @Post()
  @ApiOperation({ summary: 'Ingérer des données capteur (clé API requise)' })
  @ApiHeader({
    name: 'X-Sensor-Api-Key',
    description: 'Clé API du capteur',
    required: true,
  })
  async ingest(
    @Headers('x-sensor-api-key') apiKey: string,
    @Body() dto: IotIngestDto,
  ) {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new UnauthorizedException({
        code: 'MISSING_API_KEY',
        message: 'Header X-Sensor-Api-Key requis',
      });
    }
    return this.sensorsService.ingestByApiKey(apiKey.trim(), dto);
  }
}
