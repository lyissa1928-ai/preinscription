import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getEffectifs(anneeUniv?: number) {
    const year = anneeUniv ?? new Date().getFullYear();
    const inscriptions = await this.prisma.inscription.findMany({
      where: { anneeUniv: year, statut: { not: 'ANNULEE' } },
      include: { formation: true },
    });
    const byFormation = new Map<
      string,
      { code: string; nom: string; count: number }
    >();
    for (const i of inscriptions) {
      const key = i.formationId;
      if (!byFormation.has(key)) {
        byFormation.set(key, {
          code: i.formation.code,
          nom: i.formation.nom,
          count: 0,
        });
      }
      byFormation.get(key)!.count++;
    }
    return {
      anneeUniv: year,
      total: inscriptions.length,
      parFormation: Array.from(byFormation.values()).sort(
        (a, b) => b.count - a.count,
      ),
    };
  }

  async getRecettes(annee?: number) {
    const year = annee ?? new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);
    const payments = await this.prisma.payment.findMany({
      where: { statut: 'VALIDATED', datePaiement: { gte: start, lte: end } },
    });
    const total = payments.reduce((s, p) => s + p.montant, 0);
    const byType = new Map<string, number>();
    for (const p of payments) {
      byType.set(p.type, (byType.get(p.type) ?? 0) + p.montant);
    }
    return {
      annee: year,
      total,
      parType: Object.fromEntries(byType),
      nbTransactions: payments.length,
    };
  }

  async getTauxReussite(anneeUniv?: number, session?: number) {
    const year = anneeUniv ?? new Date().getFullYear();
    const sess = session ?? 1;
    const grades = await this.prisma.grade.findMany({
      where: { anneeUniv: year, session: sess },
      include: {
        ec: {
          include: {
            ue: { include: { maquette: { include: { semestre: true } } } },
          },
        },
      },
    });
    const total = grades.length;
    const reussis = grades.filter((g) => g.note >= 10).length;
    const byFormation = new Map<string, { total: number; reussis: number }>();
    for (const g of grades) {
      const fid = g.ec.ue.maquette.semestre.formationId;
      if (!byFormation.has(fid)) byFormation.set(fid, { total: 0, reussis: 0 });
      const b = byFormation.get(fid)!;
      b.total++;
      if (g.note >= 10) b.reussis++;
    }
    return {
      anneeUniv: year,
      session: sess,
      global: {
        total,
        reussis,
        taux: total > 0 ? Math.round((reussis / total) * 1000) / 10 : 0,
      },
      parFormation: Array.from(byFormation.entries()).map(([id, v]) => ({
        formationId: id,
        ...v,
        taux: v.total > 0 ? Math.round((v.reussis / v.total) * 1000) / 10 : 0,
      })),
    };
  }

  async getSynthese(anneeUniv?: number) {
    const [effectifs, recettes, tauxReussite] = await Promise.all([
      this.getEffectifs(anneeUniv),
      this.getRecettes(anneeUniv ?? new Date().getFullYear()),
      this.getTauxReussite(anneeUniv),
    ]);
    return { effectifs, recettes, tauxReussite };
  }

  async exportPdf(anneeUniv?: number): Promise<Buffer> {
    const synth = await this.getSynthese(anneeUniv);
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([400, 600]);
    let y = 570;

    const draw = (text: string, size = 12) => {
      page.drawText(text, { x: 50, y, size, font, color: rgb(0, 0, 0) });
      y -= size + 4;
    };

    draw('RAPPORT DE SYNTHÈSE', 18);
    y -= 10;
    draw(`Année : ${synth.effectifs.anneeUniv}`);
    draw(`Généré le ${new Date().toLocaleDateString('fr-FR')}`);
    y -= 15;
    draw('Effectifs', 14);
    draw(`Total inscrits : ${synth.effectifs.total}`);
    synth.effectifs.parFormation.forEach((f) =>
      draw(`  ${f.code} : ${f.count}`),
    );
    y -= 10;
    draw('Recettes', 14);
    draw(`Total : ${synth.recettes.total.toLocaleString()} FCFA`);
    draw(`Transactions : ${synth.recettes.nbTransactions}`);
    y -= 10;
    draw('Taux de réussite', 14);
    draw(
      `Global : ${synth.tauxReussite.global.taux}% (${synth.tauxReussite.global.reussis}/${synth.tauxReussite.global.total})`,
    );

    return Buffer.from(await doc.save());
  }

  async exportCsv(anneeUniv?: number): Promise<string> {
    const [effectifs, recettes, taux] = await Promise.all([
      this.getEffectifs(anneeUniv),
      this.getRecettes(anneeUniv ?? new Date().getFullYear()),
      this.getTauxReussite(anneeUniv),
    ]);
    let csv = 'Rapport;Valeur\n';
    csv += `Année;${effectifs.anneeUniv}\n`;
    csv += `Effectifs total;${effectifs.total}\n`;
    effectifs.parFormation.forEach((f) => {
      csv += `Effectifs ${f.code};${f.count}\n`;
    });
    csv += `Recettes total;${recettes.total}\n`;
    csv += `Taux réussite;${taux.global.taux}%\n`;
    return csv;
  }

  async exportExcel(anneeUniv?: number): Promise<Buffer> {
    const XLSX = require('xlsx');
    const [effectifs, recettes, taux] = await Promise.all([
      this.getEffectifs(anneeUniv),
      this.getRecettes(anneeUniv ?? new Date().getFullYear()),
      this.getTauxReussite(anneeUniv),
    ]);
    const rows: (string | number)[][] = [
      ['Rapport', 'Valeur'],
      ['Année', effectifs.anneeUniv],
      ['Effectifs total', effectifs.total],
      ...effectifs.parFormation.map((f) => [`Effectifs ${f.code}`, f.count]),
      ['Recettes total', recettes.total],
      ['Taux réussite', `${taux.global.taux}%`],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Synthèse');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  /** Tableau de bord pédagogie : KPIs réels + activités du jour + alertes + mon campus si rattaché */
  async getPedagogyDashboard(anneeUniv?: number, userId?: string) {
    const year = anneeUniv ?? new Date().getFullYear();
    const now = new Date();
    const jourSemaine = now.getDay();
    const jour = jourSemaine >= 1 && jourSemaine <= 5 ? jourSemaine : null;

    const [
      cohortsCount,
      coursesCount,
      teachersWithCourses,
      sallesAll,
      coursesToday,
      pendingGradeRequests,
      cohortsWithSchedules,
      cohortsTotal,
      monCampusRaw,
    ] = await Promise.all([
      this.prisma.cohort.count(),
      this.prisma.course.count({ where: { anneeUniv: year } }),
      this.prisma.course.findMany({
        where: { anneeUniv: year },
        select: { teacherId: true },
        distinct: ['teacherId'],
      }),
      this.prisma.salle.findMany({ select: { id: true }, where: {} }),
      jour
        ? this.prisma.course.findMany({
            where: { anneeUniv: year, jour },
            include: {
              ec: { select: { code: true, nom: true } },
              teacher: { include: { person: { include: { user: true } } } },
              salle: {
                include: { campus: { select: { id: true, nom: true } } },
              },
              cohort: { select: { nom: true } },
            },
            orderBy: [{ heureDebut: 'asc' }],
          })
        : Promise.resolve([]),
      this.prisma.gradeModificationRequest.count({
        where: { statut: 'PENDING' },
      }),
      this.prisma.schedule.findMany({
        where: { anneeUniv: year },
        select: { cohortId: true },
        distinct: ['cohortId'],
      }),
      this.prisma.cohort.count(),
      userId
        ? this.prisma.campus.findFirst({
            where: {
              OR: [
                { responsablePedagogiqueId: userId },
                { agentPedagogiqueId: userId },
              ],
            },
            include: {
              _count: { select: { salles: true, cohorts: true } },
            },
          })
        : Promise.resolve(null),
    ]);

    const sallesOccupeesToday = new Set(coursesToday.map((c) => c.salleId))
      .size;
    const totalSalles = sallesAll.length;
    const sallesDisponibles = Math.max(0, totalSalles - sallesOccupeesToday);
    const tauxOccupation =
      totalSalles > 0 ? sallesOccupeesToday / totalSalles : 0;

    const cohortIdsWithSchedule = new Set(
      cohortsWithSchedules.map((s) => s.cohortId),
    );
    const classesSansEdt = cohortsTotal - cohortIdsWithSchedule.size;

    const activitesDuJour = coursesToday.map((c) => ({
      id: c.id,
      heureDebut: c.heureDebut,
      heureFin: c.heureFin,
      classe: c.cohort?.nom ?? '—',
      cours: c.ec?.code ?? c.ec?.nom ?? '—',
      enseignant: c.teacher?.person?.user
        ? `${c.teacher.person.user.firstName} ${c.teacher.person.user.lastName}`
        : null,
      salle: c.salle?.nom ?? null,
      campus: c.salle?.campus?.nom ?? null,
      campusId: c.salle?.campus?.id ?? null,
    }));

    let monCampus: {
      id: string;
      code: string;
      nom: string;
      nbSalles: number;
      nbCohortes: number;
      seancesAujourdHui: number;
      activitesDuJour: typeof activitesDuJour;
    } | null = null;
    if (monCampusRaw) {
      const activitesCampus = activitesDuJour.filter(
        (a) => a.campusId === monCampusRaw.id,
      );
      monCampus = {
        id: monCampusRaw.id,
        code: monCampusRaw.code,
        nom: monCampusRaw.nom,
        nbSalles: monCampusRaw._count.salles,
        nbCohortes: monCampusRaw._count.cohorts,
        seancesAujourdHui: activitesCampus.length,
        activitesDuJour: activitesCampus.map(
          ({ campusId: _c, ...rest }) => rest,
        ),
      };
    }

    return {
      anneeUniv: year,
      statsGenerales: {
        classesActives: cohortsCount,
        enseignantsActifs: teachersWithCourses.length,
        coursProgrammes: coursesCount,
        seancesAujourdHui: coursesToday.length,
        sallesOccupees: sallesOccupeesToday,
        sallesDisponibles,
        tauxOccupation,
      },
      activitesDuJour: activitesDuJour.map(({ campusId: _c, ...rest }) => rest),
      alertes: {
        demandesModificationNotesEnAttente: pendingGradeRequests,
        classesSansEdt,
      },
      monCampus,
    };
  }
}
