import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ALERT_TYPES, ALERT_SEVERITIES, AlertRuleScope } from '@agriculture/shared';

export class CreateAlertRuleDto {
  @ApiPropertyOptional({ enum: Object.values(AlertRuleScope), default: 'GLOBAL' })
  @IsOptional()
  @IsEnum(Object.values(AlertRuleScope))
  scope?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  regionId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parcelId?: string | null;

  @ApiProperty({ enum: ALERT_TYPES })
  @IsEnum(ALERT_TYPES)
  type!: string;

  @ApiProperty({ enum: ALERT_SEVERITIES })
  @IsEnum(ALERT_SEVERITIES)
  severity!: string;

  @ApiProperty({ example: { metric: 'soilMoisture', operator: '<', value: 35 } })
  @IsObject()
  conditions!: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  windowDays?: number | null;

  @ApiPropertyOptional({ default: 24 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168)
  @Type(() => Number)
  cooldownHours?: number;

  @ApiProperty()
  @IsString()
  messageTemplate!: string;
}

export class UpdateAlertRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(Object.values(AlertRuleScope))
  scope?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  regionId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parcelId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(ALERT_TYPES)
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(ALERT_SEVERITIES)
  severity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  conditions?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  windowDays?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168)
  @Type(() => Number)
  cooldownHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  messageTemplate?: string;
}
