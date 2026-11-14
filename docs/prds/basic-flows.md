# Introduction

This app is a knowledge-discovery platform that helps users discover interesting ideas from books and other sources.

**Ideas** are the core content units of the app. Each Idea is a short, self-contained piece of knowledge, presented with a title and a brief explanation. Ideas can be linked to a Book or another source, allowing users to explore other ideas from the same source.

Users can **like Ideas** to save them to their personal Library, or add them to one or more **Stacks**.

**Stacks** are user-created collections of Ideas, similar to folders or playlists. They allow users to group related Ideas around a subject, interest or purpose. An Idea can belong to multiple Stacks, and liking an Idea is independent of adding it to a Stack.

The goal is to make discovering, collecting, organizing and revisiting interesting knowledge simple and enjoyable.

# User Flows

## Navigation

The app has four main tabs: **Home**, **Explore**, **Library**, and **Profile**.

An **Idea Detail** view is accessible from Home, Explore, and Library.

## 1. Onboarding

1. Open the app and sign up or log in.
2. Select topics of interest.
3. Land on the personalized Home feed.

## 2. Home: Recommended ideas

1. View a feed of recommended ideas based on selected interests.
2. Scroll through the feed.
3. Open an idea to read its full content and see its source.
4. Like the idea or add it to a Stack.

Home is a recommendation feed only. Topic browsing and search belong in Explore.

## 3. Explore: Discover content

1. Open Explore.
2. Search for ideas, topics, or books using the search bar.
3. See trending topics and browse topics.
4. Open a topic to see its related ideas.
5. Open a book to see its associated ideas.
6. Open an idea to read it, like it, or add it to a Stack.

There are no curated collections or topic categories.

## 4. Library: Saved knowledge

The Library contains only **Liked Ideas** and **Stacks**.

### Liked Ideas

1. View all liked ideas.
2. Open an idea.
3. Unlike an idea to remove it from Liked Ideas.

### Stacks

1. View personal Stacks.
2. Create a new Stack.
3. Open a Stack to see its ideas.
4. Open an idea from a Stack.
5. Remove an idea from a Stack.
6. Rename or delete a Stack.

Ideas are added to Stacks from **Idea Detail**, not from the Library management interface. Liking an idea and adding it to a Stack are independent actions.

## 5. Profile

1. View profile information.
2. Edit personal information.
3. Manage selected topics of interest.
4. Log out.

## Shared flow: Idea Detail

1. Open an idea from Home, Explore, or Library.
2. Read its title and content, and view its source.
3. If the source is a book, open the book to browse its other ideas.
4. Like or unlike the idea to manage its presence in Liked Ideas.
5. Add the idea to an existing Stack or create a Stack and add it.

## Out of scope for the MVP

- Sharing ideas or Stacks
- User-generated ideas
- Subscriptions
- Audio playback
- Offline access
- Quizzes
- Curated collections
- App preferences