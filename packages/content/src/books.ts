import type { Book } from './types.ts';

// ISBNs are editions whose cover Open Library serves. coverHue is shown when the cover is missing.
export const sapiens: Book = { id: 'd7f76860-2300-4fe3-b9c5-bc9bdc7beecd', title: 'Sapiens', author: 'Yuval Noah Harari', isbn: '9780062316097', coverHue: 65 };
export const principles: Book = { id: 'd6b7241d-ac32-44b6-be99-997e6f18a87a', title: 'Principles', author: 'Ray Dalio', isbn: '9781501124020', coverHue: 225 };
export const consciousBusiness: Book = { id: '50c0fe45-63f9-4136-bf51-847fd00375e7', title: 'Conscious Business', author: 'Fred Kofman', isbn: '9781591793250', coverHue: 345 };
export const intelligentInvestor: Book = { id: 'ddf5d78c-73c7-4c60-b981-6daae582ef17', title: 'The Intelligent Investor', author: 'Benjamin Graham', isbn: '9780060555665', coverHue: 110 };
export const startWithWhy: Book = { id: 'a54b746f-1766-4957-93cf-d45c8030ee42', title: 'Start with Why', author: 'Simon Sinek', isbn: '9781591846444', coverHue: 255 };

export const books: readonly Book[] = [sapiens, principles, consciousBusiness, intelligentInvestor, startWithWhy];
