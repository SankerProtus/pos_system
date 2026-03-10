import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

let pool;

export const connectToDatabase = async () => {
  if (pool) {
    return pool;
  }

  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });

  pool.query("SELECT 1", (err) => {
    if (err) {
      console.error("Error connecting to the database:", err.message || err);
    } else {
      console.log("Connected to the database successfully!");
    }
  });

  pool.on("error", (err) => {
    console.error("Unexpected error on idle client:", err.message || err);
    process.exit(-1);
  });

  return pool;
};
