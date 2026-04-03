import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DISABLE'
  | 'ENABLE'
  | 'DELETE'
  | 'VERSION_CREATE'
  | 'PASSWORD_RESET';

export type AuditEntity =
  | 'User'
  | 'Region'
  | 'Crop'
  | 'CropRequirement'
  | 'AlertRule'
  | 'Sensor';

export interface AuditLogInput {
  actorId: string | null;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string | null;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  diff?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    const metadata: Record<string, unknown> = {};
    if (input.before && Object.keys(input.before).length > 0) {
      metadata.before = this.truncateMetadata(input.before);
    }
    if (input.after && Object.keys(input.after).length > 0) {
      metadata.after = this.truncateMetadata(input.after);
    }
    if (input.diff && Object.keys(input.diff).length > 0) {
      metadata.diff = this.truncateMetadata(input.diff);
    }

    await this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }

  private truncateMetadata(obj: Record<string, unknown>, maxSize = 2000): Record<string, unknown> {
    const str = JSON.stringify(obj);
    if (str.length <= maxSize) return obj;
    return { _truncated: true, _size: str.length, _preview: str.slice(0, 500) };
  }
}
