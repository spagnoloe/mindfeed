/** "1 stack", "12 stacks": the prototype's `plural(n, word)`. */
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "1 idea", "12 ideas". */
export const ideaCount = (n: number) => plural(n, 'idea');
