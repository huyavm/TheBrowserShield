module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'services/**/*.js',
        'routes/**/*.js',
        'middleware/**/*.js',
        'config/**/*.js',
        '!**/node_modules/**'
    ],
    testMatch: ['**/tests/**/*.test.js'],
    testPathIgnorePatterns: ['/node_modules/'],
    verbose: true,
    testTimeout: 30000,
    // Clear mocks between tests
    clearMocks: true,
    // Coverage thresholds
    coverageThreshold: {
        global: {
            branches: 50,
            functions: 50,
            lines: 50,
            statements: 50
        }
    }
};
