import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  private getUploadsDir(): string {
    const dir = path.join(process.cwd(), 'uploads', 'payslips');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  async calculatePreview(mois: number, annee: number) {
    const debut = new Date(annee, mois - 1, 1);
    const fin = new Date(annee, mois, 0, 23, 59, 59);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        statut: 'VALIDE',
        heureDepart: { not: null },
        date: { gte: debut, lte: fin },
      },
      include: {
        person: { include: { user: true, teacher: true } },
        course: {
          include: {
            ec: {
              include: {
                ue: {
                  include: {
                    maquette: {
                      include: { semestre: { include: { formation: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const tariffRates = await this.prisma.tariffRate.findMany({
      orderBy: { dateEffet: 'desc' },
    });
    const globalRate = tariffRates.find((r) => !r.formationId && !r.ecId);
    const getRatesForCourse = (
      ecId: string | null,
      formationId: string | null,
    ) => {
      const byEc = ecId ? tariffRates.find((r) => r.ecId === ecId) : null;
      const byFormation = formationId
        ? tariffRates.find((r) => r.formationId === formationId && !r.ecId)
        : null;
      const r = byEc ?? byFormation ?? globalRate;
      return r
        ? {
            tauxCm: r.tauxCm,
            tauxTd: r.tauxTd,
            tauxTp: r.tauxTp,
            tauxTpe: r.tauxTpe,
          }
        : { tauxCm: 0, tauxTd: 0, tauxTp: 0, tauxTpe: 0 };
    };

    interface TeacherRow {
      person: {
        matricule: string;
        user?: { firstName: string; lastName: string } | null;
        teacher?: unknown;
      };
      heuresCm: number;
      heuresTd: number;
      heuresTp: number;
      heuresTpe: number;
      montant: number;
    }
    const teachers = new Map<string, TeacherRow>();

    for (const a of attendances) {
      if (!a.person.teacher || !a.course || !a.heureDepart) continue;
      const key = a.personId;
      const formationId =
        a.course.ec?.ue?.maquette?.semestre?.formation?.id ?? null;
      const ecId = a.course.ec?.id ?? null;
      const rates = getRatesForCourse(ecId, formationId);
      const h =
        (a.heureDepart.getTime() - a.heureArrivee.getTime()) / (1000 * 60 * 60);
      const type = (a.course.type || 'CM').toUpperCase();
      const taux =
        type === 'CM'
          ? rates.tauxCm
          : type === 'TD'
            ? rates.tauxTd
            : type === 'TP'
              ? rates.tauxTp
              : type === 'TPE'
                ? rates.tauxTpe
                : rates.tauxCm;
      const montantSeance = h * taux;

      if (!teachers.has(key)) {
        teachers.set(key, {
          person: a.person,
          heuresCm: 0,
          heuresTd: 0,
          heuresTp: 0,
          heuresTpe: 0,
          montant: 0,
        });
      }
      const t = teachers.get(key)!;
      t.montant += montantSeance;
      if (type === 'CM') t.heuresCm += h;
      else if (type === 'TD') t.heuresTd += h;
      else if (type === 'TP') t.heuresTp += h;
      else if (type === 'TPE') t.heuresTpe += h;
      else t.heuresCm += h;
    }

    const result: Array<{
      personId: string;
      matricule: string;
      nom: string;
      heuresCm: number;
      heuresTd: number;
      heuresTp: number;
      heuresTpe: number;
      montant: number;
      tauxCm: number;
      tauxTd: number;
      tauxTp: number;
      tauxTpe: number;
    }> = [];

    for (const [personId, data] of teachers) {
      result.push({
        personId,
        matricule: data.person.matricule,
        nom: data.person.user
          ? `${data.person.user.firstName} ${data.person.user.lastName}`
          : data.person.matricule,
        heuresCm: Math.round(data.heuresCm * 100) / 100,
        heuresTd: Math.round(data.heuresTd * 100) / 100,
        heuresTp: Math.round(data.heuresTp * 100) / 100,
        heuresTpe: Math.round(data.heuresTpe * 100) / 100,
        montant: Math.round(data.montant * 100) / 100,
        tauxCm: globalRate?.tauxCm ?? 0,
        tauxTd: globalRate?.tauxTd ?? 0,
        tauxTp: globalRate?.tauxTp ?? 0,
        tauxTpe: globalRate?.tauxTpe ?? 0,
      });
    }

    return result.sort((a, b) => a.nom.localeCompare(b.nom));
  }

  async calculateAndSave(mois: number, annee: number) {
    const preview = await this.calculatePreview(mois, annee);
    const payrolls: Array<{ id: string; personId: string }> = [];

    for (const p of preview) {
      const payroll = await this.prisma.payroll.upsert({
        where: {
          personId_mois_annee: { personId: p.personId, mois, annee },
        },
        create: {
          personId: p.personId,
          mois,
          annee,
          heuresCm: p.heuresCm,
          heuresTd: p.heuresTd,
          heuresTp: p.heuresTp,
          heuresTpe: p.heuresTpe,
          montant: p.montant,
          statut: 'CALCULATED',
        },
        update: {
          heuresCm: p.heuresCm,
          heuresTd: p.heuresTd,
          heuresTp: p.heuresTp,
          heuresTpe: p.heuresTpe,
          montant: p.montant,
          statut: 'CALCULATED',
        },
      });
      payrolls.push({ id: payroll.id, personId: payroll.personId });
    }

    return this.findAll({ mois, annee });
  }

  async generateBulletins(mois: number, annee: number) {
    const payrolls = await this.prisma.payroll.findMany({
      where: { mois, annee, statut: 'CALCULATED' },
      include: {
        person: { include: { user: true } },
        paySlips: true,
      },
    });

    for (const payroll of payrolls) {
      if (payroll.paySlips.length > 0) continue;

      const pdfBuffer = await this.generateBulletinPdf(payroll);
      const filename = `bulletin-${payroll.person.matricule}-${annee}-${String(mois).padStart(2, '0')}.pdf`;
      const filepath = path.join(this.getUploadsDir(), filename);
      fs.writeFileSync(filepath, pdfBuffer);

      const relativePath = path.join('payslips', filename);
      await this.prisma.paySlip.create({
        data: { payrollId: payroll.id, fichierPath: relativePath },
      });
      await this.prisma.payroll.update({
        where: { id: payroll.id },
        data: { statut: 'GENERATED' },
      });
    }

    return this.findAll({ mois, annee });
  }

  private async generateBulletinPdf(payroll: {
    person: {
      matricule: string;
      user?: { firstName: string; lastName: string } | null;
    };
    mois: number;
    annee: number;
    heuresCm: number;
    heuresTd: number;
    heuresTp: number;
    heuresTpe: number;
    montant: number;
  }) {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([400, 500]);
    let y = 470;

    const drawText = (text: string, size = 12) => {
      page.drawText(text, { x: 50, y, size, font, color: rgb(0, 0, 0) });
      y -= size + 4;
    };

    const nom = payroll.person.user
      ? `${payroll.person.user.firstName} ${payroll.person.user.lastName}`
      : payroll.person.matricule;

    drawText('BULLETIN DE SALAIRE', 18);
    y -= 10;
    drawText(`Établissement : Gestion Scolaire`);
    drawText(`Période : ${payroll.mois}/${payroll.annee}`);
    drawText(`Employé : ${nom}`);
    drawText(`Matricule : ${payroll.person.matricule}`);
    drawText(`Mot de passe pour ouvrir : votre matricule`);
    y -= 15;
    drawText('Détail des heures :', 14);
    drawText(`  CM  : ${payroll.heuresCm.toFixed(2)} h`);
    drawText(`  TD  : ${payroll.heuresTd.toFixed(2)} h`);
    drawText(`  TP  : ${payroll.heuresTp.toFixed(2)} h`);
    drawText(`  TPE : ${payroll.heuresTpe.toFixed(2)} h`);
    y -= 10;
    drawText(`MONTANT NET : ${payroll.montant.toLocaleString()} FCFA`, 14);
    y -= 20;
    drawText(`Généré le ${new Date().toLocaleDateString('fr-FR')}`);

    return Buffer.from(await doc.save());
  }

  async findAll(filters?: {
    personId?: string;
    mois?: number;
    annee?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (filters?.personId) where.personId = filters.personId;
    if (filters?.mois) where.mois = filters.mois;
    if (filters?.annee) where.annee = filters.annee;

    return this.prisma.payroll.findMany({
      where,
      include: {
        person: { include: { user: true } },
        paySlips: true,
      },
      orderBy: [
        { annee: 'desc' },
        { mois: 'desc' },
        { person: { matricule: 'asc' } },
      ],
    });
  }

  async getMyPayrolls(userId: string, mois?: number, annee?: number) {
    const person = await this.prisma.person.findFirst({ where: { userId } });
    if (!person) return [];
    return this.findAll({ personId: person.id, mois, annee });
  }

  async downloadBulletin(userId: string, payrollId: string) {
    const person = await this.prisma.person.findFirst({ where: { userId } });
    if (!person) throw new NotFoundException('Profil non trouvé');

    const payroll = await this.prisma.payroll.findUnique({
      where: { id: payrollId },
      include: { person: true, paySlips: true },
    });
    if (!payroll) throw new NotFoundException('Paie non trouvée');
    if (payroll.personId !== person.id)
      throw new ForbiddenException('Accès refusé');

    const slip = payroll.paySlips[0];
    if (!slip) throw new NotFoundException('Bulletin non généré');

    const fullPath = path.join(process.cwd(), 'uploads', slip.fichierPath);
    if (!fs.existsSync(fullPath))
      throw new NotFoundException('Fichier introuvable');

    return fs.readFileSync(fullPath);
  }

  async downloadBulletinAdmin(payrollId: string) {
    const payroll = await this.prisma.payroll.findUnique({
      where: { id: payrollId },
      include: { paySlips: true },
    });
    if (!payroll) throw new NotFoundException('Paie non trouvée');

    const slip = payroll.paySlips[0];
    if (!slip) throw new NotFoundException('Bulletin non généré');

    const fullPath = path.join(process.cwd(), 'uploads', slip.fichierPath);
    if (!fs.existsSync(fullPath))
      throw new NotFoundException('Fichier introuvable');

    return fs.readFileSync(fullPath);
  }
}
