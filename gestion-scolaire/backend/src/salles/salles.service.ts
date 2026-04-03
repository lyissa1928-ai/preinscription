import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SallesService {
  constructor(private prisma: PrismaService) {}

  async findAll(campusId?: string) {
    const where = campusId ? { campusId } : {};
    return this.prisma.salle.findMany({
      where,
      orderBy: { nom: 'asc' },
      include: { campus: true },
    });
  }

  async findOne(id: string) {
    const s = await this.prisma.salle.findUnique({
      where: { id },
      include: { campus: true },
    });
    if (!s) throw new NotFoundException('Salle non trouvée');
    return s;
  }

  async create(data: {
    nom: string;
    code?: string;
    capacite?: number;
    campusId?: string;
    typeSalle?: string;
    equipements?: string;
  }) {
    const exists = await this.prisma.salle.findFirst({
      where: {
        nom: data.nom,
        campusId: data.campusId ?? null,
      },
    });
    if (exists)
      throw new ConflictException(
        `Une salle "${data.nom}" existe déjà sur ce campus`,
      );
    return this.prisma.salle.create({
      data: {
        nom: data.nom,
        code: data.code,
        capacite: data.capacite ?? 30,
        campusId: data.campusId ?? null,
        typeSalle: data.typeSalle ?? null,
        equipements: data.equipements ?? null,
      },
      include: { campus: true },
    });
  }

  async update(
    id: string,
    data: Partial<{
      nom: string;
      code: string;
      capacite: number;
      campusId: string;
      typeSalle: string;
      equipements: string;
    }>,
  ) {
    const existing = await this.prisma.salle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Salle non trouvée');
    if (data.nom != null || data.campusId != null) {
      const nom = data.nom ?? existing.nom;
      const campusId =
        data.campusId !== undefined ? data.campusId : existing.campusId;
      const exists = await this.prisma.salle.findFirst({
        where: { nom, campusId: campusId ?? null, NOT: { id } },
      });
      if (exists)
        throw new ConflictException(
          `Une salle "${nom}" existe déjà sur ce campus`,
        );
    }
    return this.prisma.salle.update({
      where: { id },
      data,
      include: { campus: true },
    });
  }

  async delete(id: string) {
    return this.prisma.salle.delete({ where: { id } });
  }

  /**
   * Import par lot : le campus doit exister et être indiqué une fois (pas de « chambre sans maison »).
   * Les éventuelles colonnes campusCode dans les lignes sont ignorées.
   */
  async bulkCreate(
    campusId: string,
    items: Array<{
      nom: string;
      code?: string;
      capacite?: number;
      campusCode?: string;
      typeSalle?: string;
      equipements?: string;
    }>,
  ) {
    const id = campusId?.trim();
    if (!id) {
      throw new BadRequestException(
        'Indiquez le campus cible : créez le campus dans « Campus » si besoin, puis sélectionnez-le avant l’import des salles.',
      );
    }
    const campus = await this.prisma.campus.findUnique({ where: { id } });
    if (!campus) {
      throw new BadRequestException(
        `Campus introuvable (id: ${id}). Créez le campus ou choisissez un campus existant.`,
      );
    }
    const created: unknown[] = [];
    const errors: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      try {
        const s = await this.create({
          nom: it.nom,
          code: it.code,
          capacite: it.capacite,
          campusId: id,
          typeSalle: it.typeSalle,
          equipements: it.equipements,
        });
        created.push(s);
      } catch (e) {
        errors.push(
          `Ligne ${i + 2}: ${e instanceof Error ? e.message : 'Erreur'}`,
        );
      }
    }
    return {
      created: created.length,
      errors,
      campusCode: campus.code,
      campusNom: campus.nom,
    };
  }

  async bulkUpdate(
    items: Array<
      { id: string } & Partial<{
        nom: string;
        code: string;
        capacite: number;
        campusId: string;
        typeSalle: string;
        equipements: string;
      }>
    >,
  ) {
    let updated = 0;
    const errors: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const { id, ...data } = items[i];
      try {
        await this.update(id, data);
        updated++;
      } catch (e) {
        errors.push(
          `Ligne ${i + 1}: ${e instanceof Error ? e.message : 'Erreur'}`,
        );
      }
    }
    return { updated, errors };
  }

  async bulkDelete(ids: string[]) {
    const r = await this.prisma.salle.deleteMany({
      where: { id: { in: ids } },
    });
    return { deleted: r.count };
  }

  getTemplateCsv(): string {
    const BOM = '\uFEFF';
    const header = 'nom;code;capacite;typeSalle;equipements';
    return (
      BOM + header + '\nSalle 101;S101;30;Amphi;Vidéoprojecteur, Tableau\n'
    );
  }

  getTemplateExcel(): Buffer {
    const XLSX = require('xlsx');
    const headers = ['nom', 'code', 'capacite', 'typeSalle', 'equipements'];
    const rows = [
      headers,
      ['Salle 101', 'S101', 30, 'Amphi', 'Vidéoprojecteur, Tableau'],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Salles');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
