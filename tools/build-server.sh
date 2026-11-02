#!/usr/bin/env bash
set -euo pipefail
mkdir -p dist
npx --yes pkg@5.8.1 server/server.js --targets node18-linux-x64 --output dist/bsp_server
chmod +x dist/bsp_server
printf 'Built dist/bsp_server. Run it from the bob-space-program folder.\n'
