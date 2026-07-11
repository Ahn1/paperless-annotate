#!/usr/bin/env bash
# Release: Version in package.json bumpen, committen und als git tag vX.Y.Z markieren.
#
#   pnpm release            → Patch-Release (0.1.0 → 0.1.1)
#   pnpm release minor      → Minor-Release (0.1.0 → 0.2.0)
#   pnpm release major      → Major-Release (0.1.0 → 1.0.0)
#   pnpm release 1.2.3      → exakte Version
#
# Danach: git push && git push --tags
# Die App zeigt die Version aus `git describe --tags` (siehe vite.config.ts).
set -euo pipefail

cd "$(dirname "$0")/.."
BUMP="${1:-patch}"

if [ -n "$(git status --porcelain)" ]; then
  echo "FEHLER: Arbeitsverzeichnis ist nicht sauber – erst committen/stashen." >&2
  exit 1
fi

NEW_VERSION=$(node -e '
  const fs = require("fs")
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"))
  const bump = process.argv[1]
  let next
  if (/^\d+\.\d+\.\d+$/.test(bump)) {
    next = bump
  } else {
    const [major, minor, patch] = pkg.version.split(".").map(Number)
    if (bump === "major") next = `${major + 1}.0.0`
    else if (bump === "minor") next = `${major}.${minor + 1}.0`
    else if (bump === "patch") next = `${major}.${minor}.${patch + 1}`
    else { console.error(`Unbekanntes Argument: ${bump} (erwartet: patch|minor|major|X.Y.Z)`); process.exit(1) }
  }
  pkg.version = next
  fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n")
  console.log(next)
' "$BUMP")

TAG="v$NEW_VERSION"

if git rev-parse "$TAG" >/dev/null 2>&1; then
  git checkout -- package.json
  echo "FEHLER: Tag $TAG existiert bereits." >&2
  exit 1
fi

git add package.json
git commit -m "release: $TAG"
git tag -a "$TAG" -m "$TAG"

echo "==> $TAG erstellt. Veröffentlichen mit: git push && git push --tags"
