import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DeviceTokenService {
  constructor(private prisma: PrismaService) {}

  hashToken(plain: string): string {
    return createHash('sha256').update(plain, 'utf8').digest('hex');
  }

  async validateToken(plainToken: string): Promise<boolean> {
    if (!plainToken?.trim()) return false;
    const hash = this.hashToken(plainToken.trim());
    const row = await this.prisma.deviceToken.findFirst({
      where: { tokenHash: hash, isActive: true },
    });
    return !!row;
  }
}
