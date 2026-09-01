#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# REDÉPLOIEMENT COMPLET — esebat-digitalservices.com (Apache2 + PM2)
# Copier-coller sur le serveur :
#   cd /var/www/uniportail && bash deploy/redeploy-prod-complet.sh
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

APP_ROOT="${UNIPORTAIL_APP_ROOT:-/var/www/uniportail}"
DOMAIN="${ESEBAT_DOMAIN:-esebat-digitalservices.com}"
BACKUP_ROOT="${UNIPORTAIL_BACKUP_DIR:-/var/backups/uniportail}"
STAMP="$(date +%Y%m%d-%H%M%S)"

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  UniPortail — redéploiement prod $DOMAIN"
echo "  $STAMP"
echo "══════════════════════════════════════════════════════════════"
echo ""

mkdir -p "$BACKUP_ROOT"
cd "$APP_ROOT"

# ─── 1. SAUVEGARDES ───
echo ">>> [1/9] Sauvegardes..."
[[ -f backend/database/preinscription.json ]] && \
  cp backend/database/preinscription.json "$BACKUP_ROOT/preinscription-$STAMP.json"
[[ -f backend/.env ]] && cp backend/.env "$BACKUP_ROOT/backend.env.$STAMP"
[[ -d backend/uploads ]] && \
  tar czf "$BACKUP_ROOT/uploads-$STAMP.tar.gz" -C backend uploads 2>/dev/null || true
tar czf "$BACKUP_ROOT/apache-config-$STAMP.tar.gz" /etc/apache2/sites-enabled 2>/dev/null || true
echo "    OK → $BACKUP_ROOT"

# ─── 2. GIT (débloquer fichiers locaux) ───
echo ">>> [2/9] Mise à jour code GitHub..."
git checkout -- deploy/ 2>/dev/null || true
git checkout -- frontend/package-lock.json backend/package-lock.json 2>/dev/null || true
git fetch origin main
git pull origin main
chmod +x deploy/*.sh 2>/dev/null || true

# ─── 3. PROTECTION DONNÉES (skip-worktree) ───
echo ">>> [3/9] Protection preinscription.json + .env..."
bash deploy/proteger-donnees-prod.sh

# ─── 4. CONFIG ENV ───
echo ">>> [4/9] Configuration .env..."
# Frontend : racine du domaine
ENV_PROD="frontend/.env.production"
touch "$ENV_PROD"
grep -q '^VITE_BASE_PATH=' "$ENV_PROD" \
  && sed -i 's|^VITE_BASE_PATH=.*|VITE_BASE_PATH=/|' "$ENV_PROD" \
  || echo 'VITE_BASE_PATH=/' >> "$ENV_PROD"
grep -q '^VITE_API_URL=' "$ENV_PROD" \
  && sed -i 's|^VITE_API_URL=.*|VITE_API_URL=|' "$ENV_PROD" \
  || echo 'VITE_API_URL=' >> "$ENV_PROD"

# Backend CORS
if [[ -f backend/.env ]]; then
  CORS="https://${DOMAIN},https://www.${DOMAIN}"
  grep -q '^CORS_ORIGINS=' backend/.env \
    && sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=${CORS}|" backend/.env \
    || echo "CORS_ORIGINS=${CORS}" >> backend/.env
  grep -q '^NODE_ENV=' backend/.env \
    && sed -i 's|^NODE_ENV=.*|NODE_ENV=production|' backend/.env \
    || echo 'NODE_ENV=production' >> backend/.env
fi

# config-site.js (API même origine)
mkdir -p frontend/public frontend/dist
mkdir -p backend/uploads/etablissements backend/uploads/platform
chmod -R u+rwX backend/uploads 2>/dev/null || true
cat > frontend/public/config-site.js <<'JS'
window.__PREINSCRIPTION_SITE_KEYS__ = {
  recaptcha: '',
  apiBaseUrl: '',
  platform_name: '',
  faviconUrl: '',
}
JS

# ─── 5. BUILD ───
echo ">>> [5/9] npm install + build (2-5 min)..."
npm run install:all
npm run build
cp frontend/public/config-site.js frontend/dist/config-site.js

# ─── 6. PM2 (API Node) ───
echo ">>> [6/9] PM2 uniportail-api..."
if pm2 describe uniportail-api >/dev/null 2>&1; then
  pm2 restart uniportail-api --update-env
else
  cd backend && pm2 start server.js --name uniportail-api && cd ..
fi
pm2 save 2>/dev/null || true
sleep 2
curl -sf --max-time 10 http://127.0.0.1:5000/api/health >/dev/null \
  && echo "    API locale : OK" \
  || echo "    ATTENTION : API locale KO → pm2 logs uniportail-api --lines 30"

# ─── 7. APACHE2 vhost ───
echo ">>> [7/9] Apache2 vhost..."
a2enmod proxy proxy_http proxy_wstunnel rewrite ssl headers 2>/dev/null || true

SSL_CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
SSL_KEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
VHOST_OLD="$(grep -rl "ServerName.*${DOMAIN}" /etc/apache2/sites-enabled 2>/dev/null | head -1 || true)"
if [[ ! -f "$SSL_CERT" && -n "$VHOST_OLD" ]]; then
  SSL_CERT="$(grep SSLCertificateFile "$VHOST_OLD" 2>/dev/null | head -1 | awk '{print $2}')"
  SSL_KEY="$(grep SSLCertificateKeyFile "$VHOST_OLD" 2>/dev/null | head -1 | awk '{print $2}')"
fi

if [[ ! -f "$SSL_CERT" || ! -f "$SSL_KEY" ]]; then
  echo "    ERREUR certificat SSL introuvable."
  echo "    Lancez : certbot certificates"
  echo "    Puis éditez deploy/apache-esebat-digitalservices.conf manuellement."
  exit 1
fi

[[ -n "$VHOST_OLD" ]] && cp "$VHOST_OLD" "$BACKUP_ROOT/apache-vhost-avant-$STAMP.conf"

APACHE_TARGET="/etc/apache2/sites-available/${DOMAIN}.conf"
sed -e "s|__APP_ROOT__|${APP_ROOT}|g" \
    -e "s|__DOMAIN__|${DOMAIN}|g" \
    -e "s|__SSL_CERT__|${SSL_CERT}|g" \
    -e "s|__SSL_KEY__|${SSL_KEY}|g" \
  "$APP_ROOT/deploy/apache-esebat-digitalservices.conf" > "$APACHE_TARGET"

a2ensite "${DOMAIN}.conf" 2>/dev/null || true
for f in /etc/apache2/sites-enabled/*; do
  [[ -f "$f" ]] || continue
  b="$(basename "$f")"
  [[ "$b" == "${DOMAIN}.conf" ]] && continue
  grep -q "ServerName.*${DOMAIN}\|ServerAlias.*${DOMAIN}" "$f" 2>/dev/null \
    && a2dissite "$b" 2>/dev/null && echo "    Désactivé : $b"
done

apache2ctl configtest
systemctl reload apache2
echo "    Apache : OK"

# ─── 8. RÔLE admin établissement (Adama DIOP — aligner prod sur config attendue) ───
echo ">>> [8/9] Alignement rôle admin établissement (adama.diop@esebat.com)..."
cd "$APP_ROOT/backend"
node -e "
const db = require('./database/db');
const email = 'adama.diop@esebat.com';
const u = db.get('utilisateurs').find({ email }).value();
if (!u) { console.log('    Utilisateur absent — ignoré'); process.exit(0); }
if (u.role !== 'admin_etablissement') {
  db.get('utilisateurs').find({ id: u.id }).assign({
    role: 'admin_etablissement',
    updated_at: new Date().toISOString(),
  }).write();
  console.log('    Rôle mis à jour → admin_etablissement');
} else {
  console.log('    Rôle déjà admin_etablissement');
}
const etabId = u.etablissement_id || 1;
db.get('etablissements').find({ id: etabId }).assign({
  admin_etablissement_id: u.id,
  responsable_id: u.id,
}).write();
" 2>/dev/null || echo "    (ignoré si erreur DB)"
cd "$APP_ROOT"
pm2 restart uniportail-api 2>/dev/null || true

# ─── 9. TESTS ───
echo ">>> [9/9] Tests publics..."
echo ""
HTTP_ROOT="$(curl -sI --max-time 15 "https://${DOMAIN}/" | head -1 || echo 'ERREUR')"
HTTP_API="$(curl -s --max-time 15 "https://${DOMAIN}/api/health" | head -c 80 || echo 'ERREUR')"
UPLOADS_TEST="$(curl -sI --max-time 15 "https://${DOMAIN}/uploads/etablissements/__probe__.png" | head -1 || echo 'ERREUR')"
echo "    Site  : $HTTP_ROOT"
echo "    API   : $HTTP_API"
echo "    /uploads (proxy Apache→Node, attendu 404 et non HTML SPA) : $UPLOADS_TEST"
echo ""
if echo "$UPLOADS_TEST" | grep -qi '200.*OK'; then
  echo "    ATTENTION : /uploads renvoie 200 — vérifiez ProxyPass /uploads/ dans Apache."
fi
echo "══════════════════════════════════════════════════════════════"
echo "  TERMINÉ"
echo "  URL      : https://${DOMAIN}/"
echo "  Connexion: https://${DOMAIN}/connexion"
echo "  Sauvegarde: $BACKUP_ROOT/preinscription-$STAMP.json"
echo ""
echo "  IMPORTANT : déconnectez-vous et reconnectez-vous dans le"
echo "  navigateur pour rafraîchir le rôle (token JWT)."
echo "══════════════════════════════════════════════════════════════"
