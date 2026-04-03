import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AppearanceService } from './appearance.service';
import type { AppSettingsDto } from './appearance.service';

const UPLOAD_TYPES = ['logo', 'logoLogin', 'favicon', 'stamp'] as const;

@Controller('appearance')
export class AppearanceController {
  constructor(private service: AppearanceService) {}

  /** Public : récupère le thème actif (logo, couleurs) pour le front. */
  @Get('settings')
  getSettings() {
    return this.service.getSettings();
  }

  /** SUPER_ADMIN : upload logo, logo login ou favicon (fichier). Retourne l’URL à enregistrer. */
  @Post('upload')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }),
  )
  upload(
    @Query('type') type: string,
    @UploadedFile()
    file:
      | { buffer?: Buffer; originalname?: string; mimetype?: string }
      | undefined,
  ) {
    const typeVal = (type || '').trim() as (typeof UPLOAD_TYPES)[number];
    if (!UPLOAD_TYPES.includes(typeVal)) {
      throw new BadRequestException(
        'Paramètre type requis : logo, logoLogin, favicon ou stamp (cachet)',
      );
    }
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException(
        'Aucun fichier reçu. Envoyez un fichier dans le champ "file".',
      );
    }
    return this.service.uploadAppearanceFile(typeVal, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
    });
  }

  /** SUPER_ADMIN uniquement : met à jour et active le thème. */
  @Patch('settings')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateSettings(
    @Body() body: AppSettingsDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.updateSettings(body, user.sub);
  }
}
