#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

export CSC_IDENTITY_AUTO_DISCOVERY=false

echo "Installation des dependances Facturette..."
npm ci

echo "Compilation de Facturette pour macOS..."
npm run dist:mac

echo ""
echo "Termine. Les fichiers Mac sont dans le dossier dist :"
ls -lh dist/Facturette-Mac-* || true
