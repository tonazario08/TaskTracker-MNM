const fs = require('node:fs');
const path = require('node:path');
const pool = require('../config/db');
const { ensureSessionTable } = require('../lib/sessionStore');

const seedPath = path.join(__dirname, '..', 'seeds', 'dev_seed.sql');

async function main() {
  const sql = fs.readFileSync(seedPath, 'utf8');
  await pool.query('SELECT 1');
  await ensureSessionTable();
  await pool.query(sql);
  console.log('Development seed applied successfully.');
  console.log('Default seeded password: Admin@123');
  await pool.end();
}

main().catch(async (err) => {
  console.error('Seed failed:', err.message);
  try {
    await pool.end();
  } catch (_err) {
    // ignore shutdown errors in CLI script
  }
  process.exit(1);
});
