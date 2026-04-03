import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsEmail, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsersService } from './users.service';

class CreateUserBody {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsString()
  role!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  numberOfChildren?: number;

  @IsOptional()
  @IsString()
  matricule?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  service?: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsString()
  contractType?: string;

  @IsOptional()
  @IsString()
  hireDate?: string;

  @IsOptional()
  @IsString()
  accountStatus?: string;
}

class UpdateUserBody {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  numberOfChildren?: number;

  @IsOptional()
  @IsString()
  matricule?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

class BulkDeleteBody {
  @IsOptional()
  ids?: string[];
}

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  findAll() {
    return this.authService.findAllUsers();
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: { sub: string },
    @Body() body: { firstName?: string; lastName?: string },
  ) {
    return this.authService.updateProfile(user.sub, body);
  }

  @Post('me/photo')
  @UseInterceptors(FileInterceptor('file'))
  uploadMyPhoto(
    @CurrentUser() user: { sub: string },
    @UploadedFile() file: { buffer?: Buffer; originalname?: string },
  ) {
    if (!file?.buffer) throw new BadRequestException('Fichier requis');
    return this.usersService.uploadProfilePhoto(user.sub, {
      buffer: file.buffer,
      originalname: file.originalname,
    });
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  create(@Body() body: CreateUserBody) {
    return this.usersService.createUser(body);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  update(@Param('id') id: string, @Body() body: UpdateUserBody) {
    return this.usersService.updateUser(id, body);
  }

  @Patch(':id/validate-profile')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  validateProfile(@Param('id') id: string) {
    return this.usersService.setProfileValidated(id);
  }

  @Patch(':id/badge-active')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  setBadgeActive(@Param('id') id: string, @Body() body: { active: boolean }) {
    return this.usersService.setBadgeActive(id, Boolean(body?.active));
  }

  @Post(':id/regenerate-badge-qr')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  regenerateBadgeQr(@Param('id') id: string) {
    return this.usersService.regenerateBadgeQr(id);
  }

  @Post(':id/photo')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file: { buffer?: Buffer; originalname?: string },
  ) {
    if (!file?.buffer) throw new BadRequestException('Fichier requis');
    return this.usersService.uploadProfilePhoto(id, {
      buffer: file.buffer,
      originalname: file.originalname,
    });
  }

  @Get(':id/badge-data')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getBadgeData(@Param('id') id: string) {
    return this.usersService.getBadgeData(id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  deleteOne(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  @Post('bulk-delete')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  bulkDelete(@Body() body: BulkDeleteBody) {
    const ids = body.ids ?? [];
    return this.usersService.deleteMany(ids);
  }
}
