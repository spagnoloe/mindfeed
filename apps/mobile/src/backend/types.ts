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

export type SignUpDetails = { name: string; email: string; password: string };
export type LogInDetails = { email: string; password: string };

/** Why an account action failed, in the app's terms rather than Supabase's. */
export type AuthErrorCode = 'invalid-credentials' | 'email-taken' | 'unknown';

export class AuthError extends Error {
  constructor(
    readonly code: AuthErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface AuthService {
  /** The signed-in user's session, or null when nobody is signed in. Restored from the device after a restart. */
  getSession(): Promise<Session | null>;
  /** Creates the account and its profile, and signs it in. No email confirmation. Rejects with `email-taken`. */
  signUp(details: SignUpDetails): Promise<Session>;
  /** Rejects with `invalid-credentials` for an unknown email or a wrong password alike. */
  logIn(details: LogInDetails): Promise<Session>;
  logOut(): Promise<void>;
  /** Calls `listener` whenever the session changes (sign-up, log-in, log-out). Returns an unsubscribe function. */
  onSessionChange(listener: (session: Session | null) => void): () => void;
}

export type Topic = { id: string; name: string; hue: number };

/** Read-only Ideas, Books, Topics and search. */
export interface ContentRepository {
  /** Every Topic, ordered by name. */
  getTopics(): Promise<Topic[]>;
}

export type Profile = { name: string; bio: string };

/** The minimum number of Interests a user picks. */
export const MIN_INTERESTS = 3;

/** The signed-in user's profile, Interests, Likes and Stacks. Every method rejects when nobody is signed in. */
export interface UserDataRepository {
  getProfile(): Promise<Profile>;
  /** The Topic ids of the user's Interests, in no particular order. */
  getInterests(): Promise<string[]>;
  /** Replaces all the user's Interests. Rejects, changing nothing, with fewer than {@link MIN_INTERESTS}. */
  setInterests(topicIds: string[]): Promise<void>;
}

export type Backend = {
  auth: AuthService;
  content: ContentRepository;
  userData: UserDataRepository;
};
