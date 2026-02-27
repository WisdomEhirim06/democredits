import { setupTestDb, cleanDb, teardownTestDb } from '../setup';
import { AuthService } from '../../src/services/auth.service';
import { UserService } from '../../src/services/user.service';
import { KarmaService } from '../../src/services/karma.service';
import { UnauthorizedError, BlacklistedError, ConflictError } from '../../src/helpers/errors';

jest.mock('../../src/database/connection', () => {
    return {
        __esModule: true,
        default: null,
    };
});

// Mock the KarmaService
const mockKarmaService = {
    isBlacklisted: jest.fn(),
} as unknown as KarmaService;

let authService: AuthService;
let userService: UserService;

beforeAll(async () => {
    const db = await setupTestDb();
    const connectionModule = require('../../src/database/connection');
    connectionModule.default = db;

    userService = new UserService();
    authService = new AuthService(userService, mockKarmaService);
});

afterEach(async () => {
    await cleanDb();
    jest.clearAllMocks();
});

afterAll(async () => {
    await teardownTestDb();
});

describe('AuthService', () => {
    const validRegistrationData = {
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe',
        password: 'securePassword123',
    };

    describe('register', () => {
        it('should register a new user successfully', async () => {
            (mockKarmaService.isBlacklisted as jest.Mock).mockResolvedValue(false);

            const result = await authService.register(validRegistrationData);

            expect(result.user).toBeDefined();
            expect(result.user.email).toBe(validRegistrationData.email);
            expect(result.user.first_name).toBe(validRegistrationData.first_name);
            expect(result.token).toBeDefined();
            expect(typeof result.token).toBe('string');
            // Password should not be in the response
            expect((result.user as Record<string, unknown>).password).toBeUndefined();
        });

        it('should reject blacklisted users', async () => {
            (mockKarmaService.isBlacklisted as jest.Mock).mockResolvedValue(true);

            await expect(
                authService.register(validRegistrationData)
            ).rejects.toThrow(BlacklistedError);

            // Verify karma check was called
            expect(mockKarmaService.isBlacklisted).toHaveBeenCalledWith(
                validRegistrationData.email
            );
        });

        it('should throw ConflictError for duplicate email', async () => {
            (mockKarmaService.isBlacklisted as jest.Mock).mockResolvedValue(false);

            await authService.register(validRegistrationData);

            await expect(
                authService.register(validRegistrationData)
            ).rejects.toThrow(ConflictError);
        });

        it('should hash the password before storing', async () => {
            (mockKarmaService.isBlacklisted as jest.Mock).mockResolvedValue(false);

            await authService.register(validRegistrationData);
            const user = await userService.findByEmail(validRegistrationData.email);

            // Stored password should be different from plain text
            expect(user.password).not.toBe(validRegistrationData.password);
            expect(user.password.length).toBeGreaterThan(20); // bcrypt hash
        });
    });

    describe('login', () => {
        beforeEach(async () => {
            // Register a user first
            (mockKarmaService.isBlacklisted as jest.Mock).mockResolvedValue(false);
            await authService.register(validRegistrationData);
        });

        it('should login successfully with correct credentials', async () => {
            const result = await authService.login({
                email: validRegistrationData.email,
                password: validRegistrationData.password,
            });

            expect(result.user).toBeDefined();
            expect(result.user.email).toBe(validRegistrationData.email);
            expect(result.token).toBeDefined();
            expect((result.user as Record<string, unknown>).password).toBeUndefined();
        });

        it('should throw UnauthorizedError for wrong password', async () => {
            await expect(
                authService.login({
                    email: validRegistrationData.email,
                    password: 'wrongPassword',
                })
            ).rejects.toThrow(UnauthorizedError);
        });

        it('should throw NotFoundError for non-existent email', async () => {
            await expect(
                authService.login({
                    email: 'nonexistent@example.com',
                    password: 'password',
                })
            ).rejects.toThrow();
        });
    });

    describe('token generation and verification', () => {
        it('should generate and verify a valid token', () => {
            const payload = { userId: 1, email: 'test@example.com' };
            const token = authService.generateToken(payload);

            const decoded = authService.verifyToken(token);
            expect(decoded.userId).toBe(payload.userId);
            expect(decoded.email).toBe(payload.email);
        });

        it('should reject invalid token format', () => {
            expect(() => authService.verifyToken('invalid-token')).toThrow(
                UnauthorizedError
            );
        });

        it('should reject tampered tokens', () => {
            const payload = { userId: 1, email: 'test@example.com' };
            const token = authService.generateToken(payload);

            // Tamper with the token
            const parts = token.split('.');
            parts[1] = Buffer.from(JSON.stringify({ userId: 999, email: 'hacker@evil.com' })).toString('base64url');
            const tamperedToken = parts.join('.');

            expect(() => authService.verifyToken(tamperedToken)).toThrow(
                UnauthorizedError
            );
        });
    });
});
