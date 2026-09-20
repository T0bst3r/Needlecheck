#!/bin/sh
set -e
CRATE_PATH="${CRATE_PATH:-/data/crate.json}"
mkdir -p "$(dirname "$CRATE_PATH")" /data
if [ ! -f "$CRATE_PATH" ]; then
  cp /opt/needlecheck/crate.default.json "$CRATE_PATH"
  echo "Seeded default crate at $CRATE_PATH"
fi
exec node src/index.js
