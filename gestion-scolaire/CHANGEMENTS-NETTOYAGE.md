# Changements – Nettoyage des fonctionnalités inutiles

Ce document liste les modifications effectuées pour supprimer le code et les fonctionnalités non nécessaires du projet Gestion Scolaire.

---

## 1. Backend – Module Persons (enseignants)

### Supprimé

- **GET `/persons/teachers/template`**  
  Téléchargement du template Excel pour import en masse d’enseignants.  
  **Raison :** plus utilisé par le frontend (l’import CSV/Excel des enseignants a été retiré ; création uniquement via formulaire).

- **POST `/persons/teachers/bulk`**  
  Création en masse d’enseignants à partir d’un tableau.  
  **Raison :** aucun appel depuis le frontend.

- **PATCH `/persons/teachers/bulk`**  
  Mise à jour en masse d’enseignants.  
  **Raison :** aucun appel depuis le frontend.

- **Dans `persons.service.ts` :**
  - `bulkCreateTeachers(...)` – supprimée
  - `bulkUpdateTeachers(...)` – supprimée
  - `getTeachersTemplateCsv()` – supprimée (template CSV non utilisé)
  - `getTeachersTemplateExcel()` – supprimée (plus d’endpoint template)

### Conservé

- **DELETE `/persons/bulk`** : toujours utilisé par la page « Enseignants » (suppression multiple).
- Création / mise à jour unitaire des enseignants (POST `teachers`, PATCH `teachers/:personId`).

---

## 2. Backend – Module Inscriptions (cohortes)

### Supprimé

- **Dans `inscriptions.service.ts` :**
  - `getCohortsTemplateCsv()`  
  **Raison :** seul le template Excel est utilisé (endpoint `GET /inscriptions/cohorts/template` envoie l’Excel). La méthode CSV n’était jamais appelée.

### Conservé

- `getCohortsTemplateExcel()` et l’endpoint **GET `/inscriptions/cohorts/template`** (utilisés par Pédagogie → Classes).

---

## 3. Backend – Module Persons (étudiants – doublon)

### Supprimé

- **POST `/persons/students/uploads`** (route dupliquée)  
  Alias d’upload de document étudiant.  
  **Raison :** le frontend n’utilise que **POST `/persons/students/upload`**. La route `uploads` était redondante.

- Méthode handler **`uploadStudentDocumentAlt`** dans le controller.

### Conservé

- **POST `/persons/students/upload`** : unique point d’upload (photo, justificatifs) pour les étudiants.

---

## 4. Fichiers modifiés (résumé)

| Fichier | Action |
|--------|--------|
| `backend/src/persons/persons.controller.ts` | Suppression de 3 routes (teachers/template, teachers/bulk POST/PATCH) et de la route dupliquée students/uploads. |
| `backend/src/persons/persons.service.ts` | Suppression de 4 méthodes : bulkCreateTeachers, bulkUpdateTeachers, getTeachersTemplateCsv, getTeachersTemplateExcel. |
| `backend/src/inscriptions/inscriptions.service.ts` | Suppression de getCohortsTemplateCsv. |

---

## 5. Non modifié (volontairement conservé)

- **Module Timetables** (`api/v1/timetables`) : pas d’appel depuis le frontend actuel (l’emploi du temps utilise `/courses`). Le module et le modèle `SeancePlanning` sont conservés pour cohérence du schéma et usage futur éventuel.
- **POST `/persons/students/full`** (création étudiant « full ») : non utilisé par le frontend actuel mais conservé comme API possible pour import ou scripts.
- Toutes les autres routes et services utilisés par le frontend (inscriptions, cohortes, cours, salles, formations, etc.) sont inchangés.

---

## 6. Impact

- **Frontend :** aucun changement requis ; les pages n’appelaient pas les endpoints supprimés.
- **Tests / scripts :** si des tests ou scripts externes appelaient `GET /persons/teachers/template`, `POST /persons/teachers/bulk` ou `PATCH /persons/teachers/bulk`, ils devront être adaptés ou supprimés.
- **Build :** après `npm run build` dans le backend, les fichiers compilés (`dist/`) seront régénérés ; un nettoyage manuel de `dist/` peut être fait si besoin.

---

*Document généré après revue du projet et suppression des fonctionnalités non nécessaires.*
