module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    'no-console': 'off',
    'no-undef': 'error',
    'no-unused-vars': 'warn'
  },
  globals: {
    'global': 'readonly',
    'globalThis': 'readonly'
  },
  ignorePatterns: [
    'debug-*.js',
    'debug-*.cjs',
    '*.config.js',
    'dist/',
    'build/',
    'node_modules/'
  ],
  overrides: [
    {
      files: ['**/*.cjs', '.eslintrc.js'],
      env: {
        node: true,
        commonjs: true
      },
      parserOptions: {
        sourceType: 'script'
      },
      rules: {
        '@typescript-eslint/no-require-imports': 'off'
      }
    },
    {
      files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true,
        browser: true,
        node: true
      },
      globals: {
        'page': 'readonly',
        'browser': 'readonly',
        'jestPuppeteer': 'readonly'
      }
    }
  ]
};