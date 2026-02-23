const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Ss123456789@localhost:5432/ridehail' });

async function run() {
    try {
        console.log("Adding system_settings table...");
        await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

        console.log("Inserting initial fuel settings...");
        await pool.query(`INSERT INTO system_settings (key, value) VALUES ('fuel_price_liter', '24000') ON CONFLICT (key) DO NOTHING`);
        await pool.query(`INSERT INTO system_settings (key, value) VALUES ('profit_multiplier', '3') ON CONFLICT (key) DO NOTHING`);

        console.log("Adding fuel_consumption to drivers...");
        // Check if column exists first to avoid error
        const colCheck = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='drivers' AND column_name='fuel_consumption_tanaka_km'");
        if (colCheck.rows.length === 0) {
            await pool.query("ALTER TABLE drivers ADD COLUMN fuel_consumption_tanaka_km FLOAT DEFAULT 250");
            console.log("Column fuel_consumption_tanaka_km added to drivers.");
        } else {
            console.log("Column fuel_consumption_tanaka_km already exists.");
        }

        console.log("Migration complete.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}
run();
