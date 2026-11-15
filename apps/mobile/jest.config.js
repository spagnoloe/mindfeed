/** App tests and the fake Backend's contract tests. Runs without a server. */
const base = require('./jest.base.config');

module.exports = {
  ...base,
  testPathIgnorePatterns: ['/node_modules/', '/supabase\\.contract\\.test\\.ts$'],
  // The first test of each app test file renders the whole app, so it transforms every module
  // the routes import. Without a transform cache (as on CI) that alone takes about 2s on a fast
  // machine, and CI's runners, testing several files at once, pushed it past Jest's 5s default.
  testTimeout: 20000,
};
