#!/usr/bin/env bash
# Apache2 uniquement — si le build est déjà fait et vous voulez juste le vhost.
# Usage : cd /var/www/uniportail && bash deploy/activer-apache-esebat.sh

set -euo pipefail
APP_ROOT="${UNIPORTAIL_APP_ROOT:-/var/www/uniportail}"
DOMAIN="${ESEBAT_DOMAIN:-esebat-digitalservices.com}"
cd "$APP_ROOT"

a2enmod proxy proxy_http proxy_wstunnel rewrite ssl headers

SSL_CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
SSL_KEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
if [[ ! -f "$SSL_CERT" ]]; then
  VHOST="$(grep -rl "ServerName.*${DOMAIN}" /etc/apache2/sites-enabled 2>/dev/null | head -1)"
  if [[ -n "$VHOST" ]]; then
    SSL_CERT="$(grep SSLCertificateFile "$VHOST" | head -1 | awk '{print $2}')"
    SSL_KEY="$(grep SSLCertificateKeyFile "$VHOST" | head -1 | awk '{print $2}')"
  fi
fi

APACHE_TARGET="/etc/apache2/sites-available/${DOMAIN}.conf"
sed -e "s|__APP_ROOT__|${APP_ROOT}|g" \
    -e "s|__DOMAIN__|${DOMAIN}|g" \
    -e "s|__SSL_CERT__|${SSL_CERT}|g" \
    -e "s|__SSL_KEY__|${SSL_KEY}|g" \
  "$APP_ROOT/deploy/apache-esebat-digitalservices.conf" > "$APACHE_TARGET"

a2ensite "${DOMAIN}.conf"
apache2ctl configtest
systemctl reload apache2
echo "OK — https://${DOMAIN}/"
