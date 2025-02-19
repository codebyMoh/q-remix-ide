module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['<rootDir>/src/utils/**/*'],
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
    transform: {
      '^.+\\.tsx?$': 'ts-jest'
    },
    setupFiles: ['<rootDir>/jest.setup.js'],
    roots: [
      '<rootDir>/src'
    ],
    modulePaths: [
      '<rootDir>'
    ],
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/src/$1' // If you use aliases
    }
  };