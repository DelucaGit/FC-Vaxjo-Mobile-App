// https://docs.expo.dev/guides/using-eslint/
const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'coverage/*', 'node_modules/*'],
  },
  {
    // These screens were already written. Token storage did not restyle them.
    files: ['src/screens/CreateUserScreen.tsx', 'src/screens/TrainingsScreen.tsx'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
]);
