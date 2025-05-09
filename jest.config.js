process.env.TZ = 'UTC';

/**
 * @type {import('jest').Config}
 */
module.exports = {
  // Jest configuration provided by Grafana scaffolding
  ...require('./.config/jest.config'),
  testMatch: ['<rootDir>/tests/*.{js,jsx}'],
};
