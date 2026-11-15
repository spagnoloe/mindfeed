---
name: run-android
description: Run the Mindfeed app on the Android emulator, drive it, and screenshot it next to the Claude Design prototype. Use when launching the app, checking a UI change on a device, or doing a ticket's design check.
---

## The app

`scripts/android.sh start` boots the emulator if needed, starts this worktree's Metro, and returns once the app has loaded. Run `scripts/android.sh` alone for the other commands: `reload`, `shot`, `tap`, `text`, `back`, `log`, `stop`.

- Metro watches files, so edits hot-reload. Use `reload` for a fresh mount (state cleared), never a new `start`.
- `shot` saves a 390px-wide image, the same scale as the design's frames. `tap` takes coordinates measured on a shot.
- After an action that animates (a press has a 150ms delay), wait about a second before `shot`.
- `stop` when the check is done.

Signing up against local Supabase needs `supabase status` to be running.

## The design

Get a `serve_url` from the claude_design MCP's `render_preview` for `MindfeedPressedApp.dc.html`, then:

```sh
node scripts/design-shot.mjs "$URL" <out-dir> shot:signup 'click:Log in' shot:login
```

The file header lists every step (`click:`, `type:`, `focus:`, `blur`, `wait:`, `js:`). The prototype opens on Sign up; reach other screens through clicks, like a user. The `serve_url` carries a token: keep it in the command line only.

Save every shot under your scratchpad, and compare the app and design shots of each screen side by side.
