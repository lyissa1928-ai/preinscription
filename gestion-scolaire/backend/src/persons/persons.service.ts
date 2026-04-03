import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import * as bwipjs from 'bwip-js';
import QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { InscriptionsService } from '../inscriptions/inscriptions.service';
import { AppearanceService } from '../appearance/appearance.service';
import { UsersService } from '../users/users.service';

const NIS_ALPHANUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Une ligne de la grille 2×4 du badge unifié (enseignant / étudiant / personnel). */
type UnifiedBadgeGridRow = {
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
};

type UnifiedModernBadgeContext = {
  firstName: string;
  lastName: string;
  photoPath: string | null;
  /** Statut affiché sous le nom : Étudiant / Enseignant / Personnel. */
  heroSubtitle: string;
  /** Max 2 lignes : formation / service / identifiants (pas d’email ni téléphone sur carte physique). */
  rows: UnifiedBadgeGridRow[];
  /** Contenu exact du QR (jeton GEST1. signé). */
  qrPayload: string;
  settings: Awaited<ReturnType<AppearanceService['getSettings']>>;
  badgeBarcode: string;
  establishment: string;
  websiteLine: string;
};

@Injectable()
export class PersonsService {
  private readonly logger = new Logger(PersonsService.name);

  constructor(
    private prisma: PrismaService,
    private inscriptionsService: InscriptionsService,
    private appearance: AppearanceService,
    private usersService: UsersService,
  ) {}

  /** Génère un NIS unique : [Année] + 4 caractères alphanumériques (ex: 2026A8Z2) */
  private async generateNIS(): Promise<string> {
    const year = new Date().getFullYear();
    for (let attempt = 0; attempt < 100; attempt++) {
      let suffix = '';
      for (let i = 0; i < 4; i++) {
        suffix += NIS_ALPHANUM[Math.floor(Math.random() * NIS_ALPHANUM.length)];
      }
      const nis = `${year}${suffix}`;
      const exists = await this.prisma.person.findUnique({
        where: { matricule: nis },
      });
      if (!exists) return nis;
    }
    throw new ConflictException(
      'Impossible de générer un NIS unique. Réessayez.',
    );
  }

  private async generateMatricule(prefix: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.person.count({
      where: { matricule: { startsWith: `${prefix}-${year}-` } },
    });
    const num = String(count + 1).padStart(4, '0');
    return `${prefix}-${year}-${num}`;
  }

  /** Matricule temporaire avant validation du dossier (évite doublon avec ETU-YYYY-XXXX). */
  private async generatePendingMatricule(): Promise<string> {
    const year = new Date().getFullYear();
    for (let i = 0; i < 50; i++) {
      const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
      const pending = `ETU-PENDING-${year}-${suffix}`;
      const exists = await this.prisma.person.findUnique({
        where: { matricule: pending },
      });
      if (!exists) return pending;
    }
    throw new ConflictException(
      'Impossible de générer un matricule temporaire unique.',
    );
  }

  /** Upload document étudiant (photo, justificatif bac, justificatif cni) ; max 2 Mo, jpg/png ou PDF. Retourne le chemin relatif. */
  uploadStudentDocument(
    type: string,
    file: { buffer: Buffer; originalname?: string },
  ): { path: string } {
    const MAX = 2 * 1024 * 1024;
    if (file.buffer.length > MAX)
      throw new BadRequestException('Taille maximale 2 Mo.');
    const dir = path.join(process.cwd(), 'uploads', 'students');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const ext = (
      path.extname(file.originalname || '') ||
      (type === 'photo' ? '.jpg' : '.pdf')
    ).toLowerCase();
    const safeType = ['photo', 'justificatif_bac', 'justificatif_cni'].includes(
      type,
    )
      ? type
      : 'document';
    const filename = `${safeType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, file.buffer);
    return { path: `/uploads/students/${filename}` };
  }

  async findAll(type?: 'STUDENT' | 'TEACHER' | 'STAFF') {
    const where = type ? { type } : {};
    return this.prisma.person.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        teacher: true,
        student: true,
      },
      orderBy: { matricule: 'asc' },
    });
  }

  /** Liste des étudiants avec filière et filtres (search, filiereId, formationId, cohortId, anneeUniv, statut). */
  async findAllStudents(filters: {
    search?: string;
    filiereId?: string;
    formationId?: string;
    cohortId?: string;
    anneeUniv?: number;
    statut?: string;
  }) {
    const q = filters.search?.trim();
    const where: Record<string, unknown> = { type: 'STUDENT' };
    if (q) {
      where.OR = [
        { matricule: { contains: q } },
        { user: { firstName: { contains: q } } },
        { user: { lastName: { contains: q } } },
      ];
    }
    const insSome: Record<string, unknown> = {};
    if (filters.filiereId?.trim())
      insSome.formation = { filiereId: filters.filiereId.trim() };
    if (filters.formationId?.trim())
      insSome.formationId = filters.formationId.trim();
    if (filters.cohortId?.trim()) insSome.cohortId = filters.cohortId.trim();
    if (filters.anneeUniv != null) insSome.anneeUniv = filters.anneeUniv;
    if (Object.keys(insSome).length) where.inscriptions = { some: insSome };
    if (filters.statut?.trim()) {
      where.student = { statutInscription: filters.statut.trim() };
    }
    return this.prisma.person.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        student: true,
        inscriptions: {
          include: { formation: { include: { filiere: true } }, cohort: true },
        },
      },
      orderBy: { matricule: 'asc' },
    });
  }

  /** Retourne le chemin absolu du document étudiant pour envoi (stream). */
  async getStudentDocumentPath(
    personId: string,
    type: 'photo' | 'justificatif_bac' | 'justificatif_cni',
  ): Promise<{ filePath: string; fileName: string }> {
    const student = await this.prisma.student.findUnique({
      where: { personId },
      select: {
        photoProfil: true,
        justificatifBac: true,
        justificatifCni: true,
      },
    });
    if (!student) throw new NotFoundException('Étudiant non trouvé.');
    const field =
      type === 'photo'
        ? 'photoProfil'
        : type === 'justificatif_bac'
          ? 'justificatifBac'
          : 'justificatifCni';
    const rel = student[field];
    if (!rel?.trim()) throw new NotFoundException('Document non disponible.');
    const filePath = path.join(process.cwd(), rel.replace(/^\//, ''));
    if (!fs.existsSync(filePath))
      throw new NotFoundException('Fichier introuvable.');
    const fileName = path.basename(filePath);
    return { filePath, fileName };
  }

  async findOne(id: string) {
    const p = await this.prisma.person.findUnique({
      where: { id },
      include: {
        user: true,
        teacher: true,
        student: true,
      },
    });
    if (!p) throw new NotFoundException('Personne non trouvée');
    return p;
  }

  /** Vérifie si l'email est déjà utilisé et lance une ConflictException avec un message clair. */
  private async ensureEmailNotUsed(
    email: string,
    currentType: 'STUDENT' | 'TEACHER' | 'STAFF',
  ) {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalized },
      include: { person: { select: { type: true } } },
    });
    if (!existingUser) return;
    const typeLabel =
      existingUser.person?.type === 'STUDENT'
        ? 'étudiant'
        : existingUser.person?.type === 'TEACHER'
          ? 'enseignant'
          : 'personnel';
    throw new ConflictException(
      `Un compte avec cet email existe déjà (${typeLabel}). Utilisez un autre email.`,
    );
  }

  async createPerson(data: {
    type: 'STUDENT' | 'TEACHER' | 'STAFF';
    dateNaissance?: Date;
    email?: string;
    firstName?: string;
    lastName?: string;
    password?: string;
    role?: string;
    address?: string;
    phone?: string;
    typeContrat?: string;
    niveauEtude?: string;
    articlesPublies?: number;
    rangGrade?: string;
  }) {
    const matricule =
      data.type === 'TEACHER'
        ? await this.generateMatriculePATS()
        : await this.generateMatricule(data.type === 'STUDENT' ? 'STU' : 'STF');

    const email = data.email?.trim().toLowerCase();
    const firstName = (data.firstName ?? '').trim();
    const lastName = (data.lastName ?? '').trim();
    if (data.email && data.firstName && data.lastName) {
      await this.ensureEmailNotUsed(email!, data.type);
    }

    let userId: string | undefined;
    if (email && firstName && lastName) {
      const plainPassword =
        data.password?.trim() ||
        (data.type === 'TEACHER' ? matricule : 'password123');
      const hash = await bcrypt.hash(plainPassword, 10);
      const role =
        data.role ||
        (data.type === 'STUDENT'
          ? 'STUDENT'
          : data.type === 'TEACHER'
            ? 'TEACHER'
            : 'ADMIN');
      try {
        const user = await this.prisma.user.create({
          data: {
            email,
            passwordHash: hash,
            role,
            firstName,
            lastName,
            address: data.address ?? undefined,
            phone: data.phone ?? undefined,
          },
        });
        userId = user.id;
      } catch (e: unknown) {
        const prismaError = e as { code?: string };
        if (prismaError.code === 'P2002') {
          throw new ConflictException(
            'Un compte avec cet email existe déjà. Utilisez un autre email.',
          );
        }
        throw e;
      }
    }

    const person = await this.prisma.person.create({
      data: {
        matricule,
        type: data.type,
        dateNaissance: data.dateNaissance,
        userId,
      },
      include: { user: true },
    });

    if (data.type === 'TEACHER') {
      await this.prisma.teacher.create({
        data: {
          personId: person.id,
          typeContrat: data.typeContrat || 'VACATAIRE',
          niveauEtude: data.niveauEtude ?? undefined,
          articlesPublies: data.articlesPublies ?? undefined,
          rangGrade: data.rangGrade ?? undefined,
        },
      });
    }

    return this.findOne(person.id);
  }

  async createTeacher(data: {
    email: string;
    firstName: string;
    lastName: string;
    password?: string;
    typeContrat?: string;
    niveauEtude?: string;
    articlesPublies?: number;
    rangGrade?: string;
    address?: string;
    phone?: string;
    dateNaissance?: Date;
  }) {
    return this.createPerson({
      type: 'TEACHER',
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      password: data.password,
      role: 'TEACHER',
      typeContrat: data.typeContrat || 'VACATAIRE',
      niveauEtude: data.niveauEtude,
      articlesPublies: data.articlesPublies,
      rangGrade: data.rangGrade,
      address: data.address,
      phone: data.phone,
      dateNaissance: data.dateNaissance,
    });
  }

  async createStudent(data: {
    email: string;
    firstName: string;
    lastName: string;
    password?: string;
    dateNaissance?: Date;
  }) {
    return this.createPerson({
      type: 'STUDENT',
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      password: data.password,
      role: 'STUDENT',
      dateNaissance: data.dateNaissance,
    });
  }

  /** Inscription complète (scolarité) : matricule ETU-YYYY-XXXX, mot de passe = matricule, création Person + User + Student + Inscription */
  async createStudentWithInscription(data: {
    nom: string;
    prenom: string;
    cinOuPasseport: string;
    formationId: string;
    cohortId: string;
    campusId?: string | null;
    anneeUniv: number;
    dateNaissance?: string;
    lieuNaissance?: string;
    nationalite?: string;
    genre?: string;
    telephone?: string;
    adresse?: string;
    photoProfil?: string;
    dernierDiplome?: string;
    anneeObtention?: number;
    mention?: string;
    etablissementOrigine?: string;
    typeBac?: string;
    nomTuteur?: string;
    telephoneParent?: string;
    telephoneTuteur?: string;
    lienParente?: string;
    groupeSanguin?: string;
    antecedentsMedicaux?: string;
    maladiesSignalees?: string;
    justificatifBac?: string;
    justificatifCni?: string;
    email?: string;
  }) {
    const cin = data.cinOuPasseport?.trim();
    if (!cin)
      throw new BadRequestException(
        'Le numéro de CIN ou Passeport est obligatoire.',
      );
    const existingCni = await this.prisma.student.findFirst({
      where: { cinOuPasseport: cin },
    });
    if (existingCni)
      throw new ConflictException(
        'Ce numéro de CIN ou Passeport est déjà utilisé.',
      );
    const matricule = await this.generatePendingMatricule();
    const passwordHash = await bcrypt.hash(matricule, 10);
    const email =
      data.email?.trim() || `${matricule.replace(/-/g, '')}@etudiant.local`;

    const cohort = await this.prisma.cohort.findUnique({
      where: { id: data.cohortId },
      include: { formation: true },
    });
    if (!cohort) throw new NotFoundException('Classe non trouvée');
    if (cohort.formationId !== data.formationId)
      throw new BadRequestException(
        'La classe ne correspond pas à la formation choisie.',
      );

    const semestre = await this.prisma.semestre.findFirst({
      where: { formationId: data.formationId, numero: 1 },
      include: { maquettes: { where: { anneeRef: data.anneeUniv } } },
    });
    const maquette = semestre?.maquettes?.[0];
    if (!semestre || !maquette)
      throw new BadRequestException(
        'Maquette ou semestre introuvable pour cette formation et année.',
      );

    let emailToUse = email;
    if (data.email?.trim()) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: emailToUse },
      });
      if (existingUser) {
        throw new ConflictException(
          'Un compte avec cet email existe déjà. Utilisez un autre email ou laissez le champ vide pour générer un identifiant technique.',
        );
      }
    } else {
      while (
        await this.prisma.user.findUnique({ where: { email: emailToUse } })
      ) {
        const suffix = Math.random().toString(36).slice(2, 8);
        emailToUse = `${matricule.replace(/-/g, '')}-${suffix}@etudiant.local`;
      }
    }

    const user = await this.prisma.user.create({
      data: {
        email: emailToUse,
        passwordHash,
        role: 'STUDENT',
        firstName: data.prenom.trim(),
        lastName: data.nom.trim(),
      },
    });

    const person = await this.prisma.person.create({
      data: {
        matricule,
        type: 'STUDENT',
        dateNaissance: data.dateNaissance
          ? new Date(data.dateNaissance)
          : undefined,
        userId: user.id,
      },
    });

    await this.prisma.student.create({
      data: {
        personId: person.id,
        numeroCarteEtudiant: matricule,
        cinOuPasseport: cin,
        statutInscription: 'en_attente',
        photoProfil: data.photoProfil?.trim() || undefined,
        lieuNaissance: data.lieuNaissance?.trim() || undefined,
        nationalite: data.nationalite?.trim() || undefined,
        genre: data.genre?.trim() || undefined,
        telephone: data.telephone?.trim() || undefined,
        adresse: data.adresse?.trim() || undefined,
        dernierDiplome: data.dernierDiplome?.trim() || undefined,
        anneeObtention: data.anneeObtention ?? undefined,
        mention: data.mention?.trim() || undefined,
        etablissementOrigine: data.etablissementOrigine?.trim() || undefined,
        typeBac: data.typeBac?.trim() || undefined,
        nomTuteur: data.nomTuteur?.trim() || undefined,
        telephoneParent: data.telephoneParent?.trim() || undefined,
        telephoneTuteur: data.telephoneTuteur?.trim() || undefined,
        lienParente: data.lienParente?.trim() || undefined,
        groupeSanguin: data.groupeSanguin?.trim() || undefined,
        antecedentsMedicaux: data.antecedentsMedicaux?.trim() || undefined,
        maladiesSignalees: data.maladiesSignalees?.trim() || undefined,
        justificatifBac: data.justificatifBac?.trim() || undefined,
        justificatifCni: data.justificatifCni?.trim() || undefined,
      },
    });

    await this.inscriptionsService.createInscription({
      personId: person.id,
      formationId: data.formationId,
      cohortId: data.cohortId,
      campusId: data.campusId ?? cohort.campusId ?? null,
      maquetteId: maquette.id,
      semestreId: semestre.id,
      anneeUniv: data.anneeUniv,
      statut: 'PROVISOIRE',
    });

    return this.prisma.person.findUnique({
      where: { id: person.id },
      include: {
        user: true,
        student: true,
        inscriptions: { include: { formation: true, cohort: true } },
      },
    });
  }

  /** Valide le dossier étudiant : génère le matricule définitif, renomme les fichiers, met à jour le mot de passe. Puis affectation automatique à une cohorte (formation + année). */
  async validateDossier(personId: string, userId?: string) {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      include: { user: true, student: true },
    });
    if (!person?.student) throw new NotFoundException('Étudiant non trouvé.');
    if (person.student.statutInscription === 'valide') {
      throw new BadRequestException('Dossier déjà validé.');
    }
    const matricule = await this.generateMatricule('ETU');
    const baseDir = path.join(process.cwd(), 'uploads', 'students');
    const safeMatricule = matricule.replace(/-/g, '_');
    const updates: {
      photoProfil?: string;
      justificatifBac?: string;
      justificatifCni?: string;
    } = {};

    const renameDoc = (
      relPath: string | null | undefined,
      docName: string,
    ): string | undefined => {
      if (!relPath?.trim()) return undefined;
      const oldFull = path.join(process.cwd(), relPath.replace(/^\//, ''));
      if (!fs.existsSync(oldFull)) return relPath;
      const ext = path.extname(oldFull);
      const newFilename = `${safeMatricule}_${docName}${ext}`;
      const newFull = path.join(baseDir, newFilename);
      fs.renameSync(oldFull, newFull);
      return `/uploads/students/${newFilename}`;
    };

    if (person.student.photoProfil)
      updates.photoProfil =
        renameDoc(person.student.photoProfil, 'photo_profil') ??
        person.student.photoProfil;
    if (person.student.justificatifBac)
      updates.justificatifBac =
        renameDoc(person.student.justificatifBac, 'diplome_bac') ??
        person.student.justificatifBac;
    if (person.student.justificatifCni)
      updates.justificatifCni =
        renameDoc(person.student.justificatifCni, 'cni') ??
        person.student.justificatifCni;

    await this.prisma.$transaction([
      this.prisma.person.update({
        where: { id: personId },
        data: { matricule },
      }),
      this.prisma.student.update({
        where: { personId },
        data: {
          numeroCarteEtudiant: matricule,
          statutInscription: 'valide',
          ...updates,
        },
      }),
    ]);
    if (person.user) {
      const passwordHash = await bcrypt.hash(matricule, 10);
      await this.prisma.user.update({
        where: { id: person.user.id },
        data: { passwordHash },
      });
    }
    await this.prisma.inscription.updateMany({
      where: { personId, statut: 'PROVISOIRE' },
      data: { statut: 'INSCRIT' },
    });

    const inscriptionsSansCohorte = await this.prisma.inscription.findMany({
      where: {
        personId,
        cohortId: null,
        statut: { in: ['INSCRIT', 'VALIDE'] },
      },
      select: { id: true },
    });
    for (const ins of inscriptionsSansCohorte) {
      try {
        await this.inscriptionsService.assignInscriptionToCohort(
          ins.id,
          userId,
        );
      } catch (err) {
        // Ne pas faire échouer la validation du dossier si l'affectation échoue (ex. aucune formation)
        if (
          err instanceof NotFoundException ||
          err instanceof BadRequestException
        ) {
          // Log silencieux ou à remonter selon la politique
        } else {
          throw err;
        }
      }
    }

    return this.findOne(personId);
  }

  /**
   * Création complète étudiant (legacy, sans inscription) : Person + User + Student avec tous les champs.
   * @deprecated Préférer createStudentWithInscription pour les nouvelles inscriptions.
   */
  async createStudentFull(data: {
    nom: string;
    prenom: string;
    dateNaissance?: string;
    lieuNaissance?: string;
    numeroCarteEtudiant: string;
    cinOuPasseport?: string;
    telephone?: string;
    adresse?: string;
    telephoneParent?: string;
    telephoneTuteur?: string;
    typeBac?: string;
    groupeSanguin?: string;
    antecedentsMedicaux?: string;
    maladiesSignalees?: string;
    email?: string;
    password?: string;
  }) {
    const carte = data.numeroCarteEtudiant?.trim();
    if (!carte)
      throw new ConflictException('Le numéro de carte étudiant est requis');
    const existingCarte = await this.prisma.student.findUnique({
      where: { numeroCarteEtudiant: carte },
    });
    if (existingCarte)
      throw new ConflictException(
        'Ce numéro de carte étudiant est déjà utilisé',
      );

    const prefix = 'STU';
    const matricule = await this.generateMatricule(prefix);
    let userId: string | undefined;
    const email = data.email?.trim();
    if (email && data.prenom && data.nom) {
      const hash = data.password
        ? await bcrypt.hash(data.password, 10)
        : await bcrypt.hash('password123', 10);
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash: hash,
          role: 'STUDENT',
          firstName: data.prenom.trim(),
          lastName: data.nom.trim(),
        },
      });
      userId = user.id;
    }

    const person = await this.prisma.person.create({
      data: {
        matricule,
        type: 'STUDENT',
        dateNaissance: data.dateNaissance
          ? new Date(data.dateNaissance)
          : undefined,
        userId,
      },
    });

    await this.prisma.student.create({
      data: {
        personId: person.id,
        numeroCarteEtudiant: carte,
        cinOuPasseport: data.cinOuPasseport?.trim() || undefined,
        lieuNaissance: data.lieuNaissance?.trim() || undefined,
        telephone: data.telephone?.trim() || undefined,
        adresse: data.adresse?.trim() || undefined,
        telephoneParent: data.telephoneParent?.trim() || undefined,
        telephoneTuteur: data.telephoneTuteur?.trim() || undefined,
        typeBac: data.typeBac?.trim() || undefined,
        groupeSanguin: data.groupeSanguin?.trim() || undefined,
        antecedentsMedicaux: data.antecedentsMedicaux?.trim() || undefined,
        maladiesSignalees: data.maladiesSignalees?.trim() || undefined,
      },
    });

    return this.prisma.person.findUnique({
      where: { id: person.id },
      include: { user: true, student: true },
    });
  }

  /** Génère un matricule enseignant unique : PATS + 4 chiffres (ex. PATS0001). */
  private async generateMatriculePATS(): Promise<string> {
    const persons = await this.prisma.person.findMany({
      where: { matricule: { startsWith: 'PATS' }, type: 'TEACHER' },
      select: { matricule: true },
      orderBy: { matricule: 'desc' },
      take: 1,
    });
    const last = persons[0]?.matricule;
    const num = last ? parseInt(last.replace(/^PATS/, ''), 10) + 1 : 1;
    const matricule = `PATS${String(num).padStart(4, '0')}`;
    const exists = await this.prisma.person.findUnique({
      where: { matricule },
    });
    if (exists)
      throw new ConflictException(
        'Impossible de générer un matricule PATS unique. Réessayez.',
      );
    return matricule;
  }

  /** Photo de profil (badge PDF) : même stockage que /users/:id/photo, autorisé pour les rôles CAN_WRITE_TEACHER_RECORD. */
  async uploadTeacherProfilePhoto(
    personId: string,
    file: { buffer: Buffer; originalname?: string; mimetype?: string },
  ) {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      select: { type: true, userId: true },
    });
    if (!person || person.type !== 'TEACHER' || !person.userId) {
      throw new NotFoundException(
        'Enseignant non trouvé ou sans compte utilisateur.',
      );
    }
    const mime = (file.mimetype || '').toLowerCase();
    const name = (file.originalname || '').toLowerCase();
    const extOk = /\.(jpe?g|png)$/.test(name);
    if (mime && !['image/jpeg', 'image/png'].includes(mime)) {
      throw new BadRequestException('Photo : JPEG ou PNG uniquement.');
    }
    if (!mime && !extOk) {
      throw new BadRequestException(
        'Photo : fichier .jpg, .jpeg ou .png uniquement.',
      );
    }
    return this.usersService.uploadProfilePhoto(person.userId, file);
  }

  async updateTeacher(
    personId: string,
    data: {
      typeContrat?: string;
      niveauEtude?: string;
      articlesPublies?: number;
      rangGrade?: string;
      bioAcademique?: string;
      dateFin?: Date;
    },
  ) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { personId },
    });
    if (!teacher) throw new NotFoundException('Enseignant non trouvé');
    return this.prisma.teacher.update({
      where: { personId },
      data: {
        ...(data.typeContrat !== undefined && {
          typeContrat: data.typeContrat,
        }),
        ...(data.niveauEtude !== undefined && {
          niveauEtude: data.niveauEtude,
        }),
        ...(data.articlesPublies !== undefined && {
          articlesPublies: data.articlesPublies,
        }),
        ...(data.rangGrade !== undefined && { rangGrade: data.rangGrade }),
        ...(data.bioAcademique !== undefined && {
          bioAcademique: data.bioAcademique,
        }),
        ...(data.dateFin !== undefined && { dateFin: data.dateFin }),
      },
    });
  }

  /** Profil enseignant connecté (pour espace personnel, inclut bio). */
  async getTeacherMe(userId: string) {
    const person = await this.prisma.person.findFirst({
      where: { userId, type: 'TEACHER' },
      include: {
        teacher: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
          },
        },
      },
    });
    if (!person?.teacher) throw new NotFoundException('Enseignant non trouvé.');
    return { person, teacher: person.teacher, user: person.user };
  }

  /** Mise à jour par l'enseignant connecté de sa propre bio (résumé de parcours académique). */
  async updateTeacherMe(userId: string, data: { bioAcademique?: string }) {
    const person = await this.prisma.person.findFirst({
      where: { userId, type: 'TEACHER' },
      include: { teacher: true },
    });
    if (!person?.teacher) throw new NotFoundException('Enseignant non trouvé.');
    return this.prisma.teacher.update({
      where: { personId: person.id },
      data: { bioAcademique: data.bioAcademique ?? undefined },
    });
  }

  async updateStudent(
    personId: string,
    data: {
      statutInscription?: string;
      telephone?: string;
      adresse?: string;
      nomTuteur?: string;
      telephoneParent?: string;
      telephoneTuteur?: string;
      lienParente?: string;
      groupeSanguin?: string;
      antecedentsMedicaux?: string;
      maladiesSignalees?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
    },
  ) {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      include: { student: true, user: true },
    });
    if (!person?.student) throw new NotFoundException('Étudiant non trouvé.');
    const { firstName, lastName, email, ...studentData } = data;
    if (Object.keys(studentData).length) {
      await this.prisma.student.update({
        where: { personId },
        data: studentData,
      });
    }
    if (
      person.user &&
      (firstName !== undefined || lastName !== undefined || email !== undefined)
    ) {
      await this.prisma.user.update({
        where: { id: person.user.id },
        data: {
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(email !== undefined && { email }),
        },
      });
    }
    return this.findOne(personId);
  }

  /** Changement de statut en masse (Inscrit / Suspendu / En attente). */
  async bulkUpdateStudentStatus(
    personIds: string[],
    statutInscription: string,
  ) {
    if (!personIds?.length) return { updated: 0 };
    const valid = ['valide', 'en_attente', 'incomplet', 'suspendu'].includes(
      statutInscription,
    )
      ? statutInscription
      : 'en_attente';
    const r = await this.prisma.student.updateMany({
      where: { personId: { in: personIds } },
      data: { statutInscription: valid },
    });
    return { updated: r.count };
  }

  /** Transfert en masse vers une classe (cohorte). Utilise les inscriptions de l'année en cours. */
  async bulkTransferToCohort(
    personIds: string[],
    cohortId: string,
    anneeUniv?: number,
    userId?: string,
  ) {
    if (!personIds?.length) return { updated: 0 };
    const cohort = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
      include: { formation: true },
    });
    if (!cohort) throw new NotFoundException('Classe non trouvée');
    const an = anneeUniv ?? new Date().getFullYear();
    const inscriptions = await this.prisma.inscription.findMany({
      where: {
        personId: { in: personIds },
        formationId: cohort.formationId,
        anneeUniv: an,
        statut: 'VALIDE',
      },
      select: { id: true },
    });
    const ids = inscriptions.map((i) => i.id);
    if (ids.length === 0) return { updated: 0 };
    return this.inscriptionsService.bulkAssignToCohort(
      { cohortId, inscriptionIds: ids },
      userId,
    );
  }

  /** Export liste d'étudiants (Excel ou PDF). */
  async exportStudents(
    personIds: string[],
    format: 'excel' | 'pdf',
  ): Promise<Buffer> {
    const persons = await this.prisma.person.findMany({
      where: { id: { in: personIds }, type: 'STUDENT' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        student: true,
        inscriptions: {
          include: { formation: { include: { filiere: true } }, cohort: true },
        },
      },
      orderBy: { matricule: 'asc' },
    });
    if (format === 'excel') {
      const XLSX = require('xlsx');
      const rows: (string | number)[][] = [
        [
          'Matricule',
          'Nom',
          'Prénom',
          'Email',
          'Filière',
          'Formation',
          'Classe',
          'Statut',
        ],
        ...persons.map((p) => {
          const ins = p.inscriptions?.[0];
          const formation = ins?.formation;
          const cohort = ins?.cohort;
          return [
            p.matricule,
            p.user?.lastName ?? '',
            p.user?.firstName ?? '',
            p.user?.email ?? '',
            formation?.filiere?.nom ?? '',
            formation?.nom ?? '',
            cohort ? `${cohort.nom} ${cohort.section || ''}`.trim() : '',
            p.student?.statutInscription ?? '',
          ];
        }),
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Étudiants');
      return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    }
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    let page = doc.addPage([595, 842]);
    let y = 820;
    const lineHeight = 12;
    const draw = (
      p: { drawText: (t: string, o: object) => void },
      text: string,
      size = 10,
    ) => {
      p.drawText(text, { x: 50, y, size, font, color: rgb(0, 0, 0) });
    };
    draw(page, 'Liste des étudiants exportés', 14);
    y -= 18;
    draw(page, `Généré le ${new Date().toLocaleDateString('fr-FR')}`, 9);
    y -= 12;
    for (const p of persons) {
      if (y < 60) {
        page = doc.addPage([595, 842]);
        y = 820;
      }
      const ins = p.inscriptions?.[0];
      draw(
        page,
        `${p.matricule} — ${p.user?.lastName ?? ''} ${p.user?.firstName ?? ''} — ${ins?.formation?.nom ?? ''} — ${p.student?.statutInscription ?? ''}`,
      );
      y -= lineHeight;
    }
    return Buffer.from(await doc.save());
  }

  /** Génère une attestation de scolarité PDF pour un étudiant. */
  async generateAttestationPdf(personId: string): Promise<Buffer> {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      include: {
        user: true,
        student: true,
        inscriptions: {
          include: { formation: { include: { filiere: true } }, cohort: true },
        },
      },
    });
    if (!person?.student) throw new NotFoundException('Étudiant non trouvé.');
    const ins = person.inscriptions?.[0];
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([595, 842]);
    const nom = person.user
      ? `${person.user.firstName} ${person.user.lastName}`
      : person.matricule;
    const formationNom = ins?.formation?.nom ?? '–';
    const cohortNom = ins?.cohort
      ? `${ins.cohort.nom} ${ins.cohort.section || ''}`.trim()
      : '–';
    const anneeUniv = ins?.anneeUniv ?? new Date().getFullYear();
    let y = 750;
    const draw = (text: string, size = 12) => {
      page.drawText(text, { x: 80, y, size, font, color: rgb(0, 0, 0) });
      y -= size + 6;
    };
    draw('ATTESTATION DE SCOLARITÉ', 16);
    y -= 20;
    draw(
      `Je soussigné(e) certifie que M./Mme ${nom.toUpperCase()}, matricule ${person.matricule},`,
    );
    draw(
      `est régulièrement inscrit(e) pour l'année universitaire ${anneeUniv}-${anneeUniv + 1}`,
    );
    draw(`en ${formationNom}, classe ${cohortNom}.`);
    y -= 30;
    draw(`Fait pour servir et valoir ce que de droit.`);
    draw(`Généré le ${new Date().toLocaleDateString('fr-FR')}.`);
    return Buffer.from(await doc.save());
  }

  /**
   * Carte étudiant PDF : même gabarit que le badge unifié (QR + code-barres, grille identité).
   * Nécessite un compte utilisateur lié à la personne.
   */
  async generateCarteEtudiantPdf(personId: string): Promise<Buffer> {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      select: { userId: true, type: true, student: { select: { id: true } } },
    });
    if (!person?.student) throw new NotFoundException('Étudiant non trouvé.');
    if (!person.userId) {
      throw new BadRequestException(
        'Impossible de générer la carte : aucun compte utilisateur lié à cet étudiant.',
      );
    }
    return this.buildUserBadgePdf(person.userId);
  }

  /**
   * Fiche d'inscription administrative : logo (optionnel), photo étudiant, identité, parcours, santé, inscription.
   * Logo : ESTABLISHMENT_LOGO_PATH ou fichier assets/establishment-logo.png|.jpg
   */
  async generateFicheInscriptionPdf(personId: string): Promise<Buffer> {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      include: {
        user: true,
        student: true,
        inscriptions: {
          orderBy: { anneeUniv: 'desc' },
          take: 1,
          include: {
            formation: { include: { filiere: true } },
            cohort: true,
            campus: true,
            semestre: true,
            maquette: { select: { code: true, anneeRef: true } },
          },
        },
      },
    });
    if (!person?.student) throw new NotFoundException('Étudiant non trouvé.');
    const st = person.student;
    const ins = person.inscriptions[0];

    const branding = await this.prisma.appSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { appName: true, logoUrl: true },
    });
    const establishmentName =
      branding?.appName?.trim() ||
      process.env.ESTABLISHMENT_NAME?.trim() ||
      'Établissement';

    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const pageW = 595;
    const pageH = 842;
    const margin = 48;
    let page = doc.addPage([pageW, pageH]);
    let y = pageH - margin;

    const logoFromSettings = branding?.logoUrl?.trim()
      ? path.join(process.cwd(), branding.logoUrl.replace(/^\//, ''))
      : '';
    const logoCandidates = [
      logoFromSettings,
      process.env.ESTABLISHMENT_LOGO_PATH?.trim(),
      path.join(process.cwd(), 'assets', 'establishment-logo.png'),
      path.join(process.cwd(), 'assets', 'establishment-logo.jpg'),
    ].filter((p): p is string => Boolean(p));

    for (const logoPath of logoCandidates) {
      if (!fs.existsSync(logoPath)) continue;
      try {
        const buf = fs.readFileSync(logoPath);
        const lower = logoPath.toLowerCase();
        const img = lower.endsWith('.png')
          ? await doc.embedPng(buf)
          : await doc.embedJpg(buf);
        const scale = Math.min(110 / img.width, 52 / img.height);
        const iw = img.width * scale;
        const ih = img.height * scale;
        page.drawImage(img, { x: margin, y: y - ih, width: iw, height: ih });
        y -= ih + 10;
        break;
      } catch {
        /* essai suivant */
      }
    }

    page.drawText(establishmentName, {
      x: margin,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.15, 0.15, 0.2),
    });
    y -= 22;
    page.drawText("FICHE D'INSCRIPTION", {
      x: margin,
      y,
      size: 15,
      font: fontBold,
      color: rgb(0, 0.15, 0.45),
    });
    y -= 28;

    const photoRel = st.photoProfil?.trim();
    if (photoRel) {
      const photoPath = path.join(process.cwd(), photoRel.replace(/^\//, ''));
      if (fs.existsSync(photoPath)) {
        try {
          const pbuf = fs.readFileSync(photoPath);
          const lowerP = photoPath.toLowerCase();
          const pimg = lowerP.endsWith('.png')
            ? await doc.embedPng(pbuf)
            : await doc.embedJpg(pbuf);
          const targetW = 88;
          let ph = (targetW / pimg.width) * pimg.height;
          let pw = targetW;
          if (ph > 108) {
            ph = 108;
            pw = (ph / pimg.height) * pimg.width;
          }
          const imgBottom = pageH - margin - ph;
          page.drawImage(pimg, {
            x: pageW - margin - pw,
            y: imgBottom,
            width: pw,
            height: ph,
          });
        } catch {
          /* pas de photo dans le PDF */
        }
      }
    }

    y = Math.min(y, pageH - margin - 120);
    const fmtDate = (d: Date | null | undefined) =>
      d ? d.toLocaleDateString('fr-FR') : '—';

    const newPageIfNeeded = () => {
      if (y < 72) {
        page = doc.addPage([pageW, pageH]);
        y = pageH - margin;
      }
    };

    const drawSection = (title: string) => {
      y -= 6;
      newPageIfNeeded();
      page.drawText(title, {
        x: margin,
        y,
        size: 11,
        font: fontBold,
        color: rgb(0.1, 0.12, 0.35),
      });
      y -= 14;
    };

    const drawLine = (label: string, value: string | undefined | null) => {
      newPageIfNeeded();
      const v = (value ?? '').toString().trim() || '—';
      let text = `${label} : ${v}`;
      if (text.length > 105) text = `${text.slice(0, 102)}...`;
      page.drawText(text, { x: margin, y, size: 9, font, color: rgb(0, 0, 0) });
      y -= 11;
    };

    drawSection('Identité et coordination');
    drawLine('Nom', person.user?.lastName);
    drawLine('Prénom', person.user?.firstName);
    drawLine('Email', person.user?.email);
    drawLine('Matricule / N° carte', person.matricule);
    drawLine('CIN ou passeport', st.cinOuPasseport);
    drawLine('Date de naissance', fmtDate(person.dateNaissance));
    drawLine('Lieu de naissance', st.lieuNaissance);
    drawLine('Nationalité', st.nationalite);
    drawLine('Genre', st.genre);
    drawLine('Téléphone', st.telephone);
    drawLine('Adresse', st.adresse);

    drawSection('Parcours');
    drawLine('Dernier diplôme', st.dernierDiplome);
    drawLine(
      "Année d'obtention",
      st.anneeObtention != null ? String(st.anneeObtention) : undefined,
    );
    drawLine('Mention', st.mention);
    drawLine("Établissement d'origine", st.etablissementOrigine);
    drawLine('Type de bac', st.typeBac);

    drawSection('Contact urgence');
    drawLine('Nom du tuteur / responsable', st.nomTuteur);
    drawLine('Téléphone parent', st.telephoneParent);
    drawLine('Téléphone tuteur', st.telephoneTuteur);
    drawLine('Lien de parenté', st.lienParente);

    drawSection('Santé');
    drawLine('Groupe sanguin', st.groupeSanguin);
    drawLine('Antécédents médicaux', st.antecedentsMedicaux);
    drawLine('Maladies signalées', st.maladiesSignalees);

    drawSection('Inscription pédagogique');
    if (ins) {
      drawLine('Année universitaire', `${ins.anneeUniv}–${ins.anneeUniv + 1}`);
      drawLine('Filière', ins.formation.filiere?.nom);
      drawLine('Formation', `${ins.formation.code} — ${ins.formation.nom}`);
      drawLine(
        'Classe (cohorte)',
        ins.cohort
          ? `${ins.cohort.nom}${ins.cohort.section ? ` — section ${ins.cohort.section}` : ''}`
          : undefined,
      );
      drawLine('Campus', ins.campus?.nom ?? undefined);
      drawLine('Semestre', `S${ins.semestre.numero}`);
      drawLine(
        'Maquette',
        ins.maquette
          ? `${ins.maquette.code} (réf. ${ins.maquette.anneeRef})`
          : undefined,
      );
      drawLine('Statut inscription (admin.)', ins.statut);
    } else {
      drawLine('Inscription', 'Aucune inscription enregistrée');
    }
    drawLine('Statut dossier étudiant', st.statutInscription);

    drawSection('Pièces jointes');
    drawLine("Photo d'identité", st.photoProfil ? 'Fournie' : 'Non fournie');
    drawLine('Justificatif bac', st.justificatifBac ? 'Fourni' : 'Non fourni');
    drawLine('Justificatif CNI', st.justificatifCni ? 'Fourni' : 'Non fourni');

    y -= 10;
    newPageIfNeeded();
    page.drawText(`Document généré le ${new Date().toLocaleString('fr-FR')}`, {
      x: margin,
      y,
      size: 8,
      font,
      color: rgb(0.45, 0.45, 0.45),
    });

    return Buffer.from(await doc.save());
  }

  /**
   * La scolarité peut supprimer des étudiants mais pas des enseignants (création / suppression réservées au pédagogique + admin).
   */
  async assertScolariteMayDeletePersons(
    userRole: string | undefined,
    ids: string[],
  ) {
    if (userRole !== 'SCOLARITE' || ids.length === 0) return;
    const teacherCount = await this.prisma.person.count({
      where: { id: { in: ids }, type: 'TEACHER' },
    });
    if (teacherCount > 0) {
      throw new ForbiddenException(
        'La scolarité ne peut pas supprimer des comptes enseignants. Contactez le service pédagogique ou un administrateur.',
      );
    }
  }

  async delete(id: string) {
    return this.prisma.person.delete({ where: { id } });
  }

  async bulkDeletePersons(ids: string[]) {
    const r = await this.prisma.person.deleteMany({
      where: { id: { in: ids } },
    });
    return { deleted: r.count };
  }

  /**
   * Badge PDF pour tout utilisateur (bandeau + bande latérale couleur primaire, texte centré dans le bandeau).
   * Bas : QR (lien pointage enseignant / espace étudiant) au-dessus du code-barres Code 128.
   * Attribue un code badge unique si absent.
   */
  async buildUserBadgePdf(userId: string): Promise<Buffer> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        person: {
          include: {
            teacher: true,
            student: true,
            inscriptions: {
              where: { statut: { not: 'ANNULEE' } },
              orderBy: [{ anneeUniv: 'desc' }, { createdAt: 'desc' }],
              take: 1,
              include: {
                formation: { include: { filiere: true } },
                campus: true,
              },
            },
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé.');
    }

    if (user.badgeActive === false) {
      throw new ForbiddenException(
        'Ce badge a été désactivé. Contactez l’administration pour le réactiver.',
      );
    }

    let badgeBarcode = user.badgeBarcode?.trim();
    if (!badgeBarcode) {
      const ref =
        user.person?.student?.numeroCarteEtudiant ??
        user.person?.matricule ??
        user.matricule ??
        user.id;
      const safe = String(ref).replace(/[^A-Za-z0-9-]/g, '') || 'X';
      const prefix =
        user.role === 'STUDENT' || user.person?.type === 'STUDENT'
          ? 'STU'
          : user.role === 'TEACHER' || user.person?.type === 'TEACHER'
            ? 'ENS'
            : 'STA';
      badgeBarcode = `${prefix}-${safe}-${user.id.slice(-6).toUpperCase()}`;
      await this.prisma.user.update({
        where: { id: userId },
        data: { badgeBarcode },
      });
    }

    const settings = await this.appearance.getSettings();
    const establishment = settings.appName?.trim() || 'Établissement';
    const websiteLine =
      settings.websiteUrl?.trim() ||
      process.env.BADGE_WEBSITE_URL?.trim() ||
      '';

    const ins = user.person?.inscriptions?.[0];
    const formationNom = ins?.formation?.nom ?? '';
    const filiereNom = ins?.formation?.filiere?.nom ?? '';

    const regDisplay = String(
      user.person?.student?.numeroCarteEtudiant ??
        user.person?.matricule ??
        user.matricule ??
        user.id.slice(0, 14),
    );

    let programLine = formationNom || '—';
    let facultyLine = filiereNom || ins?.campus?.nom || '—';

    if (user.role === 'TEACHER' || user.person?.type === 'TEACHER') {
      programLine = user.jobTitle?.trim() || 'Corps enseignant';
      facultyLine =
        user.person?.teacher?.rangGrade?.trim() || user.service?.trim() || '—';
    } else if (user.person?.type === 'STUDENT' && !formationNom) {
      programLine = '—';
    } else if (!user.person?.student && user.person?.type !== 'TEACHER') {
      programLine = user.jobTitle?.trim() || user.service?.trim() || '—';
      facultyLine = user.service?.trim() || '—';
    }

    const displayName = `${user.firstName} ${user.lastName}`
      .trim()
      .toUpperCase();
    const verticalRole = this.badgeVerticalRoleEnglish(user);

    const photoPathLegacy =
      user.person?.student?.photoProfil?.trim() ||
      user.profilePhotoUrl?.trim() ||
      null;

    const qrPayload = await this.usersService.buildBadgePdfQrPayload(userId);

    const unifiedCtx = this.composeUnifiedModernBadgeContext(user, {
      settings,
      badgeBarcode,
      establishment,
      websiteLine,
      qrPayload,
    });

    try {
      return await this.renderUnifiedModernBadgePdf(unifiedCtx);
    } catch (e) {
      this.logger.warn(
        `renderUnifiedModernBadgePdf échoué, repli institutionnel: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    return this.buildStandardInstitutionalBadgePdf({
      user,
      settings,
      badgeBarcode,
      establishment,
      websiteLine,
      regDisplay,
      programLine,
      facultyLine,
      displayName,
      verticalRole,
      photoPath: photoPathLegacy,
    });
  }

  private badgeVal(s?: string | null): string {
    return s?.trim() ? s.trim() : '—';
  }

  /** Libellé français du rôle pour la ligne « profil » (personnel sans fiche métier détaillée). */
  private badgeRoleLabelFr(role: string): string {
    const m: Record<string, string> = {
      STUDENT: 'Étudiant',
      TEACHER: 'Enseignant',
      ADMIN: 'Administrateur',
      SUPER_ADMIN: 'Super administrateur',
      SCOLARITE: 'Scolarité',
      SERVICE_PEDAGOGIQUE: 'Service pédagogique',
      RESPONSABLE_PEDAGOGIQUE: 'Responsable pédagogique',
      AGENT_PEDAGOGIQUE: 'Agent pédagogique',
      DEPT_HEAD: 'Chef de département',
      AUDITOR: 'Auditeur',
      CAISSIER: 'Caissier',
      CHEF_COMPTABLE: 'Chef comptable',
      DAF: 'DAF',
      STAFF: 'Personnel',
    };
    return m[role] ?? role;
  }

  /**
   * Contenu du badge « carte unifiée » : même mise en page pour tous, champs selon le profil.
   */
  private composeUnifiedModernBadgeContext(
    user: {
      id: string;
      role: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
      address: string | null;
      jobTitle: string | null;
      service: string | null;
      matricule: string | null;
      profilePhotoUrl: string | null;
      person: null | {
        type: string;
        matricule: string;
        teacher: { typeContrat: string; rangGrade: string | null } | null;
        student: {
          numeroCarteEtudiant: string;
          adresse: string | null;
          telephone: string | null;
          photoProfil: string | null;
        } | null;
        inscriptions?: Array<{
          formation: { nom: string; filiere: { nom: string } | null } | null;
          campus: { nom: string } | null;
        }>;
      };
    },
    pack: {
      settings: Awaited<ReturnType<AppearanceService['getSettings']>>;
      badgeBarcode: string;
      establishment: string;
      websiteLine: string;
      qrPayload: string;
    },
  ): UnifiedModernBadgeContext {
    const année = this.currentAnneeUnivBadgeLabel();
    const v = (x?: string | null) => this.badgeVal(x);
    const refBadge =
      pack.badgeBarcode.length > 18
        ? `…${pack.badgeBarcode.slice(-14)}`
        : pack.badgeBarcode;

    if (user.person?.type === 'TEACHER' && user.person.teacher) {
      const spé =
        user.person.teacher.rangGrade?.trim() ||
        user.jobTitle?.trim() ||
        user.service?.trim() ||
        '—';
      return {
        firstName: user.firstName,
        lastName: user.lastName,
        photoPath: user.profilePhotoUrl?.trim() || null,
        heroSubtitle: 'Enseignant',
        rows: [
          {
            leftLabel: 'Spécialité / grade',
            leftValue: v(spé),
            rightLabel: 'Année universitaire',
            rightValue: année,
          },
          {
            leftLabel: 'Identifiant',
            leftValue: v(user.person.matricule),
            rightLabel: 'Réf. badge',
            rightValue: v(refBadge),
          },
        ],
        ...pack,
      };
    }

    if (user.person?.type === 'STUDENT') {
      const st = user.person.student;
      const photoPath =
        st?.photoProfil?.trim() || user.profilePhotoUrl?.trim() || null;
      const ins = user.person.inscriptions?.[0];
      const formationNom = ins?.formation?.nom?.trim() ?? '';
      const filiereNom = ins?.formation?.filiere?.nom?.trim() ?? '';
      const campusNom = ins?.campus?.nom?.trim() ?? '';
      const formationLine =
        [formationNom, filiereNom || campusNom].filter(Boolean).join(' — ') ||
        '—';
      const carte = st?.numeroCarteEtudiant?.trim();
      const idLine =
        carte && carte !== user.person.matricule
          ? `${user.person.matricule} · ${carte}`
          : user.person.matricule;

      return {
        firstName: user.firstName,
        lastName: user.lastName,
        photoPath,
        heroSubtitle: 'Étudiant',
        rows: [
          {
            leftLabel: 'Formation',
            leftValue: v(formationLine),
            rightLabel: 'Année universitaire',
            rightValue: année,
          },
          {
            leftLabel: 'Identifiant',
            leftValue: v(idLine),
            rightLabel: 'Réf. badge',
            rightValue: v(refBadge),
          },
        ],
        ...pack,
      };
    }

    const matPerso =
      user.person?.matricule?.trim() || user.matricule?.trim() || '';
    const svc =
      user.service?.trim() ||
      user.jobTitle?.trim() ||
      this.badgeRoleLabelFr(user.role);

    return {
      firstName: user.firstName,
      lastName: user.lastName,
      photoPath: user.profilePhotoUrl?.trim() || null,
      heroSubtitle: 'Personnel',
      rows: [
        {
          leftLabel: 'Service',
          leftValue: v(svc),
          rightLabel: 'Année universitaire',
          rightValue: année,
        },
        {
          leftLabel: 'Identifiant',
          leftValue: v(matPerso),
          rightLabel: 'Réf. badge',
          rightValue: v(refBadge),
        },
      ],
      ...pack,
    };
  }

  /** Badge institutionnel (non-enseignant) : bandeau + bande latérale, QR + code-barres. */
  private async buildStandardInstitutionalBadgePdf(ctx: {
    user: { id: string; role: string; person: { type: string } | null };
    settings: Awaited<ReturnType<AppearanceService['getSettings']>>;
    badgeBarcode: string;
    establishment: string;
    websiteLine: string;
    regDisplay: string;
    programLine: string;
    facultyLine: string;
    displayName: string;
    verticalRole: string;
    photoPath: string | null;
  }): Promise<Buffer> {
    const {
      user,
      settings,
      badgeBarcode,
      establishment,
      websiteLine,
      regDisplay,
      programLine,
      facultyLine,
      displayName,
      verticalRole,
      photoPath,
    } = ctx;

    const { PDFDocument, StandardFonts, rgb, degrees } =
      await import('pdf-lib');

    const W = 486;
    const H = 306;
    const headerH = 52;
    const sidebarW = 50;
    const primaryTriplet = this.parsePrimaryColorHex(settings.primaryColor);
    const orange = primaryTriplet
      ? rgb(primaryTriplet[0], primaryTriplet[1], primaryTriplet[2])
      : rgb(0.93, 0.42, 0.08);

    const doc = await PDFDocument.create();
    const page = doc.addPage([W, H]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    page.drawRectangle({
      x: 0,
      y: H - headerH,
      width: W,
      height: headerH,
      color: orange,
    });
    page.drawRectangle({
      x: 0,
      y: 0,
      width: sidebarW,
      height: H - headerH,
      color: orange,
    });

    const tryEmbedFile = async (
      url: string | null | undefined,
      w: number,
      hMax: number,
    ): Promise<{
      img: Awaited<ReturnType<typeof doc.embedPng>>;
      w: number;
      h: number;
    } | null> => {
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
        const h = Math.min(hMax, (img.height / img.width) * w);
        return { img, w, h };
      } catch {
        return null;
      }
    };

    const logo = await tryEmbedFile(settings.logoUrl, 36, headerH - 16);
    const logoX = 12;
    const logoY = H - headerH + 10;
    if (logo) {
      page.drawImage(logo.img, {
        x: logoX,
        y: logoY,
        width: logo.w,
        height: logo.h,
      });
    }

    const logoEnd = logo ? logoX + logo.w + 14 : sidebarW + 8;
    const headerRightPad = 14;
    const titleMaxW = W - logoEnd - headerRightPad;
    const headerTitle = this.fitPdfLine(establishment, titleMaxW, 13, fontBold);
    const titleW = fontBold.widthOfTextAtSize(headerTitle, 13);
    const titleX =
      logoEnd + Math.max(0, (W - logoEnd - headerRightPad - titleW) / 2);
    page.drawText(headerTitle, {
      x: titleX,
      y: H - 26,
      size: 13,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    if (websiteLine) {
      const wl = this.fitPdfLine(websiteLine, titleMaxW, 7, font);
      const wwl = font.widthOfTextAtSize(wl, 7);
      page.drawText(wl, {
        x: logoEnd + Math.max(0, (W - logoEnd - headerRightPad - wwl) / 2),
        y: H - 42,
        size: 7,
        font,
        color: rgb(0.88, 0.92, 1),
      });
    }

    /** Rôle sur la bande latérale (lecture bas → haut, rotation CCW). */
    page.drawText(verticalRole, {
      x: 20,
      y: 68,
      size: 16,
      font: fontBold,
      color: rgb(1, 1, 1),
      rotate: degrees(90),
    });

    const cx = sidebarW + 14;
    let ty = H - headerH - 16;
    const textBlack = rgb(0.08, 0.08, 0.08);
    const textMuted = rgb(0.4, 0.4, 0.4);

    page.drawText(this.fitPdfLine(displayName, W - cx - 96, 13, fontBold), {
      x: cx,
      y: ty,
      size: 13,
      font: fontBold,
      color: textBlack,
    });
    ty -= 22;

    const drawLabeled = (label: string, value: string) => {
      const v = this.fitPdfLine(value, W - cx - 108, 9, fontBold);
      page.drawText(label, { x: cx, y: ty, size: 9, font, color: textMuted });
      const lw = font.widthOfTextAtSize(`${label} `, 9);
      page.drawText(v, {
        x: cx + lw,
        y: ty,
        size: 9,
        font: fontBold,
        color: textBlack,
      });
      ty -= 17;
    };

    drawLabeled('N° enreg. : ', regDisplay);
    drawLabeled('Programme : ', programLine);
    drawLabeled('Faculté / structure : ', facultyLine);

    /** QR : lien pointage / séance (enseignant) ou espace étudiant ; secours payload signé. */
    const qrContent = this.usersService.getBadgePresenceQrContent({
      id: user.id,
      role: user.role,
      person: user.person,
    });
    const qrBuf = await QRCode.toBuffer(qrContent, {
      type: 'png',
      width: 240,
      margin: 1,
      errorCorrectionLevel: 'M',
    });
    const qrImg = await doc.embedPng(qrBuf);
    const qrSize = 92;

    const barcodeBuf = await bwipjs.toBuffer({
      bcid: 'code128',
      text: badgeBarcode.replace(/\s/g, ''),
      scale: 2,
      height: 11,
      includetext: true,
      textsize: 7,
    });
    const bcImg = await doc.embedPng(barcodeBuf);
    const bcW = 162;
    const bcH = (bcImg.height / bcImg.width) * bcW;

    /** Bas de carte : code-barres tout en bas ; QR au-dessus (pointage / début de séance). */
    const bottomPad = 10;
    const stackGap = 8;
    const bcY = bottomPad;
    const qrY = bcY + bcH + stackGap;
    page.drawImage(qrImg, { x: cx, y: qrY, width: qrSize, height: qrSize });
    page.drawImage(bcImg, { x: cx, y: bcY, width: bcW, height: bcH });

    const photo = await tryEmbedFile(photoPath, 82, 82);
    const ph = 78;
    const phX = W - ph - 18;
    const phY = bottomPad;
    if (photo) {
      page.drawImage(photo.img, { x: phX, y: phY, width: ph, height: ph });
    }
    page.drawRectangle({
      x: phX,
      y: phY,
      width: ph,
      height: ph,
      borderColor: rgb(0.65, 0.65, 0.65),
      borderWidth: photo ? 0.5 : 0.8,
    });
    if (!photo) {
      page.drawText('Photo', {
        x: phX + 22,
        y: phY + 30,
        size: 9,
        font,
        color: textMuted,
      });
    }

    return Buffer.from(await doc.save());
  }

  /** @deprecated alias — utilisez buildUserBadgePdf */
  async buildTeacherBadgePdf(userId: string): Promise<Buffer> {
    return this.buildUserBadgePdf(userId);
  }

  private currentAnneeUnivBadgeLabel(): string {
    const now = new Date();
    const y = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    return `${y}–${y + 1}`;
  }

  private formatBadgeDateFr(d: Date | string | null | undefined): string {
    if (d == null) return '—';
    const dt = typeof d === 'string' ? new Date(d) : d;
    if (Number.isNaN(dt.getTime())) return '—';
    return dt.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  /** Bleu institutionnel par défaut (proche template carte type #1a3a5c) si aucune couleur primaire. */
  private static readonly BADGE_HEADER_DEFAULT_RGB: [number, number, number] = [
    26 / 255,
    58 / 255,
    92 / 255,
  ];

  /**
   * Bandeau haut « simple » : 3 bandes pleines (léger dégradé vertical), sans low-poly.
   * Encoche visuelle à gauche (fond blanc) pour s’aligner sur la zone photo, comme les modèles carte pro.
   */
  private drawSimpleBrandHeader(
    page: {
      drawRectangle: (o: {
        x: number;
        y: number;
        width: number;
        height: number;
        color: ReturnType<(typeof import('pdf-lib'))['rgb']>;
      }) => void;
    },
    rgbFn: (typeof import('pdf-lib'))['rgb'],
    W: number,
    H: number,
    bh: number,
    br: number,
    bg: number,
    bb: number,
    notch?: { photoCx: number; photoR: number },
  ): void {
    const y0 = H - bh;
    const clamp = (c: number) => Math.min(1, Math.max(0, c));
    const shade = (mul: number) =>
      rgbFn(clamp(br * mul), clamp(bg * mul), clamp(bb * mul));

    const h3 = bh / 3;
    /** Du plus foncé (haut) au plus clair (bas) — rendu sobre type carte d’identité */
    page.drawRectangle({
      x: 0,
      y: y0,
      width: W,
      height: h3,
      color: shade(0.64),
    });
    page.drawRectangle({
      x: 0,
      y: y0 + h3,
      width: W,
      height: h3,
      color: shade(0.82),
    });
    page.drawRectangle({
      x: 0,
      y: y0 + 2 * h3,
      width: W,
      height: h3,
      color: shade(0.98),
    });

    if (notch) {
      const nw = Math.max(0, notch.photoCx - notch.photoR * 0.25);
      const nh = Math.min(bh * 0.42, 48);
      page.drawRectangle({
        x: 0,
        y: H - nh,
        width: nw,
        height: nh,
        color: rgbFn(1, 1, 1),
      });
    }
  }

  /**
   * Badge carte unifiée (enseignant, étudiant, personnel) : même gabarit, contenu via `UnifiedModernBadgeContext`.
   */
  private async renderUnifiedModernBadgePdf(
    ctx: UnifiedModernBadgeContext,
  ): Promise<Buffer> {
    const {
      firstName,
      lastName,
      photoPath,
      heroSubtitle,
      rows: rawRows,
      qrPayload,
      settings,
      badgeBarcode,
      establishment,
      websiteLine,
    } = ctx;

    const rows: UnifiedBadgeGridRow[] = [...rawRows];
    while (rows.length < 2) {
      rows.push({
        leftLabel: '—',
        leftValue: '—',
        rightLabel: '—',
        rightValue: '—',
      });
    }
    if (rows.length > 2) rows.length = 2;
    const pl = await import('pdf-lib');
    const {
      PDFDocument,
      StandardFonts,
      rgb,
      pushGraphicsState,
      popGraphicsState,
      moveTo,
      lineTo,
      closePath,
      setFillingRgbColor,
      fill,
      clip,
    } = pl;

    /** Format carte bancaire ISO 7810 : 85,6 × 54 mm → ~242,6 × 152,9 pt (72 pt/in) */
    const W = Math.round((85.6 / 25.4) * 72);
    const H = Math.round((54 / 25.4) * 72);
    const bannerH = Math.round(H * 0.28);
    const footerBandH = Math.round(H * 0.22);
    const photoR = Math.round(H * 0.14);
    const photoCx = Math.round(W * 0.16);
    const photoCy = H - bannerH;
    const cutR = photoR + 5;

    const primaryTriplet =
      this.parsePrimaryColorHex(settings.primaryColor) ??
      PersonsService.BADGE_HEADER_DEFAULT_RGB;
    const br = primaryTriplet[0];
    const bg = primaryTriplet[1];
    const bb = primaryTriplet[2];

    const doc = await PDFDocument.create();
    const page = doc.addPage([W, H]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const textBlack = rgb(0.06, 0.06, 0.08);
    const textMuted = rgb(0.45, 0.46, 0.5);
    const brandText = rgb(
      Math.min(1, br * 0.95 + 0.02),
      Math.min(1, bg * 0.95 + 0.02),
      Math.min(1, bb * 0.95 + 0.02),
    );
    const white = rgb(1, 1, 1);
    const lineGrey = rgb(0.86, 0.87, 0.9);

    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: white });
    this.drawSimpleBrandHeader(page, rgb, W, H, bannerH, br, bg, bb, {
      photoCx,
      photoR,
    });

    /** Disque blanc derrière la photo (contraste sur le bandeau) */
    page.drawCircle({
      x: photoCx - cutR,
      y: photoCy - cutR,
      size: cutR * 2,
      color: white,
    });

    const tryEmbedFile = async (
      url: string | null | undefined,
      w: number,
      hMax: number,
    ): Promise<{
      img: Awaited<ReturnType<typeof doc.embedPng>>;
      w: number;
      h: number;
    } | null> => {
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
        const h = Math.min(hMax, (img.height / img.width) * w);
        return { img, w, h };
      } catch {
        return null;
      }
    };

    const logo = await tryEmbedFile(settings.logoUrl, 44, bannerH - 18);
    const logoW = logo?.w ?? 38;
    const logoH = logo?.h ?? 38;
    const logoX = W - logoW - 16;
    const logoY = H - bannerH + 16;
    if (logo) {
      page.drawImage(logo.img, {
        x: logoX,
        y: logoY,
        width: logo.w,
        height: logo.h,
      });
    }

    const bannerTextLeft = photoCx + photoR + 14;
    const bannerTextRight = logoX - 10;
    const bannerTitleMax = Math.max(72, bannerTextRight - bannerTextLeft);
    const banTitle = this.fitPdfLine(
      establishment,
      bannerTitleMax,
      13,
      fontBold,
    );
    page.drawText(banTitle, {
      x: bannerTextLeft,
      y: H - 26,
      size: 13,
      font: fontBold,
      color: white,
    });
    if (websiteLine) {
      const wl = this.fitPdfLine(websiteLine, bannerTitleMax, 7, font);
      page.drawText(wl, {
        x: bannerTextLeft,
        y: H - 42,
        size: 7,
        font,
        color: rgb(0.92, 0.94, 0.98),
      });
    }

    const photoImg = await tryEmbedFile(
      photoPath?.trim() || null,
      photoR * 2,
      photoR * 2,
    );
    const clipOps = [pushGraphicsState()];
    const seg = 56;
    for (let i = 0; i <= seg; i++) {
      const t = (i / seg) * Math.PI * 2;
      const x = photoCx + photoR * Math.cos(t);
      const y = photoCy + photoR * Math.sin(t);
      if (i === 0) clipOps.push(moveTo(x, y));
      else clipOps.push(lineTo(x, y));
    }
    clipOps.push(closePath(), clip());
    page.pushOperators(...clipOps);
    if (photoImg) {
      const side = photoR * 2;
      page.drawImage(photoImg.img, {
        x: photoCx - photoR,
        y: photoCy - photoR,
        width: side,
        height: side,
      });
    } else {
      page.pushOperators(
        pushGraphicsState(),
        setFillingRgbColor(0.94, 0.94, 0.96),
        moveTo(photoCx - photoR, photoCy - photoR),
        lineTo(photoCx + photoR, photoCy - photoR),
        lineTo(photoCx + photoR, photoCy + photoR),
        lineTo(photoCx - photoR, photoCy + photoR),
        closePath(),
        fill(),
        popGraphicsState(),
      );
      const ini =
        `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';
      page.drawText(ini, {
        x: photoCx - font.widthOfTextAtSize(ini, 18) / 2,
        y: photoCy - 8,
        size: 18,
        font: fontBold,
        color: textMuted,
      });
    }
    page.pushOperators(popGraphicsState());
    /** Bord blanc épais autour du portrait (comme le template) */
    page.drawCircle({
      x: photoCx - photoR,
      y: photoCy - photoR,
      size: photoR * 2,
      borderColor: white,
      borderWidth: 4,
    });

    const textLeft = photoCx + photoR + 22;
    const textRightMax = W - 20;
    const colGap = Math.floor((textRightMax - textLeft - 8) / 2);
    const col2 = textLeft + colGap + 8;
    const valueMaxW = colGap - 4;

    const fullNameHero = `${firstName} ${lastName}`.trim().toUpperCase();

    let ty = H - bannerH - 8;
    const heroMaxW = textRightMax - textLeft;
    const nameSize = Math.min(13, Math.max(9, H * 0.078));
    page.drawText(this.fitPdfLine(fullNameHero, heroMaxW, nameSize, fontBold), {
      x: textLeft,
      y: ty,
      size: nameSize,
      font: fontBold,
      color: textBlack,
    });
    ty -= nameSize + 4;
    page.drawText(
      this.fitPdfLine(heroSubtitle.toUpperCase(), heroMaxW, 7.5, fontBold),
      {
        x: textLeft,
        y: ty,
        size: 7.5,
        font: fontBold,
        color: brandText,
      },
    );
    ty -= 10;
    page.drawLine({
      start: { x: textLeft, y: ty },
      end: { x: textRightMax, y: ty },
      thickness: 0.5,
      color: lineGrey,
    });
    ty -= 16;

    const drawFieldCell = (
      lx: number,
      label: string,
      value: string,
      y: number,
    ) => {
      const ls = Math.max(5, H * 0.034);
      const vs = Math.max(6.5, H * 0.045);
      page.drawText(label, {
        x: lx,
        y,
        size: ls,
        font: fontBold,
        color: brandText,
      });
      page.drawText(this.fitPdfLine(value, valueMaxW, vs, fontBold), {
        x: lx,
        y: y - 9,
        size: vs,
        font: fontBold,
        color: textBlack,
      });
    };

    const rowH = Math.max(26, Math.round(H * 0.16));
    const nextRow = (y: number, row: UnifiedBadgeGridRow) => {
      drawFieldCell(textLeft, row.leftLabel, row.leftValue, y);
      drawFieldCell(col2, row.rightLabel, row.rightValue, y);
      return y - rowH;
    };

    let rowY = ty;
    for (const r of rows) {
      rowY = nextRow(rowY, r);
    }

    /** Bas de carte : QR à gauche (jeton signé), code-barres à droite — même baseline */
    const qrBuf = await QRCode.toBuffer(qrPayload, {
      type: 'png',
      width: 240,
      margin: 1,
      errorCorrectionLevel: 'M',
    });
    const qrImg = await doc.embedPng(qrBuf);
    const qrSize = Math.min(52, Math.max(36, Math.round(H * 0.24)));

    const barcodeBuf = await bwipjs.toBuffer({
      bcid: 'code128',
      text: badgeBarcode.replace(/\s/g, ''),
      scale: 2,
      height: 8,
      includetext: true,
      textsize: 4,
    });
    const bcImg = await doc.embedPng(barcodeBuf);
    const bcW = Math.min(118, W * 0.48);
    const bcH = (bcImg.height / bcImg.width) * bcW;

    const baselineY = 8;
    const qrX = 10;
    const qrY = baselineY;
    const bcX = W - bcW - 10;
    const bcY = baselineY;

    page.drawRectangle({
      x: 0,
      y: 0,
      width: W,
      height: footerBandH,
      color: rgb(0.99, 0.99, 1),
      borderColor: lineGrey,
      borderWidth: 0.5,
    });
    const bandTop = Math.max(qrY + qrSize, bcY + bcH) + 5;
    page.drawText('Présence (scan)', {
      x: qrX,
      y: bandTop,
      size: 5.5,
      font: fontBold,
      color: textMuted,
    });
    page.drawImage(qrImg, { x: qrX, y: qrY, width: qrSize, height: qrSize });
    page.drawImage(bcImg, { x: bcX, y: bcY, width: bcW, height: bcH });

    return Buffer.from(await doc.save());
  }

  private badgeVerticalRoleEnglish(user: {
    role: string;
    person: { type: string } | null;
  }): string {
    if (user.role === 'STUDENT' || user.person?.type === 'STUDENT')
      return 'Student';
    if (user.role === 'TEACHER' || user.person?.type === 'TEACHER')
      return 'Teacher';
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN')
      return 'Administrator';
    return 'Staff';
  }

  private parsePrimaryColorHex(
    hex: string | null | undefined,
  ): [number, number, number] | null {
    if (!hex?.trim()) return null;
    const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  /** Tronque une ligne pour tenir dans maxWidth (points), police donnée. */
  private fitPdfLine(
    text: string,
    maxWidthPt: number,
    size: number,
    font: { widthOfTextAtSize: (s: string, z: number) => number },
  ): string {
    const t = text.trim() || '—';
    if (font.widthOfTextAtSize(t, size) <= maxWidthPt) return t;
    const ell = '…';
    for (let n = t.length - 1; n >= 1; n--) {
      const s = `${t.slice(0, n)}${ell}`;
      if (font.widthOfTextAtSize(s, size) <= maxWidthPt) return s;
    }
    return ell;
  }
}
