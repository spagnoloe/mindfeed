#!/usr/bin/env bash
# Copy git-ignored local files from the main checkout into a new git worktree.
# Run from inside the worktree (Orca runs its setup script there).
set -euo pipefail

# Files to copy, relative to the repo root. Add more here as needed.
FILES=(
  apps/mobile/.env
)

worktree_root="$(git rev-parse --show-toplevel)"
# The first entry of `git worktree list` is always the main checkout.
main_root="$(git worktree list --porcelain | awk 'NR==1 {sub(/^worktree /, ""); print}')"

if [[ "$worktree_root" == "$main_root" ]]; then
  echo "Already in the main checkout; nothing to copy."
  exit 0
fi

for file in "${FILES[@]}"; do
  src="$main_root/$file"
  dest="$worktree_root/$file"
  if [[ ! -f "$src" ]]; then
    echo "skip   $file (not in main checkout)"
  elif [[ -e "$dest" ]]; then
    echo "keep   $file (already exists)"
  else
    mkdir -p "$(dirname "$dest")"
    cp "$src" "$dest"
    echo "copied $file"
  fi
done
