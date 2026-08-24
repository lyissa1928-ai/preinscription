/**
 * Domaines / synonymes d'orientation — utilisés uniquement pour la recherche
 * dans le catalogue (pas comme « formations inventées »).
 */

const DOMAIN_SYNONYMS = [
  {
    id: 'informatique',
    labels: ['informatique', 'info', 'ordinateur', 'software', 'logiciel', 'programmation', 'developpeur', 'developpement', 'coding', 'code', 'digital', 'numerique'],
    careerHints: [
      'Développeur / développeuse',
      'Analyste informatique',
      'Administrateur systèmes (selon spécialisation)',
      'Technicien support / helpdesk',
      'Data analyst (selon parcours)',
    ],
  },
  {
    id: 'cybersecurite',
    labels: ['cybersecurite', 'cyber', 'securite informatique', 'hacking ethique', 'soc', 'pentest', 'infosec'],
    // Pas de formation cyber dédiée aujourd'hui : on mappe vers informatique / électrotechnique proches
    searchBoost: ['informatique', 'reseau', 'electrotechnique', 'electrique'],
    careerHints: [
      'Analyste cybersécurité (après spécialisation)',
      'Administrateur systèmes et réseaux',
      'Consultant sécurité (évolution)',
    ],
  },
  {
    id: 'reseaux',
    labels: ['reseau', 'reseaux', 'network', 'telecom', 'telecommunications', 'ingenieur reseau'],
    searchBoost: ['electrotechnique', 'electrique', 'informatique', 'electromecanique'],
    careerHints: [
      'Administrateur réseaux',
      'Technicien télécoms / réseaux',
      'Ingénieur réseau (selon niveau)',
    ],
  },
  {
    id: 'genie_civil',
    labels: ['genie civil', 'batiment', 'construction', 'btp', 'beton', 'chantier', 'architecture technique'],
    careerHints: [
      'Technicien / conducteur de travaux',
      'Dessinateur BTP',
      'Chef de chantier',
      'Ingénieur génie civil (selon niveau)',
    ],
  },
  {
    id: 'electrotechnique',
    labels: ['electrotechnique', 'electricite', 'electrique', 'genie electrique', 'courant fort'],
    careerHints: [
      'Technicien électricien',
      'Technicien électrotechnique',
      'Responsable maintenance électrique',
    ],
  },
  {
    id: 'electromecanique',
    labels: ['electromecanique', 'automatisme', 'automation', 'mecatronique', 'systeme automatise'],
    careerHints: [
      'Technicien électromécanicien',
      'Technicien automatismes',
      'Maintenance industrielle',
    ],
  },
  {
    id: 'energies',
    labels: ['energie', 'energies', 'renouvelable', 'solaire', 'photovoltaique', 'environnement energetique'],
    careerHints: [
      'Technicien énergies renouvelables',
      'Installateur solaire',
      'Conseiller efficacité énergétique',
    ],
  },
  {
    id: 'topographie',
    labels: ['topographie', 'topographe', 'geometre', 'cadastre', 'arpentage'],
    careerHints: [
      'Géomètre-topographe',
      'Technicien topographe',
      'Assistant géomètre',
    ],
  },
  {
    id: 'qhse',
    labels: ['qhse', 'qualite', 'hygiene', 'securite', 'environnement', 'hse'],
    careerHints: [
      'Responsable QHSE',
      'Auditeur qualité',
      'Conseiller sécurité / environnement',
    ],
  },
  {
    id: 'comptabilite',
    labels: ['comptabilite', 'comptable', 'gestion', 'finance', 'audit comptable'],
    careerHints: [
      'Comptable',
      'Assistant de gestion',
      'Contrôleur de gestion (évolution)',
    ],
  },
  {
    id: 'rh',
    labels: ['ressources humaines', 'rh', 'recrutement', 'paie', 'gestion du personnel'],
    careerHints: [
      'Assistant RH',
      'Chargé de recrutement',
      'Gestionnaire de paie',
    ],
  },
  {
    id: 'entrepreneuriat',
    labels: ['entrepreneuriat', 'entreprise', 'business', 'startup', 'commerce'],
    careerHints: [
      'Créateur d’entreprise',
      'Chargé de développement commercial',
      'Assistant de direction',
    ],
  },
  {
    id: 'sante',
    labels: ['sante', 'infirmier', 'infirmiere', 'sage femme', 'sagefemme', 'pharmacie', 'biologie', 'medical', 'soins'],
    careerHints: [
      'Infirmier / infirmière d’État',
      'Sage-femme',
      'Technicien de laboratoire',
      'Assistant / vendeur en pharmacie',
    ],
  },
  {
    id: 'geotechnique',
    labels: ['geotechnique', 'route', 'voirie', 'sols'],
    careerHints: [
      'Technicien géotechnique',
      'Technicien routes / voiries',
    ],
  },
];

const LEVEL_PATTERNS = [
  { id: 'bac', re: /\b(apres?\s+le\s+bac|apres?\s+bac|niveau\s+bac|bachelier)\b/ },
  { id: 'bts', re: /\b(bts|dut|bts\/)\b/ },
  { id: 'licence', re: /\b(licence|l1|l2|l3|bac\s*\+?\s*3)\b/ },
  { id: 'master', re: /\b(master|m1|m2|bac\s*\+?\s*5)\b/ },
  { id: 'technicien', re: /\b(technicien|bt\b|bfem|bep)\b/ },
];

function detectDomains(normalizedQuery) {
  const hits = [];
  for (const d of DOMAIN_SYNONYMS) {
    let score = 0;
    for (const label of d.labels) {
      if (normalizedQuery.includes(normalizeLoose(label))) score += label.length > 8 ? 3 : 2;
    }
    if (score > 0) hits.push({ ...d, score });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits;
}

function normalizeLoose(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectLevels(normalizedQuery) {
  return LEVEL_PATTERNS.filter((p) => p.re.test(normalizedQuery)).map((p) => p.id);
}

module.exports = {
  DOMAIN_SYNONYMS,
  detectDomains,
  detectLevels,
  normalizeLoose,
};
