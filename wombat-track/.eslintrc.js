module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'script'
  },
  rules: {
    'no-console': 'off',
    'no-undef': 'error',
    'no-unused-vars': 'warn'
  },
  overrides: [
    {
      files: ['scripts/**/*.js'],
      env: {
        node: true,
        commonjs: true
      },
      parserOptions: {
        sourceType: 'script'
      }
    }
  ]
};