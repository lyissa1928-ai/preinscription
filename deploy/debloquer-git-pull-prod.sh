#!/usr/bin/env bash
# Débloque git pull lorsque config-site.js (ou autres) est en skip-worktree.
# Usage : cd /var/www/uniportail && bash deploy/debloquer-git-pull-prod.sh && git pull origin main

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
BACKUP_ROOT="${UNIPORTAIL_BACKUP_DIR:-/var/backups/uniportail}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_ROOT"

echo "=== Déblocage git pull (skip-worktree) ==="

# Fichiers souvent protégés en prod
FILES=(
  "frontend/public/config-site.js"
  "backend/.env"
  "frontend/.env.production"
  "backend/database/preinscription.json"
)

for f in "${FILES[@]}"; do
  [[ -f "$f" ]] || continue
  if git ls-files -v "$f" 2>/dev/null | grep -q '^S'; then
    echo "  skip-worktree détecté : $f"
  fi
  if [[ "$f" == "frontend/public/config-site.js" ]]; then
    cp "$f" "$BACKUP_ROOT/config-site.js.$STAMP"
    git update-index --no-skip-worktree "$f" 2>/dev/null || true
    git restore --source=HEAD --staged --worktree "$f" 2>/dev/null \
      || git checkout HEAD -- "$f" 2>/dev/null \
      || true
    echo "  → reset : $f (sauvegarde : $BACKUP_ROOT/config-site.js.$STAMP)"
  fi
done

echo ""
echo "OK. Lancez : git pull origin main"
echo "Puis      : bash deploy/redeploy-prod-complet.sh"
