const db = require('../database/db');
const { createBackup } = require('./dbBackup');

function maxId(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  return Math.max(...arr.map((x) => x.id || 0));
}

function rebuildInitialCatalog() {
  const etabs = db.get('etablissements').value() || [];
  const filieres = db.get('filieres').value() || [];
  const formations = db.get('formations').value() || [];

  if (etabs.length > 0 || filieres.length > 0 || formations.length > 0) {
    return {
      ok: false,
      reason: 'skip_not_empty',
      counts: { etablissements: etabs.length, filieres: filieres.length, formations: formations.length },
    };
  }

  createBackup('before-rebuild-catalog');

  const now = new Date().toISOString();

  const newEtabs = [
    {
      id: 1,
      nom: 'Institut Sante Plus',
      type: 'sante',
      description: 'Etablissement de reference pour les filieres medicales et paramedicales.',
      logo_url: null,
      cachet_url: null,
      couleur_primaire: '#0f766e',
      couleur_secondaire: '#14b8a6',
      adresse: 'Dakar',
      telephone: '+221770000001',
      email_contact: 'contact@santeplus.sn',
      site_web: '',
      ninea: '',
      rc: '',
      arrete: '',
      compte_bancaire: '',
      responsable_id: null,
      actif: true,
      created_at: now,
    },
    {
      id: 2,
      nom: 'Ecole BTP Horizon',
      type: 'btp',
      description: 'Formations professionnelles en genie civil et batiment.',
      logo_url: null,
      cachet_url: null,
      couleur_primaire: '#9a3412',
      couleur_secondaire: '#f97316',
      adresse: 'Thiès',
      telephone: '+221770000002',
      email_contact: 'contact@btphorizon.sn',
      site_web: '',
      ninea: '',
      rc: '',
      arrete: '',
      compte_bancaire: '',
      responsable_id: null,
      actif: true,
      created_at: now,
    },
    {
      id: 3,
      nom: 'Academie Gestion Excellence',
      type: 'gestion',
      description: 'Formations en gestion, marketing et comptabilite.',
      logo_url: null,
      cachet_url: null,
      couleur_primaire: '#1d4ed8',
      couleur_secondaire: '#60a5fa',
      adresse: 'Dakar',
      telephone: '+221770000003',
      email_contact: 'contact@gestionexcellence.sn',
      site_web: '',
      ninea: '',
      rc: '',
      arrete: '',
      compte_bancaire: '',
      responsable_id: null,
      actif: true,
      created_at: now,
    },
  ];

  const newFilieres = [
    { id: 1, etablissement_id: 1, nom: 'Sciences Infirmieres', code: 'SI', description: '', actif: true, created_at: now },
    { id: 2, etablissement_id: 2, nom: 'Genie Civil', code: 'GC', description: '', actif: true, created_at: now },
    { id: 3, etablissement_id: 3, nom: 'Management', code: 'MGT', description: '', actif: true, created_at: now },
  ];

  const newFormations = [
    {
      id: 1, etablissement_id: 1, filiere_id: 1, titre: 'Licence 1 Sciences Infirmieres', type: 'presentiel',
      niveau: 'Bac+1 / Licence 1', niveau_requis: 'Baccalaureat', duree: '3 ans', description: '',
      ville: 'Dakar', places: 80, frais_inscription: 25000, prix: 450000, mensualite: 0, frais_soutenance: 0, autres_frais: 0,
      actif: true, created_at: now,
    },
    {
      id: 2, etablissement_id: 2, filiere_id: 2, titre: 'Licence 1 Genie Civil', type: 'presentiel',
      niveau: 'Bac+1 / Licence 1', niveau_requis: 'Baccalaureat', duree: '3 ans', description: '',
      ville: 'Thiès', places: 70, frais_inscription: 30000, prix: 500000, mensualite: 0, frais_soutenance: 0, autres_frais: 0,
      actif: true, created_at: now,
    },
    {
      id: 3, etablissement_id: 3, filiere_id: 3, titre: 'Licence 1 Management', type: 'en_ligne',
      niveau: 'Bac+1 / Licence 1', niveau_requis: 'Baccalaureat', duree: '3 ans', description: '',
      ville: null, places: 200, frais_inscription: 20000, prix: 350000, mensualite: 35000, frais_soutenance: 0, autres_frais: 0,
      actif: true, created_at: now,
    },
  ];

  db.set('etablissements', newEtabs).write();
  db.set('filieres', newFilieres).write();
  db.set('formations', newFormations).write();

  db.set('_nextId.etablissements', maxId(newEtabs) + 1).write();
  db.set('_nextId.filieres', maxId(newFilieres) + 1).write();
  db.set('_nextId.formations', maxId(newFormations) + 1).write();

  return {
    ok: true,
    reason: 'rebuilt',
    counts: {
      etablissements: newEtabs.length,
      filieres: newFilieres.length,
      formations: newFormations.length,
    },
  };
}

if (require.main === module) {
  const result = rebuildInitialCatalog();
  console.log(JSON.stringify(result, null, 2));
}

module.exports = { rebuildInitialCatalog };

