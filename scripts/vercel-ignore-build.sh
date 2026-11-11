#!/usr/bin/env bash
# Vercel's "Ignored Build Step" (vercel.json ignoreCommand): exit 0 skips the build, exit 1 builds.
# Keeps Vercel usage low: only main is ever built (CI already builds every pull request), and
# only when the commit changes something the website is built from.
set -u

if [ "${VERCEL_GIT_COMMIT_REF:-}" != "main" ]; then
  echo "Skipping: only main is deployed (CI builds pull requests)."
  exit 0
fi

# Any error (for example no parent commit in the clone) falls through to a build.
if git diff --quiet HEAD^ HEAD -- \
  apps/web packages data/bulletins \
  package.json pnpm-lock.yaml pnpm-workspace.yaml .nvmrc \
  vercel.json scripts/vercel-ignore-build.sh; then
  echo "Skipping: nothing the website is built from changed."
  exit 0
fi

echo "Building: the website changed."
exit 1
