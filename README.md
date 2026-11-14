# Mindfeed

Interesting ideas from great books, one at a time. An Expo (React Native) app on Supabase.

## Repository layout

- `apps/mobile`: the Expo app (expo-router, TypeScript).
- `packages/content`: the master copy of Topics, Books and Ideas.
- `supabase`: the local Supabase project (`config.toml`; migrations and seed arrive with later tickets).

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

If the phone can't connect, check that macOS's firewall allows incoming connections for Node, and that the Wi-Fi doesn't isolate devices from each other (common on guest networks).

## Checks

Run these from the repo root. CI runs all of them on every PR.

```sh
pnpm typecheck       # TypeScript across the workspace
pnpm lint            # ESLint across the workspace
pnpm test            # app tests and the fake Backend's contract tests (no server needed)
pnpm test:contract   # the Backend contract suite against the fake and local Supabase (needs `supabase start`)
```
