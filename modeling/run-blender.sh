#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
city_blender_bin="${BLENDER_BIN:-/Applications/Blender.app/Contents/MacOS/Blender}"
if [[ ! -x "$city_blender_bin" ]]; then
  echo 'Blender not found. Set BLENDER_BIN to your Blender executable.' >&2
  exit 1
fi
exec "$city_blender_bin" --background --factory-startup --python-exit-code 1 --python "${1:-modeling/build_city.py}"
