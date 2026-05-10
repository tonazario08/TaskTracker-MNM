const app = require('./app');
const pool = require('./config/db');

const PORT = process.env.PORT || 8080;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await pool.query('SELECT 1');
    console.log('Ket noi PostgreSQL thanh cong');
  } catch (err) {
    console.error('Khong the ket noi PostgreSQL:', err.message);
    console.error('Hay kiem tra file .env va dam bao PostgreSQL dang chay');
  }
});
