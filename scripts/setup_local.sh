#!/usr/bin/env bash
#
# One-shot setup script for the iCloud-hosted SADP-II Monitoring repo.
# Idempotent — safe to re-run.
#
# Run from the repo root:
#   bash scripts/setup_local.sh
#
# What it does:
#   1. Removes the now-redundant starter_kit/ folder (its contents were lifted
#      into supabase/migrations/, supabase/seeds/, scripts/ when the scaffold
#      was added — keeping starter_kit/ around would be duplicate).
#   2. Removes __pycache__ directories that snuck in from earlier Python runs.
#   3. Initialises git, configures user, makes the first commit.
#   4. (Optional) Adds a GitHub remote and pushes — uncomment the last block.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> SADP-II setup, working in: $REPO_ROOT"

# ----------------------------------------------------------------------------
# 1. Remove redundant starter_kit/ (contents are in supabase/* and scripts/* now)
# ----------------------------------------------------------------------------
if [ -d "starter_kit" ]; then
  echo "Removing redundant starter_kit/ (contents already in supabase/ + scripts/)..."
  rm -rf starter_kit
fi

# ----------------------------------------------------------------------------
# 2. Clean Python caches that may have synced down from earlier runs
# ----------------------------------------------------------------------------
find . -type d -name "__pycache__" -not -path "./node_modules/*" -prune -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -not -path "./node_modules/*" -delete 2>/dev/null || true

# ----------------------------------------------------------------------------
# 3. git init + first commit
# ----------------------------------------------------------------------------
if [ ! -d .git ] || [ ! -f .git/HEAD ]; then
  echo "Initialising git repo..."
  git init -q
fi

git config user.email "sehsan.rizvi@gmail.com"
git config user.name "Ehsan Rizvi"

git add -A

if git diff --cached --quiet; then
  echo "Nothing to commit (working tree clean)."
else
  git commit -m "phase-1: scaffold — schema, auth, admin panel, enterprises, cover-page PDF" -q
  echo "Initial commit created."
fi

git log --oneline -3 2>/dev/null || true

# ----------------------------------------------------------------------------
# 4. (Optional) Add GitHub remote and push
# ----------------------------------------------------------------------------
# Uncomment one of the blocks below, then re-run this script.
#
# ---- Reuse SADP_II_Last_Try (force-push to overwrite old history) ----
# git remote remove origin 2>/dev/null || true
# git remote add origin https://github.com/EhsanRiz/SADP_II_Last_Try.git
# git branch -M main
# git push -u --force origin main
#
# ---- Push to SADP_II_Last_Try on a new branch (preserves old main) ----
# git remote remove origin 2>/dev/null || true
# git remote add origin https://github.com/EhsanRiz/SADP_II_Last_Try.git
# git checkout -B phase-1-rebuild
# git push -u origin phase-1-rebuild
#
# ---- Brand-new repo (run `gh repo create` first) ----
# gh repo create sadp-ii-monitoring --private --source=. --remote=origin --push

echo ""
echo "Done. Next steps:"
echo "  npm install"
echo "  cp .env.example .env.local   # then fill in Supabase keys"
echo "  npm run dev"
