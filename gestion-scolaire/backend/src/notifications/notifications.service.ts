import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    userId: string;
    type: string;
    message: string;
    entityId?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        message: data.message,
        entityId: data.entityId,
      },
    });
  }

  async notifyRole(
    role: string,
    type: string,
    message: string,
    entityId?: string,
    excludeSuperAdmin = false,
  ) {
    const roles = excludeSuperAdmin
      ? [role, 'ADMIN']
      : [role, 'SUPER_ADMIN', 'ADMIN'];
    const users = await this.prisma.user.findMany({
      where: { role: { in: roles } },
      select: { id: true },
    });
    await Promise.all(
      users.map((u) => this.create({ userId: u.id, type, message, entityId })),
    );
  }

  async findForUser(userId: string, unreadOnly?: boolean) {
    const where: { userId: string; lu?: boolean } = { userId };
    if (unreadOnly) where.lu = false;
    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async countUnread(userId: string) {
    return this.prisma.notification.count({
      where: { userId, lu: false },
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { lu: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId },
      data: { lu: true },
    });
  }
}
