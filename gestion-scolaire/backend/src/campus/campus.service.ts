import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../prisma/prisma-client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CampusService {
  private readonly logger = new Logger(CampusService.name);

  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.campus.findMany({
      orderBy: { code: 'asc' },
      include: { _count: { select: { salles: true } } },
    });
  }

  async findOne(id: string) {
    const c = await this.prisma.campus.findUnique({
      where: { id },
      include: { salles: true },
    });
    if (!c) throw new NotFoundException('Campus non trouvé');
    return c;
  }

  async create(data: {
    code: string;
    nom: string;
    adresse?: string;
    region?: string;
    departement?: string;
    commune?: string;
    telDirection?: string;
  }) {
    if (!data?.code?.trim())
      throw new BadRequestException('Le code du campus est obligatoire.');
    if (!data?.nom?.trim())
      throw new BadRequestException('Le nom du campus est obligatoire.');
    const payload = {
      code: data.code.trim(),
      nom: data.nom.trim(),
      adresse: data.adresse?.trim() || null,
      region: data.region?.trim() || null,
      departement: data.departement?.trim() || null,
      commune: data.commune?.trim() || null,
      telDirection: data.telDirection?.trim() || null,
    };
    const exists = await this.prisma.campus.findUnique({
      where: { code: payload.code },
    });
    if (exists)
      throw new ConflictException(
        `Un campus avec le code ${payload.code} existe déjà`,
      );
    try {
      return await this.prisma.campus.create({ data: payload });
    } catch (e) {
      this.logger.warn('Campus create failed', e);
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002')
          throw new ConflictException('Un campus avec ce code existe déjà.');
        if (e.code === 'P2003')
          throw new BadRequestException('Référence invalide.');
      }
      throw e;
    }
  }

  async update(
    id: string,
    data: Partial<{
      code: string;
      nom: string;
      adresse: string;
      region: string;
      departement: string;
      commune: string;
      telDirection: string;
      responsablePedagogiqueId: string | null;
      agentPedagogiqueId: string | null;
    }>,
  ) {
    const existing = await this.prisma.campus.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Campus non trouvé');
    if (data.code && data.code !== existing.code) {
      const exists = await this.prisma.campus.findUnique({
        where: { code: data.code },
      });
      if (exists)
        throw new ConflictException(
          `Un campus avec le code ${data.code} existe déjà`,
        );
    }

    const scalarFields = [
      'code',
      'nom',
      'adresse',
      'region',
      'departement',
      'commune',
      'telDirection',
    ] as const;
    const updateData: Record<string, unknown> = {};
    for (const key of scalarFields) {
      if (data[key] !== undefined) {
        const v = data[key];
        (updateData as Record<string, string | null>)[key] =
          typeof v === 'string' ? v.trim() || null : (v ?? null);
      }
    }
    if (data.responsablePedagogiqueId !== undefined) {
      const val = data.responsablePedagogiqueId?.trim() || null;
      updateData.responsablePedagogique = val
        ? { connect: { id: val } }
        : { disconnect: true };
    }
    if (data.agentPedagogiqueId !== undefined) {
      const val = data.agentPedagogiqueId?.trim() || null;
      updateData.agentPedagogique = val
        ? { connect: { id: val } }
        : { disconnect: true };
    }

    return this.prisma.campus.update({ where: { id }, data: updateData });
  }

  async delete(id: string) {
    const c = await this.prisma.campus.findUnique({
      where: { id },
      include: { _count: { select: { salles: true } } },
    });
    if (!c) throw new NotFoundException('Campus non trouvé');
    if (c._count.salles > 0) {
      throw new ConflictException(
        "Impossible de supprimer un campus qui possède des salles. Réaffectez ou supprimez les salles d'abord.",
      );
    }
    return this.prisma.campus.delete({ where: { id } });
  }
}
