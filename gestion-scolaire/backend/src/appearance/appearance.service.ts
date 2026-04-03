import { BadRequestException, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const ALLOWED_TYPES = ['logo', 'logoLogin', 'favicon', 'stamp'] as const;
const MAX_SIZE = 2 * 1024 * 1024; // 2 Mo
const ALLOWED_MIMES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
];

export type AppSettingsDto = {
  appName?: string | null;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  logoLoginUrl?: string | null;
  stampUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  successColor?: string | null;
  dangerColor?: string | null;
  backgroundColor?: string | null;
  sidebarColor?: string | null;
};

@Injectable()
export class AppearanceService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /**
   * Upload un fichier (logo, logo login, favicon). Sauvegarde dans uploads/appearance/
   * et retourne l’URL publique.
   */
  uploadAppearanceFile(
    type: (typeof ALLOWED_TYPES)[number],
    file: { buffer: Buffer; originalname?: string; mimetype?: string },
  ): { url: string } {
    if (!file?.buffer?.length)
      throw new BadRequestException('Fichier manquant.');
    if (file.buffer.length > MAX_SIZE)
      throw new BadRequestException('Taille maximale 2 Mo.');
    const mime = (file.mimetype || '').toLowerCase();
    const extFromName = (
      path.extname(file.originalname || '') || ''
    ).toLowerCase();
    const allowedExts = [
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.webp',
      '.svg',
      '.ico',
    ];
    const mimeOk =
      mime && (ALLOWED_MIMES.includes(mime) || mime.startsWith('image/'));
    const extOk = allowedExts.includes(extFromName);
    if (!mimeOk && !extOk) {
      throw new BadRequestException(
        'Type de fichier non autorisé (images PNG, JPG, SVG, ICO, etc.).',
      );
    }
    const dir = path.join(process.cwd(), 'uploads', 'appearance');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const ext = (path.extname(file.originalname || '') || '.png')
      .toLowerCase()
      .replace(/jpeg/, '.jpg');
    const filename = `${type}-${Date.now()}${ext}`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, file.buffer);
    return { url: `/uploads/appearance/${filename}` };
  }

  /** Récupère les paramètres d'apparence (public, pour chargement thème). */
  async getSettings(): Promise<AppSettingsDto> {
    const row = await this.prisma.appSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    if (!row) return {};
    return {
      appName: row.appName,
      websiteUrl: row.websiteUrl,
      logoUrl: row.logoUrl,
      logoLoginUrl: row.logoLoginUrl,
      stampUrl: row.stampUrl,
      faviconUrl: row.faviconUrl,
      primaryColor: row.primaryColor,
      secondaryColor: row.secondaryColor,
      successColor: row.successColor,
      dangerColor: row.dangerColor,
      backgroundColor: row.backgroundColor,
      sidebarColor: row.sidebarColor,
    };
  }

  /** Met à jour les paramètres (SUPER_ADMIN uniquement, audit log). */
  async updateSettings(
    data: AppSettingsDto,
    userId?: string,
  ): Promise<AppSettingsDto> {
    let row = await this.prisma.appSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    if (!row) {
      row = await this.prisma.appSettings.create({
        data: {
          appName: data.appName?.trim() || undefined,
          websiteUrl:
            data.websiteUrl !== undefined &&
            data.websiteUrl !== null &&
            String(data.websiteUrl).trim() !== ''
              ? String(data.websiteUrl).trim()
              : undefined,
          logoUrl: data.logoUrl ?? undefined,
          logoLoginUrl: data.logoLoginUrl ?? undefined,
          stampUrl: data.stampUrl ?? undefined,
          faviconUrl: data.faviconUrl ?? undefined,
          primaryColor: data.primaryColor ?? undefined,
          secondaryColor: data.secondaryColor ?? undefined,
          successColor: data.successColor ?? undefined,
          dangerColor: data.dangerColor ?? undefined,
          backgroundColor: data.backgroundColor ?? undefined,
          sidebarColor: data.sidebarColor ?? undefined,
        },
      });
    } else {
      const oldJson = JSON.stringify({
        appName: row.appName,
        websiteUrl: row.websiteUrl,
        logoUrl: row.logoUrl,
        primaryColor: row.primaryColor,
        successColor: row.successColor,
        dangerColor: row.dangerColor,
      });
      row = await this.prisma.appSettings.update({
        where: { id: row.id },
        data: {
          appName:
            data.appName !== undefined
              ? data.appName === null || String(data.appName).trim() === ''
                ? null
                : String(data.appName).trim()
              : row.appName,
          websiteUrl:
            data.websiteUrl !== undefined
              ? data.websiteUrl === null ||
                String(data.websiteUrl).trim() === ''
                ? null
                : String(data.websiteUrl).trim()
              : row.websiteUrl,
          logoUrl: data.logoUrl !== undefined ? data.logoUrl : row.logoUrl,
          logoLoginUrl:
            data.logoLoginUrl !== undefined
              ? data.logoLoginUrl
              : row.logoLoginUrl,
          stampUrl: data.stampUrl !== undefined ? data.stampUrl : row.stampUrl,
          faviconUrl:
            data.faviconUrl !== undefined ? data.faviconUrl : row.faviconUrl,
          primaryColor:
            data.primaryColor !== undefined
              ? data.primaryColor
              : row.primaryColor,
          secondaryColor:
            data.secondaryColor !== undefined
              ? data.secondaryColor
              : row.secondaryColor,
          successColor:
            data.successColor !== undefined
              ? data.successColor
              : row.successColor,
          dangerColor:
            data.dangerColor !== undefined ? data.dangerColor : row.dangerColor,
          backgroundColor:
            data.backgroundColor !== undefined
              ? data.backgroundColor
              : row.backgroundColor,
          sidebarColor:
            data.sidebarColor !== undefined
              ? data.sidebarColor
              : row.sidebarColor,
        },
      });
      const newJson = JSON.stringify({
        appName: row.appName,
        logoUrl: row.logoUrl,
        primaryColor: row.primaryColor,
        successColor: row.successColor,
        dangerColor: row.dangerColor,
      });
      await this.audit.log({
        userId,
        action: 'UPDATE_APP_SETTINGS',
        entityType: 'AppSettings',
        entityId: row.id,
        oldValue: oldJson.slice(0, 500),
        newValue: newJson.slice(0, 500),
      });
    }
    return this.getSettings();
  }
}
