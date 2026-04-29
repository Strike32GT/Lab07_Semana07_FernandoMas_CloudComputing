const { Pool } = require("pg");

const useSsl = String(process.env.DB_SSL || "false").toLowerCase() === "true";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "appdb",
  user: process.env.DB_USER || "appuser",
  password: process.env.DB_PASSWORD || "apppassword",
  ssl: useSsl
    ? {
        rejectUnauthorized: false,
      }
    : false,
});

module.exports = pool;
