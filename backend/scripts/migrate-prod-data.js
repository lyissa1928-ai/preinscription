#!/usr/bin/env node
/**
 * Migration données post-déploiement (prod ou local).
 * - Factures : échéance = émission + 1 an
 * - Admin établissement : pointeurs admin_etablissement_id alignés
 *
 * Usage : node backend/scripts/migrate-prod-data.js
 */
const db = require('../database/db');
const { syncDateEcheanceFacture } = require('../utils/factureValidite');
const { findAdminEtablissementUser } = require('../utils/adminEtablissement');
const { ROLE_ADMIN_ETABLISSEMENT } = require('../utils/staffRoles');

function migrateFactures() {
  const factures = db.get('factures').value() || [];
  let updated = 0;
  factures.forEach((f) => {
    const next = syncDateEcheanceFacture(f);
    if (next && next !== f.date_echeance) {
      db.get('factures').find({ id: f.id }).assign({ date_echeance: next }).write();
      updated += 1;
    }
  });
  return { total: factures.length, updated };
}

function migrateAdminEtabPointers() {
  const etabs = db.get('etablissements').value() || [];
  let fixed = 0;
  etabs.forEach((etab) => {
    const admin = findAdminEtablissementUser(etab.id);
    const expected = admin?.id ?? null;
    if (Number(etab.admin_etablissement_id) !== Number(expected)) {
      db.get('etablissements').find({ id: etab.id }).assign({ admin_etablissement_id: expected }).write();
      fixed += 1;
    }
  });
  return { etablissements: etabs.length, pointers_fixed: fixed };
}

function migrateDemandesProformaValidite() {
  const { dateEcheanceFacture } = require('../utils/factureValidite');
  const demandes = db.get('demandes_proforma').value() || [];
  let updated = 0;
  demandes.forEach((d) => {
    if (d.statut !== 'acceptee' || !d.facture) return;
    const base = d.facture.date_emission || d.updated_at || d.created_at;
    const expected = dateEcheanceFacture(base);
    const cur = d.facture.validite_jusqu_au;
    if (!cur || new Date(cur).getTime() < new Date(expected).getTime() - 86400000) {
      db.get('demandes_proforma')
        .find({ id: d.id })
        .assign({
          facture: { ...d.facture, validite_jusqu_au: expected },
        })
        .write();
      updated += 1;
    }
  });
  return { total: demandes.length, updated };
}

function main() {
  console.log('Migration UniPortail — données métier');
  const factures = migrateFactures();
  console.log(`  Factures : ${factures.updated}/${factures.total} échéances mises à jour (validité 1 an)`);
  const demandes = migrateDemandesProformaValidite();
  console.log(`  Demandes proforma : ${demandes.updated} validités mises à jour`);
  const admins = migrateAdminEtabPointers();
  console.log(`  Établissements : ${admins.pointers_fixed} pointeurs admin corrigés`);
  const adminsRole = (db.get('utilisateurs').value() || []).filter(
    (u) => u.role === ROLE_ADMIN_ETABLISSEMENT,
  ).length;
  console.log(`  Comptes admin_etablissement actifs : ${adminsRole}`);
  console.log('Migration terminée.');
}

main();
