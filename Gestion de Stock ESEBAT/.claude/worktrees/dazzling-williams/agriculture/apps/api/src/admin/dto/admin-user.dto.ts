import { IsString, IsEmail, IsOptional, IsBoolean, IsEnum, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@agriculture/shared';

export class CreateAdminUserDto {
  @ApiPropertyOptional()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional()
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit faire au moins 8 caractères' })
  password!: string;

  @ApiPropertyOptional({ enum: ['ADMIN', 'FARMER', 'AGRONOMIST', 'TECHNICIAN'] })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAdminUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Nouveau mot de passe (si présent)' })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit faire au moins 8 caractères' })
  resetPassword?: string;
}
