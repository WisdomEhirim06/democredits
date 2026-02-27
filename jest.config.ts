import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/__tests__'],
    testMatch: ['**/*.test.ts'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    // Transform ESM-only modules (uuid, etc.) so Jest can handle them
    transformIgnorePatterns: [
        'node_modules/(?!(uuid|express|body-parser|router|path-to-regexp|finalhandler|send|fresh|mime)/)',
    ],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
        '^.+\\.jsx?$': ['ts-jest', { useESM: false }],
    },
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/server.ts',
        '!src/database/migrations/**',
        '!src/database/seeds/**',
    ],
    coverageDirectory: 'coverage',
    verbose: true,
    forceExit: true,
    detectOpenHandles: true,
};

export default config;
