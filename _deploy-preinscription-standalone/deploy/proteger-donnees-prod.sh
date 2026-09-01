#!/usr/bin/env bash
# À lancer UNE SEULE FOIS sur le serveur de production après le clone.
# Empêche git pull d'écraser la base, les secrets et la config build locale.
#
# Usage : cd /var/www/uniportail && bash deploy/proteger-donnees-prod.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Erreur : pas un dépôt git ($ROOT)" >&2
  exit 1
fi

PROTECT=(
  "backend/database/preinscription.json"
  "backend/.env"
  "frontend/.env.production"
  "frontend/public/config-site.js"
)

echo "=== Protection des fichiers de production (skip-worktree) ==="
for f in "${PROTECT[@]}"; do
  if [[ -f "$f" ]]; then
    git update-index --skip-worktree "$f" 2>/dev/null || true
    echo "  OK  $f"
  else
    echo "  --  $f (absent, ignoré)"
  fi
done

echo ""
echo "Git ne modifiera plus ces fichiers lors des git pull."
echo "Pour annuler sur un fichier : git update-index --no-skip-worktree CHEMIN"
echo ""
echo "Vérifiez avec : git ls-files -v | grep '^S'"
