import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const { Client } = pg;

async function applyFix() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("DATABASE_URL not found in .env");
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false } // Supabase requires SSL, but sometimes self-signed in dev? Usually standard for remote
    });

    try {
        await client.connect();
        console.log("Connected to database.");

        const sqlPath = path.resolve('supabase/migrations/20240205_fix_rls_all.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Applying RLS fix SQL...");
        await client.query(sql);
        console.log("RLS fix applied successfully!");

    } catch (err) {
        console.error("Error applying fix:", err);
    } finally {
        await client.end();
    }
}

applyFix();
