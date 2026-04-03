import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { AppearanceService } from '../appearance/appearance.service';
import { PrismaService } from '../prisma/prisma.service';
import { CoursesService } from './courses.service';

const JOURS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const ROW_HOURS = Array.from({ length: 15 }, (_, i) => 8 + i); // 8 … 22

type CourseRow = Awaited<ReturnType<CoursesService['findAll']>>[number];

function parseHexColor(hex: string | null | undefined): {
  r: number;
  g: number;
  b: number;
} {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
    return { r: 0.12, g: 0.31, b: 0.62 };
  }
  const raw = hex.replace(/^#/, '').replace(/[^0-9a-fA-F]/g, '');
  const n = parseInt(
    raw.length >= 6 ? raw.slice(0, 6) : raw.padEnd(6, '0'),
    16,
  );
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  };
}

function hexToDocxFill(hex: string | null | undefined): string {
  if (!hex || !hex.startsWith('#')) return '1F4E79';
  return hex
    .replace(/^#/, '')
    .replace(/[^0-9a-fA-F]/g, '')
    .slice(0, 6)
    .padEnd(6, '0');
}

function userFullName(
  u: { firstName?: string | null; lastName?: string | null } | null | undefined,
): string {
  if (!u) return '';
  const t = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
  return t;
}

function teacherLabel(c: CourseRow): string {
  const p = c.teacher?.person;
  if (p?.user) return userFullName(p.user) || p.matricule || '—';
  return p?.matricule || '—';
}

function safeFilenamePart(s: string): string {
  return s.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40) || 'campus';
}

@Injectable()
export class EdtExportService {
  constructor(
    private prisma: PrismaService,
    private appearance: AppearanceService,
    private coursesService: CoursesService,
  ) {}

  private async loadContext(
    campusId: string,
    anneeUniv: number,
    teacherId?: string,
  ) {
    const campus = await this.prisma.campus.findUnique({
      where: { id: campusId },
      include: {
        responsablePedagogique: true,
        agentPedagogique: true,
      },
    });
    if (!campus) throw new NotFoundException('Campus introuvable');
    const settings = await this.appearance.getSettings();
    const courseList = await this.coursesService.findAll({
      campusId,
      anneeUniv,
      teacherId: teacherId || undefined,
    });
    return { campus, settings, courseList };
  }

  private cellCourse(
    jour: number,
    hourRow: number,
    courseList: CourseRow[],
  ): CourseRow | undefined {
    return courseList.find(
      (c) => c.jour === jour && c.heureDebut <= hourRow && c.heureFin > hourRow,
    );
  }

  private formatCellText(c: CourseRow | undefined, hourRow: number): string {
    if (!c || c.heureDebut !== hourRow) return '';
    const lines = [
      `${c.ec.code} (${c.type})`,
      `${c.heureDebut}h–${c.heureFin}h`,
      c.ec.nom.length > 42 ? `${c.ec.nom.slice(0, 40)}…` : c.ec.nom,
      `Salle : ${c.salle.nom}`,
      `Ens. : ${teacherLabel(c)}`,
    ];
    if (c.groupe) lines.push(`Groupe : ${c.groupe}`);
    return lines.join('\n');
  }

  /** Cellule EDT enseignant : inclut le campus (plusieurs sites sur un même tableau). */
  private formatCellTextTeacher(
    c: CourseRow | undefined,
    hourRow: number,
  ): string {
    if (!c || c.heureDebut !== hourRow) return '';
    const campusNom = c.salle?.campus?.nom || c.salle?.campus?.code || '—';
    const lines = [
      `${c.ec.code} (${c.type})`,
      `${c.heureDebut}h–${c.heureFin}h`,
      `Campus : ${campusNom}`,
      c.ec.nom.length > 34 ? `${c.ec.nom.slice(0, 32)}…` : c.ec.nom,
      `Salle : ${c.salle.nom}`,
    ];
    if (c.groupe) lines.push(`Groupe : ${c.groupe}`);
    return lines.join('\n');
  }

  private async tryLoadLogoBuffer(
    logoUrl: string | null | undefined,
  ): Promise<Buffer | null> {
    if (!logoUrl?.trim()) return null;
    const rel = logoUrl.startsWith('/') ? logoUrl.slice(1) : logoUrl;
    const fsPath = path.join(process.cwd(), rel);
    if (!fs.existsSync(fsPath)) return null;
    try {
      return fs.readFileSync(fsPath);
    } catch {
      return null;
    }
  }

  async buildCampusPdf(
    campusId: string,
    anneeUniv: number,
    teacherId?: string,
  ): Promise<Buffer> {
    const { campus, settings, courseList } = await this.loadContext(
      campusId,
      anneeUniv,
      teacherId,
    );
    const doc = await PDFDocument.create();
    const page = doc.addPage([842, 595]); // A4 paysage
    const { width, height } = page.getSize();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const primary = parseHexColor(settings.primaryColor);
    const margin = 40;
    const establishment = settings.appName?.trim() || 'Établissement';
    const anneeScolaire = `${anneeUniv} – ${anneeUniv + 1}`;

    let y = height - margin;

    const logoBuf = await this.tryLoadLogoBuffer(settings.logoUrl);
    let logoW = 0;
    let logoH = 0;
    if (logoBuf) {
      try {
        let embedded;
        try {
          embedded = await doc.embedPng(logoBuf);
        } catch {
          embedded = await doc.embedJpg(logoBuf);
        }
        logoW = 56;
        logoH = (embedded.height / embedded.width) * logoW;
        page.drawImage(embedded, {
          x: margin,
          y: y - logoH,
          width: logoW,
          height: logoH,
        });
      } catch {
        /* logo non PNG/JPG ou fichier illisible */
      }
    }

    const titleX = margin + (logoW > 0 ? logoW + 16 : 0);
    page.drawText(establishment, {
      x: titleX,
      y: y - 14,
      size: 14,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(`Campus : ${campus.nom} (${campus.code})`, {
      x: titleX,
      y: y - 30,
      size: 11,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    page.drawText(`Année universitaire : ${anneeScolaire}`, {
      x: titleX,
      y: y - 44,
      size: 10,
      font,
      color: rgb(0.25, 0.25, 0.25),
    });
    const respName =
      userFullName(campus.responsablePedagogique) ||
      'Non renseigné (à définir sur la fiche campus)';
    page.drawText(`Responsable pédagogique : ${respName}`, {
      x: titleX,
      y: y - 58,
      size: 9,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    if (campus.adresse) {
      page.drawText(`Adresse : ${campus.adresse}`, {
        x: titleX,
        y: y - 72,
        size: 8,
        font,
        color: rgb(0.35, 0.35, 0.35),
      });
    }

    y -= Math.max(logoH, 78) + 8;

    const bandH = 22;
    page.drawRectangle({
      x: margin,
      y: y - bandH,
      width: width - 2 * margin,
      height: bandH,
      color: rgb(primary.r, primary.g, primary.b),
    });
    page.drawText('EMPLOI DU TEMPS DU CAMPUS', {
      x: margin + 8,
      y: y - 15,
      size: 12,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    y -= bandH + 12;

    const tableLeft = margin;
    const tableW = width - 2 * margin;
    const timeColW = 44;
    const dayColW = (tableW - timeColW) / 6;
    const rowH = 36;
    const headerH = 22;

    page.drawRectangle({
      x: tableLeft,
      y: y - headerH,
      width: timeColW,
      height: headerH,
      borderColor: rgb(0.4, 0.4, 0.4),
      borderWidth: 0.5,
      color: rgb(0.92, 0.92, 0.94),
    });
    page.drawText('Heure', {
      x: tableLeft + 6,
      y: y - 14,
      size: 8,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    for (let d = 0; d < 6; d++) {
      const x = tableLeft + timeColW + d * dayColW;
      page.drawRectangle({
        x,
        y: y - headerH,
        width: dayColW,
        height: headerH,
        borderColor: rgb(0.4, 0.4, 0.4),
        borderWidth: 0.5,
        color: rgb(0.92, 0.92, 0.94),
      });
      const label = JOURS[d + 1];
      page.drawText(label, {
        x: x + 4,
        y: y - 14,
        size: 8,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
    }
    y -= headerH;

    for (const h of ROW_HOURS) {
      page.drawRectangle({
        x: tableLeft,
        y: y - rowH,
        width: timeColW,
        height: rowH,
        borderColor: rgb(0.55, 0.55, 0.55),
        borderWidth: 0.4,
      });
      page.drawText(`${h}h`, {
        x: tableLeft + 6,
        y: y - rowH + 12,
        size: 8,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
      for (let d = 0; d < 6; d++) {
        const jour = d + 1;
        const x = tableLeft + timeColW + d * dayColW;
        page.drawRectangle({
          x,
          y: y - rowH,
          width: dayColW,
          height: rowH,
          borderColor: rgb(0.55, 0.55, 0.55),
          borderWidth: 0.4,
        });
        const c = this.cellCourse(jour, h, courseList);
        const text = this.formatCellText(c, h);
        if (text) {
          const lines = text.split('\n');
          let ly = y - 10;
          for (const line of lines.slice(0, 5)) {
            page.drawText(line.length > 48 ? `${line.slice(0, 46)}…` : line, {
              x: x + 3,
              y: ly,
              size: 6.2,
              font,
              color: rgb(0, 0, 0),
            });
            ly -= 8;
          }
        }
      }
      y -= rowH;
    }

    y -= 10;
    const agentName = userFullName(campus.agentPedagogique);
    const footerLines = [
      `Document généré le ${new Date().toLocaleString('fr-FR')}`,
      agentName ? `Agent pédagogique (référence) : ${agentName}` : null,
      `Chaque campus dispose de son propre emploi du temps — export filtré sur ce campus.`,
    ].filter(Boolean) as string[];
    for (const line of footerLines) {
      page.drawText(line, {
        x: margin,
        y: y,
        size: 7,
        font,
        color: rgb(0.35, 0.35, 0.35),
      });
      y -= 10;
    }

    const pdfBytes = await doc.save();
    return Buffer.from(pdfBytes);
  }

  /** PDF emploi du temps personnel : tous les cours de l’enseignant, tous campus confondus. */
  async buildTeacherEdtPdf(userId: string, anneeUniv: number): Promise<Buffer> {
    const person = await this.prisma.person.findFirst({
      where: { userId, type: 'TEACHER' },
    });
    if (!person) throw new NotFoundException('Profil enseignant introuvable');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const courseList = await this.coursesService.findByTeacherPersonId(
      person.id,
      anneeUniv,
    );
    const settings = await this.appearance.getSettings();
    const doc = await PDFDocument.create();
    const page = doc.addPage([842, 595]);
    const { width, height } = page.getSize();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const primary = parseHexColor(settings.primaryColor);
    const margin = 40;
    const establishment = settings.appName?.trim() || 'Établissement';
    const anneeScolaire = `${anneeUniv} – ${anneeUniv + 1}`;
    const teacherName = userFullName(user) || person.matricule;

    let y = height - margin;

    const logoBuf = await this.tryLoadLogoBuffer(settings.logoUrl);
    let logoW = 0;
    let logoH = 0;
    if (logoBuf) {
      try {
        let embedded;
        try {
          embedded = await doc.embedPng(logoBuf);
        } catch {
          embedded = await doc.embedJpg(logoBuf);
        }
        logoW = 56;
        logoH = (embedded.height / embedded.width) * logoW;
        page.drawImage(embedded, {
          x: margin,
          y: y - logoH,
          width: logoW,
          height: logoH,
        });
      } catch {
        /* ignore */
      }
    }

    const titleX = margin + (logoW > 0 ? logoW + 16 : 0);
    page.drawText(establishment, {
      x: titleX,
      y: y - 14,
      size: 14,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(`Mon emploi du temps — ${teacherName}`, {
      x: titleX,
      y: y - 30,
      size: 11,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    page.drawText(
      `Année universitaire : ${anneeScolaire} — tous campus confondus`,
      {
        x: titleX,
        y: y - 44,
        size: 10,
        font,
        color: rgb(0.25, 0.25, 0.25),
      },
    );
    page.drawText(`Matricule : ${person.matricule}`, {
      x: titleX,
      y: y - 58,
      size: 9,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    y -= Math.max(logoH, 68) + 8;

    const bandH = 22;
    page.drawRectangle({
      x: margin,
      y: y - bandH,
      width: width - 2 * margin,
      height: bandH,
      color: rgb(primary.r, primary.g, primary.b),
    });
    page.drawText('EMPLOI DU TEMPS ENSEIGNANT', {
      x: margin + 8,
      y: y - 15,
      size: 12,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    y -= bandH + 12;

    const tableLeft = margin;
    const tableW = width - 2 * margin;
    const timeColW = 44;
    const dayColW = (tableW - timeColW) / 6;
    const rowH = 36;
    const headerH = 22;

    page.drawRectangle({
      x: tableLeft,
      y: y - headerH,
      width: timeColW,
      height: headerH,
      borderColor: rgb(0.4, 0.4, 0.4),
      borderWidth: 0.5,
      color: rgb(0.92, 0.92, 0.94),
    });
    page.drawText('Heure', {
      x: tableLeft + 6,
      y: y - 14,
      size: 8,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    for (let d = 0; d < 6; d++) {
      const x = tableLeft + timeColW + d * dayColW;
      page.drawRectangle({
        x,
        y: y - headerH,
        width: dayColW,
        height: headerH,
        borderColor: rgb(0.4, 0.4, 0.4),
        borderWidth: 0.5,
        color: rgb(0.92, 0.92, 0.94),
      });
      page.drawText(JOURS[d + 1], {
        x: x + 4,
        y: y - 14,
        size: 8,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
    }
    y -= headerH;

    for (const h of ROW_HOURS) {
      page.drawRectangle({
        x: tableLeft,
        y: y - rowH,
        width: timeColW,
        height: rowH,
        borderColor: rgb(0.55, 0.55, 0.55),
        borderWidth: 0.4,
      });
      page.drawText(`${h}h`, {
        x: tableLeft + 6,
        y: y - rowH + 12,
        size: 8,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
      for (let d = 0; d < 6; d++) {
        const jour = d + 1;
        const x = tableLeft + timeColW + d * dayColW;
        page.drawRectangle({
          x,
          y: y - rowH,
          width: dayColW,
          height: rowH,
          borderColor: rgb(0.55, 0.55, 0.55),
          borderWidth: 0.4,
        });
        const c = this.cellCourse(jour, h, courseList);
        const text = this.formatCellTextTeacher(c, h);
        if (text) {
          const lines = text.split('\n');
          let ly = y - 10;
          for (const line of lines.slice(0, 6)) {
            page.drawText(line.length > 50 ? `${line.slice(0, 48)}…` : line, {
              x: x + 2,
              y: ly,
              size: 5.8,
              font,
              color: rgb(0, 0, 0),
            });
            ly -= 7.5;
          }
        }
      }
      y -= rowH;
    }

    y -= 10;
    page.drawText(
      `Document généré le ${new Date().toLocaleString('fr-FR')} — re-téléchargez pour actualiser après modification de vos cours.`,
      { x: margin, y, size: 7, font, color: rgb(0.35, 0.35, 0.35) },
    );

    return Buffer.from(await doc.save());
  }

  async buildCampusDocx(
    campusId: string,
    anneeUniv: number,
    teacherId?: string,
  ): Promise<Buffer> {
    const { campus, settings, courseList } = await this.loadContext(
      campusId,
      anneeUniv,
      teacherId,
    );
    const establishment = settings.appName?.trim() || 'Établissement';
    const anneeScolaire = `${anneeUniv} – ${anneeUniv + 1}`;
    const respName =
      userFullName(campus.responsablePedagogique) ||
      'Non renseigné (à définir sur la fiche campus)';
    const headerFill = hexToDocxFill(settings.primaryColor);

    const headerChildren: Paragraph[] = [];
    const logoBuf = await this.tryLoadLogoBuffer(settings.logoUrl);
    if (logoBuf) {
      try {
        headerChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: logoBuf,
                transformation: { width: 120, height: 90 },
              }),
            ],
          }),
        );
      } catch {
        /* logo non pris en charge (ex. SVG) */
      }
    }

    const metaParagraphs: Paragraph[] = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: establishment, bold: true, size: 36 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `Campus : ${campus.nom} (${campus.code})`,
            size: 24,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `Année universitaire : ${anneeScolaire}`,
            size: 22,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `Responsable pédagogique : ${respName}`,
            italics: true,
            size: 22,
          }),
        ],
      }),
    ];
    if (campus.adresse) {
      metaParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: campus.adresse, size: 20 })],
        }),
      );
    }

    const tableRows: TableRow[] = [];

    const headerCells = [
      new TableCell({
        shading: { fill: headerFill, type: ShadingType.CLEAR },
        width: { size: 8, type: WidthType.PERCENTAGE },
        margins: { top: 80, bottom: 80, left: 80, right: 80 },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'Heure',
                bold: true,
                color: 'FFFFFF',
                size: 20,
              }),
            ],
          }),
        ],
      }),
      ...[1, 2, 3, 4, 5, 6].map(
        (j) =>
          new TableCell({
            shading: { fill: headerFill, type: ShadingType.CLEAR },
            width: { size: 15.33, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: JOURS[j],
                    bold: true,
                    color: 'FFFFFF',
                    size: 20,
                  }),
                ],
              }),
            ],
          }),
      ),
    ];
    tableRows.push(new TableRow({ children: headerCells }));

    for (const h of ROW_HOURS) {
      const hourCell = new TableCell({
        width: { size: 8, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: `${h}h`, bold: true, size: 18 })],
          }),
        ],
      });
      const dayCells = [1, 2, 3, 4, 5, 6].map((jour) => {
        const c = this.cellCourse(jour, h, courseList);
        const text = this.formatCellText(c, h);
        return new TableCell({
          width: { size: 15.33, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
          },
          children: text
            ? text.split('\n').map(
                (line) =>
                  new Paragraph({
                    children: [new TextRun({ text: line, size: 16 })],
                  }),
              )
            : [
                new Paragraph({
                  children: [new TextRun({ text: '', size: 16 })],
                }),
              ],
        });
      });
      tableRows.push(new TableRow({ children: [hourCell, ...dayCells] }));
    }

    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: tableRows,
    });

    const footerParagraphs: Paragraph[] = [
      new Paragraph({ text: '' }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Généré le ${new Date().toLocaleString('fr-FR')} — ${establishment}`,
            size: 18,
            color: '666666',
          }),
        ],
      }),
    ];
    if (userFullName(campus.agentPedagogique)) {
      footerParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Agent pédagogique : ${userFullName(campus.agentPedagogique)}`,
              size: 18,
              color: '666666',
            }),
          ],
        }),
      );
    }

    const children: (Paragraph | Table)[] = [
      ...headerChildren,
      ...metaParagraphs,
      new Paragraph({ text: '' }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'EMPLOI DU TEMPS',
            bold: true,
            color: headerFill,
            size: 32,
          }),
        ],
      }),
      new Paragraph({ text: '' }),
      table,
      ...footerParagraphs,
    ];

    const document = new Document({
      sections: [
        {
          properties: {},
          children,
        },
      ],
    });

    return await Packer.toBuffer(document);
  }

  assertCampusId(campusId: string | undefined): string {
    const id = campusId?.trim();
    if (!id) {
      throw new BadRequestException(
        'Le campus est obligatoire : chaque site a son propre emploi du temps. Sélectionnez un campus puis exportez.',
      );
    }
    return id;
  }
}
