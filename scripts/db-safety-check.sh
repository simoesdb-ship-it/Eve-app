#!/usr/bin/env bash
# db-safety-check.sh
#
# Run drizzle-kit push in explain (dry-run) mode and fail loudly if:
#   1. drizzle-kit itself exits with a non-zero status code, OR
#   2. the planned SQL contains any DROP TABLE statement.
#
# Usage:
#   DATABASE_URL="$NEON_DATABASE_URL" bash scripts/db-safety-check.sh

set -uo pipefail

OUTPUT=$(npx drizzle-kit push --explain 2>&1)
DRIZZLE_EXIT=$?

# Always print the output so CI logs are readable.
echo "$OUTPUT"
echo ""

if [ "$DRIZZLE_EXIT" -ne 0 ]; then
  echo "SAFETY CHECK FAILED: drizzle-kit push --explain exited with code $DRIZZLE_EXIT"
  exit "$DRIZZLE_EXIT"
fi

if echo "$OUTPUT" | grep -qiE 'drop[[:space:]]+table'; then
  echo "SAFETY CHECK FAILED: DROP TABLE detected in planned statements — review the output above before running db:push"
  exit 1
fi

echo "Safety check passed: drizzle-kit push --explain completed with no DROP TABLE statements"
