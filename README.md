# Mindfeed

Interesting ideas from great books, one at a time. An Expo (React Native) app on Supabase.

## Repository layout

- `apps/mobile`: the Expo app (expo-router, TypeScript).
- `packages/content`: the master copy of Topics, Books and Ideas.
- `supabase`: the local Supabase project: `config.toml`, `migrations/`, and `seed.sql`, which is generated from `packages/content`.

## Changing the content

Edit the Topics, Books and Ideas in `packages/content/src`. Every row has a UUID literal that never changes; give a new row a fresh one (`uuidgen | tr A-Z a-z`). Then regenerate the seed and load it:

```sh
pnpm seed:generate   # rewrites supabase/seed.sql; commit it with the content change
supabase db reset    # local only: reapplies migrations and the seed
```

`pnpm test` fails if a content rule is broken or if `supabase/seed.sql` is out of date.

Screens reach Supabase only through the `Backend` in `apps/mobile/src/backend`. See [ADR-0001](docs/adr/0001-supabase-behind-async-repositories.md).

## Local setup

You need the toolchain from issue #4: fnm, Node 24, pnpm via corepack, the Supabase CLI, Docker Desktop, and Android Studio with an emulator.

1. **Node 24.** The version lives in `.nvmrc`. With fnm set up using `--use-on-cd`, `cd`-ing into the repo switches to it. To switch by hand:

   ```sh
   fnm use
   ```

2. **pnpm.** The version is pinned in the root `package.json`'s `packageManager` field. Corepack picks it up after you run this once per Node version:

   ```sh
   corepack enable
   ```

3. **Install dependencies** at the repo root:

   ```sh
   pnpm install
   ```

4. **Start local Supabase** at the repo root, with Docker Desktop running:

   ```sh
   supabase start
   ```

   It prints the API URL and keys. To print them again:

   ```sh
   supabase status -o env
   ```

   Email confirmation is off and the minimum password length is 6. Both are set in `supabase/config.toml`.

5. **Environment variables.** Copy the example file:

   ```sh
   cp apps/mobile/.env.example apps/mobile/.env
   ```

   Then fill in:

   | Variable                        | Value                                                         |
   | ------------------------------- | ------------------------------------------------------------- |
   | `EXPO_PUBLIC_SUPABASE_URL`      | Where the device reaches Supabase (see below), port `54321`   |
   | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | The `ANON_KEY` value from `supabase status -o env`            |

   `apps/mobile/.env` is git-ignored. Restart `expo start` after changing it.

## Running the app

### On the Android emulator

Start the emulator from Android Studio's Device Manager. Set `EXPO_PUBLIC_SUPABASE_URL=http://10.0.2.2:54321`; `10.0.2.2` is how the emulator reaches the Mac. Then:

```sh
pnpm --filter mobile android
```

The first run installs Expo Go on the emulator if it is missing.

`scripts/android.sh start` does the same without Android Studio, waits until the app has loaded, and works around Expo Go showing a stale bundle. Coding agents use it, together with its `shot` and `tap` commands, for design checks (see `.claude/skills/run-android/SKILL.md`).

### On a physical phone over Wi-Fi

The phone and the Mac must be on the same Wi-Fi network.

1. Find the Mac's network IP:

   ```sh
   ipconfig getifaddr en0
   ```

2. In `apps/mobile/.env`, set `EXPO_PUBLIC_SUPABASE_URL=http://<that IP>:54321`. `localhost` and `127.0.0.1` would point at the phone itself, not the Mac.
3. Start the dev server:

   ```sh
   pnpm --filter mobile start
   ```

4. Scan the QR code with Expo Go on the phone.

If the phone can't reach Supabase:

- **Test it from the phone with Firefox**, at `http://<Mac's IP>:54321`. A `{"message":"no route matched with those values"}` reply means Supabase is reachable. Don't test with Chrome: on Android it refuses local `http://` addresses (`ERR_TOO_MANY_RETRIES`), even when the app would connect fine.
- **macOS Local Network permission**: in System Settings → Privacy & Security → Local Network, turn on Docker (and your terminal app), then quit and reopen Docker Desktop and run `supabase start` again. Docker only picks up the permission when it restarts.
- **Same network**: the phone's IP should start the same way as the Mac's (e.g. `192.168.1.`). Guest Wi-Fi networks usually keep devices apart, and so does a VPN on the phone.

## Checks

Run these from the repo root. CI runs all of them on every PR.

```sh
pnpm typecheck       # TypeScript across the workspace
pnpm lint            # ESLint across the workspace
pnpm test            # content checks, app tests and the fake Backend's contract tests (no server needed)
pnpm test:contract   # the Backend contract suite and content-table access rules against local Supabase (needs `supabase start`)
```
