import type { Topic } from './types.ts';

// Hues follow the prototype's topic palette. trendingOrder sets the Trending topics in Explore.
export const history: Topic = { id: '4ce51636-bbbf-45da-95b9-a3eaa68bba7d', name: 'History', hue: 65, trendingOrder: 4 };
export const psychology: Topic = { id: 'd1925fac-85a2-4edc-9b4f-12bc368ef762', name: 'Psychology', hue: 30, trendingOrder: 1 };
export const philosophy: Topic = { id: '6ae8f6b9-7528-4dc1-99ac-12544d0a38a3', name: 'Philosophy', hue: 285, trendingOrder: null };
export const economics: Topic = { id: 'd085d8bd-6f6e-4576-87c0-07fecc9529e2', name: 'Economics', hue: 150, trendingOrder: null };
export const investing: Topic = { id: '445168a4-60a9-4990-9d98-94a0df9f24a1', name: 'Investing', hue: 110, trendingOrder: 2 };
export const decisionMaking: Topic = { id: '770b67f5-8633-4425-a533-ef84544e83d8', name: 'Decision-making', hue: 225, trendingOrder: null };
export const leadership: Topic = { id: '75319d53-f4e2-4686-95ac-02f50013868f', name: 'Leadership', hue: 345, trendingOrder: 3 };
export const business: Topic = { id: 'ff102e80-5691-4183-8cee-22930d8855f3', name: 'Business', hue: 255, trendingOrder: null };
export const communication: Topic = { id: 'e381e88e-bc00-45c4-99e8-1a14324d9ac4', name: 'Communication', hue: 185, trendingOrder: null };

export const topics: readonly Topic[] = [history, psychology, philosophy, economics, investing, decisionMaking, leadership, business, communication];
