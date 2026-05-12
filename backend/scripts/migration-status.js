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

async function main() {
  await ensureMigrationsTable();
  const result = await pool.query('SELECT filename, checksum, applied_at FROM schema_migrations ORDER BY filename');
  const applied = new Map(result.rows.map((row) => [row.filename, row]));
  const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();

  const rows = files.map((filename) => {
    const content = fs.readFileSync(path.join(migrationsDir, filename), 'utf8');
    const fileChecksum = checksum(content);
    const row = applied.get(filename);
    return {
      filename,
      applied: Boolean(row),
      checksumMatch: row ? row.checksum === fileChecksum : null,
      appliedAt: row ? row.applied_at.toISOString() : '-',
    };
  });

  console.table(rows);
  await pool.end();
}

main().catch(async (err) => {
  console.error('Migration status failed:', err.message);
  try {
    await pool.end();
  } catch (_err) {
    // ignore shutdown errors in CLI script
  }
  process.exit(1);
});
