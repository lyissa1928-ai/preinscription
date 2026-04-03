# À installer / À développer - Agriculture Intelligente

## 1. À installer et configurer

### Obligatoire pour le fonctionnement complet

| Élément | Description | Où configurer |
|---------|-------------|----------------|
| **Docker Desktop** | Pour PostgreSQL et Redis | Installer depuis https://docker.com |
| **Node.js 20+** | Runtime JavaScript | https://nodejs.org |
| **pnpm** | Gestionnaire de paquets | `npm install -g pnpm` |
| **Fichier .env** | Variables d'environnement | Copier `.env.example` vers `.env` |

### Clés API et services externes

| Service | Variable | Obligatoire | Obtention |
|---------|----------|-------------|-----------|
| **OpenWeather** | `OPENWEATHER_API_KEY` | Oui pour la météo | https://openweathermap.org/api (gratuit) |
| **SMTP (email)** | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Non (mot de passe oublié) | Gmail, SendGrid, etc. |

Sans `OPENWEATHER_API_KEY`, les widgets météo ne fonctionneront pas (erreur ou données vides).

---

## 2. À développer (fonctionnalités incomplètes)

### Service IoT (priorité moyenne)

| Tâche | État | Description |
|-------|------|-------------|
| API REST ingest | Fait | `POST /iot/ingest` avec clé API — mise à jour profil sol |
| Interface capteurs | Fait | Pages `/capteurs` pour TECHNICIAN/ADMIN |
| Connexion MQTT | Non fait | Le service `apps/iot` existe mais ne fait que logger |
| Consommation messages MQTT | Non fait | Traiter les messages des capteurs via MQTT |
| Mosquitto (broker) | Configuré | Docker profile `mqtt` — lancer avec `docker compose --profile mqtt up -d` |

### Email (mot de passe oublié)

| Tâche | État | Description |
|-------|------|-------------|
| Envoi réel d'emails | Partiel | Fonctionne si SMTP configuré ; sinon log en console |
| Config SMTP | À ajouter dans .env | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` |

### Multi-langue (i18n)

| Tâche | État | Description |
|-------|------|-------------|
| Page d'accueil | Fait | FR, EN, ES, IT |
| Page login | Fait | Traductions Auth |
| Reste de l'app | Non fait | Dashboard, admin, parcelles, etc. restent en français |

### Inscription publique

| Tâche | État | Description |
|-------|------|-------------|
| Route /auth/register | Désactivée | Retourne 403 — les comptes sont créés par l'admin |
| Page /auth/register | Existe | Redirige ou affiche message |

---

## 3. Améliorations possibles

### UX / Interface

- Notifications push (navigateur) pour les alertes
- Mode sombre
- Application mobile (PWA ou React Native)
- Export PDF des recommandations
- Graphiques météo plus détaillés

### Technique

- Tests E2E (Playwright, Cypress)
- CI/CD (GitHub Actions déjà configuré)
- Monitoring (Sentry, LogRocket)
- Rate limiting sur l'API
- Validation des coordonnées GPS (bornes Sénégal)

### Fonctionnalités métier

- Historique des recommandations par parcelle
- Comparaison de parcelles
- Calendrier cultural (semis, récolte)
- Intégration données satellites (NDVI, etc.)
- Tableau de bord agronome (vue multi-exploitations)

---

## 4. Checklist de démarrage

```
[ ] Docker Desktop installé et démarré
[ ] .env créé (cp .env.example .env)
[ ] OPENWEATHER_API_KEY ajouté dans .env
[ ] pnpm install
[ ] pnpm db:migrate
[ ] pnpm db:seed
[ ] pnpm dev
```

**Capteurs :** La migration `add_sensors` crée la table des capteurs. Si une erreur P3015 apparaît, vérifier que tous les dossiers de migration contiennent un fichier `migration.sql`.

---

## 5. Commandes utiles

| Commande | Usage |
|----------|-------|
| `pnpm dev` | Lancer tout (nécessite Docker) |
| `pnpm dev:no-docker` | Lancer web + API sans Docker (DB doit tourner) |
| `pnpm dev:web` | Frontend seul |
| `pnpm db:seed` | Créer l'admin (lyissa1928@gmail.com / Passer@12345) |
