/**
 * Réponses ancrées uniquement sur le catalogue (formations, tarifs, conditions).
 */
const { INTENTS } = require('./intent');

function formatContactBlock(contact, title) {
  if (!contact) {
    return `${title}\nJe n’ai pas de coordonnées de scolarité dans la base. Consultez la page de l’établissement.`;
  }
  const lines = [`**${title || contact.label || 'Scolarité'}**`];
  if (contact.email) lines.push(`• E-mail : ${contact.email}`);
  if (contact.telephone) lines.push(`• Téléphone : ${contact.telephone}`);
  return lines.join('\n');
}

function formatFormationCard(f, index, { contacts } = {}) {
  const n = index != null ? `${index + 1}. ` : '';
  const lines = [`**${n}${f.titre}**`];
  if (f.niveau) lines.push(`• Niveau : ${f.niveau}`);
  if (f.duree) lines.push(`• Durée : ${f.duree}`);
  if (f.type_label) lines.push(`• Modalité : ${f.type_label}`);
  if (f.etablissement_nom) lines.push(`• Établissement : ${f.etablissement_nom}`);
  const frais = f.prix_label || f.frais_inscription_label;
  if (frais) lines.push(`• Frais : ${frais}`);
  if (f.niveau_requis) lines.push(`• Admission : ${f.niveau_requis}`);
  // Contacts dynamiques (jamais en dur)
  if (contacts?.responsable?.email) {
    lines.push(`• E-mail responsable : ${contacts.responsable.email}`);
  }
  if (f.type === 'en_ligne' && contacts?.responsable_fad?.email) {
    lines.push(`• E-mail Responsable FAD : ${contacts.responsable_fad.email}`);
  }
  return lines.join('\n');
}

function buildActions({ etab, formations = [], contacts = {}, intent }) {
  const actions = [];
  const eid = etab?.id;
  const etabHref = eid ? `/etablissement/${eid}` : '/etablissements';

  if (formations[0]) {
    actions.push({
      id: 'voir_formation',
      label: 'Voir la formation',
      href: etabHref,
      style: 'primary',
    });
  } else {
    actions.push({ id: 'voir_formations', label: 'Voir les formations', href: etabHref, style: 'primary' });
  }

  if (intent === INTENTS.PROFORMA || intent === INTENTS.INSCRIPTION || intent === INTENTS.FEES) {
    actions.push({
      id: 'creer_proforma',
      label: 'Créer une facture proforma',
      href: eid ? `/demande-proforma?etablissement_id=${eid}` : '/demande-proforma',
      style: 'primary',
    });
  }

  const sco = contacts.scolarite;
  if (sco?.mailto) {
    actions.push({
      id: 'contacter_scolarite',
      label: 'Contacter la scolarité',
      href: sco.mailto,
      external: true,
      email: sco.email,
      style: 'secondary',
    });
  } else {
    actions.push({
      id: 'contacter_scolarite',
      label: 'Contacter la scolarité',
      href: etabHref,
      style: 'secondary',
    });
  }

  if (intent === INTENTS.INSCRIPTION) {
    actions.push({
      id: 'inscription',
      label: 'Démarrer l’inscription',
      href: '/inscription',
      style: 'primary',
    });
  }

  const seen = new Set();
  return actions.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

function nextStepCue(text) {
  return text;
}

function buildReply({
  intent,
  search,
  conditions = [],
  etab = null,
  session = {},
  contacts = {},
  config = {},
  unresolvedDomain = null,
  selectedFormation = null,
}) {
  const formations = selectedFormation
    ? [selectedFormation]
    : search?.results || [];
  const domains = search?.domains || [];
  const multi = !!search?.multiEtablissement;
  const actions = buildActions({ etab, formations, contacts, intent });
  const assistant = config.assistant_name || 'Accueil scolarité';

  const evidence = {
    formation_ids: formations.map((f) => f.id),
    etablissement_id: etab?.id || search?.scopedEtablissementId || null,
    official: true,
  };

  if (intent === INTENTS.OFF_TOPIC) {
    return {
      reply: nextStepCue(
        `Je suis ${assistant} : je réponds à partir du catalogue des formations (intitulé, durée, tarifs, conditions).\n\nCette question n’est pas dans le catalogue. Souhaitez-vous une formation ou les tarifs ?`,
      ),
      formations: [],
      actions,
      contacts: [contacts.scolarite].filter(Boolean),
      meta: { intent, grounded: true, invented: false },
      followUps: ['Trouver une formation', 'Facture proforma', 'Contacter la scolarité'],
    };
  }

  if (intent === INTENTS.GREETING) {
    const scope = etab?.nom
      ? `Bienvenue à l’accueil de **${etab.nom}**.`
      : 'Bienvenue à l’accueil virtuel de la scolarité.';
    return {
      reply: nextStepCue(
        `Bonjour ! ${scope} Posez une question sur une formation du catalogue (durée, tarif, admission) — je m’appuie uniquement sur la base de données.\n\nQue recherchez-vous ?`,
      ),
      formations: [],
      actions,
      meta: { intent, grounded: true, invented: false },
      followUps: ['Voir les formations', 'Facture proforma', 'Conditions d’admission'],
    };
  }

  if (intent === INTENTS.PROFORMA) {
    const parts = [
      'Bien sûr — je peux vous accompagner pour une **facture proforma**.',
      '',
      'Vous n’avez **pas besoin** d’avoir déjà un compte étudiant : une personne qui se présente peut obtenir une proforma en saisissant ses informations (nom, prénom, téléphone, formation…).',
      '',
      '**Que faire maintenant ?**',
      '1. Ouvrez le formulaire « Créer une facture proforma ».',
      '2. Indiquez vos coordonnées et la formation / prestation.',
      '3. Générez immédiatement la proforma.',
      '',
      'Si vous préférez être accompagné sur place, contactez l’accueil de la scolarité.',
    ];
    if (contacts.scolarite?.email) {
      parts.push('', formatContactBlock(contacts.scolarite, 'Contact scolarité'));
    }
    return {
      reply: parts.join('\n'),
      formations: [],
      actions: buildActions({ etab, formations: [], contacts, intent: INTENTS.PROFORMA }),
      contacts: [contacts.scolarite].filter(Boolean),
      meta: { intent, grounded: true, invented: false },
      followUps: ['Voir les formations', 'Conditions d’admission'],
    };
  }

  if (intent === INTENTS.INSCRIPTION) {
    const parts = [
      'Pour vous **inscrire / préinscrire**, voici le parcours recommandé :',
      '',
      '1. Consultez les formations et conditions d’admission.',
      '2. Créez un compte candidat (si besoin) ou démarrez la préinscription.',
      '3. Déposez les pièces demandées.',
      '',
      'Une facture proforma peut être demandée **sans compte** via le formulaire dédié, si vous en avez besoin pour une démarche.',
    ];
    if (contacts.scolarite) {
      parts.push('', formatContactBlock(contacts.scolarite, 'Scolarité'));
    }
    return {
      reply: parts.join('\n'),
      formations: formations.slice(0, 3),
      actions: buildActions({ etab, formations, contacts, intent: INTENTS.INSCRIPTION }),
      contacts: [contacts.scolarite].filter(Boolean),
      meta: { intent, grounded: true, invented: false, evidence },
      followUps: ['Conditions d’admission', 'Facture proforma'],
    };
  }

  if (intent === INTENTS.ETAB_INFO) {
    if (!etab) {
      return {
        reply:
          'Pour vous donner les informations exactes, précisez l’établissement (ou ouvrez sa page). Je pourrai alors afficher les coordonnées publiques.',
        formations: [],
        actions,
        meta: { intent, grounded: true, invented: false, missing: 'etablissement' },
        followUps: ['Voir les établissements'],
      };
    }
    const parts = [
      `Voici les informations disponibles pour **${etab.nom}** :`,
      etab.adresse ? `• Adresse : ${etab.adresse}` : null,
      etab.telephone ? `• Téléphone : ${etab.telephone}` : null,
      etab.email_contact ? `• E-mail : ${etab.email_contact}` : null,
      etab.site_web ? `• Site : ${etab.site_web}` : null,
      '',
      'Souhaitez-vous voir les formations du catalogue ?',
    ].filter(Boolean);
    return {
      reply: parts.join('\n'),
      formations: [],
      actions,
      contacts: [contacts.scolarite].filter(Boolean),
      meta: { intent, grounded: true, invented: false },
      followUps: ['Voir les formations', 'Contacter la scolarité'],
    };
  }

  if (intent === INTENTS.CONTACT_ETAB || intent === INTENTS.CONTACT_RESPONSABLE || intent === INTENTS.CONTACT) {
    const sco = contacts.scolarite;
    const parts = [];
    if (formations[0]) {
      parts.push(`Voici les informations du catalogue pour **${formations[0].titre}** :`, '', formatFormationCard(formations[0], null, { contacts }), '');
    }
    parts.push(
      'Pour toute question complémentaire, contactez uniquement la scolarité.',
      '',
      formatContactBlock(sco, 'Scolarité'),
    );
    return {
      reply: parts.join('\n'),
      formations: formations.slice(0, 1),
      actions,
      contacts: [sco].filter(Boolean),
      meta: { intent, grounded: true, invented: false, evidence },
      followUps: formations[0]
        ? ['Conditions d’admission', 'Facture proforma']
        : ['Voir les formations', 'Facture proforma'],
    };
  }

  if (intent === INTENTS.SELECT_ORDINAL && selectedFormation) {
    const f = selectedFormation;
    const parts = [
      `Voici les données du catalogue pour **${f.titre}** :`,
      '',
      formatFormationCard(f, null, { contacts }),
    ];
    return {
      reply: parts.join('\n'),
      formations: [f],
      actions: buildActions({ etab, formations: [f], contacts, intent: INTENTS.DETAILS }),
      contacts: [contacts.scolarite].filter(Boolean),
      meta: { intent, grounded: true, invented: false, evidence },
      followUps: ['Conditions d’admission', 'Tarifs', 'Facture proforma'],
    };
  }

  if (intent === INTENTS.ADMISSION) {
    const parts = ['Voici ce que le **catalogue** indique :\n'];
    for (const f of formations.slice(0, 5)) {
      parts.push(
        `**${f.titre}**\n• Niveau requis : ${f.niveau_requis || 'Non renseigné dans le catalogue'}`,
      );
    }
    if (conditions.length && etab) {
      parts.push(`\n**Conditions publiées — ${etab.nom}**`);
      for (const c of conditions.slice(0, 3)) {
        parts.push(`• ${c.texte.slice(0, 500)}${c.texte.length > 500 ? '…' : ''}`);
      }
    }
    if (parts.length === 1) {
      parts.push('Aucune condition n’est renseignée dans la base pour le moment.');
    }
    return {
      reply: parts.join('\n\n'),
      formations: formations.slice(0, 5),
      actions,
      contacts: [contacts.scolarite].filter(Boolean),
      meta: { intent, grounded: true, invented: false, evidence },
      followUps: ['Facture proforma', 'Contacter la scolarité'],
    };
  }

  if (intent === INTENTS.CAREERS) {
    const f = formations[0];
    if (!f) {
      return {
        reply: 'Indiquez d’abord une formation du catalogue. Je ne communique que les informations enregistrées (intitulé, description, tarifs).',
        formations: [],
        actions,
        meta: { intent, grounded: true, invented: false },
        followUps: ['Voir les formations'],
      };
    }
    const parts = [
      `Concernant **${f.titre}**, voici uniquement ce qui figure dans la base :`,
      '',
      formatFormationCard(f, null, { contacts }),
    ];
    if (!f.description) {
      parts.push('', 'Aucune fiche débouchés n’est enregistrée pour cette formation.');
    }
    return {
      reply: parts.join('\n'),
      formations: [f],
      actions,
      contacts: [contacts.scolarite].filter(Boolean),
      meta: { intent, grounded: true, invented: false, evidence },
      followUps: ['Conditions d’admission', 'Tarifs'],
    };
  }

  if (intent === INTENTS.DURATION || intent === INTENTS.FEES || intent === INTENTS.DETAILS) {
    if (!formations.length) {
      return {
        reply:
          'Je n’ai pas encore de formation en contexte. Nommez une formation du catalogue, ou demandez la liste.',
        formations: [],
        actions,
        meta: { intent, grounded: true, invented: false },
        followUps: ['Voir les formations'],
      };
    }
    const parts =
      intent === INTENTS.FEES
        ? [
            'Voici les **tarifs indiqués dans le catalogue** :\n',
            ...formations.slice(0, 6).map((f) => {
              const fees = [
                f.prix_label && `forfait ${f.prix_label}`,
                f.frais_inscription_label && `inscription ${f.frais_inscription_label}`,
                f.mensualite_label && `mensualité ${f.mensualite_label}`,
              ].filter(Boolean);
              return `• **${f.titre}** — ${fees.length ? fees.join(' · ') : 'tarif non renseigné'}`;
            }),
            '\nPour un devis personnalisé, utilisez une **facture proforma**.',
          ]
        : intent === INTENTS.DURATION
          ? [
              'Voici les **durées** indiquées dans le catalogue :\n',
              ...formations
                .slice(0, 6)
                .map((f) => `• **${f.titre}** — ${f.duree || 'durée non renseignée'}`),
            ]
          : formations.slice(0, 3).map((f) => formatFormationCard(f, null, { contacts }));

    return {
      reply: parts.join('\n'),
      formations: formations.slice(0, 6),
      actions: buildActions({
        etab,
        formations,
        contacts,
        intent: intent === INTENTS.FEES ? INTENTS.PROFORMA : intent,
      }),
      meta: { intent, grounded: true, invented: false, evidence },
      followUps:
        intent === INTENTS.FEES
          ? ['Facture proforma', 'Contacter la scolarité']
          : ['Tarifs', 'Conditions d’admission'],
    };
  }

  if (!formations.length) {
    const domainLabel = unresolvedDomain || domains[0]?.id?.replace(/_/g, ' ');
    let reply = 'Je ne trouve pas de formation correspondant exactement à votre demande';
    if (etab?.nom) reply += ` dans le catalogue de **${etab.nom}**`;
    reply += '.';
    if (domainLabel) {
      reply += `\n\nAucune formation intitulée spécifiquement « ${domainLabel} » n’est enregistrée.`;
    }
    reply += '\n\nVous pouvez consulter la liste des formations du catalogue, ou écrire à la scolarité.';
    return {
      reply,
      formations: [],
      actions,
      contacts: [contacts.scolarite].filter(Boolean),
      meta: { intent, grounded: true, invented: false, no_match: true },
      followUps: ['Voir les formations', 'Contacter la scolarité'],
    };
  }

  const header =
    intent === INTENTS.RECOMMEND
      ? 'Voici les formations du catalogue qui correspondent le mieux :'
      : 'Voici les formations disponibles dans le catalogue :';

  const parts = [header];
  if (multi) {
    parts.push('\n_Plusieurs établissements sont concernés — chaque formation indique clairement le sien._');
  }
  formations.slice(0, 5).forEach((f, i) => {
    parts.push('\n' + formatFormationCard(f, i, { contacts }));
  });

  if (domains[0]?.id === 'cybersecurite' && !formations.some((f) => /cyber/i.test(f.titre))) {
    parts.push(
      '\nAucune formation intitulée « cybersécurité » n’est enregistrée. Les suggestions ci-dessus sont les parcours **proches** du catalogue.',
    );
  }

  parts.push('\n**Prochaine étape :** dites « la 1re » ou « la 2e », ou demandez le tarif / les conditions.');

  return {
    reply: parts.join('\n'),
    formations: formations.slice(0, 5),
    actions,
    contacts: [contacts.scolarite].filter(Boolean),
    meta: { intent, grounded: true, invented: false, evidence, multi_etablissement: multi },
    followUps: ['La première m’intéresse', 'Conditions d’admission', 'Facture proforma'],
  };
}

module.exports = { buildReply, formatFormationCard, buildActions, formatContactBlock };
