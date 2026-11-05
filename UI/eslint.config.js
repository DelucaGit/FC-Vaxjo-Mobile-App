const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'coverage/*', 'node_modules/*'],
  },
  {
    // These screens were already written. This change is token storage only.
    files: ['src/screens/CreateUserScreen.tsx', 'src/screens/TrainingsScreen.tsx'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
]);
