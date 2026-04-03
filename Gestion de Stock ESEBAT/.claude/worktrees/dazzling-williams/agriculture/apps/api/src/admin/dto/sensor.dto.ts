import { IsString, IsOptional, IsEnum, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const SENSOR_TYPES = ['SOIL_PH', 'SOIL_MOISTURE', 'SOIL_SALINITY', 'WEATHER_STATION'] as const;

export class CreateSensorDto {
  @ApiProperty({ example: 'Capteur humidité parcelle A' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: SENSOR_TYPES })
  @IsEnum(SENSOR_TYPES)
  type!: string;

  @ApiPropertyOptional({ example: 'Soil Moisture Pro v2' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 'SN-2024-001' })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiProperty({ example: 'parcel-id-xxx' })
  @IsString()
  parcelId!: string;
}

export class UpdateSensorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: SENSOR_TYPES })
  @IsOptional()
  @IsEnum(SENSOR_TYPES)
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parcelId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class IotIngestDto {
  @ApiPropertyOptional({ description: 'pH (0-14)' })
  @IsOptional()
  @Min(0)
  @Max(14)
  ph?: number;

  @ApiPropertyOptional({ description: 'Humidité sol % (0-100)' })
  @IsOptional()
  @Min(0)
  @Max(100)
  soilMoisture?: number;

  @ApiPropertyOptional({ description: 'Salinité dS/m' })
  @IsOptional()
  @Min(0)
  salinity?: number;
}

