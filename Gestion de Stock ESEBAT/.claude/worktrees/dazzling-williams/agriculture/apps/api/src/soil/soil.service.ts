import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SoilProfileDTO } from '@agriculture/shared';

interface UpdateSoilInput {
  ph?: number | null;
  soilMoisture?: number | null;
  salinity?: number | null;
}

@Injectable()
export class SoilService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureParcelOwnership(userId: string, parcelId: string): Promise<void> {
    const farm = await this.prisma.farm.findUnique({ where: { userId } });
    if (!farm) {
      throw new NotFoundException({
        code: 'FARM_NOT_FOUND',
        message: 'Exploitation non trouvée',
      });
    }
    const parcel = await this.prisma.parcel.findFirst({
      where: { id: parcelId, farmId: farm.id, deletedAt: null },
    });
    if (!parcel) {
      throw new NotFoundException({
        code: 'PARCEL_NOT_FOUND',
        message: 'Parcelle non trouvée',
      });
    }
  }

  async get(userId: string, parcelId: string): Promise<SoilProfileDTO> {
    await this.ensureParcelOwnership(userId, parcelId);
    const profile = await this.prisma.parcelSoilProfile.findUnique({
      where: { parcelId },
    });
    if (!profile) {
      return {
        parcelId,
        ph: null,
        soilMoisture: null,
        salinity: null,
        updatedAt: new Date().toISOString(),
      };
    }
    return {
      parcelId,
      ph: profile.ph,
      soilMoisture: profile.soilMoisture,
      salinity: profile.salinity,
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  async upsert(
    userId: string,
    parcelId: string,
    input: UpdateSoilInput,
  ): Promise<SoilProfileDTO> {
    await this.ensureParcelOwnership(userId, parcelId);
    const existing = await this.prisma.parcelSoilProfile.findUnique({
      where: { parcelId },
    });

    const data = {
      ph: input.ph !== undefined ? input.ph : existing?.ph ?? null,
      soilMoisture:
        input.soilMoisture !== undefined ? input.soilMoisture : existing?.soilMoisture ?? null,
      salinity: input.salinity !== undefined ? input.salinity : existing?.salinity ?? null,
    };

    const profile = existing
      ? await this.prisma.parcelSoilProfile.update({
          where: { parcelId },
          data,
        })
      : await this.prisma.parcelSoilProfile.create({
          data: { parcelId, ...data },
        });

    return {
      parcelId: profile.parcelId,
      ph: profile.ph,
      soilMoisture: profile.soilMoisture,
      salinity: profile.salinity,
      updatedAt: profile.updatedAt.toISOString(),
    };
  }
}
