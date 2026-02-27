import { setupTestDb, cleanDb, teardownTestDb, getTestDb } from '../setup';
import { WalletService } from '../../src/services/wallet.service';
import { NotFoundError, InsufficientFundsError, ValidationError } from '../../src/helpers/errors';

jest.mock('../../src/database/connection', () => {
    return {
        __esModule: true,
        default: null,
    };
});

let walletService: WalletService;

async function createTestUser(
    email = 'test@example.com',
    firstName = 'Test',
    lastName = 'User'
): Promise<number> {
    const db = getTestDb();
    const [userId] = await db('users').insert({
        email,
        first_name: firstName,
        last_name: lastName,
        password: 'hashedpassword',
    });
    await db('wallets').insert({
        user_id: userId,
        balance: 0,
    });
    return userId;
}

beforeAll(async () => {
    const db = await setupTestDb();
    const connectionModule = require('../../src/database/connection');
    connectionModule.default = db;
    walletService = new WalletService();
});

afterEach(async () => {
    await cleanDb();
});

afterAll(async () => {
    await teardownTestDb();
});

describe('WalletService', () => {
    describe('getBalance', () => {
        it('should return zero balance for new wallet', async () => {
            const userId = await createTestUser();
            const balance = await walletService.getBalance(userId);
            expect(balance).toBe(0);
        });

        it('should throw NotFoundError for non-existent user', async () => {
            await expect(walletService.getBalance(99999)).rejects.toThrow(NotFoundError);
        });
    });

    describe('fund', () => {
        it('should fund wallet successfully', async () => {
            const userId = await createTestUser();
            const transaction = await walletService.fund(userId, 5000);

            expect(transaction).toBeDefined();
            expect(transaction.type).toBe('funding');
            expect(Number(transaction.amount)).toBe(5000);
            expect(Number(transaction.balance_before)).toBe(0);
            expect(Number(transaction.balance_after)).toBe(5000);
            expect(transaction.reference).toBeDefined();

            // Verify wallet balance was updated
            const balance = await walletService.getBalance(userId);
            expect(balance).toBe(5000);
        });

        it('should accumulate funds across multiple deposits', async () => {
            const userId = await createTestUser();
            await walletService.fund(userId, 1000);
            await walletService.fund(userId, 2000);

            const balance = await walletService.getBalance(userId);
            expect(balance).toBe(3000);
        });

        it('should throw ValidationError for zero amount', async () => {
            const userId = await createTestUser();
            await expect(walletService.fund(userId, 0)).rejects.toThrow(ValidationError);
        });

        it('should throw ValidationError for negative amount', async () => {
            const userId = await createTestUser();
            await expect(walletService.fund(userId, -100)).rejects.toThrow(ValidationError);
        });

        it('should throw NotFoundError for non-existent wallet', async () => {
            await expect(walletService.fund(99999, 1000)).rejects.toThrow(NotFoundError);
        });
    });

    describe('transfer', () => {
        it('should transfer funds between users successfully', async () => {
            const senderId = await createTestUser('sender@example.com');
            const recipientId = await createTestUser('recipient@example.com');

            // Fund the sender first
            await walletService.fund(senderId, 5000);

            const result = await walletService.transfer(senderId, recipientId, 2000);

            expect(result.senderTransaction).toBeDefined();
            expect(result.recipientTransaction).toBeDefined();
            expect(Number(result.senderTransaction.amount)).toBe(-2000);
            expect(Number(result.recipientTransaction.amount)).toBe(2000);

            // Verify balances
            const senderBalance = await walletService.getBalance(senderId);
            const recipientBalance = await walletService.getBalance(recipientId);
            expect(senderBalance).toBe(3000);
            expect(recipientBalance).toBe(2000);
        });

        it('should throw InsufficientFundsError when sender has insufficient funds', async () => {
            const senderId = await createTestUser('sender@example.com');
            const recipientId = await createTestUser('recipient@example.com');

            await walletService.fund(senderId, 100);

            await expect(
                walletService.transfer(senderId, recipientId, 500)
            ).rejects.toThrow(InsufficientFundsError);

            // Verify no balance change occurred
            const senderBalance = await walletService.getBalance(senderId);
            expect(senderBalance).toBe(100);
        });

        it('should throw ValidationError when transferring to self', async () => {
            const userId = await createTestUser();
            await walletService.fund(userId, 5000);

            await expect(
                walletService.transfer(userId, userId, 1000)
            ).rejects.toThrow(ValidationError);
        });

        it('should throw ValidationError for zero amount', async () => {
            const senderId = await createTestUser('sender@example.com');
            const recipientId = await createTestUser('recipient@example.com');

            await expect(
                walletService.transfer(senderId, recipientId, 0)
            ).rejects.toThrow(ValidationError);
        });

        it('should throw ValidationError for negative amount', async () => {
            const senderId = await createTestUser('sender@example.com');
            const recipientId = await createTestUser('recipient@example.com');

            await expect(
                walletService.transfer(senderId, recipientId, -500)
            ).rejects.toThrow(ValidationError);
        });

        it('should throw NotFoundError when recipient does not exist', async () => {
            const senderId = await createTestUser('sender@example.com');
            await walletService.fund(senderId, 5000);

            await expect(
                walletService.transfer(senderId, 99999, 1000)
            ).rejects.toThrow(NotFoundError);
        });

        it('should record correct balance_before and balance_after', async () => {
            const senderId = await createTestUser('sender@example.com');
            const recipientId = await createTestUser('recipient@example.com');

            await walletService.fund(senderId, 10000);
            const result = await walletService.transfer(senderId, recipientId, 3000);

            expect(Number(result.senderTransaction.balance_before)).toBe(10000);
            expect(Number(result.senderTransaction.balance_after)).toBe(7000);
            expect(Number(result.recipientTransaction.balance_before)).toBe(0);
            expect(Number(result.recipientTransaction.balance_after)).toBe(3000);
        });
    });

    describe('withdraw', () => {
        it('should withdraw funds successfully', async () => {
            const userId = await createTestUser();
            await walletService.fund(userId, 5000);

            const transaction = await walletService.withdraw(userId, 2000);

            expect(transaction).toBeDefined();
            expect(transaction.type).toBe('withdrawal');
            expect(Number(transaction.amount)).toBe(-2000);
            expect(Number(transaction.balance_before)).toBe(5000);
            expect(Number(transaction.balance_after)).toBe(3000);

            const balance = await walletService.getBalance(userId);
            expect(balance).toBe(3000);
        });

        it('should throw InsufficientFundsError when balance is too low', async () => {
            const userId = await createTestUser();
            await walletService.fund(userId, 100);

            await expect(walletService.withdraw(userId, 500)).rejects.toThrow(
                InsufficientFundsError
            );

            // Verify no balance change occurred
            const balance = await walletService.getBalance(userId);
            expect(balance).toBe(100);
        });

        it('should throw ValidationError for zero amount', async () => {
            const userId = await createTestUser();
            await expect(walletService.withdraw(userId, 0)).rejects.toThrow(ValidationError);
        });

        it('should throw ValidationError for negative amount', async () => {
            const userId = await createTestUser();
            await expect(walletService.withdraw(userId, -100)).rejects.toThrow(ValidationError);
        });

        it('should withdraw entire balance', async () => {
            const userId = await createTestUser();
            await walletService.fund(userId, 5000);

            await walletService.withdraw(userId, 5000);

            const balance = await walletService.getBalance(userId);
            expect(balance).toBe(0);
        });
    });

    describe('getTransactions', () => {
        it('should return transaction history in descending order', async () => {
            const userId = await createTestUser();
            await walletService.fund(userId, 1000);
            await walletService.fund(userId, 2000);
            await walletService.withdraw(userId, 500);

            const transactions = await walletService.getTransactions(userId);

            expect(transactions).toHaveLength(3);
            // Most recent first
            expect(transactions[0].type).toBe('withdrawal');
            expect(transactions[1].type).toBe('funding');
            expect(transactions[2].type).toBe('funding');
        });

        it('should return empty array for wallet with no transactions', async () => {
            const userId = await createTestUser();
            const transactions = await walletService.getTransactions(userId);
            expect(transactions).toHaveLength(0);
        });
    });
});
