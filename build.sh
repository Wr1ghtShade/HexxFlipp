#!/bin/bash
# HexFlipp — Build complet depuis zéro.
# Réinstalle les dépendances natives et compile la version production single-file.
#
# Usage :
#   bash build.sh           # build standard
#   bash build.sh --clean   # alias explicite (déjà clean par défaut)
#   bash build.sh --keep    # garde node_modules (npm install incrémental)

set -euo pipefail

cd "$(dirname "$0")"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
info() { echo -e "  ${YELLOW}→${NC} $1"; }
err()  { echo -e "  ${RED}✗${NC} $1" >&2; }

echo -e "\n${BOLD}HexFlipp — Build production${NC}\n"

KEEP_MODULES=0
for arg in "$@"; do
    case "$arg" in
        --keep) KEEP_MODULES=1 ;;
        --clean) KEEP_MODULES=0 ;;
        -h|--help)
            echo "Usage: $0 [--clean|--keep]"
            echo "  --clean  (défaut) Supprime node_modules et package-lock.json"
            echo "  --keep            Conserve node_modules (install incrémental)"
            exit 0
            ;;
    esac
done

# 1. Pré-requis
if ! command -v node >/dev/null 2>&1; then
    err "Node.js introuvable. Installe-le d'abord (apt install nodejs npm)."
    exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
    err "npm introuvable."
    exit 1
fi
info "Node $(node --version) / npm $(npm --version)"

# 2. Nettoyage
if [ "$KEEP_MODULES" -eq 0 ]; then
    info "Nettoyage de node_modules et package-lock.json..."
    rm -rf node_modules package-lock.json
    ok "Dossier propre."
else
    info "Mode --keep : node_modules conservé."
fi

# 3. Installation des dépendances (récupère les binaires natifs pour l'archi locale)
info "Installation des dépendances (npm install)..."
npm install
ok "Dépendances installées."

# 4. Vérification TypeScript
info "Vérification TypeScript (tsc -b)..."
node node_modules/typescript/bin/tsc -b
ok "TypeScript OK."

# 5. Build Vite (incrémente la version + bundle single-file)
info "Build Vite (single-file)..."
npm run build
ok "Build terminé."

# 6. Récapitulatif
if [ -f dist/index.html ]; then
    SIZE=$(du -h dist/index.html | cut -f1)
    VERSION=$(node -p "require('./package.json').version")
    echo ""
    echo -e "${GREEN}${BOLD}  ✓  Build complet — v${VERSION}${NC}"
    echo -e "      ${BOLD}dist/index.html${NC} (${SIZE}, autonome, ouvrable en double-clic)"
    echo ""
else
    err "dist/index.html absent — build raté."
    exit 1
fi
