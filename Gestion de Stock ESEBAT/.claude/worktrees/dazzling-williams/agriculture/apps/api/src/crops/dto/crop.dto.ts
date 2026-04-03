import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CROP_CATEGORIES } from '@agriculture/shared';

export class CreateCropDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  scientificName?: string | null;

  @ApiProperty({ enum: CROP_CATEGORIES })
  @IsEnum(CROP_CATEGORIES)
  category!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  @Max(12, { each: true })
  @Type(() => Number)
  defaultPlantingMonths?: number[] | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  @Max(12, { each: true })
  @Type(() => Number)
  defaultHarvestMonths?: number[] | null;
}

export class UpdateCropDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  scientificName?: string | null;

  @ApiPropertyOptional({ enum: CROP_CATEGORIES })
  @IsOptional()
  @IsEnum(CROP_CATEGORIES)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  @Max(12, { each: true })
  @Type(() => Number)
  defaultPlantingMonths?: number[] | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  @Max(12, { each: true })
  @Type(() => Number)
  defaultHarvestMonths?: number[] | null;
}
