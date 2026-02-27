import request from 'supertest';
import { setupTestDb, cleanDb, teardownTestDb } from '../setup';

jest.mock('../../src/database/connection', () => {
    return {
        __esModule: true,
        default: null,
    };
});

jest.mock('../../src/services/karma.service', () => {
    return {
        __esModule: true,
        KarmaService: jest.fn().mockImplementation(() => ({
            isBlacklisted: jest.fn().mockResolvedValue(false),
        })),
        default: {
            isBlacklisted: jest.fn().mockResolvedValue(false),
        },
    };
});

import app from '../../src/app';

let authToken: string;
let secondUserToken: string;

const primaryUser = {
    email: 'alice@example.com',
    first_name: 'Alice',
    last_name: 'Smith',
    password: 'password123',
};

const secondUser = {
    email: 'bob@example.com',
    first_name: 'Bob',
    last_name: 'Jones',
    password: 'password123',
};

beforeAll(async () => {
    const db = await setupTestDb();
    const connectionModule = require('../../src/database/connection');
    connectionModule.default = db;
});

beforeEach(async () => {
    await cleanDb();

    // Register primary user and get token
    const res1 = await request(app).post('/api/auth/register').send(primaryUser);
    authToken = res1.body.data.token;

    // Register second user and get token
    const res2 = await request(app).post('/api/auth/register').send(secondUser);
    secondUserToken = res2.body.data.token;
});

afterAll(async () => {
    await teardownTestDb();
});

describe('Wallet Controller', () => {
    describe('POST /api/wallet/fund', () => {
        it('should fund wallet successfully', async () => {
            const res = await request(app)
                .post('/api/wallet/fund')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ amount: 5000 })
                .expect(201);

            expect(res.body.status).toBe('success');
            expect(res.body.message).toBe('Wallet funded successfully');
            expect(res.body.data.transaction).toBeDefined();
        });

        it('should reject funding without authentication', async () => {
            await request(app)
                .post('/api/wallet/fund')
                .send({ amount: 5000 })
                .expect(401);
        });

        it('should reject funding with invalid amount', async () => {
            const res = await request(app)
                .post('/api/wallet/fund')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ amount: 0 })
                .expect(400);

            expect(res.body.status).toBe('error');
        });

        it('should reject funding with missing amount', async () => {
            const res = await request(app)
                .post('/api/wallet/fund')
                .set('Authorization', `Bearer ${authToken}`)
                .send({})
                .expect(400);

            expect(res.body.status).toBe('error');
        });
    });

    describe('POST /api/wallet/transfer', () => {
        beforeEach(async () => {
            // Fund the primary user's wallet
            await request(app)
                .post('/api/wallet/fund')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ amount: 10000 });
        });

        it('should transfer funds successfully', async () => {
            const res = await request(app)
                .post('/api/wallet/transfer')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ recipient_email: secondUser.email, amount: 3000 })
                .expect(201);

            expect(res.body.status).toBe('success');
            expect(res.body.message).toBe('Transfer successful');
        });

        it('should reject transfer with insufficient funds', async () => {
            const res = await request(app)
                .post('/api/wallet/transfer')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ recipient_email: secondUser.email, amount: 50000 })
                .expect(400);

            expect(res.body.status).toBe('error');
        });

        it('should reject transfer to non-existent recipient', async () => {
            const res = await request(app)
                .post('/api/wallet/transfer')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ recipient_email: 'nobody@example.com', amount: 1000 })
                .expect(404);

            expect(res.body.status).toBe('error');
        });

        it('should reject transfer without authentication', async () => {
            await request(app)
                .post('/api/wallet/transfer')
                .send({ recipient_email: secondUser.email, amount: 1000 })
                .expect(401);
        });

        it('should reject transfer with missing recipient email', async () => {
            const res = await request(app)
                .post('/api/wallet/transfer')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ amount: 1000 })
                .expect(400);

            expect(res.body.status).toBe('error');
        });

        it('should update both balances after transfer', async () => {
            await request(app)
                .post('/api/wallet/transfer')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ recipient_email: secondUser.email, amount: 3000 });

            // Check sender balance
            const senderRes = await request(app)
                .get('/api/wallet/balance')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(senderRes.body.data.balance).toBe(7000);

            // Check recipient balance
            const recipientRes = await request(app)
                .get('/api/wallet/balance')
                .set('Authorization', `Bearer ${secondUserToken}`)
                .expect(200);
            expect(recipientRes.body.data.balance).toBe(3000);
        });
    });

    describe('POST /api/wallet/withdraw', () => {
        beforeEach(async () => {
            await request(app)
                .post('/api/wallet/fund')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ amount: 5000 });
        });

        it('should withdraw funds successfully', async () => {
            const res = await request(app)
                .post('/api/wallet/withdraw')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ amount: 2000 })
                .expect(201);

            expect(res.body.status).toBe('success');
            expect(res.body.message).toBe('Withdrawal successful');
        });

        it('should reject withdrawal with insufficient funds', async () => {
            const res = await request(app)
                .post('/api/wallet/withdraw')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ amount: 10000 })
                .expect(400);

            expect(res.body.status).toBe('error');
        });

        it('should reject withdrawal without authentication', async () => {
            await request(app)
                .post('/api/wallet/withdraw')
                .send({ amount: 1000 })
                .expect(401);
        });
    });

    describe('GET /api/wallet/balance', () => {
        it('should return wallet balance', async () => {
            const res = await request(app)
                .get('/api/wallet/balance')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(res.body.status).toBe('success');
            expect(res.body.data.balance).toBeDefined();
            expect(res.body.data.balance).toBe(0);
        });

        it('should reject without authentication', async () => {
            await request(app)
                .get('/api/wallet/balance')
                .expect(401);
        });
    });

    describe('GET /api/wallet/transactions', () => {
        it('should return transaction history', async () => {
            // Fund, then withdraw to have some transactions
            await request(app)
                .post('/api/wallet/fund')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ amount: 5000 });

            await request(app)
                .post('/api/wallet/withdraw')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ amount: 1000 });

            const res = await request(app)
                .get('/api/wallet/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(res.body.status).toBe('success');
            expect(res.body.data.transactions).toHaveLength(2);
        });

        it('should return empty array when no transactions', async () => {
            const res = await request(app)
                .get('/api/wallet/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(res.body.data.transactions).toHaveLength(0);
        });

        it('should reject without authentication', async () => {
            await request(app)
                .get('/api/wallet/transactions')
                .expect(401);
        });
    });
});
