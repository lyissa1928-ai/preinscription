import { IsEnum, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SEASONS } from '@agriculture/shared';

export class RunRecommendationDto {
  @ApiPropertyOptional({ enum: ['DRY', 'RAINY'] })
  @IsOptional()
  @IsEnum(['DRY', 'RAINY'])
  season?: 'DRY' | 'RAINY' | null;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(7)
  @Max(90)
  @Type(() => Number)
  historyDays?: number;
}
