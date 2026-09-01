#!/usr/bin/env bash
# UniPortail = SEULE app sur https://esebat-digitalservices.com (racine).
# Serveur Nginx standard (AWS/Lightsail, Debian) ou Hestia — pas de chemin Hestia obligatoire.
#
# Usage :
#   cd /var/www/uniportail
#   bash deploy/configurer-racine-esebat.sh

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
cd "$APP_ROOT"

# ─── 0. Code à jour (débloquer package-lock.json local) ───
echo ">>> 0/8 Mise à jour Git..."
for lockfile in frontend/package-lock.json backend/package-lock.json; do
  if [[ -f "$lockfile" ]] && ! git diff --quiet HEAD -- "$lockfile" 2>/dev/null; then
    git checkout -- "$lockfile" 2>/dev/null || true
    echo "    reset local : $lockfile"
  fi
done
git fetch origin
git pull origin main

# ─── 1. Sauvegarde base ───
if [[ -f "$APP_ROOT/backend/database/preinscription.json" ]]; then
  cp "$APP_ROOT/backend/database/preinscription.json" \
    "$BACKUP_ROOT/preinscription-avant-racine-$STAMP.json"
  echo ">>> 1/8 Base sauvegardée"
fi

# Hestia public_html (optionnel — absent sur AWS/Lightsail)
OLD_PUBLIC="/home/$HESTIA_USER/web/$DOMAIN/public_html"
if [[ -d "$OLD_PUBLIC" && ! -L "$OLD_PUBLIC" ]]; then
  ARCHIVE="/home/$HESTIA_USER/web/${DOMAIN}.public_html.OLD-$STAMP"
  if [[ ! -d "$ARCHIVE" ]]; then
    mv "$OLD_PUBLIC" "$ARCHIVE"
    mkdir -p "$OLD_PUBLIC"
    echo ">>> Ancien public_html Hestia archivé : $ARCHIVE"
  fi
else
  echo ">>> 1/8 Pas de public_html Hestia (normal sur Nginx/AWS)"
fi

# ─── 2. PM2 : ne garder que uniportail-api ───
echo ">>> 2/8 PM2 — ne garder que uniportail-api..."
PM2_JSON="$(pm2 jlist 2>/dev/null || echo '[]')"
while IFS= read -r name; do
  [[ -z "$name" ]] && continue
  pm2 delete "$name" 2>/dev/null || true
  echo "    supprimé : $name"
done < <(node -e "
  const j=JSON.parse(process.argv[1]||'[]');
  for (const p of j) if (p.name && p.name !== 'uniportail-api') console.log(p.name);
" "$PM2_JSON" 2>/dev/null || true)

if pm2 describe uniportail-api >/dev/null 2>&1; then
  echo "    conservé : uniportail-api"
else
  echo "    démarrage uniportail-api..."
  cd "$APP_ROOT/backend"
  pm2 start server.js --name uniportail-api
fi
pm2 save 2>/dev/null || true

# ─── 3. Config build frontend (racine) ───
echo ">>> 3/8 frontend/.env.production (VITE_BASE_PATH=/)..."
ENV_PROD="$APP_ROOT/frontend/.env.production"
touch "$ENV_PROD"
grep -q '^VITE_BASE_PATH=' "$ENV_PROD" \
  && sed -i 's|^VITE_BASE_PATH=.*|VITE_BASE_PATH=/|' "$ENV_PROD" \
  || echo 'VITE_BASE_PATH=/' >> "$ENV_PROD"
grep -q '^VITE_API_URL=' "$ENV_PROD" \
  && sed -i 's|^VITE_API_URL=.*|VITE_API_URL=|' "$ENV_PROD" \
  || echo 'VITE_API_URL=' >> "$ENV_PROD"

# ─── 4. CORS backend ───
echo ">>> 4/8 backend/.env CORS..."
ENV_BACK="$APP_ROOT/backend/.env"
if [[ -f "$ENV_BACK" ]]; then
  CORS="https://${DOMAIN},https://www.${DOMAIN}"
  if grep -q '^CORS_ORIGINS=' "$ENV_BACK"; then
    sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=${CORS}|" "$ENV_BACK"
  else
    echo "CORS_ORIGINS=${CORS}" >> "$ENV_BACK"
  fi
fi

# ─── 5. Build + restart ───
echo ">>> 5/8 Build + redémarrage API..."
bash deploy/proteger-donnees-prod.sh 2>/dev/null || true
UNIPORTAIL_API_PUBLIC_URL="" UNIPORTAIL_SITE_URL="https://${DOMAIN}" \
  bash deploy/mise-a-jour-prod.sh

# ─── 6. Hestia public_html sync (si présent) ───
DIST="$APP_ROOT/frontend/dist"
if [[ -d "$OLD_PUBLIC" ]]; then
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete "$DIST/" "$OLD_PUBLIC/"
    echo ">>> 6/8 rsync dist → $OLD_PUBLIC"
  fi
else
  echo ">>> 6/8 Pas de sync public_html (Nginx pointe vers frontend/dist)"
fi

# ─── 7. Nginx — certificats SSL depuis config existante ou Let's Encrypt ───
echo ">>> 7/8 Configuration Nginx..."
SSL_CERT=""
SSL_KEY=""

find_existing_nginx() {
  grep -rl "server_name.*${DOMAIN}" /etc/nginx/sites-enabled /etc/nginx/conf.d /etc/nginx/sites-available 2>/dev/null | head -1 || true
}

EXISTING_NGINX="$(find_existing_nginx)"
if [[ -n "$EXISTING_NGINX" && -f "$EXISTING_NGINX" ]]; then
  cp "$EXISTING_NGINX" "$BACKUP_ROOT/nginx-avant-racine-$STAMP.conf"
  SSL_CERT="$(grep -E '^\s*ssl_certificate\s+' "$EXISTING_NGINX" | grep -v ssl_certificate_key | head -1 | awk '{print $2}' | tr -d ';' || true)"
  SSL_KEY="$(grep -E '^\s*ssl_certificate_key\s+' "$EXISTING_NGINX" | head -1 | awk '{print $2}' | tr -d ';' || true)"
  echo "    config existante : $EXISTING_NGINX"
fi

if [[ -z "$SSL_CERT" || ! -f "$SSL_CERT" ]]; then
  if [[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
    SSL_CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
    SSL_KEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
    echo "    certificat Let's Encrypt détecté"
  elif [[ -f "/home/admin/conf/web/${DOMAIN}/ssl/${DOMAIN}.pem" ]]; then
    SSL_CERT="/home/admin/conf/web/${DOMAIN}/ssl/${DOMAIN}.pem"
    SSL_KEY="/home/admin/conf/web/${DOMAIN}/ssl/${DOMAIN}.key"
    echo "    certificat Hestia détecté"
  fi
fi

if [[ -d /etc/nginx/conf.d && -n "$SSL_CERT" && -f "$SSL_CERT" && -n "$SSL_KEY" && -f "$SSL_KEY" ]]; then
  NGINX_CONF="/etc/nginx/conf.d/${DOMAIN}.conf"
  sed "s|/var/www/uniportail|${APP_ROOT}|g" \
    "$APP_ROOT/deploy/nginx-esebat-digitalservices.conf" \
    | sed "s|ssl_certificate .*|ssl_certificate     ${SSL_CERT};|" \
    | sed "s|ssl_certificate_key .*|ssl_certificate_key ${SSL_KEY};|" \
    > "$NGINX_CONF"
  if nginx -t 2>/dev/null; then
    systemctl reload nginx
    echo "    Nginx OK : $NGINX_CONF"
  else
    echo "    ERREUR nginx -t — restauration backup si disponible"
    [[ -f "$BACKUP_ROOT/nginx-avant-racine-$STAMP.conf" ]] && \
      cp "$BACKUP_ROOT/nginx-avant-racine-$STAMP.conf" "$EXISTING_NGINX"
    nginx -t || true
    echo "    Éditez manuellement : $NGINX_CONF"
    echo "    Modèle : deploy/nginx-esebat-digitalservices.conf"
  fi
elif systemctl is-active --quiet apache2 2>/dev/null; then
  echo "    Apache actif — ajoutez deploy/apache-esebat-digitalservices-root.conf.example au vhost SSL"
  echo "    puis : systemctl reload apache2"
else
  echo "    Nginx/Apache non configuré automatiquement."
  echo "    Installez deploy/nginx-esebat-digitalservices.conf (adapter ssl_certificate)."
fi

# ─── 8. Vérifications ───
echo ">>> 8/8 Tests locaux..."
curl -sf --max-time 8 "http://127.0.0.1:5000/api/health" >/dev/null && echo "    API : OK" || echo "    API : vérifiez pm2 logs uniportail-api"

echo ""
echo "=== Terminé ==="
echo "URL : https://${DOMAIN}/"
echo "Connexion : https://${DOMAIN}/connexion"
echo ""
echo "Vérifications publiques :"
echo "  curl -sI https://${DOMAIN}/ | head -3"
echo "  curl -s https://${DOMAIN}/api/health"
echo "  curl -sI https://${DOMAIN}/uniportail/connexion | head -3"
