import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/email.service';
import type { UserDTO, AuthTokens, UserRole } from '@agriculture/shared';
import type { LoginInput, RegisterInput } from '@agriculture/shared';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly email: EmailService
  ) {}

  async register(input: RegisterInput): Promise<AuthTokens & { user: UserDTO }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_EXISTS',
        message: "Cet email est déjà utilisé",
      });
    }

    const passwordHash = await argon2.hash(input.password);
    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        role: input.role as string,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role as UserRole);
    await this.saveRefreshToken(user.id, tokens.refreshToken, (tokens as AuthTokens & { _jti?: string })._jti!);

    const { _jti, ...out } = tokens as AuthTokens & { _jti?: string };
    return { ...out, user: this.toUserDTO(user) };
  }

  async login(input: LoginInput): Promise<AuthTokens & { user: UserDTO }> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Email ou mot de passe incorrect',
      });
    }

    const valid = await argon2.verify(user.passwordHash, input.password);
    if (!valid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Email ou mot de passe incorrect',
      });
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role as UserRole);
    await this.saveRefreshToken(user.id, tokens.refreshToken, (tokens as AuthTokens & { _jti?: string })._jti!);

    const { _jti, ...out } = tokens as AuthTokens & { _jti?: string };
    return { ...out, user: this.toUserDTO(user) };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    if (!refreshToken) {
      throw new BadRequestException({
        code: 'REFRESH_TOKEN_REQUIRED',
        message: 'Refresh token manquant',
      });
    }

    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret');
    let payload: { sub: string; jti: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, { secret: refreshSecret });
      if (!payload?.sub || !payload?.jti) throw new Error('Invalid payload');
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token invalide ou expiré',
      });
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { jti: payload.jti },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token invalide ou expiré',
      });
    }

    const valid = await argon2.verify(stored.tokenHash, refreshToken);
    if (!valid) {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token invalide',
      });
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.generateTokens(
      stored.user.id,
      stored.user.email,
      stored.user.role as UserRole
    );
    await this.saveRefreshToken(stored.user.id, tokens.refreshToken, (tokens as AuthTokens & { _jti?: string })._jti!);

    const { _jti, ...out } = tokens as AuthTokens & { _jti?: string };
    return out;
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret');
    try {
      const payload = await this.jwt.verifyAsync(refreshToken, { secret: refreshSecret });
      if (payload?.jti) {
        await this.prisma.refreshToken.updateMany({
          where: { jti: payload.jti },
          data: { revokedAt: new Date() },
        });
      }
    } catch {
      // Token invalid/expired - nothing to revoke
    }
  }

  async me(userId: string): Promise<UserDTO | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    return user ? this.toUserDTO(user) : null;
  }

  async forgotPassword(email: string): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    // Toujours retourner success pour ne pas révéler si l'email existe
    if (!user || !user.isActive) {
      return { success: true };
    }

    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const resetLink = `${appUrl}/auth/reset-password?token=${token}`;
    await this.email.sendPasswordResetEmail(user.email, resetLink);

    return { success: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException({
        code: 'INVALID_OR_EXPIRED_TOKEN',
        message: 'Lien invalide ou expiré. Veuillez demander un nouveau lien.',
      });
    }

    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { success: true };
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: UserRole,
    jti?: string
  ): Promise<AuthTokens> {
    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET', 'dev-secret');
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret');
    const accessExpires = this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    const refreshExpires = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');

    const refreshJti = jti ?? randomUUID();
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: userId, email, role },
        { secret: accessSecret, expiresIn: accessExpires }
      ),
      this.jwt.signAsync(
        { sub: userId, jti: refreshJti, type: 'refresh' },
        { secret: refreshSecret, expiresIn: refreshExpires }
      ),
    ]);

    const expiresIn = this.parseExpiresToSeconds(accessExpires);

    return { accessToken, refreshToken, expiresIn, _jti: refreshJti } as AuthTokens & { _jti: string };
  }

  private parseExpiresToSeconds(expires: string): number {
    const match = expires.match(/^(\d+)([smhd])$/);
    if (!match) return 900;
    const [, num, unit] = match;
    const n = parseInt(num!, 10);
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return n * (multipliers[unit!] || 60);
  }

  private async saveRefreshToken(userId: string, token: string, jti: string): Promise<void> {
    const refreshExpires = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const tokenHash = await argon2.hash(token);

    const expiresAt = new Date();
    const match = refreshExpires.match(/^(\d+)([smhd])$/);
    if (match) {
      const [, num, unit] = match;
      const n = parseInt(num!, 10);
      const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
      expiresAt.setTime(expiresAt.getTime() + n * (multipliers[unit!] || 60000));
    } else {
      expiresAt.setDate(expiresAt.getDate() + 7);
    }

    await this.prisma.refreshToken.create({
      data: { jti, userId, tokenHash, expiresAt },
    });
  }

  private toUserDTO(user: { id: string; email: string; role: string; isActive: boolean; createdAt: Date; updatedAt: Date }): UserDTO {
    return {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
