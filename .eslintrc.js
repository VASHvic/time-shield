module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: 'airbnb-base',
  overrides: [
  ],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
    'no-console': 'off',
    'max-classes-per-file': 'off',
    'no-use-before-define': ['error', {
      functions: false,
    }],
  },

};
