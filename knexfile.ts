import dotenv from 'dotenv';
import type { Knex } from 'knex';
import path from 'path';

dotenv.config();

const migrations: Knex.MigratorConfig = {
    directory: path.join(__dirname, 'src', 'database', 'migrations'),
    extension: 'ts',
};

const seeds: Knex.SeederConfig = {
    directory: path.join(__dirname, 'src', 'database', 'seeds'),
    extension: 'ts',
};

const config: Record<string, Knex.Config> = {
    // Local development using SQLite — no MySQL needed
    local: {
        client: 'better-sqlite3',
        connection: {
            filename: path.join(__dirname, 'democredit_local.sqlite3'),
        },
        useNullAsDefault: true,
        migrations,
        seeds,
    },

    development: {
        client: 'mysql2',
        connection: {
            host: process.env.DB_HOST || 'localhost',
            port: Number(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'democredit',
        },
        migrations,
        seeds,
        pool: { min: 2, max: 10 },
    },

    test: {
        client: 'better-sqlite3',
        connection: {
            filename: ':memory:',
        },
        useNullAsDefault: true,
        migrations: {
            directory: path.join(__dirname, 'src', 'database', 'migrations'),
            extension: 'ts',
        },
        seeds: {
            directory: path.join(__dirname, 'src', 'database', 'seeds'),
            extension: 'ts',
        },
    },

    production: {
        client: 'mysql2',
        connection: {
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        },
        migrations,
        seeds,
        pool: { min: 2, max: 10 },
    },
};

export default config;
