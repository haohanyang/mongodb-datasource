/**
 * @type {import('prettier').Options}
 */
const config = {
  ...require('./.config/.prettierrc.js'),
  singleQuote: true,
  trailingComma: 'all',
};

module.exports = config;
