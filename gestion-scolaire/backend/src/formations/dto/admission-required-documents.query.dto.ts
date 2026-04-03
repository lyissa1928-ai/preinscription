import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ADMISSION_CYCLE_CODES } from '../admission-documents.constants';

const CYCLES = [...ADMISSION_CYCLE_CODES];

export class AdmissionRequiredDocumentsQueryDto {
  @IsOptional()
  @ValidateIf((_o, v) => v !== undefined && v !== null && v !== '')
  @IsString()
  @MaxLength(8)
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined;
    return typeof value === 'string' ? value.trim().toUpperCase() : value;
  })
  @IsIn(CYCLES, {
    message: `cycleCode doit être l'un de : ${CYCLES.join(', ')}`,
  })
  cycleCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  formationId?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  isForeigner?: boolean;
}
