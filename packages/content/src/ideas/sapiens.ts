import { sapiens } from '../books.ts';
import * as topic from '../topics.ts';
import type { Idea } from '../types.ts';

/** Ideas from Sapiens, in our own words. */
export const sapiensIdeas: readonly Idea[] = [
  {
    id: '0a246876-a846-4d69-9878-b6cca9c49e38',
    bookId: sapiens.id,
    topicId: topic.history.id,
    title: 'Shared stories let strangers cooperate',
    explanation: 'Chimpanzees can only cooperate with animals they know personally. Humans can work with millions of strangers because we believe in the same imagined things: gods, nations, companies, laws. None of these exist outside our shared stories, yet they let us organise at a scale no other species has reached.',
  },
  {
    id: 'aab93a5e-cbba-4977-a047-92f691115b26',
    bookId: sapiens.id,
    topicId: topic.history.id,
    title: 'Humans once lived alongside other humans',
    explanation: 'For most of our past, Homo sapiens was not alone. Neanderthals, Homo erectus and several other human species lived at the same time. The idea that we are the only humans is recent, and how the others vanished, through competition, interbreeding or violence, is still debated.',
  },
  {
    id: '88566ec2-c3e2-46bf-817a-9797f821e80b',
    bookId: sapiens.id,
    topicId: topic.history.id,
    title: 'Farming was a trap that looked like progress',
    explanation: 'The Agricultural Revolution produced more food, but not better lives for most people. Farmers worked longer than foragers, ate a narrower diet and suffered more disease. Extra food fed larger populations rather than happier ones, and once villages had grown, there was no going back.',
  },
  {
    id: '2b2fbf0f-2afc-40cb-92fd-7a5cf77d2ab7',
    bookId: sapiens.id,
    topicId: topic.psychology.id,
    title: 'Our minds are built for foraging',
    explanation: 'For tens of thousands of years, humans lived as hunter-gatherers. Many of our instincts, such as craving sugar and fat or gossiping about others, made sense in that world. We now carry those instincts into cities and supermarkets they were never designed for.',
  },
  {
    id: '18379490-fe66-4017-aabb-60ad77f9fcc6',
    bookId: sapiens.id,
    topicId: topic.economics.id,
    title: 'Money is trust you can carry',
    explanation: 'Money has no value in itself. Coins, notes and numbers on a screen work only because everyone believes everyone else will accept them. That shared belief lets complete strangers trade with each other, making money the most widely trusted system people have invented.',
  },
  {
    id: '159187be-7029-491c-8d8a-3a9ef664b71c',
    bookId: sapiens.id,
    topicId: topic.business.id,
    title: 'A company is a legal fiction',
    explanation: 'A corporation has no body, yet it can own property, borrow money and be taken to court. It exists because lawyers, judges and the public agree to treat it as a person. If its founders all died tomorrow, the company would carry on.',
  },
  {
    id: 'f3c19341-96ee-4680-b997-34dbc7daf2af',
    bookId: sapiens.id,
    topicId: topic.history.id,
    title: 'Writing began as bookkeeping',
    explanation: 'The earliest writing was not poetry or law but accounting. Sumerian scribes recorded taxes, debts and harvests on clay tablets. Writing let rulers keep track of more information than any single memory could hold, which made large states and bureaucracies possible.',
  },
  {
    id: '5553e293-a9c5-4d30-ab00-2aa4bb39c2d8',
    bookId: sapiens.id,
    topicId: topic.philosophy.id,
    title: 'Imagined orders feel natural',
    explanation: 'Social hierarchies, from castes to class systems, are inventions, yet the people living inside them usually see them as natural and inevitable. An imagined order survives because it is built into buildings, laws, education and desires, so it rarely looks imagined to anyone.',
  },
  {
    id: '238ee29a-542a-45d2-b71b-dacae4c3c0f9',
    bookId: sapiens.id,
    topicId: topic.economics.id,
    title: 'Credit is a bet on the future',
    explanation: 'Modern economies run on credit: lending money today against wealth that does not yet exist. This only works when people trust that the future will be richer than the present. Belief in growth, fed by science and discovery, made that trust reasonable.',
  },
  {
    id: 'a4d9e9c7-2c0d-4477-a9a3-df0c1cb762a6',
    bookId: sapiens.id,
    topicId: topic.history.id,
    title: 'Science began by admitting ignorance',
    explanation: 'Earlier traditions assumed that everything important was already known to gods or ancient sages. The Scientific Revolution started from the opposite position: we do not know, and must find out through observation and mathematics. Admitting ignorance turned out to be a source of enormous power.',
  },
  {
    id: 'dce60dea-666d-4d49-b9a8-746c43d22d06',
    bookId: sapiens.id,
    topicId: topic.psychology.id,
    title: 'Happiness depends on expectations',
    explanation: 'Despite huge gains in wealth and comfort, people today do not seem much happier than medieval peasants. Happiness depends less on objective conditions than on how they compare with what we expect. When conditions improve, expectations tend to rise with them.',
  },
  {
    id: 'afc8384a-0605-45e2-a56d-fc8928faf05c',
    bookId: sapiens.id,
    topicId: topic.history.id,
    title: 'Empires blended cultures',
    explanation: 'Empires have often been brutal, but they were also powerful engines of cultural mixing. Conquered peoples adopted their rulers’ languages, religions and laws, then reshaped them. Much of what any group calls its own culture is the legacy of some past empire.',
  },
  {
    id: '180dcf1d-c855-4765-afb7-ca84ea81186d',
    bookId: sapiens.id,
    topicId: topic.philosophy.id,
    title: 'Progress has not been kind to animals',
    explanation: 'As humans grew more powerful, domesticated animals paid much of the price. Billions of cows, pigs and chickens now live in industrial farms, bred for traits that serve us rather than them. Counting their experience complicates any simple story of human progress.',
  },
];
