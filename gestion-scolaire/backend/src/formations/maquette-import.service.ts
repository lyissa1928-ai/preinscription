import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';

export interface MaquetteImportRow {
  semestreNumero: number;
  ueCode: string;
  ueNom: string;
  ueCoefficient: number;
  ueCreditsEcts: number;
  ecCode: string;
  ecNom: string;
  ecVhCm: number;
  ecVhTd: number;
  ecVhTp: number;
  ecVhTpe: number;
  ecCoefficient: number;
  ecCreditsEcts: number;
  rowIndex: number;
  errors: string[];
}

export interface MaquetteImportPreview {
  rows: MaquetteImportRow[];
  totalErrors: number;
  canImport: boolean;
}

const HEADERS = [
  'Semestre',
  'Code UE',
  'Nom UE',
  'Coef UE',
  'ECTS UE',
  'Code EC',
  'Nom EC',
  'CM',
  'TD',
  'TP',
  'TPE',
  'Coef EC',
  'ECTS EC',
];

const FILL_COLOR = 'FFFFE066'; // Jaune clair pour les champs à remplir
const HEADER_COLOR = 'FF1e3a5f'; // Bleu foncé (bandeau)
const HEADER_GRIS = 'FF4a5568'; // Gris foncé en-têtes colonnes
const SECTION_GRIS = 'FFe2e8f0'; // Gris clair section

@Injectable()
export class MaquetteImportService {
  constructor(private prisma: PrismaService) {}

  /** Données tabulaires pour template Excel / CSV (une ligne = un EC). */
  private async loadTemplateRowData(maquetteId: string) {
    const maquette = await this.prisma.maquette.findUnique({
      where: { id: maquetteId },
      include: {
        semestre: { include: { formation: true } },
        ues: { include: { ecs: true } },
      },
    });
    if (!maquette) throw new NotFoundException('Maquette non trouvée');
    const semNum = maquette.semestre.numero;
    const rowData: (string | number)[][] = [];
    for (const ue of maquette.ues) {
      for (const ec of ue.ecs) {
        rowData.push([
          semNum,
          ue.code,
          ue.nom,
          ue.coefficient,
          ue.creditsEcts,
          ec.code,
          ec.nom,
          ec.vhCm,
          ec.vhTd,
          ec.vhTp,
          ec.vhTpe,
          ec.coefficient,
          ec.creditsEcts,
        ]);
      }
    }
    if (rowData.length === 0) {
      rowData.push([
        semNum,
        'M101',
        'Mathématiques',
        2,
        6,
        'ALG1',
        'Algèbre 1',
        12,
        12,
        12,
        0,
        1,
        3,
      ]);
      rowData.push([
        semNum,
        'M101',
        'Mathématiques',
        2,
        6,
        'ANA1',
        'Analyse 1',
        12,
        12,
        0,
        0,
        1,
        3,
      ]);
      rowData.push([
        semNum,
        'I101',
        'Informatique',
        2,
        6,
        'PROG1',
        'Programmation 1',
        8,
        16,
        24,
        0,
        1,
        3,
      ]);
    }
    return { maquette, rowData };
  }

  async generateTemplateBuffer(maquetteId: string): Promise<Buffer> {
    const { maquette, rowData: existingRows } =
      await this.loadTemplateRowData(maquetteId);
    const formation = maquette.semestre.formation;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Gestion Scolaire';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Maquette');

    const bandeauFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: HEADER_COLOR },
    };
    const headerGrisFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: HEADER_GRIS },
    };
    const fillColor: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: FILL_COLOR },
    };
    const sectionFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: SECTION_GRIS },
    };
    const whiteFont = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Ligne 1 — Bandeau bleu principal
    ws.mergeCells('A1:M1');
    const titleCell = ws.getCell('A1');
    titleCell.value = `MAQUETTE ${formation.code} — Semestre ${maquette.semestre.numero} (${maquette.anneeRef})`;
    titleCell.fill = bandeauFill;
    titleCell.font = whiteFont;
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 28;

    // Ligne 2 — Programme, Parcours, Semestre
    ws.mergeCells('A2:M2');
    const infoCell = ws.getCell('A2');
    infoCell.value = `PROGRAMME : ${formation.code}  |  PARCOURS : ${formation.nom}  |  SEMESTRE : ${maquette.semestre.numero}`;
    infoCell.fill = bandeauFill;
    infoCell.font = whiteFont;
    infoCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 22;

    // Ligne 3 — Section "Semestre" (gris clair)
    ws.mergeCells('A3:M3');
    const sectionCell = ws.getCell('A3');
    sectionCell.value =
      'Remplissez les lignes ci-dessous — Cellules jaunes à compléter';
    sectionCell.fill = sectionFill;
    sectionCell.font = { bold: true };
    sectionCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(3).height = 20;

    // Ligne 4 — Groupes IDENTIFICATION | ENSEIGNEMENT | ETUDIANT | CHARGE DE TRAVAIL
    ws.mergeCells('A4:G4');
    ws.mergeCells('H4:J4');
    ws.mergeCells('L4:M4');
    const groupRow = ws.getRow(4);
    groupRow.height = 20;
    groupRow.getCell(1).value = 'IDENTIFICATION';
    groupRow.getCell(8).value = 'ENSEIGNEMENT';
    groupRow.getCell(11).value = 'ETUDIANT';
    groupRow.getCell(12).value = 'CHARGE DE TRAVAIL';
    for (let c = 1; c <= 13; c++) {
      const cell = groupRow.getCell(c);
      cell.fill = headerGrisFill;
      cell.font = whiteFont;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Ligne 5 — En-têtes détaillés
    const headerRow = ws.addRow(HEADERS);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.fill = headerGrisFill;
      cell.font = whiteFont;
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
    });

    for (const rowData of existingRows) {
      const row = ws.addRow(rowData);
      row.eachCell((cell, colNumber) => {
        cell.fill = fillColor;
        cell.alignment = { vertical: 'middle' };
      });
    }

    // Largeurs colonnes
    ws.getColumn(1).width = 10;
    ws.getColumn(2).width = 12;
    ws.getColumn(3).width = 28;
    ws.getColumn(4).width = 10;
    ws.getColumn(5).width = 10;
    ws.getColumn(6).width = 12;
    ws.getColumn(7).width = 28;
    ws.getColumn(8).width = 8;
    ws.getColumn(9).width = 8;
    ws.getColumn(10).width = 8;
    ws.getColumn(11).width = 8;
    ws.getColumn(12).width = 10;
    ws.getColumn(13).width = 10;

    // Bordures sur les cellules remplies
    ws.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /** Template CSV : UTF-8 avec BOM, colonnes séparées par point-virgule (style Excel FR). */
  async generateTemplateCsv(maquetteId: string): Promise<Buffer> {
    const { rowData } = await this.loadTemplateRowData(maquetteId);
    const escapeCell = (v: string | number) => {
      const s = String(v);
      if (/[;\r\n"]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const line = (cells: (string | number)[]) =>
      cells.map(escapeCell).join(';');
    const lines = [HEADERS.map(escapeCell).join(';'), ...rowData.map(line)];
    const bom = '\uFEFF';
    return Buffer.from(bom + lines.join('\r\n'), 'utf8');
  }

  private findSemestreHeaderRow(data: unknown[][]): number {
    for (let i = 0; i < Math.min(25, data.length); i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;
      const first = String(row[0] ?? '')
        .trim()
        .replace(/^\uFEFF/, '')
        .toLowerCase();
      if (first === 'semestre') return i;
    }
    return -1;
  }

  private tryParseAsDelimitedText(
    text: string,
    fs: string,
  ): unknown[][] | null {
    try {
      const wb = XLSX.read(text, { type: 'string', FS: fs, raw: false });
      if (!wb.SheetNames?.length) return null;
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (!sheet) return null;
      return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: '',
      });
    } catch {
      return null;
    }
  }

  private buildPreviewFromSheet(
    data: unknown[][],
    headerRowIdx: number,
  ): MaquetteImportPreview {
    const rows: MaquetteImportRow[] = [];
    let totalErrors = 0;

    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;
      if (
        row.every(
          (v) => v === undefined || v === null || String(v).trim() === '',
        )
      )
        continue;

      const semestreNumero = Math.floor(Number(row[0]) || 1);
      const ueCode = String(row[1] ?? '').trim();
      const ueNom = String(row[2] ?? '').trim();
      const ueCoefficient = Number(row[3]) || 1;
      const ueCreditsEcts = Number(row[4]) || 0;
      const ecCode = String(row[5] ?? '').trim();
      const ecNom = String(row[6] ?? '').trim();
      const ecVhCm = Number(row[7]) || 0;
      const ecVhTd = Number(row[8]) || 0;
      const ecVhTp = Number(row[9]) || 0;
      const ecVhTpe = Number(row[10]) || 0;
      const ecCoefficient = Number(row[11]) || 1;
      const ecCreditsEcts = Number(row[12]) || 0;

      const errors: string[] = [];
      if (!ueCode) errors.push('Code UE requis');
      if (!ueNom) errors.push('Nom UE requis');
      if (!ecCode) errors.push('Code EC requis');
      if (!ecNom) errors.push('Nom EC requis');
      if (semestreNumero < 1 || semestreNumero > 12)
        errors.push('Semestre invalide (1-12)');

      if (errors.length > 0) totalErrors += errors.length;

      rows.push({
        semestreNumero,
        ueCode,
        ueNom,
        ueCoefficient,
        ueCreditsEcts,
        ecCode,
        ecNom,
        ecVhCm,
        ecVhTd,
        ecVhTp,
        ecVhTpe,
        ecCoefficient,
        ecCreditsEcts,
        rowIndex: i + 1,
        errors,
      });
    }

    return {
      rows,
      totalErrors,
      canImport: totalErrors === 0,
    };
  }

  /**
   * Lit un fichier Excel (.xlsx, .xls) ou CSV / texte délimité.
   * CSV : privilégier le point-virgule (;) ou la tabulation (export Excel FR) ; la virgule est essayée en dernier.
   */
  parseFile(
    buffer: Buffer,
    maquetteId: string,
    originalname?: string,
  ): MaquetteImportPreview {
    void maquetteId;
    const lower = (originalname || '').toLowerCase();
    const csvish = lower.endsWith('.csv') || lower.endsWith('.txt');
    let data: unknown[][] | null = null;

    if (csvish) {
      const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
      for (const fs of [';', '\t', ','] as const) {
        const d = this.tryParseAsDelimitedText(text, fs);
        if (!d?.length) continue;
        if (this.findSemestreHeaderRow(d) >= 0) {
          data = d;
          break;
        }
      }
      if (!data) {
        throw new BadRequestException(
          'Fichier CSV illisible ou sans ligne d’en-tête « Semestre » en première colonne. Utilisez le point-virgule (;) ou la tabulation comme séparateur (comme un export Excel), ou téléchargez le template CSV.',
        );
      }
    } else {
      try {
        const workbook = XLSX.read(buffer, { type: 'buffer', raw: false });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        if (sheet) {
          data = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
            header: 1,
            defval: '',
          });
        }
      } catch {
        data = null;
      }
      if (!data || this.findSemestreHeaderRow(data) < 0) {
        const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
        for (const fs of [';', '\t', ','] as const) {
          const d = this.tryParseAsDelimitedText(text, fs);
          if (!d?.length) continue;
          if (this.findSemestreHeaderRow(d) >= 0) {
            data = d;
            break;
          }
        }
      }
    }

    if (!data?.length) {
      throw new BadRequestException('Fichier vide ou illisible.');
    }

    const headerRowIdx = this.findSemestreHeaderRow(data);
    if (headerRowIdx < 0) {
      throw new BadRequestException(
        'Ligne d’en-tête introuvable : la première colonne doit contenir « Semestre » (même ligne que Code UE, Nom UE, etc.).',
      );
    }

    return this.buildPreviewFromSheet(data, headerRowIdx);
  }

  async importFromPreview(
    maquetteId: string,
    rows: MaquetteImportRow[],
  ): Promise<{ created: number; updated: number }> {
    const maquette = await this.prisma.maquette.findUnique({
      where: { id: maquetteId },
      include: { semestre: true },
    });
    if (!maquette) throw new NotFoundException('Maquette non trouvée');
    if (maquette.verrouille)
      throw new ConflictException(
        'Cette maquette est verrouillée et ne peut pas être modifiée',
      );

    const seen = new Map<string, string>();
    let created = 0;
    let updated = 0;

    for (const row of rows) {
      if (row.errors.length > 0) continue;
      // Ignorer les lignes dont le semestre ne correspond pas à la maquette
      if (row.semestreNumero !== maquette.semestre.numero) continue;

      let ueId = seen.get(row.ueCode);

      if (!ueId) {
        let ue = await this.prisma.uE.findFirst({
          where: { maquetteId, code: row.ueCode },
        });
        if (!ue) {
          ue = await this.prisma.uE.create({
            data: {
              maquetteId,
              code: row.ueCode,
              nom: row.ueNom,
              coefficient: row.ueCoefficient,
              creditsEcts: row.ueCreditsEcts,
            },
          });
          created++;
        } else {
          await this.prisma.uE.update({
            where: { id: ue.id },
            data: {
              nom: row.ueNom,
              coefficient: row.ueCoefficient,
              creditsEcts: row.ueCreditsEcts,
            },
          });
          updated++;
        }
        const newUeId = ue.id;
        if (!newUeId) continue;
        ueId = newUeId;
        seen.set(row.ueCode, newUeId);
      }

      if (!ueId) continue;

      const ecExists = await this.prisma.eC.findFirst({
        where: { ueId, code: row.ecCode },
      });
      if (!ecExists) {
        await this.prisma.eC.create({
          data: {
            ueId,
            code: row.ecCode,
            nom: row.ecNom,
            vhCm: row.ecVhCm,
            vhTd: row.ecVhTd,
            vhTp: row.ecVhTp,
            vhTpe: row.ecVhTpe,
            coefficient: row.ecCoefficient,
            creditsEcts: row.ecCreditsEcts,
          },
        });
        created++;
      } else {
        await this.prisma.eC.update({
          where: { id: ecExists.id },
          data: {
            nom: row.ecNom,
            vhCm: row.ecVhCm,
            vhTd: row.ecVhTd,
            vhTp: row.ecVhTp,
            vhTpe: row.ecVhTpe,
            coefficient: row.ecCoefficient,
            creditsEcts: row.ecCreditsEcts,
          },
        });
        updated++;
      }
    }

    return { created, updated };
  }
}
