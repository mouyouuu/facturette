#!/usr/bin/env bash
DIR="$(cd "$(dirname "$0")" && pwd)"
bash "$DIR/build-mac.sh"
echo ""
echo "Tu peux fermer cette fenetre."
read -r
