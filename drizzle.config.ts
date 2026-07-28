import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Exclude the connect-pg-simple session store — it is managed by the
  // express-session middleware, not by Drizzle, and must never be dropped
  // or altered by migrations.
  tablesFilter: ["!session"],
});
