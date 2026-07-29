/**
 * Schema safety tests
 *
 * Guards against drizzle-kit push silently generating DROP TABLE statements
 * for tables that exist in the database but are not managed by Drizzle.
 *
 * Two layers:
 *
 *   1. Static  — reads drizzle.config.ts and verifies that tablesFilter
 *      contains an exclusion ("!tableName") for every known untracked table
 *      (currently: the connect-pg-simple `session` table).
 *
 *   2. Integration — connects to the live database, lists every table in the
 *      public schema, and asserts that every untracked table is covered by a
 *      "!tableName" negation filter.  A table that is (a) present in the
 *      database, (b) absent from the Drizzle schema, and (c) NOT excluded by
 *      tablesFilter would be a candidate for DROP TABLE on the next db:push.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { getTableName } from "drizzle-orm";
import * as schema from "../shared/schema";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the SQL table names registered in shared/schema.ts.
 * We identify Drizzle table objects by duck-typing: they carry a numeric "id"
 * property and expose a Symbol-keyed "[drizzle:IsDrizzleTable]" tag, but the
 * simplest reliable check is to call drizzle-orm's `getTableName()` — it
 * throws a TypeError for non-table values.
 */
function drizzleManagedTables(): Set<string> {
  const tables = new Set<string>();
  for (const value of Object.values(schema)) {
    try {
      const name = getTableName(value as Parameters<typeof getTableName>[0]);
      if (typeof name === "string" && name.length > 0) {
        tables.add(name);
      }
    } catch {
      // Not a table — skip
    }
  }
  return tables;
}

/**
 * Parse the tablesFilter array out of drizzle.config.ts source text.
 * Returns the raw filter strings, e.g. ["!session"].
 */
function readTablesFilter(): string[] {
  const configPath = resolve(__dirname, "../drizzle.config.ts");
  const src = readFileSync(configPath, "utf8");
  const match = src.match(/tablesFilter\s*:\s*\[([^\]]*)\]/s);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((s) => s.trim().replace(/^['"`]|['"`]$/g, ""))
    .filter(Boolean);
}

/**
 * Given the tablesFilter entries from drizzle.config.ts, return the set of
 * table names that are EXCLUDED (i.e. prefixed with "!").
 */
function excludedByFilter(filters: string[]): Set<string> {
  const excluded = new Set<string>();
  for (const f of filters) {
    if (f.startsWith("!")) excluded.add(f.slice(1));
  }
  return excluded;
}

// ---------------------------------------------------------------------------
// Static tests — no database connection required
// ---------------------------------------------------------------------------

describe("drizzle.config.ts — tablesFilter safety", () => {
  it("tablesFilter is defined in drizzle.config.ts", () => {
    const filters = readTablesFilter();
    expect(filters.length).toBeGreaterThan(0);
  });

  it('tablesFilter excludes the connect-pg-simple session table ("!session")', () => {
    const filters = readTablesFilter();
    expect(filters).toContain("!session");
  });

  it("drizzle schema exports at least one table", () => {
    const tables = drizzleManagedTables();
    expect(tables.size).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Integration tests — require DATABASE_URL
// ---------------------------------------------------------------------------

const DATABASE_URL =
  process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL ?? "";

describe.skipIf(!DATABASE_URL)(
  "Live database — no untracked tables would be DROPped by db:push",
  () => {
    it(
      "every table in the public schema is either managed by Drizzle or excluded by tablesFilter",
      { timeout: 30_000 },
      async () => {
        // Dynamic import so the test file can still be parsed without a DB URL.
        const { neon } = await import("@neondatabase/serverless");

        const sql = neon(DATABASE_URL);

        // List all user-created tables in the public schema.
        const rows = await sql`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `;

        const dbTables = new Set(rows.map((r) => r.table_name as string));
        const managed = drizzleManagedTables();
        const filters = readTablesFilter();
        const excluded = excludedByFilter(filters);

        // Tables that Drizzle does not manage and are NOT excluded by the filter
        // would be candidates for an implicit DROP TABLE on the next db:push.
        const unsafe = [...dbTables].filter(
          (t) => !managed.has(t) && !excluded.has(t)
        );

        if (unsafe.length > 0) {
          // Fail with an actionable message listing the offending tables.
          const tableList = unsafe.map((t) => `  - ${t}`).join("\n");
          throw new Error(
            `SAFETY CHECK FAILED: The following table(s) exist in the database ` +
              `but are not in the Drizzle schema and not excluded by tablesFilter ` +
              `in drizzle.config.ts.\n\nA 'drizzle-kit push' would propose ` +
              `DROP TABLE for each of them:\n\n${tableList}\n\n` +
              `Fix: add a "!<tableName>" entry to the tablesFilter array in ` +
              `drizzle.config.ts for every table Drizzle should not manage.`
          );
        }

        expect(unsafe).toHaveLength(0);
      }
    );

    it(
      "drizzle-kit push --explain exits cleanly and produces no DROP TABLE statements",
      { timeout: 60_000 },
      async () => {
        const { execSync } = await import("child_process");

        let output = "";
        let exitCode = 0;

        try {
          output = execSync("npx drizzle-kit push --explain 2>&1", {
            env: { ...process.env, DATABASE_URL },
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
          });
        } catch (err: unknown) {
          // execSync throws when the process exits non-zero.
          // Capture both the output and the exit status so we can report both.
          const child = err as {
            stdout?: string;
            stderr?: string;
            status?: number;
          };
          output = (child.stdout ?? "") + (child.stderr ?? "");
          exitCode = child.status ?? 1;
        }

        // 1. The explain run itself must succeed — a non-zero exit means
        //    drizzle-kit encountered an error (bad credentials, unsupported
        //    dialect, schema parse failure, etc.) and no DROP TABLE check can
        //    be trusted.
        if (exitCode !== 0) {
          throw new Error(
            `SAFETY CHECK FAILED: 'drizzle-kit push --explain' exited with ` +
              `code ${exitCode}. Fix the drizzle-kit error before relying on ` +
              `this check.\n\nOutput:\n${output}`
          );
        }

        // 2. No DROP TABLE anywhere in the planned SQL output.
        const dropTablePattern = /drop\s+table/i;
        if (dropTablePattern.test(output)) {
          throw new Error(
            `SAFETY CHECK FAILED: 'drizzle-kit push --explain' output contains ` +
              `a DROP TABLE statement. Review the output and add any untracked ` +
              `tables to tablesFilter in drizzle.config.ts.\n\nFull output:\n${output}`
          );
        }

        expect(exitCode).toBe(0);
        expect(dropTablePattern.test(output)).toBe(false);
      }
    );
  }
);
