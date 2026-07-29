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
  // Exclude tables that exist in the database but are not managed by Drizzle:
  //   - session: managed by connect-pg-simple (express-session middleware)
  //   - activities: orphaned legacy table (renamed to "activity" in schema);
  //     retained in the DB for historical record but not touched by migrations.
  tablesFilter: ["!session", "!activities"],
});
