// The master copy of Mindfeed's launch content: Topics, Books and Ideas.
import { books } from './books.ts';
import { consciousBusinessIdeas } from './ideas/consciousBusiness.ts';
import { intelligentInvestorIdeas } from './ideas/intelligentInvestor.ts';
import { principlesIdeas } from './ideas/principles.ts';
import { sapiensIdeas } from './ideas/sapiens.ts';
import { startWithWhyIdeas } from './ideas/startWithWhy.ts';
import { topics } from './topics.ts';
import type { Content } from './types.ts';

export type { Book, Content, Hue, Idea, Topic } from './types.ts';

export const content: Content = {
  topics,
  books,
  ideas: [...sapiensIdeas, ...principlesIdeas, ...consciousBusinessIdeas, ...intelligentInvestorIdeas, ...startWithWhyIdeas],
};
