/**
 * Auto-migrate the database on startup (for local/test SQLite environments).
 * For production MySQL, migrations should be run manually via npm run migrate.
 */
import db from './connection';

async function autoMigrate(): Promise<void> {
    const env = process.env.NODE_ENV || 'development';
    if (env === 'local' || env === 'test') {
        try {
            console.log(`[AutoMigrate] Running migrations for "${env}" environment...`);
            await db.migrate.latest();
            console.log('[AutoMigrate] Migrations up to date.');
        } catch (err) {
            console.error('[AutoMigrate] Migration failed:', err);
            process.exit(1);
        }
    }
}

autoMigrate();
