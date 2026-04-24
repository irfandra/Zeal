
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const path = require('path');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    settings: {
      'import/resolver': {
        alias: {
          map: [
            ['@', path.resolve(__dirname)],
            ['@/components', path.resolve(__dirname, 'components')],
            ['@/app', path.resolve(__dirname, 'app')],
            ['@/hooks', path.resolve(__dirname, 'hooks')],
            ['@/assets', path.resolve(__dirname, 'assets')],
            ['@/services', path.resolve(__dirname, 'services')],
            ['@/config', path.resolve(__dirname, 'config')],
            ['@/constants', path.resolve(__dirname, 'constants')],
          ],
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        },
      },
    },
  },
]);