import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class MuteAlertDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Max(168)
  @Type(() => Number)
  hours!: number;
}
