/**
 * Activité staff réelle (audit_logs, dossiers, factures, demandes) sur une période.
 */
const db = require('../database/db');
const { ETAB_STAFF_ROLES, ROLE_ADMIN_ETABLISSEMENT } = require('./staffRoles');

function inRange(iso, start, end) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return t >= start.getTime() && t <= end.getTime();
}

function staffOfEtab(etabId) {
  const roles = new Set([...ETAB_STAFF_ROLES, ROLE_ADMIN_ETABLISSEMENT, 'directeur']);
  return (db.get('utilisateurs').value() || []).filter(
    (u) =>
      u &&
      u.actif !== false &&
      Number(u.etablissement_id) === Number(etabId) &&
      roles.has(u.role),
  );
}

/**
 * @returns {{ ranking: object[], mostActive: object|null, totals: object }}
 */
function computeStaffActivityForEtab(etabId, start, end) {
  const staff = staffOfEtab(etabId);
  const byId = new Map(
    staff.map((u) => [
      Number(u.id),
      {
        user_id: u.id,
        prenom: u.prenom || '',
        nom: u.nom || '',
        email: u.email || '',
        role: u.role,
        matricule: u.matricule || '',
        actions_total: 0,
        audit_actions: 0,
        dossiers_traites: 0,
        preinscriptions_traitees: 0,
        factures_generees: 0,
        demandes_traitees: 0,
        validations: 0,
      },
    ]),
  );

  const ensure = (uid) => {
    const id = Number(uid);
    if (!byId.has(id)) return null;
    return byId.get(id);
  };

  const logs = (db.get('audit_logs').value() || []).filter(
    (l) => Number(l.etablissement_id) === Number(etabId) && inRange(l.created_at, start, end),
  );
  for (const l of logs) {
    const row = ensure(l.user_id);
    if (!row) continue;
    row.audit_actions += 1;
    row.actions_total += 1;
    const act = String(l.action || '').toLowerCase();
    if (act.includes('valid') || act.includes('accept')) row.validations += 1;
  }

  // Aussi logs sans etablissement_id mais user du staff
  const staffIds = new Set([...byId.keys()]);
  for (const l of db.get('audit_logs').value() || []) {
    if (!inRange(l.created_at, start, end)) continue;
    if (l.etablissement_id != null && Number(l.etablissement_id) === Number(etabId)) continue;
    const uid = Number(l.user_id);
    if (!staffIds.has(uid)) continue;
    const row = byId.get(uid);
    if (!row) continue;
    // déjà compté si même log — on skip ceux déjà filtrés par etab
    // ici uniquement logs sans etab_id
    if (l.etablissement_id != null) continue;
    row.audit_actions += 1;
    row.actions_total += 1;
  }

  const dossiers = (db.get('dossiers').value() || []).filter(
    (d) => Number(d.etablissement_id) === Number(etabId),
  );
  for (const d of dossiers) {
    const traiteId = d.traite_par || d.valide_par || d.accepte_par || d.traite_par_id;
    const when = d.traite_at || d.valide_at || d.accepte_at || d.updated_at || d.created_at;
    if (traiteId && inRange(when, start, end)) {
      const row = ensure(traiteId);
      if (row) {
        row.dossiers_traites += 1;
        row.preinscriptions_traitees += 1;
        row.actions_total += 1;
      }
    }
  }

  const factures = (db.get('factures').value() || []).filter((f) => !f.supprime_at);
  for (const f of factures) {
    const when = f.created_at || f.date_emission;
    if (!inRange(when, start, end)) continue;
    let etabOk = Number(f.etablissement_id) === Number(etabId);
    if (!etabOk && f.dossier_id) {
      const d = db.get('dossiers').find({ id: f.dossier_id }).value();
      etabOk = d && Number(d.etablissement_id) === Number(etabId);
    }
    if (!etabOk && f.formation_id) {
      const fo = db.get('formations').find({ id: f.formation_id }).value();
      etabOk = fo && Number(fo.etablissement_id) === Number(etabId);
    }
    if (!etabOk) continue;
    const author = f.cree_par || f.created_by || f.emise_par || f.user_id;
    const row = ensure(author);
    if (row) {
      row.factures_generees += 1;
      row.actions_total += 1;
    }
  }

  const demandes = (db.get('demandes_proforma').value() || []).filter(
    (d) => Number(d.etablissement_id) === Number(etabId) && inRange(d.updated_at || d.traite_at || d.created_at, start, end),
  );
  for (const d of demandes) {
    const author = d.traite_par || d.valide_par || d.decide_par || d.updated_by;
    const row = ensure(author);
    if (row) {
      row.demandes_traitees += 1;
      row.actions_total += 1;
    }
  }

  const ranking = [...byId.values()].sort(
    (a, b) => b.actions_total - a.actions_total || String(a.nom).localeCompare(String(b.nom)),
  );
  const mostActive = ranking.find((r) => r.actions_total > 0) || null;

  return {
    ranking,
    mostActive,
    totals: {
      staff_count: ranking.length,
      actions_total: ranking.reduce((s, r) => s + r.actions_total, 0),
      dossiers_traites: ranking.reduce((s, r) => s + r.dossiers_traites, 0),
      factures_generees: ranking.reduce((s, r) => s + r.factures_generees, 0),
      demandes_traitees: ranking.reduce((s, r) => s + r.demandes_traitees, 0),
    },
  };
}

module.exports = {
  computeStaffActivityForEtab,
  staffOfEtab,
  inRange,
};
