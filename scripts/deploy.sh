#!/usr/bin/env bash
# Publish / update the site on GitHub Pages.
#
# First time:
#   1. Create an EMPTY public repo on github.com (no README), e.g. "octo-connectome".
#   2. Run:  scripts/deploy.sh git@github.com:<your-user>/octo-connectome.git
#      (or the https://github.com/<your-user>/octo-connectome.git URL)
#   3. On GitHub: Settings -> Pages -> Source: "Deploy from a branch",
#      Branch: main, Folder: / (root) -> Save.
#      The site appears at https://<your-user>.github.io/octo-connectome/ in about a minute.
#
# Every later update:
#   scripts/deploy.sh "Short description of what changed"
#
# Sources in figures_src/ are not pushed (see .gitignore); only assets/img/ is.

set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -d .git ]; then
  REMOTE="${1:-}"
  if [ -z "$REMOTE" ]; then
    echo "First run: pass the GitHub repo URL, e.g."
    echo "  scripts/deploy.sh git@github.com:<your-user>/octo-connectome.git"
    exit 1
  fi
  git init -b main
  git remote add origin "$REMOTE"
  git add -A
  git commit -m "Initial project page"
  git push -u origin main
  echo
  echo "Pushed. Now enable Pages: repo Settings -> Pages -> Branch: main, / (root)."
  exit 0
fi

MSG="${1:-Update project page}"
git add -A
if git diff --cached --quiet; then
  echo "Nothing to deploy (no changes)."
  exit 0
fi
git commit -m "$MSG"
git push
echo "Pushed. GitHub Pages usually refreshes within a minute."
