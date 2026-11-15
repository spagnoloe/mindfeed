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

export type Book = {
  id: string;
  title: string;
  author: string;
  /** Fetches the cover from Open Library. */
  isbn: string;
  /** The hue of the coloured placeholder shown behind (or instead of) the cover. */
  coverHue: number;
};

/** A Book with how many Ideas it has (the Source card's and the Book screen's "N ideas"). */
export type BookSummary = Book & { ideaCount: number };

/** An Idea with its Topic and Book, as every screen shows it. */
export type Idea = {
  id: string;
  title: string;
  explanation: string;
  topic: Topic;
  book: Book;
};

/** Where a page of the Home feed starts and how long it is. */
export type FeedPageRequest = {
  /** Shuffles the feed: the same seed always gives the same order. The app picks one per session. */
  seed: string;
  /** The position of the page's first Idea in the endless feed, from 0. */
  offset: number;
  limit: number;
};

/** The most Ideas one feed page returns. */
export const MAX_FEED_PAGE = 100;

/** Read-only Ideas, Books, Topics and search. */
export interface ContentRepository {
  /** Every Topic, ordered by name. */
  getTopics(): Promise<Topic[]>;
  /** The Trending topics, in their trending order. */
  getTrendingTopics(): Promise<Topic[]>;
  /** Every Topic with its Idea count, ordered by name. */
  getTopicSummaries(): Promise<TopicSummary[]>;
  /** Every Book, ordered by title. */
  getBooks(): Promise<Book[]>;
  /**
   * A page of the signed-in user's Home feed: every Idea in their Interests, shuffled, then every
   * other Idea, shuffled. Positions past the last Idea wrap around to the first, so the feed never
   * ends and a page always has `limit` Ideas (an Idea can appear twice in one page). `limit` is at
   * most {@link MAX_FEED_PAGE}.
   */
  getFeedPage(request: FeedPageRequest): Promise<Idea[]>;
  /** Rejects when there is no such Idea. */
  getIdea(ideaId: string): Promise<Idea>;
  /** A Topic's Ideas, ordered by title. */
  getTopicIdeas(topicId: string): Promise<Idea[]>;
  /** Rejects when there is no such Book. */
  getBook(bookId: string): Promise<BookSummary>;
  /** A Book's Ideas, ordered by title. */
  getBookIdeas(bookId: string): Promise<Idea[]>;
  /**
   * The Topics whose name, Books whose title or author, and Ideas whose title or explanation
   * contain `query`, ignoring case and surrounding spaces: Topics by name, then Books by title,
   * then Ideas by title. A blank query finds nothing.
   */
  search(query: string): Promise<SearchResult[]>;
}

/** A Topic with how many Ideas it has ("N ideas" in Explore). */
export type TopicSummary = Topic & { ideaCount: number };

/** One search result, with what its row in Explore shows. */
export type SearchResult =
  | ({ kind: 'topic' } & TopicSummary)
  | { kind: 'book'; id: string; title: string; author: string }
  | { kind: 'idea'; id: string; title: string; bookTitle: string };

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
  /** The user's Liked Ideas, newest Like first. */
  getLikedIdeas(): Promise<Idea[]>;
  /** Likes the Idea. Liking an Idea already liked changes nothing, so it keeps its place in Liked Ideas. */
  like(ideaId: string): Promise<void>;
  /** Unlikes the Idea. Unliking an Idea not liked changes nothing. */
  unlike(ideaId: string): Promise<void>;
  /** Whether the user has liked the Idea; false for an Idea that doesn't exist. */
  isLiked(ideaId: string): Promise<boolean>;
  /** The user's Stacks, newest first. */
  getStacks(): Promise<StackSummary[]>;
  /** Creates a Stack, holding `ideaId` if given. Rejects, creating nothing, when the name is blank. The name and description are trimmed. */
  createStack(details: NewStack): Promise<StackSummary>;
  /** Adds the Idea to one of the user's Stacks. Adding it again changes nothing. Rejects for a Stack that isn't the user's. */
  addToStack(stackId: string, ideaId: string): Promise<void>;
  /** Takes the Idea out of the Stack. Removing an Idea that isn't there, or from a Stack that isn't the user's, changes nothing. */
  removeFromStack(stackId: string, ideaId: string): Promise<void>;
  /** The ids of the user's Stacks that hold the Idea, in no particular order. */
  getStacksWith(ideaId: string): Promise<string[]>;
  /** One of the user's Stacks with its Ideas, first added first. Rejects for a Stack that isn't the user's. */
  getStack(stackId: string): Promise<Stack>;
  /**
   * Renames the Stack and replaces its description, both trimmed, and returns it. Rejects, changing
   * nothing, when the name is blank or the Stack isn't the user's.
   */
  updateStack(stackId: string, details: StackDetails): Promise<StackSummary>;
  /** Deletes the Stack and its entries; its Ideas, and their Likes, stay. Rejects for a Stack that isn't the user's. */
  deleteStack(stackId: string): Promise<void>;
}

/** A Stack as lists show it, without its Ideas. */
export type StackSummary = {
  id: string;
  name: string;
  /** Empty when the Stack has none. */
  description: string;
  ideaCount: number;
  /** The Topic of the Idea added to the Stack first, which tints the Stack's icon; null for an empty Stack. */
  firstTopic: Topic | null;
};

/** A Stack with its Ideas, first added first. */
export type Stack = StackSummary & { ideas: Idea[] };

export type StackDetails = { name: string; description: string };

export type NewStack = { name: string; description?: string; ideaId?: string };

export type Backend = {
  auth: AuthService;
  content: ContentRepository;
  userData: UserDataRepository;
};
