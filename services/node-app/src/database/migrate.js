require('dotenv').config();
const migration = require('./migrations/20251103193635_dummy_training_marker');

async function runMigration() {
    try {
        console.log('Running migration...');
        await migration.up();
        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();