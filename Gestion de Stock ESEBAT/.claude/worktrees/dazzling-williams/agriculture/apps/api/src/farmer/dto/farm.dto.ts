import { IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FARMING_TYPES } from '@agriculture/shared';

export class CreateFarmDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty()
  @IsString()
  regionId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalArea?: number;

  @ApiProperty({ enum: FARMING_TYPES })
  @IsEnum(FARMING_TYPES)
  farmingType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateFarmDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  regionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalArea?: number;

  @ApiPropertyOptional({ enum: FARMING_TYPES })
  @IsOptional()
  @IsEnum(FARMING_TYPES)
  farmingType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
