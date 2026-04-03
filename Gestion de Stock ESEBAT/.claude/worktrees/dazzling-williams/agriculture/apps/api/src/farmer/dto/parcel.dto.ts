import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SOIL_TYPES, PARCEL_STATUSES } from '@agriculture/shared';

export class CreateParcelDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  area!: number;

  @ApiProperty()
  @IsString()
  regionId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude?: number;

  @ApiProperty({ enum: SOIL_TYPES })
  @IsEnum(SOIL_TYPES)
  soilType!: string;

  @ApiPropertyOptional({ enum: PARCEL_STATUSES, default: 'ACTIVE' })
  @IsOptional()
  @IsEnum(PARCEL_STATUSES)
  status?: string = 'ACTIVE';
}

export class UpdateParcelDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  area?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  regionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude?: number | null;

  @ApiPropertyOptional({ enum: SOIL_TYPES })
  @IsOptional()
  @IsEnum(SOIL_TYPES)
  soilType?: string;

  @ApiPropertyOptional({ enum: PARCEL_STATUSES })
  @IsOptional()
  @IsEnum(PARCEL_STATUSES)
  status?: string;
}
