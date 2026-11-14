/**
 * The Backend boundary (ADR-0001). Screens reach Ideas, accounts and user data
 * only through these async interfaces, never through Supabase directly.
 *
 * Methods are added by later tickets; each one needs a contract test that runs
 * against both the fake and the Supabase implementation.
 */

export type Session = {
  userId: string;
  email: string;
};

export interface AuthService {
  /** The signed-in user's session, or null when nobody is signed in. */
  getSession(): Promise<Session | null>;
}

/** Read-only Ideas, Books, Topics and search. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- methods arrive with the schema ticket
export interface ContentRepository {}

/** The user's Interests, Likes and Stacks. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- methods arrive with the schema ticket
export interface UserDataRepository {}

export type Backend = {
  auth: AuthService;
  content: ContentRepository;
  userData: UserDataRepository;
};
