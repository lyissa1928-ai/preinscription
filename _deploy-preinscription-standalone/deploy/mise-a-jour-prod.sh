#!/usr/bin/env bash
# Mise à jour sécurisée en production — code à jour, données intactes.
#
# Usage :
#   cd /var/www/uniportail
#   bash deploy/mise-a-jour-prod.sh
#
# Prérequis (une fois) :
#   bash deploy/proteger-donnees-prod.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BACKUP_ROOT="${UNIPORTAIL_BACKUP_DIR:-/var/backups/uniportail}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BRANCH="${UNIPORTAIL_GIT_BRANCH:-main}"

echo "=== UniPortail — mise à jour prod ($STAMP) ==="
echo "Répertoire : $ROOT"
echo ""

mkdir -p "$BACKUP_ROOT"

# ─── 1. Sauvegarde complète avant toute modification ───
echo ">>> 1/7 Sauvegarde des données..."
DB_FILE="backend/database/preinscription.json"
if [[ -f "$DB_FILE" ]]; then
  cp "$DB_FILE" "$BACKUP_ROOT/preinscription-$STAMP.json"
  echo "    Base : $BACKUP_ROOT/preinscription-$STAMP.json"
fi

if [[ -d backend/uploads ]]; then
  tar czf "$BACKUP_ROOT/uploads-$STAMP.tar.gz" -C backend uploads
  echo "    Uploads : $BACKUP_ROOT/uploads-$STAMP.tar.gz"
fi

[[ -f backend/.env ]] && cp backend/.env "$BACKUP_ROOT/backend.env.$STAMP"
[[ -f frontend/.env.production ]] && cp frontend/.env.production "$BACKUP_ROOT/frontend.env.production.$STAMP"
[[ -f frontend/public/config-site.js ]] && cp frontend/public/config-site.js "$BACKUP_ROOT/config-site.js.$STAMP"

# Stats avant (utilisateurs, factures…)
STATS_BEFORE=""
if [[ -f "$DB_FILE" ]]; then
  STATS_BEFORE="$(node -e "
    const d=require('./$DB_FILE');
    const n=(k)=>Array.isArray(d[k])?d[k].length:0;
    console.log(JSON.stringify({
      utilisateurs:n('utilisateurs'),
      factures:n('factures'),
      dossiers:n('dossiers'),
      etablissements:n('etablissements')
    }));
  " 2>/dev/null || echo '{}')"
  echo "    Compteurs avant : $STATS_BEFORE"
fi

# ─── 2. Protection skip-worktree (idempotent) ───
echo ">>> 2/7 Protection skip-worktree..."
bash deploy/proteger-donnees-prod.sh

# ─── 3. Copie de sécurité en mémoire locale ───
TMP_DB=""
if [[ -f "$DB_FILE" ]]; then
  TMP_DB="$(mktemp)"
  cp "$DB_FILE" "$TMP_DB"
fi

# ─── 4. Mise à jour du code ───
echo ">>> 3/7 git fetch + pull ($BRANCH)..."
git fetch origin
git pull origin "$BRANCH"

# ─── 5. Restaurer la base si git l'a écrasée ───
echo ">>> 4/7 Vérification de la base de données..."
if [[ -n "$TMP_DB" && -f "$TMP_DB" ]]; then
  NEED_RESTORE=0
  if [[ ! -f "$DB_FILE" ]]; then
    NEED_RESTORE=1
  elif ! cmp -s "$TMP_DB" "$DB_FILE" 2>/dev/null; then
    # Si le fichier a changé après pull, restaurer la prod
    NEED_RESTORE=1
  fi
  if [[ "$NEED_RESTORE" -eq 1 ]]; then
    cp "$TMP_DB" "$DB_FILE"
    echo "    Base restaurée depuis la sauvegarde pré-pull."
  else
    echo "    Base inchangée (skip-worktree actif)."
  fi
  rm -f "$TMP_DB"
fi

# Restaurer secrets et config build (jamais écrasés par git pull)
if [[ -f "$BACKUP_ROOT/backend.env.$STAMP" ]]; then
  cp "$BACKUP_ROOT/backend.env.$STAMP" backend/.env
fi
if [[ -f "$BACKUP_ROOT/frontend.env.production.$STAMP" ]]; then
  cp "$BACKUP_ROOT/frontend.env.production.$STAMP" frontend/.env.production
fi
if [[ -f "$BACKUP_ROOT/config-site.js.$STAMP" ]]; then
  cp "$BACKUP_ROOT/config-site.js.$STAMP" frontend/public/config-site.js
fi

# ─── 6. Stats après ───
echo ">>> 5/7 Compteurs après pull..."
if [[ -f "$DB_FILE" ]]; then
  STATS_AFTER="$(node -e "
    const d=require('./$DB_FILE');
    const n=(k)=>Array.isArray(d[k])?d[k].length:0;
    console.log(JSON.stringify({
      utilisateurs:n('utilisateurs'),
      factures:n('factures'),
      dossiers:n('dossiers'),
      etablissements:n('etablissements')
    }));
  " 2>/dev/null || echo '{}')"
  echo "    Compteurs après : $STATS_AFTER"
  if [[ -n "$STATS_BEFORE" && "$STATS_BEFORE" != "$STATS_AFTER" ]]; then
    echo ""
    echo "    ATTENTION : les compteurs ont changé !"
    echo "    Avant : $STATS_BEFORE"
    echo "    Après : $STATS_AFTER"
    echo "    Restauration automatique depuis $BACKUP_ROOT/preinscription-$STAMP.json"
    cp "$BACKUP_ROOT/preinscription-$STAMP.json" "$DB_FILE"
    git update-index --skip-worktree "$DB_FILE" 2>/dev/null || true
  fi
fi

# ─── 7. Build + restart ───
echo ">>> 6/7 Dépendances + build frontend..."
npm run install:all
npm run build

# config-site.js : apiBaseUrl vide = même origine (/api proxifié par nginx/apache).
# Sous-dossier legacy : UNIPORTAIL_API_PUBLIC_URL=https://esebat-digitalservices.com/uniportail
API_PUBLIC="${UNIPORTAIL_API_PUBLIC_URL-}"
SITE_URL="${UNIPORTAIL_SITE_URL:-https://esebat-digitalservices.com}"
write_config_site() {
  local target="$1"
  mkdir -p "$(dirname "$target")"
  cat > "$target" <<EOF
window.__PREINSCRIPTION_SITE_KEYS__ = {
  recaptcha: '',
  apiBaseUrl: '${API_PUBLIC}',
}
EOF
  echo "    config-site.js → $target (apiBaseUrl=${API_PUBLIC:-<same-origin>})"
}
write_config_site frontend/dist/config-site.js
write_config_site frontend/public/config-site.js

echo ">>> 7/8 Redémarrage API (migrations schéma au démarrage)..."
if pm2 describe uniportail-api >/dev/null 2>&1; then
  pm2 restart uniportail-api
  sleep 2
else
  echo "    PM2 uniportail-api introuvable — démarrez manuellement depuis backend/"
fi
pm2 save 2>/dev/null || true

echo ">>> 8/8 Vérification schéma base + API..."
if [[ -f "$DB_FILE" ]]; then
  SCHEMA_INFO="$(node -e "
    const d=require('./$DB_FILE');
    const v=d._schemaVersion??0;
    const mig=Array.isArray(d._migrations)?d._migrations.length:0;
    console.log('version='+v+' migrations='+mig);
  " 2>/dev/null || echo 'version=?')"
  echo "    Schéma : $SCHEMA_INFO"
  if [[ -d "$BACKUP_ROOT" ]]; then
    ls -1t "$BACKUP_ROOT"/preinscription-pre-migration-*.json 2>/dev/null | head -1 | while read -r bak; do
      echo "    Backup pré-migration : $bak"
    done
  fi
fi
if curl -sf --max-time 10 "http://127.0.0.1:5000/api/health" >/dev/null 2>&1; then
  echo "    API health : OK"
else
  echo "    API health : indisponible — vérifiez pm2 logs uniportail-api"
fi

echo ""
echo "=== Mise à jour terminée ==="
echo "URL application : ${SITE_URL}/"
echo "Connexion       : ${SITE_URL}/connexion"
echo "Sauvegarde      : $BACKUP_ROOT/preinscription-$STAMP.json"
echo ""
echo "Test rapide : curl -sI ${SITE_URL}/api/health | head -3"
