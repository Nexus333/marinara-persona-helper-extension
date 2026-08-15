#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "Installing dependencies…"
  pnpm install
fi

echo "Building…"
pnpm build

echo "Packing…"
pnpm zip

echo "Done → dist/hello-world.personal-extension.zip"