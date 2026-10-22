#!/usr/bin/env bash
# Sobe o servidor local da Gestão Condominial (http://localhost:8330)
cd "$(dirname "$0")"
source "$HOME/.nvm/nvm.sh" 2>/dev/null
exec node server.js
