import request from 'supertest';
import { setupTestDb, cleanDb, teardownTestDb } from '../setup';

// Mock the database connection module BEFORE importing app
jest.mock('../../src/database/connection', () => {
    return {
        __esModule: true,
        default: null,
    };
});

// Mock the karma service to never block during integration tests
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

beforeAll(async () => {
    const db = await setupTestDb();
    const connectionModule = require('../../src/database/connection');
    connectionModule.default = db;
});

afterEach(async () => {
    await cleanDb();
});

afterAll(async () => {
    await teardownTestDb();
});

describe('Auth Controller', () => {
    const validUser = {
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe',
        password: 'securePassword123',
    };

    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send(validUser)
                .expect(201);

            expect(res.body.status).toBe('success');
            expect(res.body.message).toBe('User registered successfully');
            expect(res.body.data.user).toBeDefined();
            expect(res.body.data.user.email).toBe(validUser.email);
            expect(res.body.data.token).toBeDefined();
            expect(res.body.data.user.password).toBeUndefined();
        });

        it('should reject registration with missing email', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ ...validUser, email: undefined })
                .expect(400);

            expect(res.body.status).toBe('error');
        });

        it('should reject registration with invalid email', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ ...validUser, email: 'not-an-email' })
                .expect(400);

            expect(res.body.status).toBe('error');
        });

        it('should reject registration with missing password', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ ...validUser, password: undefined })
                .expect(400);

            expect(res.body.status).toBe('error');
        });

        it('should reject registration with short password', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ ...validUser, password: '123' })
                .expect(400);

            expect(res.body.status).toBe('error');
        });

        it('should reject duplicate email registration', async () => {
            await request(app).post('/api/auth/register').send(validUser);

            const res = await request(app)
                .post('/api/auth/register')
                .send(validUser)
                .expect(409);

            expect(res.body.status).toBe('error');
        });
    });

    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            await request(app).post('/api/auth/register').send(validUser);
        });

        it('should login successfully with correct credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: validUser.email, password: validUser.password })
                .expect(200);

            expect(res.body.status).toBe('success');
            expect(res.body.data.token).toBeDefined();
            expect(res.body.data.user.email).toBe(validUser.email);
        });

        it('should reject login with wrong password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: validUser.email, password: 'wrongpassword' })
                .expect(401);

            expect(res.body.status).toBe('error');
        });

        it('should reject login with non-existent email', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'nobody@example.com', password: 'password' })
                .expect(404);

            expect(res.body.status).toBe('error');
        });
    });
});
