import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSoilDto {
  @ApiPropertyOptional({ description: 'pH (0-14)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(14)
  @Type(() => Number)
  ph?: number | null;

  @ApiPropertyOptional({ description: 'Humidité sol % (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  soilMoisture?: number | null;

  @ApiPropertyOptional({ description: 'Salinité (dS/m)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  salinity?: number | null;
}
