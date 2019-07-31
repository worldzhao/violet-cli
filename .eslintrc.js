module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
  plugins: ['@typescript-eslint', 'node'],
  rules: {
    '@typescript-eslint/indent': 0,
    '@typescript-eslint/no-use-before-define': 0,
    '@typescript-eslint/no-var-requires': 0,
    '@typescript-eslint/explicit-function-return-type': 0
  }
};
