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
 *      public schema AND in any non-public schema referenced by a
 *      schema-qualified exclusion pattern in tablesFilter (e.g. "!auth.*"),
 *      and asserts that every untracked table is covered by a negation filter.
 *      A table that is (a) present in the database, (b) absent from the
 *      Drizzle schema, and (c) NOT excluded by tablesFilter would be a
 *      candidate for DROP TABLE on the next db:push.
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
 * Returns the raw filter strings, e.g. ["!session", "!auth.*"].
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
 * Returns true when `name` matches `pattern`.
 * Supports a single wildcard character `*` that matches any sequence of
 * characters (zero or more), as used by drizzle-kit tablesFilter globs.
 * Schema-qualified patterns (e.g. "auth.*") are matched against
 * schema-qualified names (e.g. "auth.users").
 */
function matchesGlob(pattern: string, name: string): boolean {
  // Escape all regex metacharacters except '*', then replace '*' with '.*'
  const regexSrc = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${regexSrc}$`).test(name);
}

/**
 * Given the tablesFilter entries from drizzle.config.ts, return a predicate
 * that is true for any table name EXCLUDED by a "!" negation filter.
 *
 * The predicate accepts either:
 *   - a plain table name (e.g. "session") for tables in the public schema, or
 *   - a schema-qualified name (e.g. "auth.users") for tables in other schemas.
 *
 * Supports exact names (e.g. "!session"), plain glob patterns
 * (e.g. "!_*", "!pg_*"), and schema-qualified glob patterns
 * (e.g. "!auth.*", "!extensions.*").
 */
function excludedByFilter(filters: string[]): (tableName: string) => boolean {
  const patterns = filters
    .filter((f) => f.startsWith("!"))
    .map((f) => f.slice(1));
  return (tableName: string) =>
    patterns.some((p) => matchesGlob(p, tableName));
}

/**
 * Extract the unique non-public schema names referenced by schema-qualified
 * exclusion patterns in tablesFilter.
 *
 * For example, given ["!session", "!auth.*", "!extensions.*"] this returns
 * Set { "auth", "extensions" }.  These are schemas whose tables the test
 * should also inspect in the integration suite.
 */
function nonPublicSchemasFromFilter(filters: string[]): Set<string> {
  const schemas = new Set<string>();
  for (const f of filters) {
    if (!f.startsWith("!")) continue;
    const pattern = f.slice(1); // strip leading "!"
    const dotIdx = pattern.indexOf(".");
    if (dotIdx !== -1) {
      const schemaName = pattern.slice(0, dotIdx);
      // Skip wildcards in the schema position (e.g. "!*.*") — not actionable.
      if (schemaName && schemaName !== "public" && !schemaName.includes("*")) {
        schemas.add(schemaName);
      }
    }
  }
  return schemas;
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

  it("excludedByFilter matches exact names", () => {
    const isExcluded = excludedByFilter(["!session", "public"]);
    expect(isExcluded("session")).toBe(true);
    expect(isExcluded("users")).toBe(false);
  });

  it("excludedByFilter matches glob wildcard patterns (e.g. !_*, !pg_*)", () => {
    const isExcluded = excludedByFilter(["!session", "!_*", "!pg_*"]);
    // exact match still works
    expect(isExcluded("session")).toBe(true);
    // underscore-prefix glob
    expect(isExcluded("_drizzle_migrations")).toBe(true);
    expect(isExcluded("_anything")).toBe(true);
    // pg_ prefix glob
    expect(isExcluded("pg_stat_user_tables")).toBe(true);
    // unmatched names are NOT excluded
    expect(isExcluded("users")).toBe(false);
    expect(isExcluded("locations")).toBe(false);
  });

  it("excludedByFilter matches schema-qualified glob patterns (e.g. !auth.*, !extensions.*)", () => {
    const isExcluded = excludedByFilter(["!session", "!auth.*", "!extensions.*"]);
    // plain name still works
    expect(isExcluded("session")).toBe(true);
    // schema-qualified names covered by schema glob
    expect(isExcluded("auth.users")).toBe(true);
    expect(isExcluded("auth.refresh_tokens")).toBe(true);
    expect(isExcluded("extensions.pg_stat_statements")).toBe(true);
    // plain name NOT matched by a schema-qualified pattern
    expect(isExcluded("users")).toBe(false);
    // wrong schema NOT matched
    expect(isExcluded("public.users")).toBe(false);
  });

  it("nonPublicSchemasFromFilter extracts schema names from schema-qualified exclusion patterns", () => {
    const schemas = nonPublicSchemasFromFilter([
      "!session",
      "!auth.*",
      "!extensions.*",
      "public",
    ]);
    expect(schemas).toEqual(new Set(["auth", "extensions"]));
  });

  it("nonPublicSchemasFromFilter ignores plain patterns and the public schema", () => {
    const schemas = nonPublicSchemasFromFilter([
      "!session",
      "!_*",
      "!public.*",
    ]);
    // "public" schema is intentionally excluded from the set — it is handled
    // by the main public-schema integration query.
    expect(schemas.has("public")).toBe(false);
    // plain patterns with no dot contribute nothing
    expect(schemas.size).toBe(0);
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
          (t) => !managed.has(t) && !excluded(t)
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
      "every table in non-public schemas referenced by tablesFilter is excluded by a schema-qualified pattern",
      { timeout: 30_000 },
      async () => {
        const filters = readTablesFilter();
        const extraSchemas = nonPublicSchemasFromFilter(filters);

        // Nothing to check if no schema-qualified exclusion patterns exist.
        if (extraSchemas.size === 0) return;

        const { neon } = await import("@neondatabase/serverless");
        const sql = neon(DATABASE_URL);

        const schemaList = [...extraSchemas];

        // Query all base tables in the referenced non-public schemas.
        const rows = await sql`
          SELECT table_schema, table_name
          FROM information_schema.tables
          WHERE table_schema = ANY(${schemaList})
            AND table_type = 'BASE TABLE'
          ORDER BY table_schema, table_name
        `;

        const excluded = excludedByFilter(filters);

        // For non-public schemas every table must be covered by a
        // schema-qualified exclusion pattern such as "!auth.*".
        // We check using the qualified name "schema.tableName".
        const unsafe = rows
          .map((r) => `${r.table_schema as string}.${r.table_name as string}`)
          .filter((qualifiedName) => !excluded(qualifiedName));

        if (unsafe.length > 0) {
          const tableList = unsafe.map((t) => `  - ${t}`).join("\n");
          throw new Error(
            `SAFETY CHECK FAILED: The following table(s) exist in a non-public ` +
              `schema that is referenced in tablesFilter but are not covered by ` +
              `a schema-qualified exclusion pattern (e.g. "!auth.*").\n\n` +
              `A 'drizzle-kit push' could propose DROP TABLE for each of them:\n\n` +
              `${tableList}\n\n` +
              `Fix: ensure drizzle.config.ts tablesFilter includes a pattern ` +
              `like "!<schema>.*" that covers every table in that schema.`
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
