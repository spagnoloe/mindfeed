/** The Backend contract suite against every implementation. Needs local Supabase running. */
const base = require('./jest.base.config');

module.exports = {
  ...base,
  testMatch: ['**/*.contract.test.ts'],
};
