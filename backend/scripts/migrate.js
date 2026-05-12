const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const pool = require('../config/db');

const migrationsDir = path.join(__dirname, '..', 'migrations');

function checksum(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      checksum VARCHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations() {
  const result = await pool.query('SELECT filename, checksum FROM schema_migrations ORDER BY filename');
  return new Map(result.rows.map((row) => [row.filename, row.checksum]));
}

async function applyMigration(client, filename, content) {
  const fileChecksum = checksum(content);
  await client.query('BEGIN');
  try {
    await client.query(content);
    await client.query(
      'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
      [filename, fileChecksum]
    );
    await client.query('COMMIT');
    console.log('Applied migration:', filename);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function main() {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  const files = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const client = await pool.connect();
  try {
    for (const filename of files) {
      const fullPath = path.join(migrationsDir, filename);
      const content = fs.readFileSync(fullPath, 'utf8');
      const fileChecksum = checksum(content);
      const appliedChecksum = applied.get(filename);

      if (appliedChecksum) {
        if (appliedChecksum !== fileChecksum) {
          throw new Error(`Migration checksum mismatch for ${filename}. Create a new migration instead of editing an applied one.`);
        }
        continue;
      }

      await applyMigration(client, filename, content);
    }

    if (!files.length) {
      console.log('No migration files found.');
    } else {
      console.log('Migrations are up to date.');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(async (err) => {
  console.error('Migration failed:', err.message);
  try {
    await pool.end();
  } catch (_err) {
    // ignore shutdown errors in CLI script
  }
  process.exit(1);
});
