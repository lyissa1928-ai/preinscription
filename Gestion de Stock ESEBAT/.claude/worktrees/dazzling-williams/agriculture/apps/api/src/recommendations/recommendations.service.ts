import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RecommendationEngine } from './recommendation.engine';
import type { RecommendationDTO } from '@agriculture/shared';

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly engine: RecommendationEngine,
    private readonly config: ConfigService,
  ) {}

  private getThreshold(): number {
    return this.config.get<number>('RECO_THRESHOLD', 60);
  }

  async run(
    userId: string,
    parcelId: string,
    seasonOverride: 'DRY' | 'RAINY' | null,
    historyDays: number,
    isAdmin: boolean,
  ) {
    try {
      const result = await this.engine.run(
        parcelId,
        userId,
        seasonOverride,
        historyDays,
        this.getThreshold(),
        isAdmin,
      );
      return result;
    } catch (e) {
      if (e instanceof Error) {
        if (e.message === 'PARCEL_NOT_FOUND') {
          throw new NotFoundException({
            code: 'PARCEL_NOT_FOUND',
            message: 'Parcelle non trouvée',
          });
        }
        if (e.message === 'PARCEL_OWNERSHIP_DENIED') {
          throw new ForbiddenException({
            code: 'PARCEL_OWNERSHIP_DENIED',
            message: 'Vous n\'avez pas accès à cette parcelle',
          });
        }
      }
      throw e;
    }
  }

  async listByParcel(
    userId: string,
    parcelId: string,
    page: number,
    limit: number,
    isAdmin: boolean,
  ): Promise<{ data: RecommendationDTO[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const { data, meta } = await this.engine.listByParcel(
      userId,
      parcelId,
      page,
      limit,
      isAdmin,
    );
    return { data, meta };
  }

  async listAll(
    userId: string,
    page: number,
    limit: number,
    isAdmin: boolean,
  ): Promise<{ data: RecommendationDTO[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const { data, meta } = await this.engine.listAll(
      userId,
      page,
      limit,
      isAdmin,
    );
    return { data, meta };
  }

  async getOne(
    userId: string,
    recommendationId: string,
    isAdmin: boolean,
  ): Promise<RecommendationDTO> {
    return this.engine.getOne(userId, recommendationId, isAdmin);
  }
}
