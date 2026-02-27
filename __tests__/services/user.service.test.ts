import { setupTestDb, cleanDb, teardownTestDb, getTestDb } from '../setup';
import { UserService } from '../../src/services/user.service';
import { ConflictError, NotFoundError } from '../../src/helpers/errors';

// Mock the database connection module to use test DB
jest.mock('../../src/database/connection', () => {
    return {
        __esModule: true,
        default: null,
    };
});

let userService: UserService;

beforeAll(async () => {
    const db = await setupTestDb();
    // Replace the mock with our test DB
    const connectionModule = require('../../src/database/connection');
    connectionModule.default = db;
    userService = new UserService();
});

afterEach(async () => {
    await cleanDb();
});

afterAll(async () => {
    await teardownTestDb();
});

describe('UserService', () => {
    const validUserData = {
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe',
        password: 'hashedpassword123',
    };

    describe('create', () => {
        it('should create a user and wallet successfully', async () => {
            const user = await userService.create(validUserData);

            expect(user).toBeDefined();
            expect(user.id).toBeDefined();
            expect(user.email).toBe(validUserData.email);
            expect(user.first_name).toBe(validUserData.first_name);
            expect(user.last_name).toBe(validUserData.last_name);

            // Verify wallet was also created
            const db = getTestDb();
            const wallet = await db('wallets').where({ user_id: user.id }).first();
            expect(wallet).toBeDefined();
            expect(Number(wallet.balance)).toBe(0);
        });

        it('should throw ConflictError when email already exists', async () => {
            await userService.create(validUserData);

            await expect(userService.create(validUserData)).rejects.toThrow(ConflictError);
        });

        it('should create users with unique emails', async () => {
            const user1 = await userService.create(validUserData);
            const user2 = await userService.create({
                ...validUserData,
                email: 'jane@example.com',
            });

            expect(user1.id).not.toBe(user2.id);
            expect(user1.email).not.toBe(user2.email);
        });
    });

    describe('findByEmail', () => {
        it('should find a user by email', async () => {
            await userService.create(validUserData);
            const user = await userService.findByEmail(validUserData.email);

            expect(user).toBeDefined();
            expect(user.email).toBe(validUserData.email);
        });

        it('should throw NotFoundError for non-existent email', async () => {
            await expect(
                userService.findByEmail('nonexistent@example.com')
            ).rejects.toThrow(NotFoundError);
        });
    });

    describe('findById', () => {
        it('should find a user by ID', async () => {
            const created = await userService.create(validUserData);
            const user = await userService.findById(created.id!);

            expect(user).toBeDefined();
            expect(user.email).toBe(validUserData.email);
        });

        it('should throw NotFoundError for non-existent ID', async () => {
            await expect(userService.findById(99999)).rejects.toThrow(NotFoundError);
        });
    });
});
