#!/usr/bin/env bash
# Prepares a new git worktree: copies git-ignored local files from the main checkout, then
# starts Docker and local Supabase so they're up before an agent needs them, resets the database
# to this worktree's migrations and seed, and creates the dev account (scripts/dev-account.mjs).
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
  local docker_started=0 status
  # Captured first: piped straight into `grep -q`, the status command can die of SIGPIPE, which
  # pipefail would read as "not running".
  status="$(docker desktop status 2>/dev/null || true)"
  if ! grep -q 'running' <<<"$status"; then
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
  # Supabase's containers restart with Docker on their own; starting them again meanwhile fails.
  elif [[ $docker_started == 1 ]] && supabase_up_within 60; then
    echo "Local Supabase is running again."
  elif (cd "$worktree_root" && supabase start >/dev/null 2>&1) || supabase_up_within 0; then
    echo "Started local Supabase."
  else
    echo "warning: 'supabase start' failed; run it by hand to see why" >&2
    return
  fi
  reset_database
}

# Every task starts from main's schema and seed: no migrations missing since the last reset, and
# none left behind by an earlier branch. This deletes all local data, including test accounts,
# and assumes one task at a time, since every worktree shares this database.
reset_database() {
  if ! (cd "$worktree_root" && supabase db reset >/dev/null 2>&1); then
    echo "warning: 'supabase db reset' failed; run it by hand to see why" >&2
    return
  fi
  # Auth restarts after a reset; tests run before it answers fail with confusing errors.
  local key deadline=$((SECONDS + 60))
  key="$(cd "$worktree_root" && supabase status -o json 2>/dev/null | python3 -c 'import json, sys; print(json.load(sys.stdin)["ANON_KEY"])')"
  until [[ "$(curl -s -o /dev/null -w '%{http_code}' -H "apikey: $key" http://127.0.0.1:54321/auth/v1/health)" == 200 ]]; do
    if ((SECONDS >= deadline)); then
      echo "warning: Supabase Auth isn't answering after the reset" >&2
      return
    fi
    sleep 1
  done
  echo "Reset the local database to this worktree's migrations and seed."
  node "$worktree_root/scripts/dev-account.mjs" || echo "warning: the dev account wasn't created" >&2
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
