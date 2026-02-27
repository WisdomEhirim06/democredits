import knex, { Knex } from 'knex';
import config from '../knexfile';

let db: Knex;

/**
 * Create and return a fresh test database connection.
 * Runs all migrations so tables are ready.
 */
export async function setupTestDb(): Promise<Knex> {
    db = knex(config.test);
    await db.migrate.latest();
    return db;
}

/**
 * Clean all tables (in order respecting FK constraints).
 */
export async function cleanDb(): Promise<void> {
    if (!db) return;
    await db('transactions').del();
    await db('wallets').del();
    await db('users').del();
}

/**
 * Destroy the test database connection.
 */
export async function teardownTestDb(): Promise<void> {
    if (db) {
        await db.destroy();
    }
}

export function getTestDb(): Knex {
    return db;
}
