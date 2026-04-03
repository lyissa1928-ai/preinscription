
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  passwordHash: 'passwordHash',
  role: 'role',
  firstName: 'firstName',
  lastName: 'lastName',
  dateOfBirth: 'dateOfBirth',
  maritalStatus: 'maritalStatus',
  numberOfChildren: 'numberOfChildren',
  matricule: 'matricule',
  phone: 'phone',
  address: 'address',
  gender: 'gender',
  nationality: 'nationality',
  service: 'service',
  jobTitle: 'jobTitle',
  contractType: 'contractType',
  hireDate: 'hireDate',
  accountStatus: 'accountStatus',
  profilePhotoUrl: 'profilePhotoUrl',
  profileValidated: 'profileValidated',
  badgeBarcode: 'badgeBarcode',
  badgeActive: 'badgeActive',
  badgeQrVersion: 'badgeQrVersion',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PersonScalarFieldEnum = {
  id: 'id',
  matricule: 'matricule',
  type: 'type',
  dateNaissance: 'dateNaissance',
  userId: 'userId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StudentScalarFieldEnum = {
  id: 'id',
  personId: 'personId',
  numeroCarteEtudiant: 'numeroCarteEtudiant',
  cinOuPasseport: 'cinOuPasseport',
  photoProfil: 'photoProfil',
  lieuNaissance: 'lieuNaissance',
  nationalite: 'nationalite',
  genre: 'genre',
  telephone: 'telephone',
  adresse: 'adresse',
  dernierDiplome: 'dernierDiplome',
  anneeObtention: 'anneeObtention',
  mention: 'mention',
  etablissementOrigine: 'etablissementOrigine',
  typeBac: 'typeBac',
  nomTuteur: 'nomTuteur',
  telephoneParent: 'telephoneParent',
  telephoneTuteur: 'telephoneTuteur',
  lienParente: 'lienParente',
  groupeSanguin: 'groupeSanguin',
  antecedentsMedicaux: 'antecedentsMedicaux',
  maladiesSignalees: 'maladiesSignalees',
  justificatifBac: 'justificatifBac',
  justificatifCni: 'justificatifCni',
  statutInscription: 'statutInscription',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CohortScalarFieldEnum = {
  id: 'id',
  nom: 'nom',
  section: 'section',
  formationId: 'formationId',
  campusId: 'campusId',
  annee: 'annee',
  effectifMax: 'effectifMax',
  responsableTeacherId: 'responsableTeacherId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InscriptionScalarFieldEnum = {
  id: 'id',
  personId: 'personId',
  formationId: 'formationId',
  maquetteId: 'maquetteId',
  semestreId: 'semestreId',
  cohortId: 'cohortId',
  campusId: 'campusId',
  anneeUniv: 'anneeUniv',
  statut: 'statut',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TeacherScalarFieldEnum = {
  id: 'id',
  personId: 'personId',
  typeContrat: 'typeContrat',
  niveauEtude: 'niveauEtude',
  articlesPublies: 'articlesPublies',
  rangGrade: 'rangGrade',
  bioAcademique: 'bioAcademique',
  chargeMaxSemestre: 'chargeMaxSemestre',
  chargeMaxAnnee: 'chargeMaxAnnee',
  dateDebut: 'dateDebut',
  dateFin: 'dateFin',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EncadrementScalarFieldEnum = {
  id: 'id',
  teacherId: 'teacherId',
  personId: 'personId',
  type: 'type',
  titre: 'titre',
  anneeUniv: 'anneeUniv',
  statut: 'statut',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TeachingGroupScalarFieldEnum = {
  id: 'id',
  code: 'code',
  libelle: 'libelle',
  niveau: 'niveau',
  effectif: 'effectif',
  filiereId: 'filiereId',
  semestreId: 'semestreId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TimeSlotScalarFieldEnum = {
  id: 'id',
  dayOfWeek: 'dayOfWeek',
  startTime: 'startTime',
  endTime: 'endTime',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SeancePlanningScalarFieldEnum = {
  id: 'id',
  semaineRef: 'semaineRef',
  date: 'date',
  timeSlotId: 'timeSlotId',
  salleId: 'salleId',
  courseId: 'courseId',
  groupId: 'groupId',
  teacherId: 'teacherId',
  statut: 'statut',
  pointageActif: 'pointageActif',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UnavailabilityScalarFieldEnum = {
  id: 'id',
  ownerType: 'ownerType',
  ownerId: 'ownerId',
  dayOfWeek: 'dayOfWeek',
  dateStart: 'dateStart',
  dateEnd: 'dateEnd',
  startTime: 'startTime',
  endTime: 'endTime',
  motif: 'motif',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FiliereScalarFieldEnum = {
  id: 'id',
  code: 'code',
  nom: 'nom',
  verrouille: 'verrouille',
  statut: 'statut',
  demandeurId: 'demandeurId',
  valideParId: 'valideParId',
  dateValidation: 'dateValidation',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FormationScalarFieldEnum = {
  id: 'id',
  code: 'code',
  nom: 'nom',
  cycle: 'cycle',
  admissionCycleCode: 'admissionCycleCode',
  filiereId: 'filiereId',
  dureeSemestres: 'dureeSemestres',
  structureManaged: 'structureManaged',
  verrouille: 'verrouille',
  statut: 'statut',
  demandeurId: 'demandeurId',
  valideParId: 'valideParId',
  dateValidation: 'dateValidation',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SemestreScalarFieldEnum = {
  id: 'id',
  numero: 'numero',
  formationId: 'formationId',
  verrouille: 'verrouille',
  statut: 'statut',
  demandeurId: 'demandeurId',
  valideParId: 'valideParId',
  dateValidation: 'dateValidation',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MaquetteScalarFieldEnum = {
  id: 'id',
  code: 'code',
  anneeRef: 'anneeRef',
  statut: 'statut',
  semestreId: 'semestreId',
  verrouille: 'verrouille',
  statutValidation: 'statutValidation',
  demandeurId: 'demandeurId',
  valideParId: 'valideParId',
  dateValidation: 'dateValidation',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DemandeDeverrouillageMaquetteScalarFieldEnum = {
  id: 'id',
  maquetteId: 'maquetteId',
  demandeurId: 'demandeurId',
  motif: 'motif',
  statut: 'statut',
  traiteParId: 'traiteParId',
  dateTraitement: 'dateTraitement',
  createdAt: 'createdAt'
};

exports.Prisma.UEScalarFieldEnum = {
  id: 'id',
  code: 'code',
  nom: 'nom',
  maquetteId: 'maquetteId',
  coefficient: 'coefficient',
  creditsEcts: 'creditsEcts',
  statutValidation: 'statutValidation',
  demandeurId: 'demandeurId',
  valideParId: 'valideParId',
  dateValidation: 'dateValidation',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ECScalarFieldEnum = {
  id: 'id',
  code: 'code',
  nom: 'nom',
  ueId: 'ueId',
  vhCm: 'vhCm',
  vhTd: 'vhTd',
  vhTp: 'vhTp',
  vhTpe: 'vhTpe',
  coefficient: 'coefficient',
  creditsEcts: 'creditsEcts',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SessionConfigScalarFieldEnum = {
  id: 'id',
  anneeUniv: 'anneeUniv',
  session: 'session',
  dateLimite: 'dateLimite',
  verrouilleJury: 'verrouilleJury',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GradeScalarFieldEnum = {
  id: 'id',
  personId: 'personId',
  ecId: 'ecId',
  session: 'session',
  anneeUniv: 'anneeUniv',
  evaluationType: 'evaluationType',
  evaluationLibelle: 'evaluationLibelle',
  note: 'note',
  saisieParId: 'saisieParId',
  dateSaisie: 'dateSaisie',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GradeModificationRequestScalarFieldEnum = {
  id: 'id',
  gradeId: 'gradeId',
  motif: 'motif',
  demandeurId: 'demandeurId',
  statut: 'statut',
  valideParId: 'valideParId',
  dateValidation: 'dateValidation',
  nouvelleNote: 'nouvelleNote',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CampusScalarFieldEnum = {
  id: 'id',
  code: 'code',
  nom: 'nom',
  adresse: 'adresse',
  region: 'region',
  departement: 'departement',
  commune: 'commune',
  telDirection: 'telDirection',
  responsablePedagogiqueId: 'responsablePedagogiqueId',
  agentPedagogiqueId: 'agentPedagogiqueId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SalleScalarFieldEnum = {
  id: 'id',
  nom: 'nom',
  code: 'code',
  capacite: 'capacite',
  campusId: 'campusId',
  typeSalle: 'typeSalle',
  equipements: 'equipements',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CourseScalarFieldEnum = {
  id: 'id',
  ecId: 'ecId',
  teacherId: 'teacherId',
  salleId: 'salleId',
  cohortId: 'cohortId',
  groupId: 'groupId',
  jour: 'jour',
  heureDebut: 'heureDebut',
  heureFin: 'heureFin',
  type: 'type',
  groupe: 'groupe',
  anneeUniv: 'anneeUniv',
  pointageActif: 'pointageActif',
  volumeHeures: 'volumeHeures',
  nbSeances: 'nbSeances',
  dureeSeanceMinutes: 'dureeSeanceMinutes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ScheduleScalarFieldEnum = {
  id: 'id',
  cohortId: 'cohortId',
  anneeUniv: 'anneeUniv',
  executionCampusId: 'executionCampusId',
  statut: 'statut',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ScheduleSessionScalarFieldEnum = {
  id: 'id',
  scheduleId: 'scheduleId',
  courseId: 'courseId',
  teacherId: 'teacherId',
  salleId: 'salleId',
  groupId: 'groupId',
  dayOfWeek: 'dayOfWeek',
  startTime: 'startTime',
  endTime: 'endTime',
  statut: 'statut',
  mode: 'mode',
  executionCampusId: 'executionCampusId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AttendanceScalarFieldEnum = {
  id: 'id',
  personId: 'personId',
  courseId: 'courseId',
  date: 'date',
  heureArrivee: 'heureArrivee',
  heureDepart: 'heureDepart',
  statut: 'statut',
  valideParId: 'valideParId',
  source: 'source',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BadgeScanLogScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  success: 'success',
  messageCode: 'messageCode',
  detail: 'detail',
  createdAt: 'createdAt'
};

exports.Prisma.ClassRollCallScalarFieldEnum = {
  id: 'id',
  cohortId: 'cohortId',
  date: 'date',
  personId: 'personId',
  status: 'status',
  comment: 'comment',
  recordedById: 'recordedById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TariffRateScalarFieldEnum = {
  id: 'id',
  formationId: 'formationId',
  ecId: 'ecId',
  tauxCm: 'tauxCm',
  tauxTd: 'tauxTd',
  tauxTp: 'tauxTp',
  tauxTpe: 'tauxTpe',
  dateEffet: 'dateEffet',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FeeConfigScalarFieldEnum = {
  id: 'id',
  formationId: 'formationId',
  fraisInscription: 'fraisInscription',
  mensualite: 'mensualite',
  nbMois: 'nbMois',
  fraisSoutenanceL3: 'fraisSoutenanceL3',
  fraisSoutenanceM2: 'fraisSoutenanceM2',
  anneeUniv: 'anneeUniv',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentScalarFieldEnum = {
  id: 'id',
  personId: 'personId',
  inscriptionId: 'inscriptionId',
  montant: 'montant',
  type: 'type',
  mois: 'mois',
  annee: 'annee',
  datePaiement: 'datePaiement',
  statut: 'statut',
  valideParId: 'valideParId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentReceiptScalarFieldEnum = {
  id: 'id',
  paymentId: 'paymentId',
  fichierPath: 'fichierPath',
  dateGeneration: 'dateGeneration',
  createdAt: 'createdAt'
};

exports.Prisma.PayrollScalarFieldEnum = {
  id: 'id',
  personId: 'personId',
  mois: 'mois',
  annee: 'annee',
  heuresCm: 'heuresCm',
  heuresTd: 'heuresTd',
  heuresTp: 'heuresTp',
  heuresTpe: 'heuresTpe',
  montant: 'montant',
  statut: 'statut',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaySlipScalarFieldEnum = {
  id: 'id',
  payrollId: 'payrollId',
  fichierPath: 'fichierPath',
  dateGeneration: 'dateGeneration',
  createdAt: 'createdAt'
};

exports.Prisma.DailyFinancialStatusScalarFieldEnum = {
  id: 'id',
  date: 'date',
  totalEncaissements: 'totalEncaissements',
  totalDepenses: 'totalDepenses',
  solde: 'solde',
  statut: 'statut',
  valideParId: 'valideParId',
  valideAt: 'valideAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BreachRequestScalarFieldEnum = {
  id: 'id',
  financialStatusId: 'financialStatusId',
  justification: 'justification',
  demandeurId: 'demandeurId',
  statut: 'statut',
  approuveParId: 'approuveParId',
  dateApprobation: 'dateApprobation',
  commentaire: 'commentaire',
  createdAt: 'createdAt'
};

exports.Prisma.CheckInLogScalarFieldEnum = {
  id: 'id',
  matricule: 'matricule',
  dateHeure: 'dateHeure',
  autorise: 'autorise',
  message: 'message',
  createdAt: 'createdAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  action: 'action',
  entityType: 'entityType',
  entityId: 'entityId',
  oldValue: 'oldValue',
  newValue: 'newValue',
  ip: 'ip',
  createdAt: 'createdAt'
};

exports.Prisma.DeviceTokenScalarFieldEnum = {
  id: 'id',
  name: 'name',
  tokenHash: 'tokenHash',
  isActive: 'isActive',
  createdAt: 'createdAt'
};

exports.Prisma.TransactionScalarFieldEnum = {
  id: 'id',
  sens: 'sens',
  montant: 'montant',
  date: 'date',
  libelle: 'libelle',
  statut: 'statut',
  typePaiement: 'typePaiement',
  referenceExterne: 'referenceExterne',
  clotureJournaliereId: 'clotureJournaliereId',
  enregistreParId: 'enregistreParId',
  rapproche: 'rapproche',
  dateRapprochement: 'dateRapprochement',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransactionReceiptScalarFieldEnum = {
  id: 'id',
  transactionId: 'transactionId',
  dateGeneration: 'dateGeneration',
  createdAt: 'createdAt'
};

exports.Prisma.ClotureJournaliereScalarFieldEnum = {
  id: 'id',
  date: 'date',
  clotureParId: 'clotureParId',
  clotureAt: 'clotureAt',
  createdAt: 'createdAt'
};

exports.Prisma.CompteComptableScalarFieldEnum = {
  id: 'id',
  numeroCompte: 'numeroCompte',
  intitule: 'intitule',
  solde: 'solde',
  type: 'type',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EcritureComptableScalarFieldEnum = {
  id: 'id',
  transactionId: 'transactionId',
  compteDebitId: 'compteDebitId',
  compteCreditId: 'compteCreditId',
  montant: 'montant',
  dateEcriture: 'dateEcriture',
  libelle: 'libelle',
  createdAt: 'createdAt'
};

exports.Prisma.BudgetScalarFieldEnum = {
  id: 'id',
  exercice: 'exercice',
  departement: 'departement',
  montantAlloue: 'montantAlloue',
  montantConsomme: 'montantConsomme',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DemandeDecaissementScalarFieldEnum = {
  id: 'id',
  transactionId: 'transactionId',
  budgetId: 'budgetId',
  montant: 'montant',
  libelle: 'libelle',
  statut: 'statut',
  initieParId: 'initieParId',
  approuveParId: 'approuveParId',
  dateDecision: 'dateDecision',
  motifRejet: 'motifRejet',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  message: 'message',
  lu: 'lu',
  entityId: 'entityId',
  createdAt: 'createdAt'
};

exports.Prisma.AppSettingsScalarFieldEnum = {
  id: 'id',
  appName: 'appName',
  websiteUrl: 'websiteUrl',
  logoUrl: 'logoUrl',
  logoLoginUrl: 'logoLoginUrl',
  stampUrl: 'stampUrl',
  faviconUrl: 'faviconUrl',
  primaryColor: 'primaryColor',
  secondaryColor: 'secondaryColor',
  successColor: 'successColor',
  dangerColor: 'dangerColor',
  backgroundColor: 'backgroundColor',
  sidebarColor: 'sidebarColor',
  updatedAt: 'updatedAt'
};

exports.Prisma.AdmissionDocumentTypeScalarFieldEnum = {
  id: 'id',
  code: 'code',
  labelFr: 'labelFr',
  description: 'description',
  category: 'category',
  attestationAcceptedInsteadOfDiploma: 'attestationAcceptedInsteadOfDiploma',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AdmissionCycleDocumentRuleScalarFieldEnum = {
  id: 'id',
  cycleCode: 'cycleCode',
  documentTypeId: 'documentTypeId',
  requirement: 'requirement',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  User: 'User',
  Person: 'Person',
  Student: 'Student',
  Cohort: 'Cohort',
  Inscription: 'Inscription',
  Teacher: 'Teacher',
  Encadrement: 'Encadrement',
  TeachingGroup: 'TeachingGroup',
  TimeSlot: 'TimeSlot',
  SeancePlanning: 'SeancePlanning',
  Unavailability: 'Unavailability',
  Filiere: 'Filiere',
  Formation: 'Formation',
  Semestre: 'Semestre',
  Maquette: 'Maquette',
  DemandeDeverrouillageMaquette: 'DemandeDeverrouillageMaquette',
  UE: 'UE',
  EC: 'EC',
  SessionConfig: 'SessionConfig',
  Grade: 'Grade',
  GradeModificationRequest: 'GradeModificationRequest',
  Campus: 'Campus',
  Salle: 'Salle',
  Course: 'Course',
  Schedule: 'Schedule',
  ScheduleSession: 'ScheduleSession',
  Attendance: 'Attendance',
  BadgeScanLog: 'BadgeScanLog',
  ClassRollCall: 'ClassRollCall',
  TariffRate: 'TariffRate',
  FeeConfig: 'FeeConfig',
  Payment: 'Payment',
  PaymentReceipt: 'PaymentReceipt',
  Payroll: 'Payroll',
  PaySlip: 'PaySlip',
  DailyFinancialStatus: 'DailyFinancialStatus',
  BreachRequest: 'BreachRequest',
  CheckInLog: 'CheckInLog',
  AuditLog: 'AuditLog',
  DeviceToken: 'DeviceToken',
  Transaction: 'Transaction',
  TransactionReceipt: 'TransactionReceipt',
  ClotureJournaliere: 'ClotureJournaliere',
  CompteComptable: 'CompteComptable',
  EcritureComptable: 'EcritureComptable',
  Budget: 'Budget',
  DemandeDecaissement: 'DemandeDecaissement',
  Notification: 'Notification',
  AppSettings: 'AppSettings',
  AdmissionDocumentType: 'AdmissionDocumentType',
  AdmissionCycleDocumentRule: 'AdmissionCycleDocumentRule'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
