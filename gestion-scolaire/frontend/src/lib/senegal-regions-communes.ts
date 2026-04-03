/**
 * Référentiel Sénégal : Région → Département → Commune (fallback si l'API ne répond pas).
 * 14 régions, 46 départements, 118 communes (113 décret 2008 + 6 Keur Massar 2021).
 */
export type Commune = { code: string; nom: string };
export type Departement = { code: string; nom: string; communes: Commune[] };
export type Region = { code: string; nom: string; departements: Departement[] };

export const REGIONS_SENEGAL: Region[] = [
  {
    code: 'DK',
    nom: 'Dakar',
    departements: [
      { code: 'DK-R', nom: 'Rufisque', communes: [{ code: 'DK-R-1', nom: 'Rufisque' }, { code: 'DK-R-2', nom: 'Bargny' }, { code: 'DK-R-3', nom: 'Diamniadio' }, { code: 'DK-R-4', nom: 'Sébikhotane' }] },
      { code: 'DK-P', nom: 'Pikine', communes: [{ code: 'DK-P-1', nom: 'Pikine' }] },
      { code: 'DK-G', nom: 'Guédiawaye', communes: [{ code: 'DK-G-1', nom: 'Guédiawaye' }] },
      { code: 'DK-V', nom: 'Dakar', communes: [{ code: 'DK-V-1', nom: 'Dakar' }] },
      {
        code: 'DK-KM',
        nom: 'Keur Massar',
        communes: [
          { code: 'DK-KM-1', nom: 'Yeumbeul Nord' },
          { code: 'DK-KM-2', nom: 'Yeumbeul Sud' },
          { code: 'DK-KM-3', nom: 'Keur Massar Nord' },
          { code: 'DK-KM-4', nom: 'Malika' },
          { code: 'DK-KM-5', nom: 'Keur Massar Sud' },
          { code: 'DK-KM-6', nom: 'Jaxaay-Parcelles' },
        ],
      },
    ],
  },
  {
    code: 'DKL',
    nom: 'Diourbel',
    departements: [
      { code: 'DKL-M', nom: 'Mbacké', communes: [{ code: 'DKL-M-1', nom: 'Mbacké' }] },
      { code: 'DKL-B', nom: 'Bambey', communes: [{ code: 'DKL-B-1', nom: 'Bambey' }] },
      { code: 'DKL-D', nom: 'Diourbel', communes: [{ code: 'DKL-D-1', nom: 'Diourbel' }] },
    ],
  },
  {
    code: 'FT',
    nom: 'Fatick',
    departements: [
      { code: 'FT-G', nom: 'Gossas', communes: [{ code: 'FT-G-1', nom: 'Gossas' }] },
      { code: 'FT-FO', nom: 'Foundiougne', communes: [{ code: 'FT-FO-1', nom: 'Foundiougne' }, { code: 'FT-FO-2', nom: 'Karang Poste' }, { code: 'FT-FO-3', nom: 'Passy' }, { code: 'FT-FO-4', nom: 'Sokone' }, { code: 'FT-FO-5', nom: 'Soum' }] },
      { code: 'FT-F', nom: 'Fatick', communes: [{ code: 'FT-F-1', nom: 'Fatick' }, { code: 'FT-F-2', nom: 'Diofior' }] },
    ],
  },
  {
    code: 'KF',
    nom: 'Kaffrine',
    departements: [
      { code: 'KF-MH', nom: 'Malem Hodar', communes: [{ code: 'KF-MH-1', nom: 'Malem Hodar' }] },
      { code: 'KF-KO', nom: 'Koungheul', communes: [{ code: 'KF-KO-1', nom: 'Koungheul' }] },
      { code: 'KF-B', nom: 'Birkilane', communes: [{ code: 'KF-B-1', nom: 'Birkilane' }] },
      { code: 'KF-K', nom: 'Kaffrine', communes: [{ code: 'KF-K-1', nom: 'Kaffrine' }, { code: 'KF-K-2', nom: 'Nganda' }] },
    ],
  },
  {
    code: 'KL',
    nom: 'Kaolack',
    departements: [
      { code: 'KL-N', nom: 'Nioro du Rip', communes: [{ code: 'KL-N-1', nom: 'Nioro du Rip' }, { code: 'KL-N-2', nom: 'Keur Madiabel' }] },
      { code: 'KL-G', nom: 'Guinguinéo', communes: [{ code: 'KL-G-1', nom: 'Guinguinéo' }, { code: 'KL-G-2', nom: 'Mboss' }, { code: 'KL-G-3', nom: 'Fass' }] },
      { code: 'KL-K', nom: 'Kaolack', communes: [{ code: 'KL-K-1', nom: 'Kaolack' }, { code: 'KL-K-2', nom: 'Gandiaye' }, { code: 'KL-K-3', nom: 'Kahone' }, { code: 'KL-K-4', nom: 'Ndoffane' }, { code: 'KL-K-5', nom: 'Sibassor' }] },
    ],
  },
  {
    code: 'KD',
    nom: 'Kédougou',
    departements: [
      { code: 'KD-S', nom: 'Saraya', communes: [{ code: 'KD-S-1', nom: 'Saraya' }] },
      { code: 'KD-SA', nom: 'Salémata', communes: [{ code: 'KD-SA-1', nom: 'Salémata' }] },
      { code: 'KD-K', nom: 'Kédougou', communes: [{ code: 'KD-K-1', nom: 'Kédougou' }] },
    ],
  },
  {
    code: 'KDLA',
    nom: 'Kolda',
    departements: [
      { code: 'KDLA-V', nom: 'Vélingara', communes: [{ code: 'KDLA-V-1', nom: 'Vélingara' }, { code: 'KDLA-V-2', nom: 'Kounkané' }, { code: 'KDLA-V-3', nom: 'Diaobé-Kabendou' }] },
      { code: 'KDLA-M', nom: 'Médina Yoro Foulah', communes: [{ code: 'KDLA-M-1', nom: 'Médina Yoro Foulah' }, { code: 'KDLA-M-2', nom: 'Pata' }] },
      { code: 'KDLA-K', nom: 'Kolda', communes: [{ code: 'KDLA-K-1', nom: 'Kolda' }, { code: 'KDLA-K-2', nom: 'Dabo' }, { code: 'KDLA-K-3', nom: 'Salikégné' }, { code: 'KDLA-K-4', nom: 'Saré Yoba Diéga' }] },
    ],
  },
  {
    code: 'LG',
    nom: 'Louga',
    departements: [
      { code: 'LG-LG', nom: 'Linguère', communes: [{ code: 'LG-LG-1', nom: 'Linguère' }, { code: 'LG-LG-2', nom: 'Dahra' }] },
      { code: 'LG-K', nom: 'Kébémer', communes: [{ code: 'LG-K-1', nom: 'Kébémer' }, { code: 'LG-K-2', nom: 'Guéoul' }] },
      { code: 'LG-L', nom: 'Louga', communes: [{ code: 'LG-L-1', nom: 'Louga' }, { code: 'LG-L-2', nom: 'Ndiagne' }, { code: 'LG-L-3', nom: 'Niomré' }] },
    ],
  },
  {
    code: 'MT',
    nom: 'Matam',
    departements: [
      { code: 'MT-R', nom: 'Ranérou', communes: [{ code: 'MT-R-1', nom: 'Ranérou' }] },
      { code: 'MT-K', nom: 'Kanel', communes: [{ code: 'MT-K-1', nom: 'Kanel' }, { code: 'MT-K-2', nom: 'Dembancané' }, { code: 'MT-K-3', nom: 'Hamady Hounaré' }, { code: 'MT-K-4', nom: 'Semmé' }, { code: 'MT-K-5', nom: 'Sinthiou Bamambé-Banadji' }, { code: 'MT-K-6', nom: 'Waoundé' }, { code: 'MT-K-7', nom: 'Odobéré' }] },
      { code: 'MT-M', nom: 'Matam', communes: [{ code: 'MT-M-1', nom: 'Matam' }, { code: 'MT-M-2', nom: 'Ourossogui' }, { code: 'MT-M-3', nom: 'Thilogne' }, { code: 'MT-M-4', nom: 'Agnam Civol' }] },
    ],
  },
  {
    code: 'SL',
    nom: 'Saint-Louis',
    departements: [
      { code: 'SL-P', nom: 'Podor', communes: [{ code: 'SL-P-1', nom: 'Podor' }, { code: 'SL-P-2', nom: 'Aéré Lao' }, { code: 'SL-P-3', nom: 'Bodé Lao' }, { code: 'SL-P-4', nom: 'Démette' }, { code: 'SL-P-5', nom: 'Galoya Toucouleur' }, { code: 'SL-P-6', nom: 'Golléré' }, { code: 'SL-P-7', nom: 'Guédé Chantier' }, { code: 'SL-P-8', nom: 'Mboumba' }, { code: 'SL-P-9', nom: 'Niandane' }, { code: 'SL-P-10', nom: 'Ndioum' }, { code: 'SL-P-11', nom: 'Pété' }, { code: 'SL-P-12', nom: 'Walaldé' }] },
      { code: 'SL-D', nom: 'Dagana', communes: [{ code: 'SL-D-1', nom: 'Dagana' }, { code: 'SL-D-2', nom: 'Gaé' }, { code: 'SL-D-3', nom: 'Richard-Toll' }, { code: 'SL-D-4', nom: 'Ross Béthio' }, { code: 'SL-D-5', nom: 'Rosso' }] },
      { code: 'SL-S', nom: 'Saint-Louis', communes: [{ code: 'SL-S-1', nom: 'Saint-Louis' }, { code: 'SL-S-2', nom: 'Mpal' }] },
    ],
  },
  {
    code: 'SH',
    nom: 'Sédhiou',
    departements: [
      { code: 'SH-G', nom: 'Goudomp', communes: [{ code: 'SH-G-1', nom: 'Goudomp' }, { code: 'SH-G-2', nom: 'Diattacounda' }, { code: 'SH-G-3', nom: 'Samine' }, { code: 'SH-G-4', nom: 'Tanaff' }] },
      { code: 'SH-B', nom: 'Bounkiling', communes: [{ code: 'SH-B-1', nom: 'Bounkiling' }, { code: 'SH-B-2', nom: 'Madina Wandifa' }] },
      { code: 'SH-S', nom: 'Sédhiou', communes: [{ code: 'SH-S-1', nom: 'Sédhiou' }, { code: 'SH-S-2', nom: 'Diannah Malary' }, { code: 'SH-S-3', nom: 'Marsassoum' }] },
    ],
  },
  {
    code: 'TC',
    nom: 'Tambacounda',
    departements: [
      { code: 'TC-K', nom: 'Koumpentoum', communes: [{ code: 'TC-K-1', nom: 'Koumpentoum' }, { code: 'TC-K-2', nom: 'Malem Niani' }] },
      { code: 'TC-G', nom: 'Goudiry', communes: [{ code: 'TC-G-1', nom: 'Goudiry' }, { code: 'TC-G-2', nom: 'Kothiary' }] },
      { code: 'TC-B', nom: 'Bakel', communes: [{ code: 'TC-B-1', nom: 'Bakel' }, { code: 'TC-B-2', nom: 'Diawara' }, { code: 'TC-B-3', nom: 'Kidira' }] },
      { code: 'TC-T', nom: 'Tambacounda', communes: [{ code: 'TC-T-1', nom: 'Tambacounda' }] },
    ],
  },
  {
    code: 'TH',
    nom: 'Thiès',
    departements: [
      { code: 'TH-TH', nom: 'Tivaouane', communes: [{ code: 'TH-TH-1', nom: 'Tivaouane' }, { code: 'TH-TH-2', nom: 'Mboro' }, { code: 'TH-TH-3', nom: 'Meckhé' }] },
      { code: 'TH-M', nom: 'Mbour', communes: [{ code: 'TH-M-1', nom: 'Mbour' }, { code: 'TH-M-2', nom: 'Joal-Fadiouth' }, { code: 'TH-M-3', nom: 'Ngaparou' }, { code: 'TH-M-4', nom: 'Nguékhokh' }, { code: 'TH-M-5', nom: 'Popenguine-Ndayane' }, { code: 'TH-M-6', nom: 'Saly Portudal' }, { code: 'TH-M-7', nom: 'Somone' }, { code: 'TH-M-8', nom: 'Thiadiaye' }] },
      { code: 'TH-T', nom: 'Thiès', communes: [{ code: 'TH-T-1', nom: 'Thiès' }, { code: 'TH-T-2', nom: 'Kayar' }, { code: 'TH-T-3', nom: 'Khombole' }, { code: 'TH-T-4', nom: 'Pout' }] },
    ],
  },
  {
    code: 'ZG',
    nom: 'Ziguinchor',
    departements: [
      { code: 'ZG-O', nom: 'Oussouye', communes: [{ code: 'ZG-O-1', nom: 'Oussouye' }] },
      { code: 'ZG-B', nom: 'Bignona', communes: [{ code: 'ZG-B-1', nom: 'Bignona' }, { code: 'ZG-B-2', nom: 'Thionck-Essyl' }, { code: 'ZG-B-3', nom: 'Diouloulou' }] },
      { code: 'ZG-Z', nom: 'Ziguinchor', communes: [{ code: 'ZG-Z-1', nom: 'Ziguinchor' }] },
    ],
  },
];
