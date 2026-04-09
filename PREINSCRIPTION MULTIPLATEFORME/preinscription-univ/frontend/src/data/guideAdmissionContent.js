/**
 * Guides conditions d’admission par établissement (contenu éditorial).
 * Clés : esebat | escoa | efosante — alignées sur detectBrand() (Landing, etc.).
 */

const COMMON_L3 = [
  'Baccalauréat',
  'Relevé de notes du baccalauréat',
  'Diplôme de niveau antérieur accepté : BTS, DUT ou Licence 2 (dans un domaine accepté par l’établissement)',
  'Relevés de notes de la 1re et de la 2e année du cycle concerné',
  'Une copie de la carte d’identité ou du passeport',
]

const COMMON_M1 = [
  'Baccalauréat et relevé de notes du bac',
  'Licence 3 obtenue dans un domaine accepté',
  'Relevés de notes des 1re, 2e et 3e années de licence',
  'Carte d’identité ou passeport',
]

const COMMON_M2 = [
  'Baccalauréat et relevé de notes du bac',
  'Licence 3 (domaine accepté)',
  'Master 1 (domaine accepté)',
  'Relevés de notes des 1re, 2e, 3e et 4e années (parcours Licence + M1)',
  'Carte d’identité ou passeport',
]

const MINISTERE = [
  'Les documents doivent être fournis en copies légalisées, conformément aux règles en vigueur.',
  'Le baccalauréat doit être présent dans le dossier même si vous vous inscrivez directement en Master ou en Licence : c’est une exigence du Ministère.',
]

const DTS_ALERT = {
  title: 'Diplôme DTS sur trois ans',
  text:
    'Si vous disposez d’un DTS acquis sur trois ans, vous devez fournir un document attestant qu’il est reconnu comme équivalent à une Licence pour la poursuite d’études envisagée.',
}

export const GUIDE_SLUGS = ['esebat', 'escoa', 'efosante']

export const GUIDES = {
  esebat: {
    slug: 'esebat',
    name: 'ESEBAT',
    domainLabel: 'BTP, génie civil & filières techniques',
    intro:
      'Présentiel ou enseignement assisté à distance (EAD) : pièces attendues par niveau, règles du Ministère et cas particulier du Brevet de technicien (filières BTP et apparentées).',
    theme: {
      header: 'from-slate-900 via-orange-950/90 to-slate-900',
      radial: 'from-orange-500/40',
      badge: 'text-orange-300/90',
      link: 'text-orange-700 hover:text-orange-900',
      cta: 'bg-orange-600 hover:bg-orange-700',
      sectionIcon: 'bg-orange-100 text-orange-700',
    },
    toc: [
      { id: 'demarche', label: 'Démarche' },
      { id: 'licence3', label: 'Licence 3' },
      { id: 'master1', label: 'Master 1' },
      { id: 'master2', label: 'Master 2' },
      { id: 'ministere', label: 'Exigences officielles' },
      { id: 'courriel', label: 'Votre demande' },
      { id: 'suite', label: 'Après envoi' },
      { id: 'bt', label: 'Brevet de technicien' },
    ],
    demarche: {
      lead:
        'Pour étudier à l’ESEBAT en présentiel ou en enseignement assisté à distance (EAD), envoyez une demande en précisant :',
      bullets: ['La filière visée', 'Le niveau d’entrée', 'Le mode de formation choisi : présentiel ou en ligne'],
      footer:
        'Joignez un dossier complet comprenant tous les documents requis pour le niveau auquel vous souhaitez vous inscrire (voir les sections ci-dessous selon Licence 3, Master 1 ou Master 2).',
    },
    licence3: { title: 'Inscription en Licence 3 (L3)', items: COMMON_L3 },
    master1: { title: 'Inscription en Master 1 (M1)', items: COMMON_M1, alert: DTS_ALERT },
    master2: {
      title: 'Inscription en Master 2 (M2)',
      items: COMMON_M2,
      footnote:
        'La pièce d’identité est une exigence du Ministère ; elle doit figurer dans le dossier pour tous les niveaux.',
    },
    ministere: { title: 'Exigences du Ministère (tous niveaux)', items: MINISTERE },
    courriel: {
      title: 'Rédiger votre demande (courriel)',
      paragraphs: [
        'Dans vos échanges écrits, indiquez clairement votre nom et prénom complets, afin que votre dossier soit correctement identifié.',
      ],
    },
    suite: {
      title: 'Après réception du dossier',
      paragraphs: [
        'Une fois le dossier reçu, l’établissement l’étudie dans les meilleurs délais. Selon le parcours : lettre de préinscription pour une candidature dossier classique, ou facture proforma et attestation pour une demande de facture proforma — précisant notamment : coût total, modalités de paiement, durée de formation, etc.',
      ],
    },
    specialBt: {
      title: 'Cas du Brevet de technicien (1re année)',
      intro:
        'Pour l’entrée en 1re année dans les filières telles que : Génie civil, Mines, Électrotechnique, Électromécanique, Géomètre topographe, il est en principe requis :',
      bullets: ['Un baccalauréat série S ou T, ou', 'Un Brevet de technicien (BT) dans le domaine concerné'],
      orientationTitle: 'Autres profils (orientation vers le programme BT)',
      orientationText:
        'Si le candidat présente un BFEM, un BEP, ou un baccalauréat L, G ou B, une orientation peut être proposée vers le programme de Brevet de technicien, selon les règles pédagogiques de l’établissement.',
    },
  },

  escoa: {
    slug: 'escoa',
    name: 'ESCOA',
    domainLabel: 'Commerce, management & gestion',
    intro:
      'Formations en commerce, gestion et management : modalités de candidature en présentiel ou à distance, dossier par niveau (Licence, Master) et exigences académiques usuelles.',
    theme: {
      header: 'from-slate-900 via-blue-950/95 to-slate-900',
      radial: 'from-blue-500/35',
      badge: 'text-blue-300/90',
      link: 'text-blue-700 hover:text-blue-900',
      cta: 'bg-blue-700 hover:bg-blue-800',
      sectionIcon: 'bg-blue-100 text-blue-800',
    },
    toc: [
      { id: 'demarche', label: 'Démarche' },
      { id: 'licence3', label: 'Licence 3' },
      { id: 'master1', label: 'Master 1' },
      { id: 'master2', label: 'Master 2' },
      { id: 'commerce', label: 'BTS & commerce' },
      { id: 'ministere', label: 'Exigences officielles' },
      { id: 'courriel', label: 'Votre demande' },
      { id: 'suite', label: 'Après envoi' },
    ],
    demarche: {
      lead:
        'Pour intégrer l’ESCOA (commerce, comptabilité, management, marketing, etc.) en présentiel ou en formation à distance, transmettez une demande en précisant :',
      bullets: [
        'La filière ou le parcours visé (ex. gestion, commerce international, comptabilité)',
        'Le niveau d’entrée souhaité',
        'Le mode : présentiel ou en ligne',
      ],
      footer:
        'Joignez un dossier complet avec les pièces listées ci-dessous selon votre niveau cible (Licence 3, Master 1 ou Master 2). Les équivalences de diplômes étrangers font l’objet d’une étude au cas par cas.',
    },
    licence3: {
      title: 'Inscription en Licence 3 (L3)',
      items: [
        ...COMMON_L3.slice(0, 3),
        'Relevés de notes des deux années du cycle court (BTS, DUT) ou de la Licence 2, selon votre parcours',
        ...COMMON_L3.slice(4),
      ],
    },
    master1: { title: 'Inscription en Master 1 (M1)', items: COMMON_M1, alert: DTS_ALERT },
    master2: {
      title: 'Inscription en Master 2 (M2)',
      items: COMMON_M2,
      footnote:
        'Pour les parcours en contrôle de gestion, audit ou finance, des prérequis spécifiques peuvent s’ajouter : le service des admissions confirmera la cohérence de votre dossier avec la filière choisie.',
    },
    ministere: { title: 'Exigences du Ministère (tous niveaux)', items: MINISTERE },
    courriel: {
      title: 'Rédiger votre demande (courriel)',
      paragraphs: [
        'Indiquez votre nom et prénom complets, un numéro de téléphone joignable et, si possible, la formation précise (intitulé sur le site ou le catalogue).',
      ],
    },
    suite: {
      title: 'Après réception du dossier',
      paragraphs: [
        'Le dossier est instruit dans les meilleurs délais. Vous recevez une lettre de préinscription (candidature complète) ou, pour une demande de facture proforma, la facture proforma et l’attestation après validation — avec le détail des frais, le calendrier et les modalités de la formation choisie.',
      ],
    },
    commerceBlock: {
      id: 'commerce',
      title: 'BTS, DUT et passerelles commerce',
      paragraphs: [
        'Les titulaires d’un BTS commerce, gestion, comptabilité ou d’un DUT Techniques de commercialisation peuvent candidater en Licence selon les passerelles reconnues par l’établissement.',
        'Joignez obligatoirement les relevés de chaque année du diplôme déjà obtenu et tout justificatif de stage ou de projet tutoré exigé par la filière.',
      ],
    },
  },

  efosante: {
    slug: 'efosante',
    name: 'EFO Santé',
    domainLabel: 'Formations santé & paramédical',
    intro:
      'Candidature aux filières santé et paramédicales : respect des prérequis académiques, dossier en copies légalisées et règles nationales applicables aux formations de santé.',
    theme: {
      header: 'from-slate-900 via-red-950/90 to-slate-900',
      radial: 'from-red-500/30',
      badge: 'text-red-300/90',
      link: 'text-red-800 hover:text-red-950',
      cta: 'bg-red-700 hover:bg-red-800',
      sectionIcon: 'bg-red-100 text-red-800',
    },
    toc: [
      { id: 'demarche', label: 'Démarche' },
      { id: 'licence3', label: 'Licence 3' },
      { id: 'master1', label: 'Master 1' },
      { id: 'master2', label: 'Master 2' },
      { id: 'sante', label: 'Filières santé' },
      { id: 'ministere', label: 'Exigences officielles' },
      { id: 'courriel', label: 'Votre demande' },
      { id: 'suite', label: 'Après envoi' },
    ],
    demarche: {
      lead:
        'Pour candidater à l’EFO Santé en présentiel ou en formation à distance (selon les programmes ouverts), précisez dans votre demande :',
      bullets: [
        'L’intitulé exact de la formation (et le niveau : technicien supérieur, licence, master, etc.)',
        'Votre parcours antérieur (bac, BTS/DUT santé, licence…)',
        'Le mode de formation souhaité lorsque plusieurs options existent',
      ],
      footer:
        'Les formations de santé sont soumises à des critères nationaux et à des capacités d’accueil : seul un dossier complet permet d’instruire votre candidature.',
    },
    licence3: {
      title: 'Inscription en Licence 3 (L3)',
      items: [
        'Baccalauréat (toutes séries autorisées pour la filière visée, notamment bac scientifique ou ST2S selon le programme)',
        'Relevé de notes du baccalauréat',
        'Diplôme de niveau antérieur accepté pour la filière : BTS/DUT paramédical ou santé, ou Licence 2 dans un domaine compatible',
        'Relevés de notes des deux années du cycle précédent',
        'Carte d’identité ou passeport',
      ],
    },
    master1: {
      title: 'Inscription en Master 1 (M1)',
      items: [
        'Baccalauréat et relevé de notes',
        'Licence obtenue dans un domaine accepté pour la poursuite en master santé / paramédical concerné',
        'Relevés des trois années de licence',
        'Carte d’identité ou passeport',
        'Le cas échéant : certificats de stage ou de formation clinique exigés par la filière',
      ],
      alert: DTS_ALERT,
    },
    master2: {
      title: 'Inscription en Master 2 (M2)',
      items: [
        ...COMMON_M2.slice(0, 5),
        'Tout document complémentaire exigé par la filière (rapport de stage, attestation d’emploi, etc.)',
      ],
      footnote:
        'Certaines spécialités peuvent imposer des quotas ou une sélection sur dossier : le service des admissions vous informe des étapes après dépôt.',
    },
    ministere: { title: 'Exigences du Ministère (tous niveaux)', items: MINISTERE },
    courriel: {
      title: 'Rédiger votre demande (courriel)',
      paragraphs: [
        'Indiquez vos nom et prénom complets tels qu’ils figurent sur vos pièces d’identité et sur vos diplômes, ainsi que la formation exacte visée.',
      ],
    },
    suite: {
      title: 'Après réception du dossier',
      paragraphs: [
        'Le dossier est examiné conformément aux règles de l’établissement et du Ministère. En cas d’acceptabilité : lettre de préinscription (parcours dossier) ou facture proforma et attestation (parcours demande proforma) — montants, durée, modalités pédagogiques et stages éventuels.',
      ],
    },
    santeBlock: {
      id: 'sante',
      title: 'Filières santé : points d’attention',
      paragraphs: [
        'Les copies des diplômes et relevés doivent être conformes aux exigences de légalisation en vigueur.',
        'Selon la filière, un test de niveau, un entretien ou une liste de classement peut compléter l’étude du dossier : vous serez informé par le service des admissions.',
        'Pour les reconnaissances de diplômes obtenus à l’étranger, joindre les documents traduits et légalisés selon les règles applicables.',
      ],
    },
  },
}

export function getGuide(slug) {
  if (!slug || typeof slug !== 'string') return null
  const key = String(slug).toLowerCase().trim()
  return GUIDES[key] || null
}

/** Retourne esebat | escoa | efosante si le nom d’établissement correspond à un guide, sinon null. */
export function guideSlugFromEtabName(name = '') {
  const n = String(name).toLowerCase()
  if (n.includes('esebat')) return 'esebat'
  if (n.includes('escoa')) return 'escoa'
  if (n.includes('efosante') || n.includes('efo sante') || n.includes('efo-sante')) return 'efosante'
  return null
}
