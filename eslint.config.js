const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  globalIgnores(['**/node_modules/', '**/.expo/', '**/dist/', 'supabase/.temp/', 'apps/mobile/expo-env.d.ts']),
  expoConfig,
  {
    settings: {
      'import/resolver': { typescript: { project: ['apps/*/tsconfig.json', 'packages/*/tsconfig.json'] } },
    },
  },
  {
    // ADR-0001: screens reach Supabase only through the Backend.
    files: ['apps/mobile/**/*.{ts,tsx}'],
    // The content-tables contract test checks database access rules, below the Backend.
    ignores: ['apps/mobile/src/backend/supabase.ts', 'apps/mobile/src/backend/contract/contentTables.contract.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@supabase/*'], message: 'Use the Backend (useBackend) instead of Supabase directly (ADR-0001).' },
          ],
        },
      ],
    },
  },
]);
