#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
"$ROOT/tools/build-server.sh"
WORK="$ROOT/dist/archpkg"
rm -rf "$WORK"
mkdir -p "$WORK"
cp "$ROOT/tools/PKGBUILD" "$WORK/PKGBUILD"
sed -i "s|__ROOT__|$ROOT|g" "$WORK/PKGBUILD"
cd "$WORK"
makepkg --force --cleanbuild
cp ./*.pkg.tar.zst "$ROOT/dist/"
echo "Built Arch package in dist/"
