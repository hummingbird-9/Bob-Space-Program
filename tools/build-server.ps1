$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path "dist" | Out-Null
npx --yes pkg@5.8.1 server/server.js --targets node18-win-x64 --output dist/bsp_server.exe
Write-Host "Built dist/bsp_server.exe. Run it from the bob-space-program folder."
