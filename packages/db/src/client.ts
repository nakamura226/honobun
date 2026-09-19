import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema.js";

/**
 * DATABASE_URL examples:
 * - Local dev / Cloud SQL Auth Proxy (TCP):
 *     postgresql://user:password@localhost:5432/honobun
 * - Cloud Run + Cloud SQL Unix socket (Auth Proxy sidecar or built-in connector):
 *     postgresql://user:password@/honobun?host=/cloudsql/PROJECT:REGION:INSTANCE
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });
