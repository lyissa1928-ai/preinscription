import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../prisma/prisma-client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

const BADGE_SECRET = process.env.BADGE_QR_SECRET || 'badge-qr-secret-dev';
const SALT_ROUNDS = 10;

export type UserCreateDto = {
  email: string;
  password?: string;
  role: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  maritalStatus?: string;
  numberOfChildren?: number;
  matricule?: string;
  phone?: string;
  address?: string;
  gender?: string;
  nationality?: string;
  service?: string;
  jobTitle?: string;
  contractType?: string;
  hireDate?: string;
  accountStatus?: string;
};

export type UserUpdateDto = Partial<
  Omit<UserCreateDto, 'password'> & { password?: string }
>;

const userSelect = {
  id: true,
  email: true,
  role: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  maritalStatus: true,
  numberOfChildren: true,
  matricule: true,
  phone: true,
  address: true,
  gender: true,
  nationality: true,
  service: true,
  jobTitle: true,
  contractType: true,
  hireDate: true,
  accountStatus: true,
  profilePhotoUrl: true,
  profileValidated: true,
  badgeBarcode: true,
  badgeActive: true,
  badgeQrVersion: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private getUploadDir() {
    const dir = path.join(process.cwd(), 'uploads', 'profiles');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  private generateBadgeBarcode(
    userId: string,
    matricule?: string | null,
  ): string {
    if (matricule?.trim()) return matricule.trim();
    return 'BDG-' + userId.slice(0, 8).toUpperCase();
  }

  /** Génère le prochain matricule PATS (PATS001, PATS002, …). */
  private async generateNextPatsMatricule(): Promise<string> {
    const users = await this.prisma.user.findMany({
      where: { matricule: { startsWith: 'PATS' } },
      select: { matricule: true },
    });
    let max = 0;
    for (const u of users) {
      const m = u.matricule;
      if (m && /^PATS\d{3}$/.test(m)) {
        const n = parseInt(m.slice(4), 10);
        if (n > max) max = n;
      }
    }
    const next = String(max + 1).padStart(3, '0');
    return `PATS${next}`;
  }

  /** Payload signé pour QR code : vérification d'authenticité */
  buildQrPayload(userId: string): string {
    const t = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({ userId, t });
    const sig = crypto
      .createHmac('sha256', BADGE_SECRET)
      .update(payload)
      .digest('hex')
      .slice(0, 16);
    return Buffer.from(JSON.stringify({ userId, t, sig })).toString(
      'base64url',
    );
  }

  /**
   * QR imprimé sur le PDF : jeton statique signé (GEST1.) — vérifiable serveur, invalidable par badgeQrVersion.
   */
  async buildBadgePdfQrPayload(userId: string): Promise<string> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { badgeActive: true, badgeQrVersion: true, accountStatus: true },
    });
    if (!u) throw new NotFoundException('Utilisateur non trouvé');
    if (!u.badgeActive)
      throw new BadRequestException(
        'Badge désactivé : régénération impossible tant que le badge est inactif.',
      );
    if (u.accountStatus !== 'ACTIF')
      throw new BadRequestException('Compte non actif.');
    const v = u.badgeQrVersion ?? 1;
    const body = JSON.stringify({ u: userId, v });
    const sig = crypto
      .createHmac('sha256', BADGE_SECRET)
      .update(body)
      .digest('hex')
      .slice(0, 24);
    const token = Buffer.from(
      JSON.stringify({ u: userId, v, s: sig }),
    ).toString('base64url');
    return `GEST1.${token}`;
  }

  /** Parse et vérifie la signature d’un jeton GEST1 (sans contrôle DB). */
  parseGest1BadgeToken(
    raw: string,
  ):
    | { ok: true; userId: string; version: number }
    | { ok: false; reason: string } {
    const trimmed = raw.trim();
    const enc = trimmed.startsWith('GEST1.') ? trimmed.slice(6) : trimmed;
    try {
      const obj = JSON.parse(Buffer.from(enc, 'base64url').toString()) as {
        u?: string;
        v?: number;
        s?: string;
      };
      if (!obj.u || obj.v == null || !obj.s)
        return { ok: false, reason: 'FORMAT' };
      const body = JSON.stringify({ u: obj.u, v: obj.v });
      const expected = crypto
        .createHmac('sha256', BADGE_SECRET)
        .update(body)
        .digest('hex')
        .slice(0, 24);
      if (obj.s !== expected) return { ok: false, reason: 'SIGNATURE' };
      return { ok: true, userId: obj.u, version: obj.v };
    } catch {
      return { ok: false, reason: 'PARSE' };
    }
  }

  async assertGest1BadgeTokenLive(
    userId: string,
    version: number,
  ): Promise<
    | { ok: true }
    | { ok: false; reason: 'USER' | 'DISABLED' | 'ACCOUNT' | 'REVOKED' }
  > {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { badgeActive: true, badgeQrVersion: true, accountStatus: true },
    });
    if (!user) return { ok: false, reason: 'USER' };
    if (!user.badgeActive) return { ok: false, reason: 'DISABLED' };
    if (user.accountStatus !== 'ACTIF') return { ok: false, reason: 'ACCOUNT' };
    if ((user.badgeQrVersion ?? 1) !== version)
      return { ok: false, reason: 'REVOKED' };
    return { ok: true };
  }

  async regenerateBadgeQr(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { badgeQrVersion: { increment: 1 } },
    });
    return this.findOne(userId);
  }

  async setBadgeActive(userId: string, active: boolean) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { badgeActive: active },
    });
    return this.findOne(userId);
  }

  /**
   * @deprecated Préférer `buildBadgePdfQrPayload` pour les PDF. Conservé pour liens profonds optionnels.
   */
  getBadgePresenceQrContent(user: {
    id: string;
    role: string;
    person: { type: string } | null;
  }): string {
    const base = (
      process.env.BADGE_APP_BASE_URL ||
      process.env.FRONTEND_URL ||
      ''
    )
      .trim()
      .replace(/\/$/, '');
    const isTeacher =
      user.role === 'TEACHER' || user.person?.type === 'TEACHER';
    const isStudent =
      user.role === 'STUDENT' || user.person?.type === 'STUDENT';
    if (base) {
      if (isTeacher) {
        return `${base}/dashboard/enseignant/pointage?from=badge`;
      }
      if (isStudent) {
        return `${base}/dashboard/etudiant?from=badge`;
      }
      return `${base}/dashboard?from=badge`;
    }
    return this.buildQrPayload(user.id);
  }

  async findOne(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    return user;
  }

  verifyQrPayload(qrPayload: string): { userId: string; valid: boolean } {
    try {
      const decoded = JSON.parse(
        Buffer.from(qrPayload, 'base64url').toString(),
      );
      const { userId, t, sig } = decoded;
      if (!userId || !t || !sig) return { userId: '', valid: false };
      const payload = JSON.stringify({ userId, t });
      const expected = crypto
        .createHmac('sha256', BADGE_SECRET)
        .update(payload)
        .digest('hex')
        .slice(0, 16);
      if (sig !== expected) return { userId: '', valid: false };
      const maxAge = 60 * 60 * 24; // 24h
      if (Math.floor(Date.now() / 1000) - t > maxAge)
        return { userId: '', valid: false };
      return { userId, valid: true };
    } catch {
      return { userId: '', valid: false };
    }
  }

  async createUser(dto: UserCreateDto) {
    if (!dto.email?.trim()) throw new BadRequestException("L'email est requis");
    if (!dto.firstName?.trim())
      throw new BadRequestException('Le prénom est requis');
    if (!dto.lastName?.trim())
      throw new BadRequestException('Le nom est requis');
    if (!dto.role?.trim()) throw new BadRequestException('Le rôle est requis');
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.trim() },
    });
    if (existing) throw new ConflictException('Cet email est déjà utilisé');
    const phoneNorm = dto.phone?.trim() || undefined;
    const dateBirthNorm = dto.dateOfBirth
      ? new Date(dto.dateOfBirth)
      : undefined;
    if (
      dto.firstName?.trim() &&
      dto.lastName?.trim() &&
      dateBirthNorm &&
      phoneNorm
    ) {
      const duplicate = await this.prisma.user.findFirst({
        where: {
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          dateOfBirth: dateBirthNorm,
          phone: phoneNorm,
        },
      });
      if (duplicate) {
        throw new ConflictException(
          'Un utilisateur avec le même nom, prénom, date de naissance et numéro de téléphone existe déjà.',
        );
      }
    }
    const matricule = await this.generateNextPatsMatricule();
    const passwordToUse = dto.password?.trim() || matricule;
    try {
      const passwordHash = await bcrypt.hash(passwordToUse, SALT_ROUNDS);
      const user = await this.prisma.user.create({
        data: {
          email: dto.email.trim(),
          passwordHash,
          role: dto.role.trim(),
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          maritalStatus: dto.maritalStatus ?? undefined,
          numberOfChildren: dto.numberOfChildren ?? undefined,
          matricule,
          phone: dto.phone?.trim() ?? undefined,
          address: dto.address?.trim() ?? undefined,
          gender: dto.gender?.trim() || undefined,
          nationality: dto.nationality?.trim() || undefined,
          service: dto.service?.trim() || undefined,
          jobTitle: dto.jobTitle?.trim() || undefined,
          contractType: dto.contractType?.trim() || undefined,
          hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
          accountStatus: dto.accountStatus?.trim() || undefined,
        },
        select: userSelect,
      });
      return user;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002')
          throw new ConflictException('Email ou matricule déjà utilisé');
        if (e.code === 'P2003')
          throw new BadRequestException('Référence invalide');
      }
      throw new InternalServerErrorException(
        e instanceof Error
          ? e.message
          : 'Erreur lors de la création du compte. Vérifiez que la base est à jour (npx prisma db push).',
      );
    }
  }

  async updateUser(userId: string, dto: UserUpdateDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing) throw new ConflictException('Cet email est déjà utilisé');
    }
    if (dto.matricule != null && dto.matricule !== user.matricule) {
      const existing = await this.prisma.user.findFirst({
        where: { matricule: dto.matricule },
      });
      if (existing)
        throw new ConflictException('Ce matricule est déjà utilisé');
    }
    const updateData: {
      firstName?: string;
      lastName?: string;
      role?: string;
      email?: string;
      passwordHash?: string;
      dateOfBirth?: Date | null;
      maritalStatus?: string | null;
      numberOfChildren?: number | null;
      matricule?: string | null;
      phone?: string | null;
      address?: string | null;
      gender?: string | null;
      nationality?: string | null;
      service?: string | null;
      jobTitle?: string | null;
      contractType?: string | null;
      hireDate?: Date | null;
      accountStatus?: string | null;
    } = {};
    if (dto.firstName != null) updateData.firstName = dto.firstName;
    if (dto.lastName != null) updateData.lastName = dto.lastName;
    if (dto.role != null) updateData.role = dto.role;
    if (dto.email != null) updateData.email = dto.email;
    if (dto.dateOfBirth != null)
      updateData.dateOfBirth = dto.dateOfBirth
        ? new Date(dto.dateOfBirth)
        : null;
    if (dto.maritalStatus !== undefined)
      updateData.maritalStatus = dto.maritalStatus || null;
    if (dto.numberOfChildren !== undefined)
      updateData.numberOfChildren = dto.numberOfChildren;
    if (dto.matricule !== undefined)
      updateData.matricule = dto.matricule || null;
    if (dto.phone !== undefined) updateData.phone = dto.phone || null;
    if (dto.address !== undefined) updateData.address = dto.address || null;
    if (dto.gender !== undefined) updateData.gender = dto.gender || null;
    if (dto.nationality !== undefined)
      updateData.nationality = dto.nationality || null;
    if (dto.service !== undefined) updateData.service = dto.service || null;
    if (dto.jobTitle !== undefined) updateData.jobTitle = dto.jobTitle || null;
    if (dto.contractType !== undefined)
      updateData.contractType = dto.contractType || null;
    if (dto.hireDate !== undefined)
      updateData.hireDate = dto.hireDate ? new Date(dto.hireDate) : null;
    if (dto.accountStatus !== undefined)
      updateData.accountStatus = dto.accountStatus || null;
    if (dto.password?.trim()) {
      updateData.passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: userSelect,
    });
    if (
      user.profileValidated &&
      (dto.role != null ||
        dto.firstName != null ||
        dto.lastName != null ||
        dto.matricule !== undefined)
    ) {
      await this.ensureBadgeBarcode(updated.id);
    }
    return updated;
  }

  async setProfileValidated(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('Utilisateur non trouvé');
      await this.ensureBadgeBarcode(userId);
      return await this.prisma.user.update({
        where: { id: userId },
        data: { profileValidated: true },
        select: userSelect,
      });
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025')
          throw new NotFoundException('Utilisateur non trouvé');
      }
      throw new InternalServerErrorException(
        e instanceof Error
          ? e.message
          : 'Erreur lors de la validation. Vérifiez que la base est à jour (npx prisma db push).',
      );
    }
  }

  private async ensureBadgeBarcode(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { badgeBarcode: true, matricule: true },
    });
    if (!user) return;
    const barcode = this.generateBadgeBarcode(userId, user.matricule);
    if (user.badgeBarcode === barcode) return;
    await this.prisma.user.update({
      where: { id: userId },
      data: { badgeBarcode: barcode },
    });
  }

  async uploadProfilePhoto(
    userId: string,
    file: { buffer: Buffer; originalname?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    const ext = path.extname(file.originalname || '') || '.jpg';
    const filename = `${userId}${ext}`;
    const dir = this.getUploadDir();
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, file.buffer);
    const profilePhotoUrl = `/uploads/profiles/${filename}`;
    await this.prisma.user.update({
      where: { id: userId },
      data: { profilePhotoUrl },
    });
    return { profilePhotoUrl };
  }

  async getBadgeData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        profilePhotoUrl: true,
        badgeBarcode: true,
        badgeActive: true,
        badgeQrVersion: true,
        accountStatus: true,
        profileValidated: true,
        matricule: true,
        jobTitle: true,
        hireDate: true,
        dateOfBirth: true,
        person: {
          select: {
            type: true,
            matricule: true,
            dateNaissance: true,
            teacher: { select: { typeContrat: true } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    if (!user.profileValidated || !user.badgeBarcode) {
      throw new BadRequestException('Profil non validé ou badge non généré');
    }
    let qrPayload = '';
    if (user.badgeActive !== false && user.accountStatus === 'ACTIF') {
      try {
        qrPayload = await this.buildBadgePdfQrPayload(user.id);
      } catch {
        qrPayload = this.buildQrPayload(user.id);
      }
    }
    const appearance = await this.prisma.appSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    const now = new Date();
    const y = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    const annéeUniv = `${y}–${y + 1}`;
    let presenceQrContent: string;
    try {
      presenceQrContent = await this.buildBadgePdfQrPayload(user.id);
    } catch {
      presenceQrContent = this.getBadgePresenceQrContent({
        id: user.id,
        role: user.role,
        person: user.person,
      });
    }
    return {
      ...user,
      qrPayload,
      presenceQrContent,
      annéeUniv,
      appName: appearance?.appName ?? null,
      logoUrl: appearance?.logoUrl ?? null,
      primaryColor: appearance?.primaryColor ?? null,
      websiteUrl: appearance?.websiteUrl ?? null,
    };
  }

  async verifyBadge(qrPayload: string) {
    const gest = this.parseGest1BadgeToken(qrPayload);
    if (gest.ok) {
      const live = await this.assertGest1BadgeTokenLive(
        gest.userId,
        gest.version,
      );
      if (live.ok === true) {
        const user = await this.prisma.user.findUnique({
          where: { id: gest.userId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            matricule: true,
            profilePhotoUrl: true,
            badgeActive: true,
          },
        });
        return { valid: true, user, reason: null as string | null };
      }
      return { valid: false, user: null, reason: live.reason };
    }
    const { userId, valid } = this.verifyQrPayload(qrPayload);
    if (!valid || !userId) {
      return { valid: false, user: null, reason: 'LEGACY_INVALID' };
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        matricule: true,
        profilePhotoUrl: true,
        badgeActive: true,
      },
    });
    return { valid: true, user, reason: null };
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      throw new BadRequestException(
        'Impossible de supprimer un compte administrateur.',
      );
    }
    await this.prisma.user.delete({ where: { id: userId } });
    return { success: true };
  }

  async deleteMany(userIds: string[]) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new BadRequestException('Aucun utilisateur à supprimer.');
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, role: true },
    });
    const protectedIds = users
      .filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN')
      .map((u) => u.id);
    if (protectedIds.length > 0) {
      throw new BadRequestException(
        'Impossible de supprimer un ou plusieurs comptes administrateurs. Veuillez les désélectionner.',
      );
    }
    await this.prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
    return { success: true, count: userIds.length };
  }
}
