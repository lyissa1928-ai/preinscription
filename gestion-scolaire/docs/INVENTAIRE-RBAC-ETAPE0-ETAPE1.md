# Inventaire RBAC – Plateforme universitaire (ÉTAPE 0 + ÉTAPE 1)

**Projet :** Gestion Scolaire (NestJS + Prisma + SQLite/PostgreSQL)  
**Date :** 2025  
**Objectif :** Établir précisément « ce qui existe » (BD + code + endpoints) puis poser des questions ciblées avant toute proposition de changement.

---

# ÉTAPE 0 — INVENTAIRE OBLIGATOIRE

## 1) RBAC côté Base de données

### Tables existantes pour la sécurité

**Il n’existe pas** de tables dédiées RBAC classiques :
- **Pas de table `roles`** (rôles stockés en chaîne dans `User`)
- **Pas de table `permissions`**
- **Pas de `role_permissions`**
- **Pas de `user_roles`** (un user = un seul rôle)
- **Pas de `user_permissions`**

### Table **User** (sécurité / identité)

| Colonne | Type | Contraintes | Description |
|--------|------|--------------|-------------|
| id | String | PK, cuid | Identifiant |
| email | String | UNIQUE | Login |
| passwordHash | String | — | map: password_hash |
| **role** | **String** | — | **Un seul rôle par utilisateur** (voir liste ci‑dessous) |
| firstName | String | map: first_name | — |
| lastName | String | map: last_name | — |
| dateOfBirth | DateTime? | map: date_of_birth | — |
| maritalStatus | String? | — | — |
| numberOfChildren | Int? | — | — |
| matricule | String? | UNIQUE | — |
| phone | String? | — | — |
| address | String? | — | — |
| profilePhotoUrl | String? | map: profile_photo_url | — |
| profileValidated | Boolean | default false | — |
| badgeBarcode | String? | UNIQUE | — |
| createdAt / updatedAt | DateTime | — | — |

**Index :** `@@index([role])`

**Valeurs de `role` (commentaire du schéma + seed) :**  
`SUPER_ADMIN`, `ADMIN`, `SERVICE_PEDAGOGIQUE`, `SCOLARITE`, `DEPT_HEAD`, `TEACHER`, `STUDENT`, `AUDITOR`, `CAISSIER`, `CHEF_COMPTABLE`, `DAF`

**Exemples (seed) :**  
- lyissa1928@gmail.com → SUPER_ADMIN  
- fifi.LY@test.com → SCOLARITE  
- admin@test.com, scolarite@test.com, teacher@test.com, student@test.com, auditor@test.com, caissier@test.com, chef_comptable@test.com, daf@test.com, service_pedagogique@test.com, dept_head@test.com → rôle correspondant au préfixe de l’email.

### Table **Person** (lien User ↔ métier)

- `id`, `matricule` (UNIQUE), `type` (STUDENT | TEACHER | STAFF), `dateNaissance`, **userId** (FK → User, UNIQUE, SetNull), `createdAt`, `updatedAt`.
- Un `User` peut être lié à au plus une `Person` ; la personne porte le type (étudiant, enseignant, staff).

### Périmètre (campus / département / programme)

- **User** : **aucun** `campus_id`, `department_id` ni `program_id`. Le rôle est **global**.
- **Cohort** : `campusId` (FK → Campus, optionnel). Donc le périmètre “campus” est sur les **entités métier** (cohorte, salles), pas sur l’utilisateur.
- **Salle** : `campusId` (FK → Campus, optionnel).
- **Budget** (finance) : `departement` (String), pas de FK vers une table “Department”.

### Table **AuditLog** (journal d’audit)

| Colonne | Type | Contraintes |
|--------|------|--------------|
| id | String | PK, cuid |
| userId | String? | — (pas de FK Prisma déclarée) |
| action | String | map: action |
| entityType | String | map: entity_type |
| entityId | String? | map: entity_id |
| oldValue | String? | map: old_value |
| newValue | String? | map: new_value |
| ip | String? | map: ip |
| createdAt | DateTime | map: created_at |

**Preuve :** `backend/prisma/schema.prisma` (lignes 707–717).

**Utilisation actuelle :**  
- Le **service** `AuditService.log()` existe (`backend/src/audit/audit.service.ts`) et écrit dans `AuditLog`.
- **Aucun autre module** n’appelle `auditService.log()` (recherche grep : 0 appel). Donc le journal est **peuplé uniquement** si du code appelle explicitement ce service (actuellement quasi inexistant).
- L’**API** d’audit (lecture / export) est protégée : `GET /audit/logs`, `GET /audit/export` → `@Roles('AUDITOR', 'ADMIN', 'SUPER_ADMIN')`.

---

## 2) RBAC côté Code

### Rôles

- **Pas d’enum central** : les rôles sont des chaînes répétées dans chaque contrôleur (constantes locales du type `CAN_READ`, `CAN_WRITE`, `SCOLARITE_ONLY`, etc.).
- **Référence unique “officielle”** : commentaire dans le schéma Prisma `User.role` + seed `backend/prisma/seed.ts` (tableau `ROLES` + SUPER_ADMIN).

### Permissions

- **Aucune** notion de “permission” en base ou dans le code. Contrôle d’accès = **rôle uniquement** (RBAC pur).

### Guards / middlewares / policies

- **AuthGuard('jwt')** : `@nestjs/passport` + JWT (fichier `backend/src/auth/jwt.strategy.ts`).  
  - Résolution du user : `PrismaService.user.findUnique({ where: { id: payload.sub } })`.  
  - Objet attaché à la requête : `{ sub, email, role }` (le **rôle vient de la base** à chaque requête).
- **RolesGuard** : `backend/src/auth/guards/roles.guard.ts`.  
  - Lit la métadonnée `ROLES_KEY` (décorateur `@Roles(...)`) et vérifie `requiredRoles.some((role) => user.role === role)`.
- **Aucun** middleware “policy”, CASL, Ability ou équivalent.

### Fichiers impliqués (chemins exacts)

| Fichier | Rôle |
|---------|------|
| `backend/src/auth/auth.module.ts` | Module auth (JWT, strategy, guard) |
| `backend/src/auth/auth.service.ts` | Login, émission JWT (payload: sub, email, role) |
| `backend/src/auth/auth.controller.ts` | POST /auth/login, GET /auth/me |
| `backend/src/auth/jwt.strategy.ts` | Validation JWT + chargement user (id, email, role) depuis la DB |
| `backend/src/auth/guards/roles.guard.ts` | Vérification @Roles() |
| `backend/src/auth/decorators/roles.decorator.ts` | SetMetadata(ROLES_KEY, roles) |
| `backend/src/auth/decorators/current-user.decorator.ts` | Récupération request.user |

### Authentification

- **JWT** (Bearer). Secret : `process.env.JWT_SECRET` ou valeur de dev.  
- Pas de session serveur ; pas de refresh token visible dans l’inventaire.

### Où est résolu le rôle ?

- Dans **JwtStrategy.validate()** : après vérification du token, relecture du user en base et retour de `{ sub: user.id, email: user.email, role: user.role }`. Le rôle est donc **toujours résolu depuis la DB** à chaque requête authentifiée, pas uniquement depuis le token.

---

## 3) Couverture RBAC sur les endpoints

**Convention :** Pas de préfixe global (pas de `/api/v1` global). Seul `TimetablesController` est sous `api/v1/timetables`.

### Synthèse par contrôleur

| Controller | Préfixe | Guard global | Roles global | Endpoints sans @Roles (donc JWT seul ou rien) |
|------------|--------|--------------|--------------|-----------------------------------------------|
| AuthController | auth | — | — | POST login (public), GET me (JWT) |
| AppController | (racine) | — | — | GET / (public) |
| HealthController | health | — | — | GET /health (public) |
| **VigileController** | **vigile** | **aucun** | **—** | **POST vigile/check-in (PUBLIC)** |
| **BadgeController** | **badge** | **aucun** | **—** | **GET badge/verify (PUBLIC)** |
| UsersController | users | JWT + RolesGuard | selon route | Toutes avec ADMIN/SUPER_ADMIN |
| PersonsController | persons | JWT + RolesGuard | CAN_READ | Sous‑routes avec CAN_WRITE, SCOLARITE_ONLY, TEACHER |
| InscriptionsController | inscriptions | JWT + RolesGuard | CAN_READ | Sous‑routes PEDAGOGIE_ADMIN ou SCOLARITE_ADMIN |
| FormationsController | formations | JWT | — | Beaucoup avec @Roles par route (CAN_READ, CAN_WRITE, SUPER_ADMIN_ONLY, etc.) |
| FilieresController | filieres | JWT | — | Routes avec CAN_READ, CAN_WRITE, SUPER_ADMIN_ONLY |
| CoursesController | courses | JWT | — | **GET /, GET check-conflicts : aucun @Roles** (tout user authentifié) |
| TimetablesController | api/v1/timetables | JWT | — | Routes avec CAN_MANAGE ou CAN_VIEW |
| CampusController | campuses | JWT + RolesGuard | SCOLARITE, SERVICE_PEDAGOGIQUE, ADMIN, SUPER_ADMIN, DEPT_HEAD, TEACHER | Écriture : CAN_MANAGE |
| SallesController | salles | JWT + RolesGuard | idem campus | Écriture : CAN_MANAGE |
| **GradesController** | **grades** | **JWT uniquement** | **aucun** | **Tous les endpoints (notes, sessions, modifs, approve/reject)** |
| **AttendanceController** | **attendance** | **JWT uniquement** | **aucun** | **Tous (dont GET /, PATCH :id/validate)** |
| **PayrollController** | **payroll** | **JWT uniquement** | **aucun** | **Tous (dont GET /, calculate, generate, findAll)** |
| **FinanceController** | **finance** | **JWT** | **—** | **GET/POST payments, PATCH validate/reject, GET statut, non-en-regle, recouvrement : aucun @Roles** |
| FinancialController | financial | JWT | — | Routes avec rôles CAISSIER, CHEF_COMPTABLE, DAF, ADMIN selon route |
| GovernanceController | governance | JWT + RolesGuard | CAN_VIEW | Sous‑routes CAN_MODIFY, CAN_CLOSE, etc. |
| TariffRatesController | tariff-rates | JWT + RolesGuard | ADMIN, CHEF_COMPTABLE | — |
| ReportsController | reports | JWT + RolesGuard | ADMIN, CHEF_COMPTABLE, DAF | — |
| AuditController | audit | JWT + RolesGuard | AUDITOR, ADMIN, SUPER_ADMIN | — |
| NotificationsController | notifications | JWT | — | Tous (tout user authentifié) |
| **VigilanceController** | **vigilance** | **JWT uniquement** | **—** | **GET presence (tout user authentifié)** |
| StudentsController | students/me | JWT | — | Tous (self‑service étudiant, filtré par user.sub) |
| EncadrementsController | encadrements | JWT + RolesGuard | TEACHER | — |

### Endpoints critiques sans protection par rôle (risque élevé)

- **Notes / délibérations**  
  - `GET/POST /grades/*` (session-configs, my-ecs, ec/:ecId/students, ec/:ecId, POST note, modification-requests, approve/reject).  
  - **Preuve :** `backend/src/grades/grades.controller.ts` → `@UseGuards(AuthGuard('jwt'))` uniquement, aucun `@Roles()`.  
  - **Risque :** tout utilisateur authentifié peut saisir/modifier des notes, configurer les sessions, approuver des demandes de modification.

- **Pointage / paie**  
  - `GET /attendance`, `PATCH /attendance/:id/validate` : tout authentifié peut lister et valider les pointages.  
  - `GET /payroll`, `GET /payroll/calculate`, `GET /payroll/generate`, etc. : idem.  
  - **Preuve :** `attendance.controller.ts`, `payroll.controller.ts` → JWT seul.

- **Finance (paiements)**  
  - `GET /finance/payments`, `POST /finance/payments`, `PATCH /finance/payments/:id/validate`, `PATCH .../reject`, `GET /finance/statut/:personId`, `GET /finance/non-en-regle`, `GET /finance/recouvrement`.  
  - **Preuve :** `backend/src/finance/finance.controller.ts` → seuls fee-configs ont @Roles ; le reste n’a que AuthGuard.  
  - **Risque :** tout authentifié peut créer/valider/rejeter des paiements et voir tous les statuts/recouvrements.

- **Emploi du temps (lecture / conflits)**  
  - `GET /courses`, `GET /courses/check-conflicts` : aucun @Roles.  
  - **Preuve :** `courses.controller.ts` → AuthGuard seul sur le contrôleur ; ces routes n’ont pas de RolesGuard.

- **Vigilance**  
  - `GET /vigilance/presence` : tout authentifié.  
  - **Preuve :** `vigilance.controller.ts`.

- **Endpoints publics (sans auth)**  
  - **POST /vigile/check-in** : aucun guard.  
  - **GET /badge/verify** : aucun guard.  
  - **Preuve :** `vigile.controller.ts`, `badge.controller.ts`.

---

# ÉTAPE 1 — QUESTIONS À ME POSER (AVANT PROPOSITION)

Les questions ci‑dessous sont formulées à partir de ce qui existe (références fichiers/tables/endpoints). Je ne propose **aucun** changement de permissions ou de rôles tant que vous n’avez pas répondu.

---

## A) Rôles existants

- **Liste exacte des rôles aujourd’hui** (noms tels que dans la base et le code) :  
  `SUPER_ADMIN`, `ADMIN`, `SERVICE_PEDAGOGIQUE`, `SCOLARITE`, `DEPT_HEAD`, `TEACHER`, `STUDENT`, `AUDITOR`, `CAISSIER`, `CHEF_COMPTABLE`, `DAF`.  
  **Question A1 :** Cette liste est‑elle exhaustive et définitive (aucun rôle “oublié” ou prévu ailleurs) ?

- **Un user ne peut avoir qu’un seul rôle** (colonne `User.role`, pas de table user_roles).  
  **Question A2 :** Souhaitez‑vous conserver “un user = un rôle” ou autoriser plusieurs rôles par utilisateur (ex. SCOLARITE + CAISSIER) ? Si plusieurs, il faudra introduire une table de liaison (ex. user_roles) et adapter la résolution du rôle (token / guard).

---

## B) Permissions

- Il n’existe **pas** de permissions fines en base ni dans le code : uniquement des chaînes de rôle et des `@Roles(...)` par route.  
  **Question B1 :** Souhaitez‑vous rester en **RBAC pur (rôle seulement)** ou évoluer vers un **RBAC + permissions** (ex. table permissions, role_permissions, vérification du type “a la permission X”) ? Si oui, quelles actions devraient être les premières à être gérées par permission (ex. “notes.saisir”, “notes.valider”, “finance.cloturer”) ?

---

## C) Périmètre (multi‑campus)

- Aujourd’hui **User** n’a pas de `campus_id` ni `department_id` ; le périmètre “campus” existe sur **Cohort** et **Salle**, pas sur l’utilisateur.  
  **Question C1 :** Les rôles doivent‑ils rester **globaux** (même droit sur tous les campus) ou faut‑il un **périmètre par campus (ou par département)** pour certains rôles (ex. “SCOLARITE campus A” ne voit pas le campus B) ?  
  **Question C2 :** Si périmètre : où le stocker en priorité — sur **User** (ex. user.campusId ou user.departmentId), ou via une table dédiée (ex. user_campus) pour plusieurs campus par user ?

---

## D) Workflow de validation (points de décision)

- **Notes :**  
  - Aujourd’hui tout utilisateur authentifié peut appeler les endpoints grades (saisie, config session, demande de modification, approve/reject).  
  - **Question D1 :** Qui doit pouvoir : **saisir** les notes (enseignant uniquement ?), **configurer** les sessions / dates limites (Scolarité ? Pédagogie ? Admin ?), **valider / verrouiller** (Scolarité ? Chef de département ?), **approuver/rejeter** les demandes de modification hors délai (quel rôle ?), **réouvrir** après verrouillage (SUPER_ADMIN uniquement ? autre ?) ?

- **Inscriptions :**  
  - Le code distingue déjà PEDAGOGIE_ADMIN (cohortes, bulk, etc.) et SCOLARITE_ADMIN (close, inscriptions).  
  - **Question D2 :** Qui doit **approuver** une inscription (passage à “valide”) : Scolarité uniquement, ou aussi Pédagogie / Admin ? Qui peut **clôturer** les inscriptions (close) : uniquement Scolarité ou aussi Admin / Pédagogie ?

- **Année / Semestre :**  
  - Pas d’endpoint dédié “clôture année” ou “activation semestre” identifié dans cet inventaire.  
  - **Question D3 :** Existe‑t‑il (ou prévoyez‑vous) des actions du type “activer/clôturer année universitaire” ou “réouvrir semestre” ? Si oui, qui doit les déclencher (quel rôle) et ces actions doivent‑elles être tracées dans l’audit ?

---

## E) Finance

- Les endpoints **payments** (création, validation, rejet) et **statut / recouvrement** sont actuellement accessibles à **tout utilisateur authentifié** (pas de @Roles sur ces routes).  
  **Question E1 :** La **finance** (création/modification/validation des paiements, clôture, décaissements) doit‑elle être **strictement isolée** aux rôles CAISSIER / CHEF_COMPTABLE / DAF / ADMIN (et éventuellement SUPER_ADMIN) ?  
  **Question E2 :** La **Scolarité** doit‑elle avoir un accès **lecture seule** au “statut de paiement” d’un étudiant (ex. pour autoriser ou non une inscription / délivrance de document), sans pouvoir créer ni valider de paiement ?

---

## F) Audit / traçabilité

- La table **AuditLog** existe et le service `AuditService.log()` aussi, mais **aucun autre module** n’appelle ce service dans l’état actuel du code.  
  **Question F1 :** Quelles **actions** doivent être **obligatoirement loggées** en priorité (ex. : modification de note, validation de paiement, clôture journalière, création/modification d’inscription, changement de statut, approbation de demande de déverrouillage, connexion, etc.) ?  
  **Question F2 :** Combien de temps les logs doivent‑ils être **conservés** (durée légale / politique de rétention) et faut‑il une purge automatique (job) ou uniquement une politique documentée ?

---

## G) Comptes enseignants / étudiants

- **StudentsController** (`students/me`) : toutes les routes sont protégées par JWT et le service filtre par `user.sub` (donc l’étudiant ne voit que ses propres données).  
  **Question G1 :** Confirmez‑vous que les **étudiants** doivent avoir un accès **lecture seule** (et téléchargement de leurs documents) à leurs infos, notes, factures, reçus, certificats, sans possibilité de modifier les notes ou les paiements ?

- **Enseignants :**  
  - Côté code, les routes “mes cours” / “mes EC” / saisie de notes sont protégées par JWT ; la vérification “c’est bien l’enseignant de cet EC” peut être dans le service (non détaillée ici).  
  **Question G2 :** Les **enseignants** doivent‑ils avoir accès **uniquement** à leurs cours / groupes / EC et à la saisie des notes pour ces EC, sans voir les notes des autres enseignants ni les données financières (hors leur propre fiche paie si prévu) ? Faut‑il une règle explicite “un enseignant ne peut modifier que les notes des EC qui lui sont assignés” et la faire vérifier côté API ?

---

## H) Endpoints publics et “kiosque”

- **POST /vigile/check-in** et **GET /badge/verify** sont **sans aucun guard**.  
  **Question H1 :** Ces endpoints sont‑ils volontairement **publics** (ex. borne/kiosque sans login) ? Si oui, comment souhaitez‑vous limiter les abus (IP, clé API, réseau interne, autre) ? Si non, quel type d’auth (JWT, clé, autre) doit‑on appliquer ?

---

Dès que vous aurez répondu à ces questions (même partiellement), je pourrai passer à l’**ÉTAPE 2** : proposition de matrice rôles → actions → scope, liste minimale des ajouts (migrations, seeds, guards, audit, tests).

---

## Mise à jour post-sécurisation RBAC

Après mise en œuvre de la sécurisation (sans changer le modèle de rôles) :

- **Matrice endpoint × rôles :** voir **`/docs/rbac_matrix.md`**.
- **Endpoints publics vigile/badge :** protégés par **X-DEVICE-TOKEN** (table `device_tokens`, guard, audit). Détails dans **`/docs/security_public_endpoints.md`**.
- **Grades, Finance, Attendance, Payroll, Courses :** tous protégés par **@Roles** + **RolesGuard** ; constantes partagées dans **`backend/src/common/rbac.constants.ts`**.
- **AuditLog :** alimenté sur création/validation/rejet de paiements, saisie/approbation/rejet de notes, et chaque appel vigile/check-in et badge/verify.
- **Tests e2e RBAC :** **`test/rbac.e2e-spec.ts`** (11 tests).
