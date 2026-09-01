#!/usr/bin/env bash
# UniPortail = SEULE app sur https://esebat-digitalservices.com (racine).
# À lancer UNE FOIS sur le serveur (root ou sudo), après clone + .env prod.
#
# Usage :
#   cd /var/www/uniportail
#   bash deploy/configurer-racine-esebat.sh
#
# Variables optionnelles :
#   UNIPORTAIL_APP_ROOT=/var/www/uniportail
#   ESEBAT_DOMAIN=esebat-digitalservices.com
#   HESTIA_USER=admin

set -euo pipefail

APP_ROOT="${UNIPORTAIL_APP_ROOT:-/var/www/uniportail}"
DOMAIN="${ESEBAT_DOMAIN:-esebat-digitalservices.com}"
HESTIA_USER="${HESTIA_USER:-admin}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_ROOT="${UNIPORTAIL_BACKUP_DIR:-/var/backups/uniportail}"

echo "=== UniPortail seul sur $DOMAIN (racine) ==="
echo "App : $APP_ROOT"
echo ""

mkdir -p "$BACKUP_ROOT"

# ─── 1. Sauvegarde base + ancien site ───
if [[ -f "$APP_ROOT/backend/database/preinscription.json" ]]; then
  cp "$APP_ROOT/backend/database/preinscription.json" \
    "$BACKUP_ROOT/preinscription-avant-racine-$STAMP.json"
  echo ">>> Base sauvegardée"
fi

OLD_PUBLIC="/home/$HESTIA_USER/web/$DOMAIN/public_html"
if [[ -d "$OLD_PUBLIC" && ! -L "$OLD_PUBLIC" ]]; then
  ARCHIVE="/home/$HESTIA_USER/web/${DOMAIN}.public_html.OLD-$STAMP"
  if [[ ! -d "$ARCHIVE" ]]; then
    mv "$OLD_PUBLIC" "$ARCHIVE"
    mkdir -p "$OLD_PUBLIC"
    echo ">>> Ancien public_html archivé : $ARCHIVE"
  fi
fi

# ─── 2. PM2 : ne garder que uniportail-api ───
echo ">>> PM2 — arrêt des autres processus..."
mapfile -t PM2_NAMES < <(pm2 jlist 2>/dev/null | node -e "
  let j=[]; try{ j=JSON.parse(require('fs').readFileSync(0,'utf8')); }catch(e){}
  for (const p of j) if (p.name && p.name !== 'uniportail-api') console.log(p.name);
" 2>/dev/null || true)
for name in "${PM2_NAMES[@]:-}"; do
  [[ -z "$name" ]] && continue
  pm2 delete "$name" 2>/dev/null || true
  echo "    supprimé : $name"
done
if pm2 describe uniportail-api >/dev/null 2>&1; then
  echo "    conservé : uniportail-api"
else
  echo "    démarrage uniportail-api..."
  cd "$APP_ROOT/backend"
  pm2 start server.js --name uniportail-api
fi
pm2 save 2>/dev/null || true

# ─── 3. Config build frontend (racine) ───
ENV_PROD="$APP_ROOT/frontend/.env.production"
touch "$ENV_PROD"
grep -q '^VITE_BASE_PATH=' "$ENV_PROD" \
  && sed -i 's|^VITE_BASE_PATH=.*|VITE_BASE_PATH=/|' "$ENV_PROD" \
  || echo 'VITE_BASE_PATH=/' >> "$ENV_PROD"
grep -q '^VITE_API_URL=' "$ENV_PROD" \
  && sed -i 's|^VITE_API_URL=.*|VITE_API_URL=|' "$ENV_PROD" \
  || echo 'VITE_API_URL=' >> "$ENV_PROD"
echo ">>> frontend/.env.production → VITE_BASE_PATH=/"

# ─── 4. CORS backend ───
ENV_BACK="$APP_ROOT/backend/.env"
if [[ -f "$ENV_BACK" ]]; then
  CORS="https://${DOMAIN},https://www.${DOMAIN}"
  if grep -q '^CORS_ORIGINS=' "$ENV_BACK"; then
    sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=${CORS}|" "$ENV_BACK"
  else
    echo "CORS_ORIGINS=${CORS}" >> "$ENV_BACK"
  fi
  echo ">>> backend/.env → CORS_ORIGINS=${CORS}"
fi

# ─── 5. Build + config-site (API même origine) ───
cd "$APP_ROOT"
bash deploy/proteger-donnees-prod.sh 2>/dev/null || true
UNIPORTAIL_API_PUBLIC_URL="" UNIPORTAIL_SITE_URL="https://${DOMAIN}" bash deploy/mise-a-jour-prod.sh

# ─── 6. Lien symbolique public_html → dist (Hestia) ───
DIST="$APP_ROOT/frontend/dist"
if [[ -d "$OLD_PUBLIC" ]]; then
  rm -rf "$OLD_PUBLIC"/*
  # Hestia attend souvent public_html ; symlink du contenu dist
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete "$DIST/" "$OLD_PUBLIC/"
    echo ">>> rsync dist → $OLD_PUBLIC"
  else
    ln -sfn "$DIST" "${OLD_PUBLIC%/}/uniportail-dist"
    echo ">>> Lien $OLD_PUBLIC/uniportail-dist → dist (rsync recommandé)"
  fi
fi

# ─── 7. Nginx (si conf.d disponible) ───
NGINX_CONF="/etc/nginx/conf.d/${DOMAIN}.conf"
if [[ -d /etc/nginx/conf.d ]]; then
  sed "s|/var/www/uniportail|${APP_ROOT}|g" \
    "$APP_ROOT/deploy/nginx-esebat-digitalservices.conf" > "$NGINX_CONF"
  nginx -t && systemctl reload nginx
  echo ">>> Nginx rechargé : $NGINX_CONF"
fi

echo ""
echo "=== Terminé ==="
echo "URL : https://${DOMAIN}/"
echo "Connexion : https://${DOMAIN}/connexion"
echo ""
echo "Vérifications :"
echo "  curl -sI https://${DOMAIN}/ | head -3"
echo "  curl -s https://${DOMAIN}/api/health"
echo "  curl -sI https://${DOMAIN}/uniportail/connexion | head -3   # doit rediriger vers /connexion"
