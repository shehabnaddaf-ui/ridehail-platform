const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Ss123456789@localhost:5432/ridehail' });

async function run() {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log(res.rows);
    await pool.end();
    process.exit(0);
}
run();
