const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const pool = require('../db');

async function run() {
  const { rows } = await pool.query('SELECT * FROM books');
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}
run();
