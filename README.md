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

## Releasing to Android

Friends install an APK from a link. JavaScript-only fixes then reach their phones through EAS Update without a reinstall. Run every command below from `apps/mobile`, except the `supabase` and `pnpm seed:generate` ones, which run from the repo root.

### One-time setup

1. **Install `expo-updates`**, the app's update client, from `apps/mobile`, and commit the `package.json` and `pnpm-lock.yaml` changes:

   ```sh
   npx expo install expo-updates
   ```

2. **Link the production Supabase project** (`mindfeed`) from the repo root:

   ```sh
   supabase link --project-ref <project ref>
   ```

3. **Production auth settings.** `supabase db push` doesn't carry the `[auth]` settings in `supabase/config.toml`, so copy them by hand. In the Supabase dashboard, go to Authentication → Sign In / Providers → Email, turn off **Confirm email** and set the minimum password length to 6.
4. **Schema and content:**

   ```sh
   supabase db push --remote --include-seed
   ```

   Without `--remote`, the Supabase CLI targets the local database and prints "Local database is up to date". Check that the first line of output says `Target: project mindfeed`.

5. **EAS project:**

   ```sh
   eas init               # creates the project on expo.dev and adds its id to app.json
   eas update:configure   # adds the update URL to app.json
   ```

   Commit the `app.json` changes.

6. **Environment variables**, from the dashboard's Project Settings → API. They live in EAS, never in the repo:

   ```sh
   eas env:set --environment production --visibility plaintext --type string --name EXPO_PUBLIC_SUPABASE_URL --value https://<project ref>.supabase.co
   eas env:set --environment production --visibility plaintext --type string --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon key>
   ```

   The anon key ships inside the app anyway, so it isn't a secret. The database's row-level security protects the data.

### First release

```sh
eas build --platform android --profile production
```

The build takes about 15 minutes. When it finishes, EAS prints a link to the build page; share that link. Friends open it on their phone, download the APK and allow installs from their browser when Android asks.

### A JavaScript-only fix

A change to TypeScript, styles or images only:

```sh
eas update --channel production --environment production --message "<what changed>"
```

`--environment production` makes the update use the production Supabase variables, not the ones in your local `.env`. Installed apps download the update on their next launch and run it on the launch after that.

### A native change

Anything that changes the native app needs a new APK: adding or upgrading a package with native code, an Expo SDK upgrade, or a change to `app.json` such as the icon, splash screen or plugins. Bump `version` in `app.json` (for example `1.0.0` → `1.1.0`), then build and share the new link as in **First release**.

The bump is what keeps updates safe. Each build only accepts updates published for its own `version` (the `appVersion` runtime version policy), so an update that expects new native code never reaches an old APK. Forget the bump and the update reaches old APKs too, which may then crash.

### A content update

Edit `packages/content` as in **Changing the content**, then:

```sh
pnpm seed:generate
supabase db push --remote --include-seed
```

The seed only inserts and updates Topics, Books and Ideas, so re-running it is harmless and never touches profiles, Likes or Stacks. It never deletes either: a row removed from `packages/content` stays in production until you delete it by hand.

### A schema change

Add a migration under `supabase/migrations`, check it locally with `supabase db reset`, then:

```sh
supabase db push --remote
```

If the app's code depends on the new schema, push the migration before you publish the update or build that uses it.
