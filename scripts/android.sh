#!/usr/bin/env bash
# Runs this worktree's app in Expo Go on the Android emulator, and drives it.
# Run `scripts/android.sh` with no arguments for the commands.
#
# Each step works around something that broke a by-hand run:
# - Expo Go restores a stale bundle from the emulator snapshot until it is force-stopped.
# - Expo Go's auto-launch uses the Mac's LAN address, which the emulator can't always reach,
#   so Metro is reverse-forwarded and opened at 127.0.0.1.
# - With CI set, Metro doesn't watch files and never sees new routes.
# - "Bundled" is logged before the first screen renders, so taps sent right away land on Android.
# - Another worktree's Metro on the same port would serve that worktree's code.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/android.sh <command>

  start          Boot the emulator if none is running, start Metro for this worktree,
                 open the app in Expo Go and wait until it has loaded
  reload         Force-stop Expo Go and reopen the app: a fresh mount, no in-memory state
  shot <file>    Screenshot the emulator at 1px per dp, the design's scale
  tap <x> <y>    Tap a point measured on a shot
  text <string>  Type into the focused field
  enter          Press the keyboard's enter key, which closes it on a single-line field
  back           Press Android back
  log            Print the end of Metro's log (app console errors show up here)
  stop           Stop Metro, and the emulator if `start` booted it

Env: AVD (default: first listed), METRO_PORT (default: 8081)
EOF
}

SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
ADB="$SDK/platform-tools/adb"
EMULATOR="$SDK/emulator/emulator"
PORT="${METRO_PORT:-8081}"
EXPO_GO=host.exp.exponent
ROOT="$(git rev-parse --show-toplevel)"
APP_DIR="$ROOT/apps/mobile"
STATE="$(git rev-parse --absolute-git-dir)/android-dev"
METRO_LOG="$STATE/metro.log"
mkdir -p "$STATE"

die() { echo "error: $*" >&2; exit 1; }

log_lines() { if [[ -f $METRO_LOG ]]; then wc -l <"$METRO_LOG" | tr -d ' '; else echo 0; fi; }

# Waits for Metro to log a finished Android bundle after line <from>. Fails fast on a bundling error.
wait_for_bundle() {
  local from=$1 deadline=$((SECONDS + $2)) new
  while ((SECONDS < deadline)); do
    new="$(tail -n +"$((from + 1))" "$METRO_LOG")"
    if grep -q 'Bundling failed' <<<"$new"; then
      tail -n 25 "$METRO_LOG" >&2
      die "Metro failed to bundle the app (log: $METRO_LOG)"
    fi
    grep -q 'Android Bundled' <<<"$new" && return 0
    sleep 2
  done
  return 1
}

# Prints any errors the app logged to Metro after line <from>.
report_errors() {
  local errors
  errors="$(tail -n +"$(($1 + 1))" "$METRO_LOG" | grep -E '^\s*ERROR' || true)"
  [[ -z $errors ]] || printf 'warning: the app logged errors:\n%s\n' "$errors" >&2
}

boot_completed() { [[ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == 1 ]]; }

ensure_emulator() {
  if ! "$ADB" get-state >/dev/null 2>&1; then
    local avd="${AVD:-$("$EMULATOR" -list-avds | head -n 1)}"
    [[ -n $avd ]] || die "no emulator found; create one in Android Studio's Device Manager"
    echo "Booting the $avd emulator..."
    # Started from a subshell, like Metro, so it outlives the shell that ran this script.
    (nohup "$EMULATOR" -avd "$avd" -no-snapshot-save -no-boot-anim -no-audio </dev/null >"$STATE/emulator.log" 2>&1 &
      echo $! >"$STATE/emulator.pid")
    "$ADB" wait-for-device
  fi
  local deadline=$((SECONDS + 180))
  until boot_completed; do
    ((SECONDS < deadline)) || die "the emulator didn't finish booting (log: $STATE/emulator.log)"
    sleep 2
  done
}

metro_pid() { { lsof -nP -t -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true; } | head -n 1; }
process_cwd() { { lsof -a -p "$1" -d cwd -Fn 2>/dev/null || true; } | sed -n 's/^n//p'; }

ensure_metro() {
  local pid
  pid="$(metro_pid)"
  if [[ -n $pid ]]; then
    local cwd
    cwd="$(process_cwd "$pid")"
    [[ $cwd == "$APP_DIR" ]] && return
    die "port $PORT is taken by a process running in ${cwd:-an unknown directory} (Metro from another worktree?). Stop it, or rerun with METRO_PORT=8082."
  fi
  echo "Starting Metro on port $PORT..."
  : >"$METRO_LOG"
  # Started from a subshell so it outlives the shell that ran this script. The inner subshell's
  # own output is redirected too: a caller piping this script would otherwise wait on it forever.
  ( (cd "$APP_DIR" && exec env -u CI nohup pnpm exec expo start --port "$PORT") </dev/null >>"$METRO_LOG" 2>&1 &)
  local deadline=$((SECONDS + 90))
  until [[ -n "$(metro_pid)" ]]; do
    if ((SECONDS >= deadline)); then
      tail -n 25 "$METRO_LOG" >&2
      die "Metro didn't start (log: $METRO_LOG)"
    fi
    sleep 1
  done
}

focused_activity() { "$ADB" shell dumpsys window | tr -d '\r' | grep -m 1 mCurrentFocus || true; }

wait_for_activity() {
  local deadline=$((SECONDS + $2))
  until [[ "$(focused_activity)" == *"$1"* ]]; do
    ((SECONDS < deadline)) || return 1
    sleep 0.5
  done
}

# A deep link sent right after a force-stop is dropped, so Expo Go is launched first.
open_app() {
  "$ADB" shell pm path "$EXPO_GO" >/dev/null 2>&1 ||
    die "Expo Go isn't installed on the emulator. Run 'pnpm --filter mobile android' once to install it."
  "$ADB" reverse "tcp:$PORT" "tcp:$PORT" >/dev/null
  "$ADB" shell am force-stop "$EXPO_GO"
  "$ADB" shell monkey -p "$EXPO_GO" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
  wait_for_activity HomeActivity 30 || die "Expo Go didn't open (focused: $(focused_activity))"
  "$ADB" shell am start -W -a android.intent.action.VIEW -d "exp://127.0.0.1:$PORT" "$EXPO_GO" >/dev/null
  wait_for_activity ExperienceActivity 30 || die "Expo Go didn't open the app (focused: $(focused_activity))"
}

cmd_start() {
  ensure_emulator
  ensure_metro
  local from
  from="$(log_lines)"
  open_app
  echo "Waiting for the app to load (the first bundle can take a few minutes)..."
  wait_for_bundle "$from" 420 || die "Expo Go never fetched a bundle from Metro (log: $METRO_LOG)"
  sleep 5
  report_errors "$from"
  echo "The app is running. Metro log: $METRO_LOG"
}

cmd_reload() {
  [[ -n "$(metro_pid)" ]] || die "Metro isn't running; use 'start'"
  local from
  from="$(log_lines)"
  open_app
  wait_for_bundle "$from" 120 || die "Expo Go never fetched a bundle from Metro (log: $METRO_LOG)"
  sleep 5
  report_errors "$from"
  echo "Reloaded."
}

cmd_shot() {
  local out=${1:?usage: shot <file.png>}
  mkdir -p "$(dirname "$out")"
  "$ADB" exec-out screencap -p >"$STATE/raw.png"
  local width
  width="$(awk -v w="$(device_width)" -v s="$(px_per_dp)" 'BEGIN { printf "%d", w / s + 0.5 }')"
  sips --resampleWidth "$width" "$STATE/raw.png" --out "$out" >/dev/null
  echo "$out"
}

# In device pixels. An override line, if any, comes last and is the one in effect.
device_width() { "$ADB" shell wm size | tr -d '\r' | awk -F'[ x]' 'END { print $(NF - 1) }'; }
px_per_dp() { "$ADB" shell wm density | tr -d '\r' | awk -F': ' 'END { print $2 / 160 }'; }

cmd_tap() {
  local x=${1:?usage: tap <x> <y>} y=${2:?usage: tap <x> <y>}
  read -r dx dy < <(awk -v x="$x" -v y="$y" -v s="$(px_per_dp)" 'BEGIN { printf "%d %d\n", x * s, y * s }')
  "$ADB" shell input tap "$dx" "$dy"
}

cmd_text() {
  local s=${1:?usage: text <string>}
  "$ADB" shell input text "'${s// /%s}'"
}

cmd_stop() {
  local pid
  pid="$(metro_pid)"
  if [[ -n $pid && "$(process_cwd "$pid")" == "$APP_DIR" ]]; then
    kill "$pid" && echo "Stopped Metro."
  fi
  "$ADB" reverse --remove "tcp:$PORT" >/dev/null 2>&1 || true
  if [[ -f $STATE/emulator.pid ]]; then
    if kill -0 "$(cat "$STATE/emulator.pid")" 2>/dev/null; then
      "$ADB" emu kill >/dev/null 2>&1 && echo "Stopped the emulator."
    fi
    rm -f "$STATE/emulator.pid"
  fi
}

case "${1:-}" in
  start) cmd_start ;;
  reload) cmd_reload ;;
  shot) cmd_shot "${2:-}" ;;
  tap) cmd_tap "${2:-}" "${3:-}" ;;
  text) cmd_text "${2:-}" ;;
  back) "$ADB" shell input keyevent KEYCODE_BACK ;;
  enter) "$ADB" shell input keyevent KEYCODE_ENTER ;;
  log) tail -n 40 "$METRO_LOG" ;;
  stop) cmd_stop ;;
  *) usage; exit 1 ;;
esac
