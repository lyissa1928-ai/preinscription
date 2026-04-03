# Documents étudiants : qui gère quoi (Scolarité vs Pédagogie)

## Répartition dans la réalité

Dans les établissements français / francophones, la répartition habituelle est la suivante.

| Document | Qui gère en pratique | Rôle de la Scolarité | Rôle de la Pédagogie |
|----------|----------------------|-----------------------|------------------------|
| **Certificat de scolarité** | **Scolarité** | Émet le document (preuve d’inscription). Données : inscription, formation, année. | — |
| **Attestation de scolarité** | **Scolarité** | Même logique que le certificat : document officiel délivré au guichet / par la scolarité. | — |
| **Relevé de notes (transcript)** | **Scolarité** (émission) | Émet le relevé officiel. Utilise les notes déjà validées (jury / pédagogie). | Saisie et validation des notes, décisions de jury. Les données « appartiennent » au pédagogique ; la **délivrance** du document est scolarité. |
| **Attestation de réussite** | **Scolarité** (émission) | Émet l’attestation après validation du jury. Preuve que l’étudiant a réussi (semestre, année, diplôme). | Valide les résultats et le passage (jury, délibérations). |

En résumé :
- **Pédagogie** : définit les maquettes, les notes, les jury, valide les résultats (réussite / échec).
- **Scolarité** : service au guichet, garde les dossiers étudiants, **délivre les documents officiels** (certificats, attestations, relevés) à partir des données validées.

---

## Ce que fait l’application actuellement

- **Attestation de scolarité (PDF)**  
  - Route : `GET /persons/students/:personId/attestation`  
  - Rôles : **SCOLARITE_ONLY** (Scolarité, Admin, Super Admin).  
  - Interface : liste des étudiants (Scolarité) → menu « Attestation de scolarité ».

- **Carte étudiant (PDF)**  
  - Route : `GET /persons/students/:personId/carte`  
  - Rôles : **SCOLARITE_ONLY**.  
  - Interface : même liste → « Carte étudiant ».

- **Certificat de scolarité (pour l’étudiant)**  
  - Route : `GET /students/me/certificate`  
  - Rôles : tout utilisateur connecté avec un compte **étudiant** (téléchargement pour soi-même).  
  - Interface : espace étudiant → « Mes documents » → « Télécharger » certificat.

- **Relevé de notes** : non implémenté (pas de génération PDF/export officiel côté app).

- **Attestation de réussite** : non implémentée.

---

## Recommandation pour la suite

Pour coller à la réalité métier :

- **Conserver** la délivrance des documents (attestation de scolarité, carte étudiant, certificat) côté **Scolarité** (ou par l’étudiant pour son propre certificat).
- Si on ajoute **relevé de notes** et **attestation de réussite** :  
  - **Pédagogie** : saisie et validation des notes, jury, décisions de réussite.  
  - **Scolarité** : génération et émission des PDF (relevé, attestation de réussite) à partir des données déjà validées.

Cela évite que la Pédagogie ait à « faire du guichet » et garde la Scolarité comme seul service qui délivre les documents officiels aux étudiants.
