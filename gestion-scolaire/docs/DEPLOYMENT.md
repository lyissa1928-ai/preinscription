# Guide de déploiement - Gestion Scolaire

## Prérequis serveur

- Ubuntu 20.04+ (ou Debian)
- Node.js 18+
- PostgreSQL 14+ (ou SQLite pour tests)
- Apache2 (reverse proxy)
- Certificat SSL (Let's Encrypt recommandé)

---

## 1. Variables d'environnement (production)

### Backend (`backend/.env`)

```env
# PostgreSQL (obligatoire en production)
DATABASE_URL="postgresql://user:password@localhost:5432/gestion_scolaire"

PORT=3000
FRONTEND_URL="https://votre-domaine.com"
JWT_SECRET="votre-secret-jwt-long-et-aleatoire"
NODE_ENV=production
```

### Frontend

Configurer `NEXT_PUBLIC_API_URL` au build : `https://api.votre-domaine.com` ou `https://votre-domaine.com/api`.

---

## 2. Base de données PostgreSQL

```bash
sudo -u postgres createdb gestion_scolaire
sudo -u postgres createuser -P gestion
# Accorder les droits
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gestion_scolaire TO gestion;"
```

Puis dans `backend/.env` :

```
DATABASE_URL="postgresql://gestion:VOTRE_MOT_DE_PASSE@localhost:5432/gestion_scolaire"
```

---

## 3. Migrations et seed

```bash
cd backend
npx prisma migrate deploy
npm run seed   # Comptes initiaux (optionnel)
```

---

## 4. Build de l'application

```bash
# Depuis la racine gestion-scolaire
npm run build
```

---

## 5. Démarrage avec PM2

```bash
npm install -g pm2

# Backend
cd backend && pm2 start dist/main.js --name "gestion-api"

# Frontend (Next.js standalone ou node server)
cd frontend && pm2 start npm --name "gestion-web" -- start

pm2 save
pm2 startup   # Démarrage automatique au boot
```

---

## 6. Configuration Apache2 (reverse proxy)

### Backend (API)

```apache
<VirtualHost *:80>
    ServerName api.votre-domaine.com
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/
</VirtualHost>
```

### Frontend

```apache
<VirtualHost *:80>
    ServerName votre-domaine.com
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:3001/
    ProxyPassReverse / http://127.0.0.1:3001/
</VirtualHost>
```

### SSL avec Let's Encrypt

```bash
sudo apt install certbot python3-certbot-apache
sudo certbot --apache -d votre-domaine.com -d api.votre-domaine.com
```

---

## 7. Sauvegardes base de données

Script cron quotidien (`/etc/cron.d/gestion-backup`) :

```bash
0 2 * * * postgres pg_dump gestion_scolaire | gzip > /var/backups/gestion_$(date +\%Y\%m\%d).sql.gz
```

---

## 8. Health check

L'API expose `GET /health` :

```json
{
  "status": "ok",
  "timestamp": "2025-02-24T12:00:00.000Z",
  "database": "connected"
}
```

Utiliser ce endpoint pour monitoring (UptimeRobot, etc.).

---

## 9. Documentation API

En production, Swagger est disponible à : `https://api.votre-domaine.com/api/docs`

Pour désactiver en production, conditionner dans `main.ts` :

```ts
if (process.env.NODE_ENV !== 'production') {
  SwaggerModule.setup('api/docs', app, document);
}
```
