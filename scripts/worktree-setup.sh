#!/usr/bin/env bash
# Prepares a new git worktree: copies git-ignored local files from the main checkout, then
# starts Docker and local Supabase so they're up before an agent needs them.
# Run from inside the worktree (Orca runs its setup script there).
set -euo pipefail

# Files to copy, relative to the repo root. Add more here as needed.
FILES=(
  apps/mobile/.env
)

worktree_root="$(git rev-parse --show-toplevel)"
# The first entry of `git worktree list` is always the main checkout.
main_root="$(git worktree list --porcelain | awk 'NR==1 {sub(/^worktree /, ""); print}')"

copy_local_files() {
  if [[ "$worktree_root" == "$main_root" ]]; then
    echo "Already in the main checkout; nothing to copy."
    return
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
}

# Local Supabase is one instance shared by every worktree; `supabase start` is a no-op when it's
# already up. Failing here doesn't fail the setup: the worktree is still usable without it.
start_services() {
  local docker_started=0
  if ! docker desktop status 2>/dev/null | grep -q 'running'; then
    echo "Starting Docker Desktop..."
    # Waits until the engine answers, which `docker info` polling can't do reliably: while the
    # engine is half up, each call hangs for about a minute.
    if ! docker desktop start --timeout 180 >/dev/null 2>&1; then
      echo "warning: Docker didn't start within 3 minutes; local Supabase isn't running" >&2
      return
    fi
    docker_started=1
  fi
  if supabase_up_within 0; then
    echo "Local Supabase is already running."
    return
  fi
  # Supabase's containers restart with Docker on their own; starting them again meanwhile fails.
  if [[ $docker_started == 1 ]] && supabase_up_within 60; then
    echo "Local Supabase is running again."
  elif (cd "$worktree_root" && supabase start >/dev/null 2>&1) || supabase_up_within 0; then
    echo "Started local Supabase."
  else
    echo "warning: 'supabase start' failed; run it by hand to see why" >&2
  fi
}

supabase_up_within() {
  local deadline=$((SECONDS + $1))
  until (cd "$worktree_root" && supabase status >/dev/null 2>&1); do
    ((SECONDS < deadline)) || return 1
    sleep 3
  done
}

copy_local_files
start_services
