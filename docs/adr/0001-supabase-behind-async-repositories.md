# Supabase from v1, behind async repositories

v1 of the mobile app uses Supabase (Auth with email and password, Postgres with row-level security for per-user data, content seeded into Postgres) rather than an on-device-only prototype. A backend was planned soon after v1, so local accounts and storage would have been throwaway work.

Screens never call Supabase directly. They go through three async interfaces (`AuthService`, `ContentRepository` for read-only Ideas/Books/Topics/search, `UserDataRepository` for Interests/Likes/Stacks), read through TanStack Query, and update Likes and Stack membership optimistically so the press-and-respond feel survives network latency. Tests run against an in-memory fake of those interfaces, not a live server.

## Considered Options

- **On-device only for v1** (`AsyncStorage`, local hashed-password accounts): fastest to start and works offline, but almost all of it would be discarded when the backend arrived.
- **Supabase now, called directly from screens**: less code, but ties every screen to Supabase's client and makes the UI untestable without a server.
