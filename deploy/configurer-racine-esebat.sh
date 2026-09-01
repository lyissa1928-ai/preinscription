#!/usr/bin/env bash
# UniPortail = SEULE app sur https://esebat-digitalservices.com (racine).
# Apache2, Nginx ou Hestia — détection automatique du serveur web actif.
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

apache_active() {
  systemctl is-active --quiet apache2 2>/dev/null
}

nginx_active() {
  systemctl is-active --quiet nginx 2>/dev/null
}

echo "=== UniPortail seul sur $DOMAIN (racine) ==="
echo "App : $APP_ROOT"
apache_active && echo "Serveur web : Apache2" || true
nginx_active && echo "Serveur web : Nginx" || true
echo ""

mkdir -p "$BACKUP_ROOT"
cd "$APP_ROOT"

# ─── 0. Code à jour ───
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

OLD_PUBLIC="/home/$HESTIA_USER/web/$DOMAIN/public_html"
if [[ -d "$OLD_PUBLIC" && ! -L "$OLD_PUBLIC" ]]; then
  ARCHIVE="/home/$HESTIA_USER/web/${DOMAIN}.public_html.OLD-$STAMP"
  [[ ! -d "$ARCHIVE" ]] && mv "$OLD_PUBLIC" "$ARCHIVE" && mkdir -p "$OLD_PUBLIC"
  echo ">>> Ancien public_html Hestia archivé"
else
  echo ">>> 1/8 Pas de public_html Hestia"
fi

# ─── 2. PM2 ───
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
  cd "$APP_ROOT/backend"
  pm2 start server.js --name uniportail-api
fi
pm2 save 2>/dev/null || true

# ─── 3–4. Env frontend + CORS ───
echo ">>> 3/8 frontend/.env.production..."
ENV_PROD="$APP_ROOT/frontend/.env.production"
touch "$ENV_PROD"
grep -q '^VITE_BASE_PATH=' "$ENV_PROD" \
  && sed -i 's|^VITE_BASE_PATH=.*|VITE_BASE_PATH=/|' "$ENV_PROD" \
  || echo 'VITE_BASE_PATH=/' >> "$ENV_PROD"
grep -q '^VITE_API_URL=' "$ENV_PROD" \
  && sed -i 's|^VITE_API_URL=.*|VITE_API_URL=|' "$ENV_PROD" \
  || echo 'VITE_API_URL=' >> "$ENV_PROD"

echo ">>> 4/8 backend/.env CORS..."
ENV_BACK="$APP_ROOT/backend/.env"
if [[ -f "$ENV_BACK" ]]; then
  CORS="https://${DOMAIN},https://www.${DOMAIN}"
  grep -q '^CORS_ORIGINS=' "$ENV_BACK" \
    && sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=${CORS}|" "$ENV_BACK" \
    || echo "CORS_ORIGINS=${CORS}" >> "$ENV_BACK"
fi

# ─── 5. Build ───
echo ">>> 5/8 Build + redémarrage API..."
bash deploy/proteger-donnees-prod.sh 2>/dev/null || true
UNIPORTAIL_API_PUBLIC_URL="" UNIPORTAIL_SITE_URL="https://${DOMAIN}" \
  bash deploy/mise-a-jour-prod.sh

DIST="$APP_ROOT/frontend/dist"
if [[ -d "$OLD_PUBLIC" ]] && command -v rsync >/dev/null 2>&1; then
  rsync -a --delete "$DIST/" "$OLD_PUBLIC/"
  echo ">>> 6/8 rsync dist → public_html Hestia"
else
  echo ">>> 6/8 DocumentRoot = $DIST"
fi

# ─── 7. Serveur web ───
SSL_CERT=""
SSL_KEY=""

find_apache_vhost() {
  grep -rl "ServerName.*${DOMAIN}" /etc/apache2/sites-enabled /etc/apache2/sites-available 2>/dev/null | head -1 || true
}

find_nginx_vhost() {
  grep -rl "server_name.*${DOMAIN}" /etc/nginx/sites-enabled /etc/nginx/conf.d /etc/nginx/sites-available 2>/dev/null | head -1 || true
}

detect_ssl_from_file() {
  local f="$1"
  [[ -z "$f" || ! -f "$f" ]] && return
  SSL_CERT="$(grep -E '^\s*SSLCertificateFile\s+' "$f" | head -1 | awk '{print $2}' || true)"
  SSL_KEY="$(grep -E '^\s*SSLCertificateKeyFile\s+' "$f" | head -1 | awk '{print $2}' || true)"
}

if [[ -z "$SSL_CERT" || ! -f "$SSL_CERT" ]]; then
  if [[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
    SSL_CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
    SSL_KEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
  fi
fi

install_apache() {
  echo ">>> 7/8 Configuration Apache2..."
  a2enmod proxy proxy_http proxy_wstunnel rewrite ssl headers 2>/dev/null || true

  EXISTING_APACHE="$(find_apache_vhost)"
  if [[ -n "$EXISTING_APACHE" && -f "$EXISTING_APACHE" ]]; then
    cp "$EXISTING_APACHE" "$BACKUP_ROOT/apache-avant-racine-$STAMP.conf"
    detect_ssl_from_file "$EXISTING_APACHE"
    echo "    vhost existant : $EXISTING_APACHE"
  fi

  if [[ -z "$SSL_CERT" || ! -f "$SSL_CERT" ]]; then
    echo "    ERREUR : certificat SSL introuvable pour $DOMAIN"
    echo "    Vérifiez : certbot certificates"
    echo "    ou éditez deploy/apache-esebat-digitalservices.conf à la main"
    return 1
  fi

  APACHE_TARGET="/etc/apache2/sites-available/${DOMAIN}.conf"
  sed -e "s|__APP_ROOT__|${APP_ROOT}|g" \
      -e "s|__DOMAIN__|${DOMAIN}|g" \
      -e "s|__SSL_CERT__|${SSL_CERT}|g" \
      -e "s|__SSL_KEY__|${SSL_KEY}|g" \
    "$APP_ROOT/deploy/apache-esebat-digitalservices.conf" > "$APACHE_TARGET"

  a2ensite "${DOMAIN}.conf" 2>/dev/null || true

  # Désactiver les anciens vhosts du même domaine (certbot -le-ssl, default, etc.)
  for old in /etc/apache2/sites-enabled/*; do
    [[ -f "$old" ]] || continue
    base="$(basename "$old" .conf)"
    [[ "$base" == "$DOMAIN" ]] && continue
    if grep -q "ServerName.*${DOMAIN}" "$old" 2>/dev/null; then
      a2dissite "$(basename "$old")" 2>/dev/null || true
      echo "    désactivé : $(basename "$old")"
    fi
  done

  if apache2ctl configtest 2>/dev/null || apachectl configtest 2>/dev/null; then
    systemctl reload apache2
    echo "    Apache OK : $APACHE_TARGET"
  else
    echo "    ERREUR apache2ctl configtest"
    [[ -n "$EXISTING_APACHE" && -f "$BACKUP_ROOT/apache-avant-racine-$STAMP.conf" ]] && \
      cp "$BACKUP_ROOT/apache-avant-racine-$STAMP.conf" "$EXISTING_APACHE"
    apache2ctl configtest || true
    return 1
  fi
}

install_nginx() {
  echo ">>> 7/8 Configuration Nginx..."
  EXISTING_NGINX="$(find_nginx_vhost)"
  if [[ -n "$EXISTING_NGINX" && -f "$EXISTING_NGINX" ]]; then
    cp "$EXISTING_NGINX" "$BACKUP_ROOT/nginx-avant-racine-$STAMP.conf"
    SSL_CERT="$(grep -E '^\s*ssl_certificate\s+' "$EXISTING_NGINX" | grep -v ssl_certificate_key | head -1 | awk '{print $2}' | tr -d ';' || true)"
    SSL_KEY="$(grep -E '^\s*ssl_certificate_key\s+' "$EXISTING_NGINX" | head -1 | awk '{print $2}' | tr -d ';' || true)"
  fi
  [[ -z "$SSL_CERT" || ! -f "$SSL_CERT" ]] && return 1
  [[ ! -d /etc/nginx/conf.d ]] && return 1

  NGINX_CONF="/etc/nginx/conf.d/${DOMAIN}.conf"
  sed "s|/var/www/uniportail|${APP_ROOT}|g" "$APP_ROOT/deploy/nginx-esebat-digitalservices.conf" \
    | sed "s|ssl_certificate .*|ssl_certificate     ${SSL_CERT};|" \
    | sed "s|ssl_certificate_key .*|ssl_certificate_key ${SSL_KEY};|" \
    > "$NGINX_CONF"
  nginx -t && systemctl reload nginx
  echo "    Nginx OK : $NGINX_CONF"
}

if apache_active; then
  install_apache
elif nginx_active; then
  install_nginx
else
  echo ">>> 7/8 Aucun serveur web actif détecté — installez Apache ou Nginx"
fi

# ─── 8. Tests ───
echo ">>> 8/8 Tests..."
curl -sf --max-time 8 "http://127.0.0.1:5000/api/health" >/dev/null && echo "    API Node : OK" || echo "    API Node : pm2 logs uniportail-api"

echo ""
echo "=== Terminé ==="
echo "URL : https://${DOMAIN}/"
echo "Connexion : https://${DOMAIN}/connexion"
echo ""
echo "  curl -sI https://${DOMAIN}/ | head -3"
echo "  curl -s https://${DOMAIN}/api/health"
