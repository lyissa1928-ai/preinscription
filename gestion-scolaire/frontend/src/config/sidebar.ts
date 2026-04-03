/**
 * Configuration des menus sidebar par zone (admin, scolarité, comptable, etc.).
 * Design ERP : une seule structure (sidebar + header) pour tous les dashboards.
 *
 * Modèle avancé :
 * - Sections repliables (accordéon) sauf `collapsible: false` (ex. Accueil).
 * - `subtitle` sous le titre de section (aide contextuelle).
 * - `id` stable par section pour persistance localStorage (`gs-erp-sidebar-section-expanded`).
 * - `isSidebarItemActive()` : règle unique pour surlignage (racines dashboard, préfixes, exclusions).
 * - Auto-ouverture de la section contenant la route active.
 */

import type { IconName } from '@/components/ui/icons';
import { ROLE_DASHBOARDS } from '@/lib/role-dashboard';

export type SidebarItem = {
  label: string;
  href: string;
  badge?: number | null;
  icon?: IconName;
  /** Préfixes de pathname pour surligner l’item (ex. filières + formations sous une seule entrée menu). */
  activePathPrefixes?: string[];
  /** Si le pathname commence par un de ces préfixes, cet item n’est pas considéré actif (ex. page Import à part). */
  activePathExcludePrefixes?: string[];
};

export type SidebarSection = {
  /** Clé stable pour persistance / accordéon (recommandé). */
  id?: string;
  title: string;
  /** Sous-titre discret sous le titre de section (mode étendu). */
  subtitle?: string;
  items: SidebarItem[];
  /**
   * false = section toujours ouverte, pas d’accordéon (ex. Accueil).
   * true ou omis = repliable si la sidebar n’est pas réduite en icônes.
   */
  collapsible?: boolean;
  /** Si absent : ouvert par défaut au premier passage. */
  defaultExpanded?: boolean;
};

export type SidebarConfig = SidebarSection[];

/** Hrefs « racine » de dashboard : pas de surlignage par préfixe sur les sous-routes. */
export const DASHBOARD_HOME_HREFS: readonly string[] = [
  '/dashboard/admin',
  '/dashboard/scolarite',
  '/dashboard/pedagogie',
  '/dashboard/comptable',
  '/dashboard/enseignant',
  '/dashboard/etudiant',
  '/dashboard/chef-departement',
  '/dashboard/auditeur',
];

/**
 * Indique si l’item de menu correspond au pathname (exact, préfixes, ou sous-chemin).
 * Source unique pour éviter les incohérences / régressions.
 */
export function isSidebarItemActive(pathname: string | null | undefined, item: SidebarItem): boolean {
  if (!pathname) return false;
  if (pathname === item.href) return true;
  if ((DASHBOARD_HOME_HREFS as readonly string[]).includes(item.href)) return false;

  const prefixHit =
    item.activePathPrefixes?.some((p) => {
      const match = pathname === p || pathname.startsWith(`${p}/`);
      if (!match) return false;
      if (item.activePathExcludePrefixes?.some((ex) => pathname.startsWith(ex))) return false;
      return true;
    }) ?? false;
  if (prefixHit) return true;

  return pathname.startsWith(`${item.href}/`);
}

/** Identifiant stable pour DOM, persistance et clés React. */
export function getSidebarSectionId(section: SidebarSection, index: number): string {
  if (section.id?.trim()) return section.id.trim();
  const slug = section.title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `nav-${index}-${slug || 'section'}`;
}

/** Section contenant la route active (pour auto-ouverture accordéon). */
export function findActiveSidebarSectionId(config: SidebarConfig, pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  for (let i = 0; i < config.length; i++) {
    const s = config[i];
    if (s.items.some((item) => isSidebarItemActive(pathname, item))) {
      return getSidebarSectionId(s, i);
    }
  }
  return null;
}

/**
 * Domaines accessibles aux administrateurs (ADMIN / SUPER_ADMIN).
 * Sur ces chemins, le sidebar admin reste toujours affiché pour garder une navigation stable.
 */
const ADMIN_DOMAIN_PREFIXES = ['/dashboard/admin', '/dashboard/scolarite', '/dashboard/pedagogie', '/dashboard/comptable'];

/** Profils pédagogie : sur les URL /scolarite/… (campus, salles, filières…) on affiche le menu Pédagogie, pas le menu Scolarité. */
const PEDAGOGIE_ROLES = ['SERVICE_PEDAGOGIQUE', 'RESPONSABLE_PEDAGOGIQUE', 'AGENT_PEDAGOGIQUE'] as const;

/** Retourne la config sidebar pour le pathname et le rôle (layout uniforme partout). */
export function getSidebarConfigForPath(pathname: string | null, role: string): SidebarConfig {
  if (!pathname) return getDefaultSidebarConfig(role);
  // Administrateurs : sidebar unique et stable sur tous les domaines (admin, scolarité, pédagogie, comptabilité)
  const isAdminOrSuper = role === 'ADMIN' || role === 'SUPER_ADMIN';
  if (isAdminOrSuper && ADMIN_DOMAIN_PREFIXES.some((p) => pathname.startsWith(p))) {
    return getAdminSidebarConfig(role);
  }
  if (pathname.startsWith('/dashboard/admin')) return getAdminSidebarConfig(role);
  if (pathname.startsWith('/dashboard/scolarite') && (PEDAGOGIE_ROLES as readonly string[]).includes(role)) {
    return getPedagogieSidebarConfig();
  }
  if (pathname.startsWith('/dashboard/scolarite')) return getScolariteSidebarConfig();
  if (pathname.startsWith('/dashboard/pedagogie')) return getPedagogieSidebarConfig();
  if (pathname.startsWith('/dashboard/comptable')) return getComptableSidebarConfig(role);
  if (pathname.startsWith('/dashboard/enseignant')) return getEnseignantSidebarConfig();
  if (pathname.startsWith('/dashboard/etudiant')) return getEtudiantSidebarConfig();
  if (pathname.startsWith('/dashboard/chef-departement')) return getChefDepartementSidebarConfig();
  if (pathname.startsWith('/dashboard/auditeur')) return getAuditeurSidebarConfig();
  return getDefaultSidebarConfig(role);
}

/** Sidebar par défaut (page d’accueil dashboard, profil, notifications, rapports). */
function getDefaultSidebarConfig(role: string): SidebarConfig {
  const home = ROLE_DASHBOARDS[role] || '/dashboard/profil';
  return [
    {
      id: 'default-accueil',
      title: 'Accueil',
      collapsible: false,
      items: [{ label: 'Tableau de bord', href: home, icon: 'home' }],
    },
    {
      id: 'default-compte',
      title: 'Compte',
      items: [
        { label: 'Mon profil', href: '/dashboard/profil', icon: 'user' },
        { label: 'Notifications', href: '/dashboard/notifications', icon: 'bell' },
      ],
    },
    ...(['CHEF_COMPTABLE', 'DAF', 'ADMIN', 'SUPER_ADMIN'].includes(role)
      ? [
          {
            id: 'default-rapports',
            title: 'Rapports',
            items: [{ label: 'Rapports', href: '/dashboard/rapports', icon: 'chart' as IconName }],
          },
        ]
      : []),
  ];
}

/** Sidebar Admin : tableau de bord, domaines, admin, rapports */
export function getAdminSidebarConfig(role: string): SidebarConfig {
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isServicePedagogique = role === 'SERVICE_PEDAGOGIQUE';
  const isAdminOrSuper = role === 'ADMIN' || role === 'SUPER_ADMIN';

  const sections: SidebarConfig = [
    {
      id: 'admin-accueil',
      title: 'Accueil',
      collapsible: false,
      items: [{ label: 'Tableau de bord', href: '/dashboard/admin', icon: 'home' }],
    },
    {
      id: 'admin-domaines',
      title: 'Domaines',
      subtitle: 'Vue transverse métier',
      items: [
        { label: 'Scolarité', href: '/dashboard/scolarite', icon: 'academic-cap' },
        { label: 'Pédagogie', href: '/dashboard/pedagogie', icon: 'book-open' },
        { label: 'Comptabilité', href: '/dashboard/comptable', icon: 'currency' },
      ],
    },
  ];

  const adminItems: SidebarItem[] = [];
  if (isAdminOrSuper) {
    adminItems.push({
      label: 'Filières & formations',
      href: '/dashboard/scolarite/filieres',
      icon: 'academic-cap',
      activePathPrefixes: ['/dashboard/scolarite/filieres', '/dashboard/scolarite/formations'],
      activePathExcludePrefixes: ['/dashboard/scolarite/formations/import'],
    });
  }
  if (!isServicePedagogique) adminItems.push({ label: 'Vigilance', href: '/dashboard/admin/vigilance', icon: 'eye' });
  if (isAdminOrSuper && !isServicePedagogique) {
    adminItems.push({ label: 'Gouvernance', href: '/dashboard/admin/gouvernance', icon: 'scale' });
    adminItems.push({ label: 'Rapports', href: '/dashboard/rapports', icon: 'chart' });
    adminItems.push({ label: 'Taux horaires', href: '/dashboard/comptable/taux-horaires', icon: 'clock' });
  }
  if (!isServicePedagogique) adminItems.push({ label: 'Personnel (comptes)', href: '/dashboard/admin/utilisateurs', icon: 'users' });
  if (isAdminOrSuper && !isServicePedagogique) {
    adminItems.push({ label: 'Journal scans badges', href: '/dashboard/admin/badge-scans', icon: 'document-magnifying-glass' });
  }
  adminItems.push({ label: 'Demandes de validation', href: '/dashboard/admin/demandes-validation', icon: 'clipboard-document-check' });
  if (isSuperAdmin) adminItems.push({ label: 'Demandes de déverrouillage', href: '/dashboard/admin/demandes-deverrouillage', icon: 'lock-closed' });
  if (!isServicePedagogique) {
    adminItems.push({ label: 'Configuration', href: '/dashboard/admin/configuration', icon: 'cog' });
    if (isAdminOrSuper) adminItems.push({ label: 'Apparence & Thème', href: '/dashboard/admin/settings/appearance', icon: 'paint-brush' });
    adminItems.push({ label: 'Vigile', href: '/vigile', icon: 'shield-check' });
    adminItems.push({ label: 'Audit', href: '/dashboard/auditeur/journal', icon: 'document-magnifying-glass' });
  }

  if (adminItems.length > 0) {
    sections.push({ id: 'admin-actions', title: 'Admin', subtitle: 'Configuration et supervision', items: adminItems });
  }

  return sections;
}

/** Sidebar Scolarité : uniquement modules scolarité (étudiants, inscriptions, filières, formations, campus, personnel, transfert). Pas de Classes, EDT ni Notes. */
export function getScolariteSidebarConfig(): SidebarConfig {
  return [
    {
      id: 'scolarite-accueil',
      title: 'Accueil',
      collapsible: false,
      items: [{ label: 'Tableau de bord', href: '/dashboard/scolarite', icon: 'home' }],
    },
    {
      id: 'scolarite-sites',
      title: 'Sites & salles',
      subtitle: 'Toujours visibles — accès direct',
      collapsible: false,
      items: [
        { label: 'Campus', href: '/dashboard/scolarite/campus', icon: 'building' },
        { label: 'Salles', href: '/dashboard/scolarite/salles', icon: 'building-office-2' },
      ],
    },
    {
      id: 'scolarite-structure',
      title: 'Offre & import',
      subtitle: 'Filières, formations, fichier Excel',
      items: [
        {
          label: 'Filières & formations',
          href: '/dashboard/scolarite/filieres',
          icon: 'academic-cap',
          activePathPrefixes: ['/dashboard/scolarite/filieres', '/dashboard/scolarite/formations'],
          activePathExcludePrefixes: ['/dashboard/scolarite/formations/import'],
        },
        {
          label: 'Import filières / formations (Excel)',
          href: '/dashboard/scolarite/formations/import',
          icon: 'arrow-down-tray',
          activePathPrefixes: ['/dashboard/scolarite/formations/import'],
        },
      ],
    },
    {
      id: 'scolarite-personnes',
      title: 'Personnes',
      subtitle: 'Étudiants, corps enseignant, staff',
      items: [
        { label: 'Étudiants', href: '/dashboard/scolarite/etudiants', icon: 'academic-cap' },
        { label: 'Enseignants', href: '/dashboard/scolarite/enseignants', icon: 'users' },
        { label: 'Personnel', href: '/dashboard/scolarite/personnel', icon: 'user-group' },
        {
          label: 'Scan présence (badge)',
          href: '/dashboard/scolarite/scan-badge',
          icon: 'magnifying-glass',
        },
      ],
    },
    {
      id: 'scolarite-dossiers',
      title: 'Dossiers & cycles',
      subtitle: 'Inscriptions et clôtures',
      items: [
        { label: 'Inscriptions', href: '/dashboard/scolarite/inscriptions', icon: 'clipboard-list' },
        { label: 'Transfert & clôture', href: '/dashboard/scolarite/transfert', icon: 'transfer' },
      ],
    },
  ];
}

/**
 * Sidebar Pédagogie — structuration par chaîne de valeur :
 * sites & salles (section toujours ouverte) → référentiel → organisation → planning → évaluation → pilotage.
 * L’import maquette (UE/EC) reste sur Formation → Maquette ; l’import global filières/formations a une entrée dédiée.
 */
export function getPedagogieSidebarConfig(): SidebarConfig {
  return [
    {
      id: 'pedagogie-accueil',
      title: 'Accueil',
      collapsible: false,
      items: [{ label: 'Tableau de bord Pédagogie', href: '/dashboard/pedagogie', icon: 'home' }],
    },
    {
      id: 'pedagogie-sites',
      title: 'Sites & salles',
      subtitle: 'Toujours visibles — accès direct',
      collapsible: false,
      items: [
        { label: 'Campus', href: '/dashboard/scolarite/campus', icon: 'building' },
        { label: 'Salles', href: '/dashboard/scolarite/salles', icon: 'building-office-2' },
      ],
    },
    {
      id: 'pedagogie-referentiel',
      title: 'Référentiel',
      subtitle: 'Offre, import structuré',
      items: [
        {
          label: 'Filières & formations',
          href: '/dashboard/scolarite/filieres',
          icon: 'academic-cap',
          activePathPrefixes: ['/dashboard/scolarite/filieres', '/dashboard/scolarite/formations'],
          activePathExcludePrefixes: ['/dashboard/scolarite/formations/import'],
        },
        {
          label: 'Import filières / formations (Excel)',
          href: '/dashboard/scolarite/formations/import',
          icon: 'arrow-down-tray',
          activePathPrefixes: ['/dashboard/scolarite/formations/import'],
        },
      ],
    },
    {
      id: 'pedagogie-organisation',
      title: 'Organisation',
      subtitle: 'Groupes et promotions',
      items: [{ label: 'Classes / cohortes', href: '/dashboard/pedagogie/classes', icon: 'table-cells' }],
    },
    {
      id: 'pedagogie-planning',
      title: 'Planning & équipes',
      subtitle: 'Temps, disponibilités, enseignants',
      items: [
        { label: 'Emploi du temps', href: '/dashboard/pedagogie/emploi-du-temps', icon: 'calendar' },
        { label: 'Indisponibilités', href: '/dashboard/pedagogie/indisponibilites', icon: 'clock' },
        { label: 'Enseignants', href: '/dashboard/pedagogie/enseignants', icon: 'users' },
      ],
    },
    {
      id: 'pedagogie-evaluation',
      title: 'Évaluation',
      subtitle: 'Devoirs, TP, examens & présences',
      items: [
        {
          label: 'Évaluations & notes',
          href: '/dashboard/pedagogie/notes',
          icon: 'document-text',
          activePathPrefixes: ['/dashboard/pedagogie/notes', '/dashboard/pedagogie/examens'],
        },
      ],
    },
    {
      id: 'pedagogie-pilotage',
      title: 'Pilotage',
      subtitle: 'Qualité et indicateurs',
      items: [
        { label: 'Audit pédagogique', href: '/dashboard/pedagogie/audit', icon: 'document-magnifying-glass' },
        { label: 'Rapports', href: '/dashboard/pedagogie/rapports', icon: 'chart' },
      ],
    },
  ];
}

const CAN_CAISSE = ['CAISSIER', 'CHEF_COMPTABLE', 'ADMIN', 'SUPER_ADMIN'];
const CAN_COMPTABILITE = ['CHEF_COMPTABLE', 'DAF', 'ADMIN', 'SUPER_ADMIN'];
const CAN_DAF = ['DAF', 'ADMIN', 'SUPER_ADMIN'];
const CAN_CLOTURE = ['CAISSIER', 'CHEF_COMPTABLE', 'DAF', 'ADMIN', 'SUPER_ADMIN'];
const CAN_TARIFS = ['SCOLARITE', 'CHEF_COMPTABLE', 'ADMIN', 'SUPER_ADMIN', 'DAF', 'CAISSIER', 'DEPT_HEAD', 'TEACHER', 'STUDENT'];
const CAN_TARIFS_PAIEMENTS_PAIE = ['CHEF_COMPTABLE', 'ADMIN', 'SUPER_ADMIN'];
const CAN_RAPPORTS = ['CHEF_COMPTABLE', 'DAF', 'ADMIN', 'SUPER_ADMIN'];

/** Sidebar Comptable (selon rôle) */
export function getComptableSidebarConfig(role: string): SidebarConfig {
  const can = (list: string[]) => list.includes(role);
  const sections: SidebarConfig = [
    {
      id: 'comptable-accueil',
      title: 'Accueil',
      collapsible: false,
      items: [{ label: 'Tableau de bord', href: '/dashboard/comptable', icon: 'home' }],
    },
  ];
  const finance: SidebarItem[] = [];
  if (can(CAN_TARIFS)) finance.push({ label: 'Tarifs', href: '/dashboard/comptable/tarifs', icon: 'currency' });
  if (can(CAN_TARIFS_PAIEMENTS_PAIE)) {
    finance.push({ label: 'Paiements', href: '/dashboard/comptable/paiements', icon: 'banknotes' });
    finance.push({ label: 'Recouvrement', href: '/dashboard/comptable/recouvrement', icon: 'arrow-trending-up' });
    finance.push({ label: 'Pointages', href: '/dashboard/comptable/pointages', icon: 'clock' });
    finance.push({ label: 'Paie', href: '/dashboard/comptable/paie', icon: 'briefcase' });
    finance.push({ label: 'Taux horaires', href: '/dashboard/comptable/taux-horaires', icon: 'clock' });
  }
  if (finance.length) sections.push({ id: 'comptable-finances', title: 'Finances', subtitle: 'Tarifs, flux, paie', items: finance });
  if (can(CAN_CAISSE)) sections.push({ id: 'comptable-caisse', title: 'Caisse', items: [{ label: 'Caisse (Brouillard)', href: '/dashboard/comptable/caisse', icon: 'banknotes' }] });
  if (can(CAN_COMPTABILITE)) sections.push({ id: 'comptable-compta', title: 'Comptabilité', items: [{ label: 'Comptabilité', href: '/dashboard/comptable/comptabilite', icon: 'table-cells' }] });
  if (can(CAN_DAF)) sections.push({ id: 'comptable-daf', title: 'DAF', items: [{ label: 'Tableau de bord DAF', href: '/dashboard/comptable/daf', icon: 'chart' }] });
  if (can(CAN_CLOTURE)) {
    sections.push({
      id: 'comptable-gouvernance',
      title: 'Gouvernance',
      subtitle: 'Clôture et historique',
      items: [
        { label: 'Clôture journalière', href: '/dashboard/comptable/cloture', icon: 'calendar-days' },
        { label: 'Historique clôture', href: '/dashboard/comptable/cloture/historique', icon: 'document-text' },
      ],
    });
  }
  if (can(CAN_RAPPORTS)) sections.push({ id: 'comptable-rapports', title: 'Rapports', items: [{ label: 'Rapports', href: '/dashboard/rapports', icon: 'chart' }] });
  return sections;
}

/** Sidebar Enseignant */
export function getEnseignantSidebarConfig(): SidebarConfig {
  return [
    {
      id: 'enseignant-accueil',
      title: 'Accueil',
      collapsible: false,
      items: [{ label: 'Tableau de bord', href: '/dashboard/enseignant', icon: 'home' }],
    },
    {
      id: 'enseignant-pedagogie',
      title: 'Pédagogie',
      items: [
        { label: 'Emploi du temps', href: '/dashboard/enseignant/emploi-du-temps', icon: 'calendar' },
        { label: 'Évaluations & présence', href: '/dashboard/enseignant/notes', icon: 'document-text' },
        { label: 'Pointage', href: '/dashboard/enseignant/pointage', icon: 'clock' },
      ],
    },
    { id: 'enseignant-paie', title: 'Paie', items: [{ label: 'Bulletins', href: '/dashboard/enseignant/paie', icon: 'ticket' }] },
  ];
}

/** Sidebar Étudiant */
export function getEtudiantSidebarConfig(): SidebarConfig {
  return [
    {
      id: 'etudiant-accueil',
      title: 'Accueil',
      collapsible: false,
      items: [{ label: 'Tableau de bord', href: '/dashboard/etudiant', icon: 'home' }],
    },
    {
      id: 'etudiant-espace',
      title: 'Espace',
      items: [
        { label: 'Documents', href: '/dashboard/etudiant/documents', icon: 'document-text' },
        { label: 'Emploi du temps', href: '/dashboard/etudiant/emploi-du-temps', icon: 'calendar' },
        { label: 'Notes', href: '/dashboard/etudiant/notes', icon: 'academic-cap' },
      ],
    },
  ];
}

/** Sidebar Chef de département */
export function getChefDepartementSidebarConfig(): SidebarConfig {
  return [
    {
      id: 'dept-accueil',
      title: 'Accueil',
      collapsible: false,
      items: [{ label: 'Tableau de bord', href: '/dashboard/chef-departement', icon: 'home' }],
    },
    {
      id: 'dept-demandes',
      title: 'Demandes',
      items: [{ label: 'Demandes de validation notes', href: '/dashboard/chef-departement', icon: 'clipboard-document-check' }],
    },
  ];
}

/** Sidebar Auditeur */
export function getAuditeurSidebarConfig(): SidebarConfig {
  return [
    {
      id: 'auditeur-accueil',
      title: 'Accueil',
      collapsible: false,
      items: [{ label: 'Tableau de bord', href: '/dashboard/auditeur', icon: 'home' }],
    },
    { id: 'auditeur-journal', title: 'Audit', items: [{ label: 'Journal', href: '/dashboard/auditeur/journal', icon: 'document-magnifying-glass' }] },
  ];
}
