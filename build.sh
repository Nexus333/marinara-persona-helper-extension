#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Installing dependencies..."
pnpm install --frozen-lockfile

echo "Building..."
pnpm build

echo "Packing..."
pnpm zip

echo "Done -> dist/persona-helper.personal-extension.zip"
