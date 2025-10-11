import dotenv from "dotenv";
import pkg from "pg";
dotenv.config();

const { Pool } = pkg;

const URL =
  process.env.DATABASE_URL ||
  process.env.USERS_DATABASE_URL || // usa tu var actual del compose/.env
  null;

export const pool = URL
  ? new Pool({ connectionString: URL, ssl: { rejectUnauthorized: false } })
  : new Pool({
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT ?? 5432),
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      ssl: { rejectUnauthorized: false }
    });
