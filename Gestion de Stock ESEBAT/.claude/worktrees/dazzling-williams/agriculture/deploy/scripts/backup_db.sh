#!/bin/bash
set -e

# Backup PostgreSQL - Agriculture Intelligente
# Usage: ./backup_db.sh [destination_dir]

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/agriculture_$TIMESTAMP.sql"

mkdir -p "$BACKUP_DIR"

# Récupérer les variables depuis .env si présentes
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

PG_USER="${POSTGRES_USER:-agriculture}"
PG_DB="${POSTGRES_DB:-agriculture}"
PG_HOST="${POSTGRES_HOST:-localhost}"

echo "Backup de $PG_DB vers $BACKUP_FILE"
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump -h "$PG_HOST" -U "$PG_USER" -d "$PG_DB" -F p > "$BACKUP_FILE"

# Rotation: garder les 7 derniers backups
ls -t "$BACKUP_DIR"/agriculture_*.sql 2>/dev/null | tail -n +8 | xargs -r rm -f

echo "Backup terminé: $BACKUP_FILE"
