/**
 * Zod 3.25 schema validator tests
 *
 * Exercises .parse() and .safeParse() failure paths for the key insert schemas
 * so that any behavioral changes in zod's error formatting (introduced in
 * zod 3.25) are caught before they reach API consumers.
 *
 * Schemas under test:
 *   - insertUserSchema
 *   - insertMessageSchema
 *   - insertTokenTransactionSchema
 *
 * Note on ZodError detection: we use duck-typing (checking for `issues` array
 * and constructor name) rather than `instanceof ZodError` because drizzle-zod
 * may resolve a different copy of the zod package, causing cross-instance
 * instanceof checks to fail.
 */

import { describe, it, expect } from "vitest";
import { fromZodError, fromError, isValidationError } from "zod-validation-error";
import {
  insertUserSchema,
  insertMessageSchema,
  insertTokenTransactionSchema,
} from "../shared/schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true if the value looks like a ZodError (duck-typed). */
function isZodError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as { constructor?: { name?: string } }).constructor?.name === "ZodError" &&
    Array.isArray((e as { issues?: unknown }).issues)
  );
}

/** Issue shape returned by a ZodError. */
interface ZodIssue {
  code: string;
  path: (string | number)[];
  message: string;
}

interface ZodLikeError {
  issues: ZodIssue[];
  format(): Record<string, unknown>;
  flatten(): { fieldErrors: Record<string, string[]>; formErrors: string[] };
}

/** Cast a caught value to our ZodLikeError after confirming it looks right. */
function asZodError(e: unknown): ZodLikeError {
  expect(isZodError(e)).toBe(true);
  return e as ZodLikeError;
}

/** Assert that safeParse fails and return the error object for inspection. */
function expectFailure(
  result: { success: boolean; error?: unknown }
): ZodLikeError {
  expect(result.success).toBe(false);
  expect(result.error).toBeDefined();
  expect(isZodError(result.error)).toBe(true);
  return result.error as ZodLikeError;
}

/** Return the set of paths (as dot-joined strings) reported in a ZodError. */
function errorPaths(err: ZodLikeError): string[] {
  return err.issues.map((i) => i.path.join("."));
}

// ---------------------------------------------------------------------------
// insertUserSchema
// ---------------------------------------------------------------------------

describe("insertUserSchema — valid data", () => {
  it("accepts a complete valid payload", () => {
    const result = insertUserSchema.safeParse({
      username: "alice",
      password: "secret123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional numeric fields when supplied", () => {
    const result = insertUserSchema.safeParse({
      username: "bob",
      password: "hunter2",
      tokenBalance: 50,
      totalTokensEarned: 10,
      totalTokensSpent: 5,
    });
    expect(result.success).toBe(true);
  });
});

describe("insertUserSchema — .safeParse() failure paths", () => {
  it("fails when username is missing", () => {
    const err = expectFailure(
      insertUserSchema.safeParse({ password: "secret" })
    );
    expect(errorPaths(err)).toContain("username");
  });

  it("fails when password is missing", () => {
    const err = expectFailure(
      insertUserSchema.safeParse({ username: "alice" })
    );
    expect(errorPaths(err)).toContain("password");
  });

  it("fails when both required fields are missing", () => {
    const err = expectFailure(insertUserSchema.safeParse({}));
    const paths = errorPaths(err);
    expect(paths).toContain("username");
    expect(paths).toContain("password");
  });

  it("fails when username is not a string", () => {
    const err = expectFailure(
      insertUserSchema.safeParse({ username: 42, password: "x" })
    );
    expect(errorPaths(err)).toContain("username");
  });

  it("fails when tokenBalance is not a number", () => {
    const err = expectFailure(
      insertUserSchema.safeParse({
        username: "alice",
        password: "secret",
        tokenBalance: "lots",
      })
    );
    expect(errorPaths(err)).toContain("tokenBalance");
  });
});

describe("insertUserSchema — .parse() throws a ZodError on invalid input", () => {
  it("throws with issues array when all required fields are missing", () => {
    expect(() => insertUserSchema.parse({})).toThrow();

    try {
      insertUserSchema.parse({});
      expect.fail("should have thrown");
    } catch (e) {
      const ze = asZodError(e);
      expect(ze.issues.length).toBeGreaterThan(0);
      for (const issue of ze.issues) {
        expect(typeof issue.code).toBe("string");
        expect(Array.isArray(issue.path)).toBe(true);
        expect(typeof issue.message).toBe("string");
      }
    }
  });

  it("throws with an issue on the username path when username has wrong type", () => {
    try {
      insertUserSchema.parse({ username: 123, password: "ok" });
      expect.fail("should have thrown");
    } catch (e) {
      const ze = asZodError(e);
      const paths = ze.issues.map((i) => i.path.join("."));
      expect(paths).toContain("username");
    }
  });
});

// ---------------------------------------------------------------------------
// insertMessageSchema
// ---------------------------------------------------------------------------

describe("insertMessageSchema — valid data", () => {
  it("accepts a minimal valid payload", () => {
    const result = insertMessageSchema.safeParse({
      senderId: "user-1",
      recipientId: "user-2",
      encryptedContent: "encrypted-blob",
      messageHash: "sha256-abc123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all optional fields", () => {
    const result = insertMessageSchema.safeParse({
      senderId: "user-1",
      recipientId: "user-2",
      messageType: "location",
      encryptedContent: "blob",
      messageHash: "hash-xyz",
      transmissionMethod: "relay",
      tokenCost: 2,
      locationData: { lat: 51.5, lng: -0.1 },
      threadId: "thread-001",
      replyToId: 5,
    });
    expect(result.success).toBe(true);
  });
});

describe("insertMessageSchema — .safeParse() failure paths", () => {
  it("fails when senderId is missing", () => {
    const err = expectFailure(
      insertMessageSchema.safeParse({
        recipientId: "user-2",
        encryptedContent: "blob",
        messageHash: "hash",
      })
    );
    expect(errorPaths(err)).toContain("senderId");
  });

  it("fails when recipientId is missing", () => {
    const err = expectFailure(
      insertMessageSchema.safeParse({
        senderId: "user-1",
        encryptedContent: "blob",
        messageHash: "hash",
      })
    );
    expect(errorPaths(err)).toContain("recipientId");
  });

  it("fails when encryptedContent is missing", () => {
    const err = expectFailure(
      insertMessageSchema.safeParse({
        senderId: "user-1",
        recipientId: "user-2",
        messageHash: "hash",
      })
    );
    expect(errorPaths(err)).toContain("encryptedContent");
  });

  it("fails when messageHash is missing", () => {
    const err = expectFailure(
      insertMessageSchema.safeParse({
        senderId: "user-1",
        recipientId: "user-2",
        encryptedContent: "blob",
      })
    );
    expect(errorPaths(err)).toContain("messageHash");
  });

  it("fails when tokenCost is not a number", () => {
    const err = expectFailure(
      insertMessageSchema.safeParse({
        senderId: "user-1",
        recipientId: "user-2",
        encryptedContent: "blob",
        messageHash: "hash",
        tokenCost: "free",
      })
    );
    expect(errorPaths(err)).toContain("tokenCost");
  });
});

describe("insertMessageSchema — .parse() throws a ZodError on invalid input", () => {
  it("throws with well-formed issues when required fields are absent", () => {
    try {
      insertMessageSchema.parse({ senderId: "only-this" });
      expect.fail("should have thrown");
    } catch (e) {
      const ze = asZodError(e);
      expect(ze.issues.length).toBeGreaterThan(0);
      for (const issue of ze.issues) {
        expect(typeof issue.code).toBe("string");
        expect(Array.isArray(issue.path)).toBe(true);
        expect(typeof issue.message).toBe("string");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// insertTokenTransactionSchema
// ---------------------------------------------------------------------------

describe("insertTokenTransactionSchema — valid data", () => {
  it("accepts a minimal valid payload", () => {
    const result = insertTokenTransactionSchema.safeParse({
      sessionId: "sess-abc",
      transactionType: "earn",
      amount: 10,
      reason: "voted on pattern",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an earn transaction with optional fields", () => {
    const result = insertTokenTransactionSchema.safeParse({
      sessionId: "sess-abc",
      transactionType: "earn",
      amount: 5,
      reason: "uploaded photo",
      relatedContentType: "photo",
      relatedContentId: 42,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a spend transaction", () => {
    const result = insertTokenTransactionSchema.safeParse({
      sessionId: "sess-xyz",
      transactionType: "spend",
      amount: 3,
      reason: "sent message",
    });
    expect(result.success).toBe(true);
  });
});

describe("insertTokenTransactionSchema — .safeParse() failure paths", () => {
  it("fails when sessionId is missing", () => {
    const err = expectFailure(
      insertTokenTransactionSchema.safeParse({
        transactionType: "earn",
        amount: 10,
        reason: "test",
      })
    );
    expect(errorPaths(err)).toContain("sessionId");
  });

  it("fails when transactionType is missing", () => {
    const err = expectFailure(
      insertTokenTransactionSchema.safeParse({
        sessionId: "sess-abc",
        amount: 10,
        reason: "test",
      })
    );
    expect(errorPaths(err)).toContain("transactionType");
  });

  it("fails when amount is missing", () => {
    const err = expectFailure(
      insertTokenTransactionSchema.safeParse({
        sessionId: "sess-abc",
        transactionType: "earn",
        reason: "test",
      })
    );
    expect(errorPaths(err)).toContain("amount");
  });

  it("fails when reason is missing", () => {
    const err = expectFailure(
      insertTokenTransactionSchema.safeParse({
        sessionId: "sess-abc",
        transactionType: "earn",
        amount: 5,
      })
    );
    expect(errorPaths(err)).toContain("reason");
  });

  it("fails when amount is not a number", () => {
    const err = expectFailure(
      insertTokenTransactionSchema.safeParse({
        sessionId: "sess-abc",
        transactionType: "earn",
        amount: "ten",
        reason: "test",
      })
    );
    expect(errorPaths(err)).toContain("amount");
  });

  it("fails when all required fields are missing", () => {
    const err = expectFailure(insertTokenTransactionSchema.safeParse({}));
    const paths = errorPaths(err);
    expect(paths).toContain("sessionId");
    expect(paths).toContain("transactionType");
    expect(paths).toContain("amount");
    expect(paths).toContain("reason");
  });
});

describe("insertTokenTransactionSchema — .parse() throws a ZodError on invalid input", () => {
  it("throws with well-formed issues when required fields are absent", () => {
    try {
      insertTokenTransactionSchema.parse({ amount: "not-a-number" });
      expect.fail("should have thrown");
    } catch (e) {
      const ze = asZodError(e);
      expect(ze.issues.length).toBeGreaterThan(0);
      for (const issue of ze.issues) {
        expect(typeof issue.code).toBe("string");
        expect(Array.isArray(issue.path)).toBe(true);
        expect(typeof issue.message).toBe("string");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// ZodError shape contract (zod 3.25 regression guard)
// ---------------------------------------------------------------------------

describe("ZodError shape — zod 3.25 regression guard", () => {
  it("error object exposes a flat `issues` array (not nested `errors`)", () => {
    const result = insertUserSchema.safeParse({});
    expect(result.success).toBe(false);
    const ze = expectFailure(result);
    expect(Array.isArray(ze.issues)).toBe(true);
    expect(ze.issues.length).toBeGreaterThan(0);
  });

  it("each issue has code, path, and message properties", () => {
    const result = insertUserSchema.safeParse({ username: 99, password: null });
    const ze = expectFailure(result);
    for (const issue of ze.issues) {
      expect(issue).toHaveProperty("code");
      expect(issue).toHaveProperty("path");
      expect(issue).toHaveProperty("message");
      expect(typeof issue.code).toBe("string");
      expect(Array.isArray(issue.path)).toBe(true);
      expect(typeof issue.message).toBe("string");
    }
  });

  it("error.format() returns a nested object with a `_errors` key", () => {
    const result = insertUserSchema.safeParse({});
    const ze = expectFailure(result);
    const formatted = ze.format();
    expect(typeof formatted).toBe("object");
    expect(formatted).not.toBeNull();
    expect("_errors" in formatted).toBe(true);
  });

  it("error.flatten() returns fieldErrors and formErrors", () => {
    const result = insertUserSchema.safeParse({});
    const ze = expectFailure(result);
    const flat = ze.flatten();
    expect(typeof flat).toBe("object");
    expect(flat).toHaveProperty("fieldErrors");
    expect(flat).toHaveProperty("formErrors");
    expect(typeof flat.fieldErrors).toBe("object");
    expect(Array.isArray(flat.formErrors)).toBe(true);
  });

  it("error.flatten() fieldErrors contains the missing field names", () => {
    const result = insertUserSchema.safeParse({});
    const ze = expectFailure(result);
    const flat = ze.flatten();
    expect(Object.keys(flat.fieldErrors)).toContain("username");
    expect(Object.keys(flat.fieldErrors)).toContain("password");
  });

  it("error.format() includes per-field _errors for missing required fields", () => {
    const result = insertTokenTransactionSchema.safeParse({});
    const ze = expectFailure(result);
    const formatted = ze.format() as Record<string, { _errors: string[] }>;
    expect(Array.isArray(formatted.sessionId?._errors)).toBe(true);
    expect(formatted.sessionId._errors.length).toBeGreaterThan(0);
    expect(Array.isArray(formatted.amount?._errors)).toBe(true);
    expect(formatted.amount._errors.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// zod-validation-error adapter (zod 3.25 readability guard)
// ---------------------------------------------------------------------------

describe("zod-validation-error — fromZodError() produces readable messages", () => {
  it("returns a non-empty message string for a missing-username error", () => {
    try {
      insertUserSchema.parse({ password: "secret" });
      expect.fail("should have thrown");
    } catch (e) {
      const validationError = fromZodError(e as Parameters<typeof fromZodError>[0]);
      expect(typeof validationError.message).toBe("string");
      expect(validationError.message.length).toBeGreaterThan(0);
      expect(validationError.message.toLowerCase()).toContain("username");
    }
  });

  it("returns a non-empty message string for a missing-password error", () => {
    try {
      insertUserSchema.parse({ username: "alice" });
      expect.fail("should have thrown");
    } catch (e) {
      const validationError = fromZodError(e as Parameters<typeof fromZodError>[0]);
      expect(typeof validationError.message).toBe("string");
      expect(validationError.message.length).toBeGreaterThan(0);
      expect(validationError.message.toLowerCase()).toContain("password");
    }
  });

  it("message mentions all missing fields when both username and password are absent", () => {
    try {
      insertUserSchema.parse({});
      expect.fail("should have thrown");
    } catch (e) {
      const validationError = fromZodError(e as Parameters<typeof fromZodError>[0]);
      expect(validationError.message.length).toBeGreaterThan(0);
      expect(validationError.message.toLowerCase()).toContain("username");
      expect(validationError.message.toLowerCase()).toContain("password");
    }
  });

  it("message mentions senderId when senderId is missing from insertMessageSchema", () => {
    try {
      insertMessageSchema.parse({
        recipientId: "user-2",
        encryptedContent: "blob",
        messageHash: "hash",
      });
      expect.fail("should have thrown");
    } catch (e) {
      const validationError = fromZodError(e as Parameters<typeof fromZodError>[0]);
      expect(validationError.message.length).toBeGreaterThan(0);
      expect(validationError.message.toLowerCase()).toContain("senderid");
    }
  });

  it("message mentions amount when amount is missing from insertTokenTransactionSchema", () => {
    try {
      insertTokenTransactionSchema.parse({
        sessionId: "sess-abc",
        transactionType: "earn",
        reason: "test",
      });
      expect.fail("should have thrown");
    } catch (e) {
      const validationError = fromZodError(e as Parameters<typeof fromZodError>[0]);
      expect(validationError.message.length).toBeGreaterThan(0);
      expect(validationError.message.toLowerCase()).toContain("amount");
    }
  });
});

describe("zod-validation-error — fromError() produces readable messages", () => {
  // fromError() is designed for catch-block usage where the thrown value is `unknown`.
  // We use .parse() throws here because that mirrors the real call-site pattern.

  it("returns a non-empty message string from a thrown ZodError via fromError()", () => {
    try {
      insertUserSchema.parse({ password: "secret" });
      expect.fail("should have thrown");
    } catch (e) {
      const validationError = fromError(e);
      expect(typeof validationError.message).toBe("string");
      expect(validationError.message.length).toBeGreaterThan(0);
      expect(validationError.message.toLowerCase()).toContain("username");
    }
  });

  it("fromError() message mentions the offending field for insertMessageSchema", () => {
    try {
      insertMessageSchema.parse({
        senderId: "user-1",
        recipientId: "user-2",
        encryptedContent: "blob",
        // messageHash intentionally omitted
      });
      expect.fail("should have thrown");
    } catch (e) {
      const validationError = fromError(e);
      expect(validationError.message.length).toBeGreaterThan(0);
      expect(validationError.message.toLowerCase()).toContain("messagehash");
    }
  });

  it("fromError() message mentions missing fields for insertTokenTransactionSchema", () => {
    try {
      insertTokenTransactionSchema.parse({ amount: "not-a-number" });
      expect.fail("should have thrown");
    } catch (e) {
      const validationError = fromError(e);
      expect(validationError.message.length).toBeGreaterThan(0);
      // sessionId and reason are missing; amount has wrong type
      expect(validationError.message.toLowerCase()).toMatch(
        /sessionid|amount|reason/
      );
    }
  });

  it("fromError() result satisfies isValidationError check", () => {
    try {
      insertUserSchema.parse({});
      expect.fail("should have thrown");
    } catch (e) {
      const validationError = fromError(e);
      expect(isValidationError(validationError)).toBe(true);
    }
  });
});
