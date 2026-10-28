#!/usr/bin/env bash
# Packed-package smoke test: build, pack, install the tarball into an empty directory, and run the CLI from there.
# Proves the published artifact (not the source checkout) can locate its package root, corpus, fixtures and Playwright.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
npm run build >/dev/null
TARBALL="$(npm pack --silent 2>/dev/null | tail -1)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/foldproof-smoke.XXXXXX")"
trap 'rm -rf "$WORK" "$ROOT/$TARBALL"' EXIT
cd "$WORK"
npm init -y >/dev/null 2>&1
npm i --silent "$ROOT/$TARBALL" playwright@"$(node -p "require('$ROOT/node_modules/playwright/package.json').version")" >/dev/null 2>&1
INSTALLED_VERSION="$(node -p "JSON.parse(require('fs').readFileSync('node_modules/foldproof/package.json','utf8')).version")"
test -n "$INSTALLED_VERSION"
echo "installed foldproof $INSTALLED_VERSION into $WORK"
npx foldproof --version
npx foldproof profiles validate
npx foldproof doctor >/dev/null
npx foldproof fixtures verify --only draft-lost-on-unfold --out "$WORK/out"
test -s "$WORK/out/foldproof.sarif"
echo "packed-package smoke test passed"
