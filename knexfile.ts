import dotenv from 'dotenv';
import type { Knex } from 'knex';
import path from 'path';

dotenv.config();

// Detect if running via ts-node (source) or compiled JS (production)
const isCompiledJS = __filename.endsWith('.js');

const migrations: Knex.MigratorConfig = {
    // In compiled production: __dirname is dist/, so migrations are in dist/src/database/migrations (as .js)
    // In ts-node local: __dirname is project root, migrations are in src/database/migrations (as .ts)
    directory: isCompiledJS
        ? path.join(__dirname, 'src', 'database', 'migrations')
        : path.join(__dirname, 'src', 'database', 'migrations'),
    extension: isCompiledJS ? 'js' : 'ts',
};

const seeds: Knex.SeederConfig = {
    directory: path.join(__dirname, 'src', 'database', 'seeds'),
    extension: isCompiledJS ? 'js' : 'ts',
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
