import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceService } from '../finance/finance.service';
import { PersonsService } from '../persons/persons.service';

const JOURS_COURS = [
  '',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
];

@Injectable()
export class StudentsService {
  constructor(
    private prisma: PrismaService,
    private finance: FinanceService,
    private personsService: PersonsService,
  ) {}

  private async getStudentPerson(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { person: true },
    });
    if (!user || !user.person)
      throw new NotFoundException('Profil étudiant non trouvé');
    if (user.person.type !== 'STUDENT')
      throw new ForbiddenException('Accès réservé aux étudiants');
    return user.person;
  }

  async getProformaInvoice(userId: string, anneeUniv?: number) {
    const person = await this.getStudentPerson(userId);
    const year = anneeUniv ?? new Date().getFullYear();

    const inscription = await this.prisma.inscription.findUnique({
      where: { personId_anneeUniv: { personId: person.id, anneeUniv: year } },
      include: {
        formation: true,
        semestre: true,
        person: { include: { user: true } },
      },
    });
    if (!inscription || inscription.statut === 'ANNULEE') {
      throw new NotFoundException('Aucune inscription active pour cette année');
    }

    const feeConfig = await this.prisma.feeConfig.findUnique({
      where: {
        formationId_anneeUniv: {
          formationId: inscription.formationId,
          anneeUniv: year,
        },
      },
    });
    if (!feeConfig)
      throw new NotFoundException('Configuration tarifaire non trouvée');

    let totalDu = feeConfig.fraisInscription;
    const sem = inscription.semestre;
    if (inscription.formation.cycle === 'L' && sem && sem.numero >= 6)
      totalDu += feeConfig.fraisSoutenanceL3;
    if (inscription.formation.cycle === 'M' && sem && sem.numero >= 10)
      totalDu += feeConfig.fraisSoutenanceM2;
    totalDu += feeConfig.mensualite * feeConfig.nbMois;

    const settings = await this.prisma.appSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    const establishment =
      settings?.appName?.trim() ||
      process.env.ESTABLISHMENT_NAME?.trim() ||
      'Établissement';
    const primary = this.parseHexRgb(settings?.primaryColor) ?? [
      0.15, 0.4, 0.85,
    ];
    const secondary = this.parseHexRgb(settings?.secondaryColor) ?? [
      0.4, 0.45, 0.5,
    ];
    const primaryRgb = rgb(primary[0], primary[1], primary[2]);
    const secondaryRgb = rgb(secondary[0], secondary[1], secondary[2]);
    const mutedText = rgb(0.25, 0.28, 0.32);

    const W = 595;
    const H = 842;
    const margin = 48;
    const headerH = 78;

    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const page = doc.addPage([W, H]);

    page.drawRectangle({
      x: 0,
      y: H - headerH,
      width: W,
      height: headerH,
      color: primaryRgb,
    });

    const tryEmbed = async (
      url: string | null | undefined,
      maxW: number,
      maxH: number,
    ) => {
      if (!url?.trim()) return null;
      const rel = url.startsWith('/') ? url.slice(1) : url;
      const fp = path.join(process.cwd(), rel);
      if (!fs.existsSync(fp)) return null;
      const buf = fs.readFileSync(fp);
      try {
        let img;
        try {
          img = await doc.embedPng(buf);
        } catch {
          img = await doc.embedJpg(buf);
        }
        let w = maxW;
        let h = (img.height / img.width) * w;
        if (h > maxH) {
          h = maxH;
          w = (img.width / img.height) * h;
        }
        return { img, w, h };
      } catch {
        return null;
      }
    };

    const logo = await tryEmbed(settings?.logoUrl, 56, 52);
    const logoX = margin - 8;
    const logoY = H - headerH + (headerH - (logo?.h ?? 0)) / 2;
    if (logo) {
      page.drawImage(logo.img, {
        x: logoX,
        y: logoY,
        width: logo.w,
        height: logo.h,
      });
    }

    const headerTextStart = logo ? logoX + logo.w + 16 : margin;
    const headerTitle = this.fitPdfLine(
      establishment,
      W - headerTextStart - margin,
      15,
      fontBold,
    );
    const titleW = fontBold.widthOfTextAtSize(headerTitle, 15);
    const titleX =
      headerTextStart +
      Math.max(0, (W - headerTextStart - margin - titleW) / 2);
    page.drawText(headerTitle, {
      x: titleX,
      y: H - 32,
      size: 15,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    const sub = settings?.websiteUrl?.trim();
    if (sub) {
      const wl = this.fitPdfLine(
        sub.replace(/^https?:\/\//i, ''),
        W - headerTextStart - margin,
        8,
        font,
      );
      const wwl = font.widthOfTextAtSize(wl, 8);
      page.drawText(wl, {
        x:
          headerTextStart +
          Math.max(0, (W - headerTextStart - margin - wwl) / 2),
        y: H - 50,
        size: 8,
        font,
        color: rgb(0.92, 0.94, 1),
      });
    }

    page.drawText('FACTURE PROFORMA', {
      x: margin,
      y: H - headerH - 28,
      size: 20,
      font: fontBold,
      color: primaryRgb,
    });
    page.drawText('Document informatif — non valant facture définitive', {
      x: margin,
      y: H - headerH - 44,
      size: 9,
      font,
      color: mutedText,
    });

    let y = H - headerH - 72;
    const line = (
      text: string,
      size = 11,
      bold = false,
      color = rgb(0, 0, 0),
    ) => {
      const f = bold ? fontBold : font;
      page.drawText(text, { x: margin, y, size, font: f, color });
      y -= size + 5;
    };

    line(
      `Date : ${new Date().toLocaleDateString('fr-FR')}`,
      10,
      false,
      mutedText,
    );
    y -= 4;
    line(
      `Étudiant : ${inscription.person.user ? `${inscription.person.user.firstName} ${inscription.person.user.lastName}` : inscription.person.matricule}`,
    );
    line(`Matricule : ${inscription.person.matricule}`);
    line(
      `Formation : ${inscription.formation.code} - ${inscription.formation.nom}`,
    );
    line(`Année universitaire : ${year}`);
    y -= 8;

    page.drawRectangle({
      x: margin,
      y: y - 4,
      width: W - 2 * margin,
      height: 2,
      color: secondaryRgb,
    });
    y -= 18;

    line('Détail des frais', 13, true, primaryRgb);
    line(
      `  • Frais d'inscription : ${feeConfig.fraisInscription.toLocaleString('fr-FR')} FCFA`,
    );
    line(
      `  • Mensualités (${feeConfig.nbMois} × ${feeConfig.mensualite.toLocaleString('fr-FR')}) : ${(feeConfig.mensualite * feeConfig.nbMois).toLocaleString('fr-FR')} FCFA`,
    );
    if (
      feeConfig.fraisSoutenanceL3 > 0 &&
      inscription.formation.cycle === 'L' &&
      sem &&
      sem.numero >= 6
    ) {
      line(
        `  • Frais soutenance L3 : ${feeConfig.fraisSoutenanceL3.toLocaleString('fr-FR')} FCFA`,
      );
    }
    if (
      feeConfig.fraisSoutenanceM2 > 0 &&
      inscription.formation.cycle === 'M' &&
      sem &&
      sem.numero >= 10
    ) {
      line(
        `  • Frais soutenance M2 : ${feeConfig.fraisSoutenanceM2.toLocaleString('fr-FR')} FCFA`,
      );
    }
    y -= 10;

    const totalBandH = 38;
    const bandBottom = y;
    page.drawRectangle({
      x: margin,
      y: bandBottom - totalBandH,
      width: W - 2 * margin,
      height: totalBandH,
      color: rgb(
        Math.min(1, primary[0] * 0.1 + 0.9),
        Math.min(1, primary[1] * 0.1 + 0.9),
        Math.min(1, primary[2] * 0.1 + 0.9),
      ),
    });
    page.drawText(`TOTAL : ${totalDu.toLocaleString('fr-FR')} FCFA`, {
      x: margin + 12,
      y: bandBottom - totalBandH + 11,
      size: 14,
      font: fontBold,
      color: primaryRgb,
    });
    y = bandBottom - totalBandH - 28;

    const stamp = await tryEmbed(settings?.stampUrl, 120, 100);
    if (stamp) {
      const stampX = W - margin - stamp.w;
      const stampY = 112;
      page.drawText('Cachet de l’établissement', {
        x: stampX,
        y: stampY + stamp.h + 6,
        size: 8,
        font,
        color: mutedText,
      });
      page.drawImage(stamp.img, {
        x: stampX,
        y: stampY,
        width: stamp.w,
        height: stamp.h,
      });
    }

    page.drawText(establishment, {
      x: margin,
      y: 42,
      size: 9,
      font: fontBold,
      color: mutedText,
    });

    return Buffer.from(await doc.save());
  }

  private parseHexRgb(
    hex: string | null | undefined,
  ): [number, number, number] | null {
    if (!hex?.trim()) return null;
    const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  private fitPdfLine(
    text: string,
    maxWidthPt: number,
    size: number,
    f: { widthOfTextAtSize: (s: string, z: number) => number },
  ): string {
    const t = text.trim() || '—';
    if (f.widthOfTextAtSize(t, size) <= maxWidthPt) return t;
    const ell = '…';
    for (let n = t.length - 1; n >= 1; n--) {
      const s = `${t.slice(0, n)}${ell}`;
      if (f.widthOfTextAtSize(s, size) <= maxWidthPt) return s;
    }
    return ell;
  }

  async getCertificate(userId: string, anneeUniv?: number) {
    const person = await this.getStudentPerson(userId);
    const year = anneeUniv ?? new Date().getFullYear();

    const statut = await this.finance.getStatutFinancier(person.id, year);
    if (!statut.enRegle) {
      throw new ForbiddenException(
        `Certificat non disponible : ${statut.raison}`,
      );
    }

    const inscription = await this.prisma.inscription.findUnique({
      where: { personId_anneeUniv: { personId: person.id, anneeUniv: year } },
      include: {
        formation: true,
        semestre: true,
        person: { include: { user: true } },
      },
    });
    if (!inscription || inscription.statut === 'ANNULEE') {
      throw new NotFoundException('Aucune inscription active');
    }

    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([400, 400]);
    let y = 370;

    const drawText = (text: string, size = 12) => {
      page.drawText(text, { x: 50, y, size, font, color: rgb(0, 0, 0) });
      y -= size + 6;
    };

    drawText('CERTIFICAT DE SCOLARITÉ', 18);
    y -= 15;
    drawText('Le soussigné certifie que :');
    drawText(
      `${inscription.person.user ? `${inscription.person.user.firstName} ${inscription.person.user.lastName}` : inscription.person.matricule}`,
    );
    drawText(`Matricule : ${inscription.person.matricule}`);
    drawText(
      `est régulièrement inscrit(e) en ${inscription.formation.nom} (${inscription.formation.code})`,
    );
    drawText(`pour l\'année universitaire ${year}.`);
    y -= 20;
    drawText(
      `Fait à _______________, le ${new Date().toLocaleDateString('fr-FR')}`,
    );
    drawText('Cachet et signature');

    return Buffer.from(await doc.save());
  }

  async getStatutFinancier(userId: string, anneeUniv?: number) {
    const person = await this.getStudentPerson(userId);
    const year = anneeUniv ?? new Date().getFullYear();
    return this.finance.getStatutFinancier(person.id, year);
  }

  async getReceipts(userId: string) {
    const person = await this.getStudentPerson(userId);

    const payments = await this.prisma.payment.findMany({
      where: { personId: person.id, statut: 'VALIDATED' },
      include: { inscription: { include: { formation: true } } },
      orderBy: { datePaiement: 'desc' },
    });

    return payments.map((p) => ({
      id: p.id,
      montant: p.montant,
      type: p.type,
      datePaiement: p.datePaiement,
      formation: p.inscription.formation.code,
      mois: p.mois,
      annee: p.annee,
    }));
  }

  async getReceiptPdf(userId: string, paymentId: string) {
    const person = await this.getStudentPerson(userId);

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        inscription: { include: { formation: true } },
        person: { include: { user: true } },
      },
    });
    if (!payment) throw new NotFoundException('Paiement non trouvé');
    if (payment.personId !== person.id)
      throw new ForbiddenException('Accès refusé');
    if (payment.statut !== 'VALIDATED')
      throw new ForbiddenException(
        'Reçu disponible uniquement pour les paiements validés',
      );

    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([400, 350]);
    let y = 320;

    const drawText = (text: string, size = 12) => {
      page.drawText(text, { x: 50, y, size, font, color: rgb(0, 0, 0) });
      y -= size + 6;
    };

    drawText('REÇU DE PAIEMENT', 18);
    y -= 15;
    drawText(`Reçu n° ${payment.id.slice(-8).toUpperCase()}`);
    drawText(
      `Date : ${new Date(payment.datePaiement).toLocaleDateString('fr-FR')}`,
    );
    drawText(
      `Étudiant : ${payment.person.user ? `${payment.person.user.firstName} ${payment.person.user.lastName}` : payment.person.matricule}`,
    );
    drawText(`Matricule : ${payment.person.matricule}`);
    drawText(`Formation : ${payment.inscription.formation.code}`);
    drawText(
      `Type : ${payment.type}${payment.mois && payment.annee ? ` (${payment.mois}/${payment.annee})` : ''}`,
    );
    drawText(`Montant : ${payment.montant.toLocaleString()} FCFA`);
    y -= 15;
    drawText('Paiement validé.');

    return Buffer.from(await doc.save());
  }

  /** PDF fiche d'inscription (même document que celui généré côté scolarité). */
  async getMyFicheInscriptionPdf(userId: string): Promise<Buffer> {
    const person = await this.getStudentPerson(userId);
    return this.personsService.generateFicheInscriptionPdf(person.id);
  }

  /**
   * Synthèse tableau de bord : inscription, finances, notes, emploi du temps (cours du semestre),
   * activités pédagogiques listées pour l'étudiant connecté.
   */
  async getStudentDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { person: { include: { student: true } } },
    });
    if (
      !user?.person ||
      user.person.type !== 'STUDENT' ||
      !user.person.student
    ) {
      throw new NotFoundException('Profil étudiant non trouvé');
    }
    const person = user.person;
    const st = person.student;
    const comptePedagogiqueActif =
      st.statutInscription === 'valide' && user.accountStatus === 'ACTIF';

    const inscription = await this.prisma.inscription.findFirst({
      where: { personId: person.id, statut: { not: 'ANNULEE' } },
      orderBy: { anneeUniv: 'desc' },
      include: {
        formation: { include: { filiere: true } },
        cohort: true,
        campus: true,
        semestre: true,
        maquette: { select: { code: true } },
      },
    });

    const anneeUniv = inscription?.anneeUniv ?? new Date().getFullYear();

    const [grades, courses, finance, recuCount, feeConfig, recentGrades] =
      await Promise.all([
        this.prisma.grade.findMany({
          where: { personId: person.id, anneeUniv },
          include: { ec: { select: { code: true, nom: true } } },
        }),
        inscription
          ? this.prisma.course.findMany({
              where: {
                anneeUniv,
                ec: {
                  ue: { maquette: { semestreId: inscription.semestreId } },
                },
              },
              include: {
                ec: { select: { code: true, nom: true } },
                salle: { select: { nom: true } },
                teacher: {
                  include: {
                    person: {
                      include: {
                        user: { select: { firstName: true, lastName: true } },
                      },
                    },
                  },
                },
              },
              orderBy: [{ jour: 'asc' }, { heureDebut: 'asc' }],
            })
          : Promise.resolve([]),
        this.finance.getStatutFinancier(person.id, anneeUniv),
        this.prisma.payment.count({
          where: { personId: person.id, statut: 'VALIDATED' },
        }),
        inscription
          ? this.prisma.feeConfig.findUnique({
              where: {
                formationId_anneeUniv: {
                  formationId: inscription.formationId,
                  anneeUniv,
                },
              },
            })
          : Promise.resolve(null),
        this.prisma.grade.findMany({
          where: { personId: person.id },
          orderBy: { dateSaisie: 'desc' },
          take: 6,
          include: { ec: { select: { code: true, nom: true } } },
        }),
      ]);

    let gte10 = 0;
    let b810 = 0;
    let lt8 = 0;
    for (const g of grades) {
      if (g.note >= 10) gte10 += 1;
      else if (g.note >= 8) b810 += 1;
      else lt8 += 1;
    }

    const dow = new Date().getDay();
    const todayJour = dow >= 1 && dow <= 5 ? dow : null;
    const prochainsCours =
      todayJour != null
        ? courses.filter((c) => c.jour === todayJour).length
        : courses.length;

    const proformaDispo = feeConfig ? 1 : 0;
    const certificatDispo = finance.enRegle ? 1 : 0;
    const documentsDisponibles = recuCount + proformaDispo + certificatDispo;

    const statutPaiement = finance.enRegle
      ? 'À jour'
      : (finance.raison ?? 'À régulariser').slice(0, 48);

    const emploiDuTemps = courses.slice(0, 14).map((c) => ({
      type: 'cours' as const,
      titre: `${c.ec.code} (${c.type})`,
      sousTitre: `${JOURS_COURS[c.jour]} ${c.heureDebut}h–${c.heureFin}h · ${c.salle.nom}`,
      detail: c.teacher?.person?.user
        ? `Intervenant : ${c.teacher.person.user.firstName} ${c.teacher.person.user.lastName}`
        : undefined,
    }));

    const notesActivites = recentGrades.map((g) => ({
      type: 'note' as const,
      titre: `Note publiée : ${g.ec.code}`,
      sousTitre: `${g.ec.nom} — ${g.note}/20 (session ${g.session}, ${g.anneeUniv})`,
      detail: undefined as string | undefined,
    }));

    const activitesPedagogiques = [...emploiDuTemps, ...notesActivites];

    return {
      comptePedagogiqueActif,
      statutDossier: st.statutInscription,
      inscription: inscription
        ? {
            formation: inscription.formation.nom,
            formationCode: inscription.formation.code,
            filiere: inscription.formation.filiere?.nom ?? null,
            cohorte: inscription.cohort
              ? `${inscription.cohort.nom}${inscription.cohort.section ? ` — ${inscription.cohort.section}` : ''}`.trim()
              : null,
            campus: inscription.campus?.nom ?? null,
            anneeUniv,
            semestre: inscription.semestre.numero,
            maquette: inscription.maquette?.code ?? null,
            statutIns: inscription.statut,
          }
        : null,
      kpis: {
        documentsDisponibles,
        notesPubliees: grades.length,
        prochainsCours,
        statutPaiement,
      },
      notesRepartition: [
        { name: '≥ 10', value: gte10 },
        { name: '8–10', value: b810 },
        { name: '< 8', value: lt8 },
      ],
      documentsRepartition: [
        { name: 'Reçus', value: recuCount },
        { name: 'Proforma', value: proformaDispo },
        { name: 'Certificat', value: certificatDispo },
      ],
      activitesPedagogiques,
    };
  }
}
