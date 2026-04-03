# Matrice RBAC — Endpoints × Rôles autorisés

**Référence :** Hiérarchie des rôles (RBAC pur, 1 rôle par user).  
**Légende :** JWT = authentification requise ; @Roles = rôles autorisés (RolesGuard).

---

## 1. Cartographie exhaustive (après sécurisation)

### Auth
| Method | Path | JWT | RolesGuard | Rôles |
|--------|------|-----|------------|-------|
| POST | /auth/login | non | non | Public |
| GET | /auth/me | oui | non | Tout authentifié |

### App & Health (publics)
| Method | Path | JWT | RolesGuard | Rôles |
|--------|------|-----|------------|-------|
| GET | / | non | non | Public |
| GET | /health | non | non | Public |

### Vigile / Badge (sécurisés par device token)
| Method | Path | JWT | DeviceToken | Rôles |
|--------|------|-----|-------------|-------|
| POST | /vigile/check-in | non | X-DEVICE-TOKEN | Device |
| GET | /badge/verify | non | X-DEVICE-TOKEN | Device |

### Users
| Method | Path | JWT | RolesGuard | Rôles |
|--------|------|-----|------------|-------|
| GET | /users | oui | oui | ADMIN, SUPER_ADMIN |
| PATCH | /users/me | oui | oui | ADMIN, SUPER_ADMIN |
| POST | /users/me/photo | oui | oui | ADMIN, SUPER_ADMIN |
| GET | /users/:id | oui | oui | ADMIN, SUPER_ADMIN |
| POST | /users | oui | oui | ADMIN, SUPER_ADMIN |
| PATCH | /users/:id | oui | oui | ADMIN, SUPER_ADMIN |
| PATCH | /users/:id/validate-profile | oui | oui | ADMIN, SUPER_ADMIN |
| POST | /users/:id/photo | oui | oui | ADMIN, SUPER_ADMIN |
| GET | /users/:id/badge-data | oui | oui | ADMIN, SUPER_ADMIN |

### Persons
| Method | Path | JWT | RolesGuard | Rôles |
|--------|------|-----|------------|-------|
| DELETE | /persons/bulk | oui | oui | CAN_WRITE (SCOLARITE, SERVICE_PEDAGOGIQUE, ADMIN, SUPER_ADMIN) |
| GET | /persons | oui | oui | CAN_READ |
| GET | /persons/students | oui | oui | CAN_READ |
| PATCH | /persons/students/bulk | oui | oui | SCOLARITE, ADMIN, SUPER_ADMIN |
| POST | /persons/students/bulk-transfer | oui | oui | SCOLARITE, ADMIN, SUPER_ADMIN |
| POST | /persons/students/export | oui | oui | SCOLARITE, ADMIN, SUPER_ADMIN |
| GET | /persons/students/:personId/attestation | oui | oui | SCOLARITE, ADMIN, SUPER_ADMIN |
| GET | /persons/students/:personId/carte | oui | oui | SCOLARITE, ADMIN, SUPER_ADMIN |
| GET | /persons/students/:personId/documents/:type | oui | oui | SCOLARITE, ADMIN, SUPER_ADMIN |
| PATCH | /persons/students/:personId/valider-dossier | oui | oui | SCOLARITE, ADMIN, SUPER_ADMIN |
| PATCH | /persons/students/:personId | oui | oui | SCOLARITE, ADMIN, SUPER_ADMIN |
| GET | /persons/:id | oui | oui | CAN_READ |
| POST | /persons/students/upload | oui | oui | SCOLARITE, ADMIN, SUPER_ADMIN |
| POST | /persons/students/inscription | oui | oui | SCOLARITE, ADMIN, SUPER_ADMIN |
| POST | /persons/students/full | oui | oui | CAN_WRITE |
| POST | /persons/teachers | oui | oui | CAN_WRITE |
| POST | /persons/staff | oui | oui | CAN_WRITE |
| PATCH | /persons/teachers/:personId | oui | oui | CAN_WRITE |
| GET | /persons/teachers/me | oui | oui | TEACHER |
| PATCH | /persons/teachers/me/bio | oui | oui | TEACHER |
| DELETE | /persons/:id | oui | oui | CAN_WRITE |

### Grades (notes)
| Method | Path | JWT | RolesGuard | Rôles |
|--------|------|-----|------------|-------|
| GET | /grades/session-configs | oui | oui | SCOLARITE, SERVICE_PEDAGOGIQUE, DEPT_HEAD, ADMIN, SUPER_ADMIN, TEACHER, AUDITOR |
| POST | /grades/session-configs | oui | oui | SCOLARITE, ADMIN, SUPER_ADMIN |
| GET | /grades/my-ecs | oui | oui | TEACHER |
| GET | /grades/ec/:ecId/students | oui | oui | TEACHER, SERVICE_PEDAGOGIQUE, SCOLARITE, DEPT_HEAD, ADMIN, SUPER_ADMIN |
| GET | /grades/ec/:ecId | oui | oui | TEACHER, SERVICE_PEDAGOGIQUE, SCOLARITE, DEPT_HEAD, ADMIN, SUPER_ADMIN, AUDITOR |
| POST | /grades | oui | oui | TEACHER, SCOLARITE, ADMIN, SUPER_ADMIN |
| GET | /grades/me | oui | oui | STUDENT, TEACHER, SCOLARITE, SERVICE_PEDAGOGIQUE, DEPT_HEAD, ADMIN, SUPER_ADMIN, AUDITOR |
| GET | /grades/modification-requests | oui | oui | SERVICE_PEDAGOGIQUE, DEPT_HEAD, ADMIN, SUPER_ADMIN, AUDITOR |
| POST | /grades/modification-requests | oui | oui | TEACHER |
| PATCH | /grades/modification-requests/:id/approve | oui | oui | SERVICE_PEDAGOGIQUE, DEPT_HEAD, ADMIN, SUPER_ADMIN |
| PATCH | /grades/modification-requests/:id/reject | oui | oui | SERVICE_PEDAGOGIQUE, DEPT_HEAD, ADMIN, SUPER_ADMIN |

### Finance (paiements)
| Method | Path | JWT | RolesGuard | Rôles |
|--------|------|-----|------------|-------|
| GET | /finance/fee-configs | oui | oui | SCOLARITE, ADMIN, CAISSIER, CHEF_COMPTABLE, DAF, DEPT_HEAD, TEACHER, STUDENT |
| POST | /finance/fee-configs | oui | oui | CHEF_COMPTABLE, ADMIN |
| GET | /finance/payments | oui | oui | CAISSIER, CHEF_COMPTABLE, DAF, ADMIN, SUPER_ADMIN, SCOLARITE, SERVICE_PEDAGOGIQUE, AUDITOR |
| POST | /finance/payments | oui | oui | CAISSIER, CHEF_COMPTABLE, DAF, ADMIN, SUPER_ADMIN |
| PATCH | /finance/payments/:id/validate | oui | oui | CHEF_COMPTABLE, DAF, ADMIN, SUPER_ADMIN |
| PATCH | /finance/payments/:id/reject | oui | oui | CHEF_COMPTABLE, DAF, ADMIN, SUPER_ADMIN |
| GET | /finance/statut/:personId | oui | oui | SCOLARITE, SERVICE_PEDAGOGIQUE, AUDITOR, ADMIN, SUPER_ADMIN, CAISSIER, CHEF_COMPTABLE, DAF |
| GET | /finance/non-en-regle | oui | oui | SCOLARITE, SERVICE_PEDAGOGIQUE, DAF, ADMIN, SUPER_ADMIN, AUDITOR |
| GET | /finance/recouvrement | oui | oui | DAF, ADMIN, SUPER_ADMIN, AUDITOR |

### Attendance (pointage)
| Method | Path | JWT | RolesGuard | Rôles |
|--------|------|-----|------------|-------|
| GET | /attendance/my-courses-today | oui | oui | TEACHER |
| POST | /attendance/arrivee | oui | oui | TEACHER |
| POST | /attendance/depart | oui | oui | TEACHER |
| GET | /attendance/me | oui | oui | TEACHER |
| GET | /attendance | oui | oui | SERVICE_PEDAGOGIQUE, ADMIN, SUPER_ADMIN |
| PATCH | /attendance/:id/validate | oui | oui | SERVICE_PEDAGOGIQUE, ADMIN, SUPER_ADMIN |

### Payroll (paie)
| Method | Path | JWT | RolesGuard | Rôles |
|--------|------|-----|------------|-------|
| GET | /payroll/preview | oui | oui | DAF, ADMIN, SUPER_ADMIN |
| GET | /payroll | oui | oui | DAF, ADMIN, SUPER_ADMIN, AUDITOR |
| GET | /payroll/me | oui | oui | TEACHER |
| GET | /payroll/calculate | oui | oui | DAF, ADMIN, SUPER_ADMIN |
| GET | /payroll/generate | oui | oui | DAF, ADMIN, SUPER_ADMIN |
| GET | /payroll/me/bulletin/:payrollId | oui | oui | TEACHER |
| GET | /payroll/bulletin/:payrollId | oui | oui | DAF, ADMIN, SUPER_ADMIN |

### Courses (emploi du temps)
| Method | Path | JWT | RolesGuard | Rôles |
|--------|------|-----|------------|-------|
| GET | /courses/template | oui | oui | SERVICE_PEDAGOGIQUE, ADMIN, SUPER_ADMIN |
| POST | /courses/bulk | oui | oui | SERVICE_PEDAGOGIQUE, ADMIN, SUPER_ADMIN |
| PATCH | /courses/bulk | oui | oui | SERVICE_PEDAGOGIQUE, ADMIN, SUPER_ADMIN |
| DELETE | /courses/bulk | oui | oui | SERVICE_PEDAGOGIQUE, ADMIN, SUPER_ADMIN |
| GET | /courses | oui | oui | SCOLARITE, SERVICE_PEDAGOGIQUE, TEACHER, STUDENT, DEPT_HEAD, ADMIN, SUPER_ADMIN |
| GET | /courses/check-conflicts | oui | oui | SERVICE_PEDAGOGIQUE, ADMIN, SUPER_ADMIN |
| GET | /courses/me/dashboard | oui | oui | TEACHER |
| GET | /courses/me | oui | oui | TEACHER, STUDENT |
| GET | /courses/:id | oui | oui | SCOLARITE, SERVICE_PEDAGOGIQUE, TEACHER, STUDENT, DEPT_HEAD, ADMIN, SUPER_ADMIN |
| POST | /courses | oui | oui | SERVICE_PEDAGOGIQUE, ADMIN, SUPER_ADMIN |
| PATCH | /courses/:id | oui | oui | SERVICE_PEDAGOGIQUE, ADMIN, SUPER_ADMIN |
| DELETE | /courses/:id | oui | oui | SERVICE_PEDAGOGIQUE, ADMIN, SUPER_ADMIN |

### Inscriptions, Formations, Campus, Salles, etc.
(Voir contrôleurs existants : inscriptions, formations, filieres, campuses, salles déjà protégés par @Roles.)

### Audit
| Method | Path | JWT | RolesGuard | Rôles |
|--------|------|-----|------------|-------|
| GET | /audit/logs | oui | oui | AUDITOR, ADMIN, SUPER_ADMIN |
| GET | /audit/export | oui | oui | AUDITOR, ADMIN, SUPER_ADMIN |

### Students (self-service)
| Method | Path | JWT | RolesGuard | Rôles |
|--------|------|-----|------------|-------|
| GET | /students/me/* | oui | non | Tout authentifié (filtré par user.sub côté service) — à restreindre STUDENT si besoin |

---

## 2. Règles métier appliquées

- **SCOLARITE** : ne valide/rejette jamais les paiements (finance).
- **TEACHER** : ne peut pas approve/reject les demandes de modification de notes.
- **AUDITOR** : lecture seule (aucune écriture).
- **Vigile/Badge** : accès uniquement avec X-DEVICE-TOKEN valide + rate limit.
