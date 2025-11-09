module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@tamagui/.*)',
  ],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'contexts/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!components/**/*.styles.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      statements: 60,
      branches: 50,
      functions: 60,
      lines: 60,
    },
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx|js)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

