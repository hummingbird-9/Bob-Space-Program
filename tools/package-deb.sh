#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
"$ROOT/tools/build-server.sh"
PKG="$ROOT/dist/bsp-server-deb"
rm -rf "$PKG"
mkdir -p "$PKG/DEBIAN" "$PKG/usr/bin" "$PKG/usr/share/bsp"
cp "$ROOT/dist/bsp_server" "$PKG/usr/bin/bsp_server"
cp -R "$ROOT/index.html" "$ROOT/css" "$ROOT/js" "$ROOT/png" "$ROOT/assets" "$PKG/usr/share/bsp/"
cat > "$PKG/DEBIAN/control" <<'CONTROL'
Package: bsp-server
Version: 0.1.0
Section: games
Priority: optional
Architecture: amd64
Maintainer: Bob Space Program contributors
Description: Bob Space Program LAN relay and static game files
CONTROL
cat > "$PKG/usr/bin/bsp-server-launch" <<'LAUNCH'
#!/bin/sh
cd /usr/share/bsp
exec /usr/bin/bsp_server
LAUNCH
chmod +x "$PKG/usr/bin/bsp_server" "$PKG/usr/bin/bsp-server-launch"
dpkg-deb --build "$PKG" "$ROOT/dist/bsp-server_0.1.0_amd64.deb"
echo "Built dist/bsp-server_0.1.0_amd64.deb"
