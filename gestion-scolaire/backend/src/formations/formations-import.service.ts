import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';

export interface ImportRow {
  filiereCode: string;
  filiereNom: string;
  formationCode: string;
  formationNom: string;
  cycle: string;
  dureeSemestres: number;
  maquetteAnneeRef: number;
  semestreNumero: number;
  semestreCreditsEcts: number;
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

export interface ImportPreview {
  rows: ImportRow[];
  totalErrors: number;
  canImport: boolean;
}

const HEADERS = [
  'formationCode',
  'formationNom',
  'cycle',
  'dureeSemestres',
  'maquetteAnneeRef',
  'semestreNumero',
  'semestreCreditsEcts',
  'ueCode',
  'ueNom',
  'ueCoefficient',
  'ueCreditsEcts',
  'ecCode',
  'ecNom',
  'ecVhCm',
  'ecVhTd',
  'ecVhTp',
  'ecVhTpe',
  'ecCoefficient',
  'ecCreditsEcts',
];

@Injectable()
export class FormationsImportService {
  constructor(private prisma: PrismaService) {}

  parseFile(buffer: Buffer): ImportPreview {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      header: 1,
      defval: '',
    });

    if (!data || data.length < 2) {
      throw new BadRequestException(
        "Le fichier Excel doit contenir au moins une ligne d'en-tête et une ligne de données.",
      );
    }

    const rows: ImportRow[] = [];
    let totalErrors = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowData = Array.isArray(row)
        ? HEADERS.reduce(
            (acc, h, idx) => ({ ...acc, [h]: row[idx] }),
            {} as Record<string, unknown>,
          )
        : row;
      if (
        Array.isArray(row) &&
        row.every(
          (v) => v === undefined || v === null || String(v).trim() === '',
        )
      )
        continue;

      const errors: string[] = [];
      const filiereCode = String(rowData.filiereCode || '').trim();
      const filiereNom = String(rowData.filiereNom || '').trim();
      const formationCode = String(rowData.formationCode || '').trim();
      const formationNom = String(rowData.formationNom || '').trim();
      const cycle = String(rowData.cycle || 'L')
        .trim()
        .toUpperCase();
      const dureeSemestres = Number(rowData.dureeSemestres) || 6;
      const maquetteAnneeRef =
        Number(rowData.maquetteAnneeRef) || new Date().getFullYear();
      const semestreNumero = Number(rowData.semestreNumero) || 1;
      const semestreCreditsEcts = Number(rowData.semestreCreditsEcts) || 0;
      const ueCode = String(rowData.ueCode || '').trim();
      const ueNom = String(rowData.ueNom || '').trim();
      const ueCoefficient = Number(rowData.ueCoefficient) || 1;
      const ueCreditsEcts = Number(rowData.ueCreditsEcts) || 0;
      const ecCode = String(rowData.ecCode || '').trim();
      const ecNom = String(rowData.ecNom || '').trim();
      const ecVhCm = Number(rowData.ecVhCm) || 0;
      const ecVhTd = Number(rowData.ecVhTd) || 0;
      const ecVhTp = Number(rowData.ecVhTp) || 0;
      const ecVhTpe = Number(rowData.ecVhTpe) || 0;
      const ecCoefficient = Number(rowData.ecCoefficient) || 1;
      const ecCreditsEcts = Number(rowData.ecCreditsEcts) || 0;

      if (!filiereCode) errors.push('Code filière requis');
      if (!filiereNom) errors.push('Nom filière requis');
      if (!formationCode) errors.push('Code formation requis');
      if (!formationNom) errors.push('Nom formation requis');
      if (!['L', 'M', 'D'].includes(cycle))
        errors.push('Cycle doit être L, M ou D');
      if (dureeSemestres < 2 || dureeSemestres > 12)
        errors.push('Durée semestres invalide (2-12)');
      if (!ueCode) errors.push('Code UE requis');
      if (!ueNom) errors.push('Nom UE requis');
      if (!ecCode) errors.push('Code EC requis');
      if (!ecNom) errors.push('Nom EC requis');

      if (errors.length > 0) totalErrors += errors.length;

      rows.push({
        filiereCode,
        filiereNom,
        formationCode,
        formationNom,
        cycle,
        dureeSemestres,
        maquetteAnneeRef,
        semestreNumero,
        semestreCreditsEcts,
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

  async importFromPreview(
    rows: ImportRow[],
  ): Promise<{ created: number; updated: number }> {
    const seen = new Map<string, string>();
    let created = 0;
    let updated = 0;

    for (const row of rows) {
      if (row.errors.length > 0) continue;

      const filKey = row.filiereCode;
      const formKey = `${filKey}:${row.formationCode}`;
      const semKey = `${formKey}:${row.semestreNumero}`;
      const maqKey = `${semKey}:${row.maquetteAnneeRef}`;
      const ueKey = `${maqKey}:${row.ueCode}`;

      let filiereId = seen.get(filKey);
      if (!filiereId) {
        let filiere = await this.prisma.filiere.findUnique({
          where: { code: row.filiereCode },
        });
        if (!filiere) {
          filiere = await this.prisma.filiere.create({
            data: { code: row.filiereCode, nom: row.filiereNom },
          });
          created++;
        } else {
          await this.prisma.filiere.update({
            where: { id: filiere.id },
            data: { nom: row.filiereNom },
          });
          updated++;
        }
        filiereId = filiere.id;
        seen.set(filKey, filiereId);
      }

      let formationId = seen.get(formKey);
      if (!formationId) {
        let formation = await this.prisma.formation.findFirst({
          where: { filiereId, code: row.formationCode },
        });
        if (!formation) {
          formation = await this.prisma.formation.create({
            data: {
              filiereId,
              code: row.formationCode,
              nom: row.formationNom,
              cycle: row.cycle,
              dureeSemestres: row.dureeSemestres,
            },
          });
          created++;
        } else {
          await this.prisma.formation.update({
            where: { id: formation.id },
            data: {
              nom: row.formationNom,
              cycle: row.cycle,
              dureeSemestres: row.dureeSemestres,
            },
          });
          updated++;
        }
        formationId = formation.id;
        seen.set(formKey, formationId);
      }

      let semestreId = seen.get(semKey);
      if (!semestreId) {
        let semestre = await this.prisma.semestre.findFirst({
          where: { formationId, numero: row.semestreNumero },
        });
        if (!semestre) {
          semestre = await this.prisma.semestre.create({
            data: { formationId, numero: row.semestreNumero },
          });
          created++;
        }
        semestreId = semestre.id;
        seen.set(semKey, semestreId);
      }

      let maquetteId = seen.get(maqKey);
      if (!maquetteId) {
        let maquette = await this.prisma.maquette.findFirst({
          where: { semestreId, anneeRef: row.maquetteAnneeRef },
        });
        if (!maquette) {
          maquette = await this.prisma.maquette.create({
            data: {
              semestreId,
              code: `S${row.semestreNumero}-${row.maquetteAnneeRef}`,
              anneeRef: row.maquetteAnneeRef,
            },
          });
          created++;
        }
        maquetteId = maquette.id;
        seen.set(maqKey, maquetteId);
      }

      let ueId = seen.get(ueKey);
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
        ueId = ue.id;
        seen.set(ueKey, ueId);
      }

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

  generateTemplateBuffer(): Buffer {
    const headers = [
      'filiereCode',
      'filiereNom',
      'formationCode',
      'formationNom',
      'cycle',
      'dureeSemestres',
      'maquetteAnneeRef',
      'semestreNumero',
      'semestreCreditsEcts',
      'ueCode',
      'ueNom',
      'ueCoefficient',
      'ueCreditsEcts',
      'ecCode',
      'ecNom',
      'ecVhCm',
      'ecVhTd',
      'ecVhTp',
      'ecVhTpe',
      'ecCoefficient',
      'ecCreditsEcts',
    ];
    const example = [
      'INFO',
      'Informatique',
      'L1-INFO',
      'Licence Informatique',
      'L',
      6,
      2024,
      1,
      30,
      'M101',
      'Mathématiques fondamentales',
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
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws['!cols'] = headers.map((_, i) => ({
      wch: Math.max(18, headers[i].length + 2),
    }));
    const guide = XLSX.utils.aoa_to_sheet([
      ['Colonne', 'Description', 'Exemple'],
      ['filiereCode', 'Code filière (ex: INFO)', 'INFO'],
      ['filiereNom', 'Nom de la filière', 'Informatique'],
      ['formationCode', 'Code formation (ex: L1-INFO)', 'L1-INFO'],
      ['formationNom', 'Nom de la formation', 'Licence Informatique'],
      ['cycle', 'L, M ou D', 'L'],
      ['dureeSemestres', 'Durée en semestres (2-12)', 6],
      ['maquetteAnneeRef', 'Année de référence', 2024],
      ['semestreNumero', 'Numéro semestre (1, 2, 3...)', 1],
      ['semestreCreditsEcts', 'Crédits ECTS du semestre', 30],
      ['ueCode', 'Code UE', 'M101'],
      ['ueNom', "Nom de l'UE", 'Mathématiques fondamentales'],
      ['ueCoefficient', 'Coefficient UE', 2],
      ['ueCreditsEcts', 'Crédits ECTS UE', 6],
      ['ecCode', 'Code EC', 'ALG1'],
      ['ecNom', "Nom de l'EC", 'Algèbre 1'],
      ['ecVhCm', 'Heures CM', 12],
      ['ecVhTd', 'Heures TD', 12],
      ['ecVhTp', 'Heures TP', 12],
      ['ecVhTpe', 'Heures TPE', 0],
      ['ecCoefficient', 'Coefficient EC', 1],
      ['ecCreditsEcts', 'Crédits ECTS EC', 3],
    ]);
    guide['!cols'] = [{ wch: 22 }, { wch: 35 }, { wch: 25 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Formations');
    XLSX.utils.book_append_sheet(wb, guide, 'Guide');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
