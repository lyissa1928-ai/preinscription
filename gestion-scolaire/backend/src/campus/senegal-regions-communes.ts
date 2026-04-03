/**
 * Référentiel Sénégal : Région → Département → Commune.
 * 14 régions, 46 départements, 118 communes (113 communes décret 2008 + 6 communes Keur Massar 2021).
 * Source : décrets 2008-748, 2008-1496, 2021-687 (Keur Massar).
 */
export interface Commune {
  code: string;
  nom: string;
}

export interface Departement {
  code: string;
  nom: string;
  communes: Commune[];
}

export interface Region {
  code: string;
  nom: string;
  departements: Departement[];
}

function c(code: string, nom: string): Commune {
  return { code, nom };
}

export const REGIONS_SENEGAL: Region[] = [
  {
    code: 'DK',
    nom: 'Dakar',
    departements: [
      {
        code: 'DK-R',
        nom: 'Rufisque',
        communes: [
          c('DK-R-1', 'Rufisque'),
          c('DK-R-2', 'Bargny'),
          c('DK-R-3', 'Diamniadio'),
          c('DK-R-4', 'Sébikhotane'),
        ],
      },
      { code: 'DK-P', nom: 'Pikine', communes: [c('DK-P-1', 'Pikine')] },
      {
        code: 'DK-G',
        nom: 'Guédiawaye',
        communes: [c('DK-G-1', 'Guédiawaye')],
      },
      { code: 'DK-V', nom: 'Dakar', communes: [c('DK-V-1', 'Dakar')] },
      {
        code: 'DK-KM',
        nom: 'Keur Massar',
        communes: [
          c('DK-KM-1', 'Yeumbeul Nord'),
          c('DK-KM-2', 'Yeumbeul Sud'),
          c('DK-KM-3', 'Keur Massar Nord'),
          c('DK-KM-4', 'Malika'),
          c('DK-KM-5', 'Keur Massar Sud'),
          c('DK-KM-6', 'Jaxaay-Parcelles'),
        ],
      },
    ],
  },
  {
    code: 'DKL',
    nom: 'Diourbel',
    departements: [
      { code: 'DKL-M', nom: 'Mbacké', communes: [c('DKL-M-1', 'Mbacké')] },
      { code: 'DKL-B', nom: 'Bambey', communes: [c('DKL-B-1', 'Bambey')] },
      { code: 'DKL-D', nom: 'Diourbel', communes: [c('DKL-D-1', 'Diourbel')] },
    ],
  },
  {
    code: 'FT',
    nom: 'Fatick',
    departements: [
      { code: 'FT-G', nom: 'Gossas', communes: [c('FT-G-1', 'Gossas')] },
      {
        code: 'FT-FO',
        nom: 'Foundiougne',
        communes: [
          c('FT-FO-1', 'Foundiougne'),
          c('FT-FO-2', 'Karang Poste'),
          c('FT-FO-3', 'Passy'),
          c('FT-FO-4', 'Sokone'),
          c('FT-FO-5', 'Soum'),
        ],
      },
      {
        code: 'FT-F',
        nom: 'Fatick',
        communes: [c('FT-F-1', 'Fatick'), c('FT-F-2', 'Diofior')],
      },
    ],
  },
  {
    code: 'KF',
    nom: 'Kaffrine',
    departements: [
      {
        code: 'KF-MH',
        nom: 'Malem Hodar',
        communes: [c('KF-MH-1', 'Malem Hodar')],
      },
      {
        code: 'KF-KO',
        nom: 'Koungheul',
        communes: [c('KF-KO-1', 'Koungheul')],
      },
      { code: 'KF-B', nom: 'Birkilane', communes: [c('KF-B-1', 'Birkilane')] },
      {
        code: 'KF-K',
        nom: 'Kaffrine',
        communes: [c('KF-K-1', 'Kaffrine'), c('KF-K-2', 'Nganda')],
      },
    ],
  },
  {
    code: 'KL',
    nom: 'Kaolack',
    departements: [
      {
        code: 'KL-N',
        nom: 'Nioro du Rip',
        communes: [c('KL-N-1', 'Nioro du Rip'), c('KL-N-2', 'Keur Madiabel')],
      },
      {
        code: 'KL-G',
        nom: 'Guinguinéo',
        communes: [
          c('KL-G-1', 'Guinguinéo'),
          c('KL-G-2', 'Mboss'),
          c('KL-G-3', 'Fass'),
        ],
      },
      {
        code: 'KL-K',
        nom: 'Kaolack',
        communes: [
          c('KL-K-1', 'Kaolack'),
          c('KL-K-2', 'Gandiaye'),
          c('KL-K-3', 'Kahone'),
          c('KL-K-4', 'Ndoffane'),
          c('KL-K-5', 'Sibassor'),
        ],
      },
    ],
  },
  {
    code: 'KD',
    nom: 'Kédougou',
    departements: [
      { code: 'KD-S', nom: 'Saraya', communes: [c('KD-S-1', 'Saraya')] },
      { code: 'KD-SA', nom: 'Salémata', communes: [c('KD-SA-1', 'Salémata')] },
      { code: 'KD-K', nom: 'Kédougou', communes: [c('KD-K-1', 'Kédougou')] },
    ],
  },
  {
    code: 'KDLA',
    nom: 'Kolda',
    departements: [
      {
        code: 'KDLA-V',
        nom: 'Vélingara',
        communes: [
          c('KDLA-V-1', 'Vélingara'),
          c('KDLA-V-2', 'Kounkané'),
          c('KDLA-V-3', 'Diaobé-Kabendou'),
        ],
      },
      {
        code: 'KDLA-M',
        nom: 'Médina Yoro Foulah',
        communes: [c('KDLA-M-1', 'Médina Yoro Foulah'), c('KDLA-M-2', 'Pata')],
      },
      {
        code: 'KDLA-K',
        nom: 'Kolda',
        communes: [
          c('KDLA-K-1', 'Kolda'),
          c('KDLA-K-2', 'Dabo'),
          c('KDLA-K-3', 'Salikégné'),
          c('KDLA-K-4', 'Saré Yoba Diéga'),
        ],
      },
    ],
  },
  {
    code: 'LG',
    nom: 'Louga',
    departements: [
      {
        code: 'LG-LG',
        nom: 'Linguère',
        communes: [c('LG-LG-1', 'Linguère'), c('LG-LG-2', 'Dahra')],
      },
      {
        code: 'LG-K',
        nom: 'Kébémer',
        communes: [c('LG-K-1', 'Kébémer'), c('LG-K-2', 'Guéoul')],
      },
      {
        code: 'LG-L',
        nom: 'Louga',
        communes: [
          c('LG-L-1', 'Louga'),
          c('LG-L-2', 'Ndiagne'),
          c('LG-L-3', 'Niomré'),
        ],
      },
    ],
  },
  {
    code: 'MT',
    nom: 'Matam',
    departements: [
      { code: 'MT-R', nom: 'Ranérou', communes: [c('MT-R-1', 'Ranérou')] },
      {
        code: 'MT-K',
        nom: 'Kanel',
        communes: [
          c('MT-K-1', 'Kanel'),
          c('MT-K-2', 'Dembancané'),
          c('MT-K-3', 'Hamady Hounaré'),
          c('MT-K-4', 'Semmé'),
          c('MT-K-5', 'Sinthiou Bamambé-Banadji'),
          c('MT-K-6', 'Waoundé'),
          c('MT-K-7', 'Odobéré'),
        ],
      },
      {
        code: 'MT-M',
        nom: 'Matam',
        communes: [
          c('MT-M-1', 'Matam'),
          c('MT-M-2', 'Ourossogui'),
          c('MT-M-3', 'Thilogne'),
          c('MT-M-4', 'Agnam Civol'),
        ],
      },
    ],
  },
  {
    code: 'SL',
    nom: 'Saint-Louis',
    departements: [
      {
        code: 'SL-P',
        nom: 'Podor',
        communes: [
          c('SL-P-1', 'Podor'),
          c('SL-P-2', 'Aéré Lao'),
          c('SL-P-3', 'Bodé Lao'),
          c('SL-P-4', 'Démette'),
          c('SL-P-5', 'Galoya Toucouleur'),
          c('SL-P-6', 'Golléré'),
          c('SL-P-7', 'Guédé Chantier'),
          c('SL-P-8', 'Mboumba'),
          c('SL-P-9', 'Niandane'),
          c('SL-P-10', 'Ndioum'),
          c('SL-P-11', 'Pété'),
          c('SL-P-12', 'Walaldé'),
        ],
      },
      {
        code: 'SL-D',
        nom: 'Dagana',
        communes: [
          c('SL-D-1', 'Dagana'),
          c('SL-D-2', 'Gaé'),
          c('SL-D-3', 'Richard-Toll'),
          c('SL-D-4', 'Ross Béthio'),
          c('SL-D-5', 'Rosso'),
        ],
      },
      {
        code: 'SL-S',
        nom: 'Saint-Louis',
        communes: [c('SL-S-1', 'Saint-Louis'), c('SL-S-2', 'Mpal')],
      },
    ],
  },
  {
    code: 'SH',
    nom: 'Sédhiou',
    departements: [
      {
        code: 'SH-G',
        nom: 'Goudomp',
        communes: [
          c('SH-G-1', 'Goudomp'),
          c('SH-G-2', 'Diattacounda'),
          c('SH-G-3', 'Samine'),
          c('SH-G-4', 'Tanaff'),
        ],
      },
      {
        code: 'SH-B',
        nom: 'Bounkiling',
        communes: [c('SH-B-1', 'Bounkiling'), c('SH-B-2', 'Madina Wandifa')],
      },
      {
        code: 'SH-S',
        nom: 'Sédhiou',
        communes: [
          c('SH-S-1', 'Sédhiou'),
          c('SH-S-2', 'Diannah Malary'),
          c('SH-S-3', 'Marsassoum'),
        ],
      },
    ],
  },
  {
    code: 'TC',
    nom: 'Tambacounda',
    departements: [
      {
        code: 'TC-K',
        nom: 'Koumpentoum',
        communes: [c('TC-K-1', 'Koumpentoum'), c('TC-K-2', 'Malem Niani')],
      },
      {
        code: 'TC-G',
        nom: 'Goudiry',
        communes: [c('TC-G-1', 'Goudiry'), c('TC-G-2', 'Kothiary')],
      },
      {
        code: 'TC-B',
        nom: 'Bakel',
        communes: [
          c('TC-B-1', 'Bakel'),
          c('TC-B-2', 'Diawara'),
          c('TC-B-3', 'Kidira'),
        ],
      },
      {
        code: 'TC-T',
        nom: 'Tambacounda',
        communes: [c('TC-T-1', 'Tambacounda')],
      },
    ],
  },
  {
    code: 'TH',
    nom: 'Thiès',
    departements: [
      {
        code: 'TH-TH',
        nom: 'Tivaouane',
        communes: [
          c('TH-TH-1', 'Tivaouane'),
          c('TH-TH-2', 'Mboro'),
          c('TH-TH-3', 'Meckhé'),
        ],
      },
      {
        code: 'TH-M',
        nom: 'Mbour',
        communes: [
          c('TH-M-1', 'Mbour'),
          c('TH-M-2', 'Joal-Fadiouth'),
          c('TH-M-3', 'Ngaparou'),
          c('TH-M-4', 'Nguékhokh'),
          c('TH-M-5', 'Popenguine-Ndayane'),
          c('TH-M-6', 'Saly Portudal'),
          c('TH-M-7', 'Somone'),
          c('TH-M-8', 'Thiadiaye'),
        ],
      },
      {
        code: 'TH-T',
        nom: 'Thiès',
        communes: [
          c('TH-T-1', 'Thiès'),
          c('TH-T-2', 'Kayar'),
          c('TH-T-3', 'Khombole'),
          c('TH-T-4', 'Pout'),
        ],
      },
    ],
  },
  {
    code: 'ZG',
    nom: 'Ziguinchor',
    departements: [
      { code: 'ZG-O', nom: 'Oussouye', communes: [c('ZG-O-1', 'Oussouye')] },
      {
        code: 'ZG-B',
        nom: 'Bignona',
        communes: [
          c('ZG-B-1', 'Bignona'),
          c('ZG-B-2', 'Thionck-Essyl'),
          c('ZG-B-3', 'Diouloulou'),
        ],
      },
      {
        code: 'ZG-Z',
        nom: 'Ziguinchor',
        communes: [c('ZG-Z-1', 'Ziguinchor')],
      },
    ],
  },
];
