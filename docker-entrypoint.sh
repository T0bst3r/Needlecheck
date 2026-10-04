#!/bin/sh
set -e
mkdir -p "${MEDIA_ROOT:-/music}"
exec node src/index.js
