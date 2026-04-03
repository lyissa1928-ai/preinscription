#!/bin/bash
set -e

# Script de déploiement staging - Agriculture Intelligente
# Usage: ./deploy.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

# Vérifier .env
if [ ! -f .env ]; then
  echo "Erreur: .env manquant. Copiez .env.example vers .env et remplissez les variables."
  exit 1
fi

# Pull du repo (si git)
if [ -d .git ]; then
  git pull
fi

# Build
echo "Build des images Docker..."
docker compose -f deploy/docker-compose.staging.yml build

# Up
echo "Démarrage des services..."
docker compose -f deploy/docker-compose.staging.yml up -d

# Attendre que Postgres soit prêt
echo "Attente Postgres..."
sleep 5

# Migrations
echo "Exécution des migrations..."
docker compose -f deploy/docker-compose.staging.yml exec -T api npx prisma migrate deploy || true

# Seed (idempotent)
echo "Seed des régions..."
docker compose -f deploy/docker-compose.staging.yml exec -T api npx prisma db seed || true

echo "Déploiement terminé."
