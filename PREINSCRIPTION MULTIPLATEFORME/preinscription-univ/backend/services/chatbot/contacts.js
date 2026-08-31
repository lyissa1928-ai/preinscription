/**
 * Contacts publics pour l’accueil virtuel.
 * N’expose que ce qui est autorisé (config + coords établissement + optionnellement staff).
 */
const db = require('../../database/db');
const { getEffectiveConfig } = require('./configStore');

function pickContact(c) {
  if (!c) return null;
  const email = String(c.email || '').trim();
  const telephone = String(c.telephone || '').trim();
  const nom = String(c.nom || '').trim();
  if (!email && !telephone && !nom) return null;
  return {
    label: c.label || 'Contact',
    nom: nom || null,
    email: email || null,
    telephone: telephone || null,
    mailto: email ? `mailto:${email}` : null,
  };
}

function staffPublicFromUser(u, label) {
  if (!u || u.actif === false) return null;
  const email = String(u.email || '').trim();
  if (!email) return null;
  return {
    label,
    nom: [u.prenom, u.nom].filter(Boolean).join(' ').trim() || null,
    email,
    telephone: u.telephone ? String(u.telephone).trim() : null,
    mailto: `mailto:${email}`,
    source: 'staff_public',
  };
}

/**
 * Résout les contacts publics pour un établissement.
 */
function resolvePublicContacts(etablissementId) {
  const eid = etablissementId != null ? Number(etablissementId) : null;
  const cfg = getEffectiveConfig(eid);
  const etab = eid != null ? db.get('etablissements').find({ id: eid }).value() : null;

  const scolariteCfg = pickContact(cfg.contacts?.scolarite);
  const pedagogieCfg = pickContact(cfg.contacts?.pedagogie);
  const financeCfg = pickContact(cfg.contacts?.finance);
  const etabCfg = pickContact(cfg.contacts?.etablissement);

  // Fallback institutionnel (toujours sûr)
  const etabPublic =
    etab && (etab.email_contact || etab.telephone)
      ? {
          label: 'Contact établissement',
          nom: etab.nom || null,
          email: etab.email_contact || null,
          telephone: etab.telephone || null,
          mailto: etab.email_contact ? `mailto:${etab.email_contact}` : null,
          source: 'etablissement',
        }
      : null;

  let responsableEtab = etabCfg;
  let responsablePedagogie = pedagogieCfg;

  if (cfg.expose_staff_contacts && etab) {
    // Responsable désigné sur l’établissement
    if (etab.responsable_id) {
      const u = db.get('utilisateurs').find({ id: etab.responsable_id }).value();
      const pub = staffPublicFromUser(u, 'Responsable d’établissement');
      if (pub) responsableEtab = responsableEtab || pub;
    }
    // Premier compte rôle responsable du même établissement
    if (!responsablePedagogie && eid != null) {
      const resp = (db.get('utilisateurs').value() || []).find(
        (u) =>
          u.role === 'responsable' &&
          Number(u.etablissement_id) === eid &&
          u.actif !== false,
      );
      const pub = staffPublicFromUser(resp, 'Responsable pédagogique');
      if (pub) responsablePedagogie = pub;
    }
  }

  const scolarite =
    scolariteCfg ||
    (etabPublic
      ? { ...etabPublic, label: 'Scolarité / Accueil' }
      : null);

  return {
    scolarite,
    pedagogie: responsablePedagogie || scolarite,
    finance: financeCfg || scolarite,
    etablissement: responsableEtab || scolarite,
    etablissement_public: etabPublic,
    expose_staff_contacts: !!cfg.expose_staff_contacts,
  };
}

function routeService(intentOrKey, etablissementId) {
  const cfg = getEffectiveConfig(etablissementId);
  const contacts = resolvePublicContacts(etablissementId);
  const routing = cfg.service_routing || [];
  const key = String(intentOrKey || '').toLowerCase();
  const rule =
    routing.find((r) => r.key === key) ||
    routing.find((r) => key.includes(r.key)) ||
    null;
  const service = rule?.service || 'scolarite';
  const contact = contacts[service] || contacts.scolarite;
  return {
    service,
    label: rule?.label || contact?.label || 'Scolarité',
    contact,
  };
}

module.exports = { resolvePublicContacts, routeService, pickContact };
