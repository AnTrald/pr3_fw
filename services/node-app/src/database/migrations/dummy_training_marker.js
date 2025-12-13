const { Pool } = require('pg');

async function up() {
    const pool = new Pool({
        host: process.env.DB_HOST || 'db',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_DATABASE || 'monolith',
        user: process.env.DB_USERNAME || 'monouser',
        password: process.env.DB_PASSWORD || 'monopass'
    });

    await pool.query(`
        CREATE TABLE IF NOT EXISTS dummy_training_marker (
            id SERIAL PRIMARY KEY,
            note VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.end();
}

async function down() {
    const pool = new Pool({
        host: process.env.DB_HOST || 'db',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_DATABASE || 'monolith',
        user: process.env.DB_USERNAME || 'monouser',
        password: process.env.DB_PASSWORD || 'monopass'
    });

    await pool.query('DROP TABLE IF EXISTS dummy_training_marker');

    await pool.end();
}

module.exports = { up, down };