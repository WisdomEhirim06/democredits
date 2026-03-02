import app from './app';
import db from './database/connection';

const PORT = process.env.PORT || 3000;
const env = process.env.NODE_ENV || 'development';

async function start(): Promise<void> {
    // Auto-run migrations for local SQLite so no separate migrate step is needed
    if (env === 'local' || env === 'test') {
        console.log(`[DB] Running migrations for "${env}" environment...`);
        await db.migrate.latest();
        console.log('[DB] Migrations up to date ✓');
    }

    app.listen(PORT, () => {
        console.log(`🚀 Demo Credit API server running on port ${PORT}`);
        console.log(`📍 Environment: ${env}`);
        console.log(`📦 Database: ${env === 'local' ? 'SQLite (local file)' : 'MySQL'}`);
    });
}

start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
