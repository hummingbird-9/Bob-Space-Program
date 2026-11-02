#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/dist"
npx --yes pkg@5.8.1 server/server.js --targets node18-macos-x64 --output "$ROOT/dist/bsp_server"
APP="$ROOT/dist/Bob Space Program Server.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/bsp"
cp "$ROOT/dist/bsp_server" "$APP/Contents/MacOS/bsp_server"
cp "$ROOT/index.html" "$ROOT/css" "$ROOT/js" "$ROOT/png" "$ROOT/assets" "$APP/Contents/Resources/bsp/"
cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleName</key><string>Bob Space Program Server</string>
<key>CFBundleIdentifier</key><string>org.bobspaceprogram.server</string>
<key>CFBundleExecutable</key><string>bsp_server</string>
<key>CFBundlePackageType</key><string>APPL</string>
</dict></plist>
PLIST
chmod +x "$APP/Contents/MacOS/bsp_server"
hdiutil create -volname "BSP Server" -srcfolder "$APP" -ov -format UDZO "$ROOT/dist/BSP-Server-macOS.dmg"
echo "Built dist/BSP-Server-macOS.dmg. Keep the game folder at the expected working directory when launching."
