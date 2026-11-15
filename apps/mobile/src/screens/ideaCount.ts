/** "1 idea", "12 ideas": the prototype's `plural(n, 'idea')`. */
export const ideaCount = (n: number) => `${n} ${n === 1 ? 'idea' : 'ideas'}`;
