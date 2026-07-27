# Threat Model

## Project Overview

A mobile-first web application for discovering Christopher Alexander architectural patterns in the real world. Built with React/TypeScript (Vite), Express.js backend, PostgreSQL (Neon) via Drizzle ORM. Deployed publicly on Replit autoscale at `https://eve-next-simoesdb.replit.app`.

Users are **anonymous**: identified by device fingerprints that produce persistent `sessionId`/`userId` strings. No traditional login/password system exists. The app features a Bitcoin-like token economy where users earn tokens by contributing location data and can trade/purchase data packages.

## Assets

- **Token balances** — internal virtual currency with a 21 million supply cap. Users earn tokens for location data contributions and spend them on data marketplace packages and peer-to-peer transfers.
- **Location and tracking data** — GPS coordinates, saved locations, movement paths, and pattern analyses. PII potential if device fingerprints are linkable to real identities.
- **Anonymous user identities** — `sessionId`/`userId` strings that uniquely identify users across sessions. Compromise allows impersonation of that user's token balance and location history.
- **Admin credentials** — admin accounts in the `adminUsers` table grant access to system analytics, content flagging, and configuration. No secrets currently protect the admin *creation* endpoint.
- **Application secrets** — `DATABASE_URL`, `ADMIN_SETUP_KEY` environment variables. The setup key has a hardcoded fallback in source.
- **API keys** — Google Maps API key committed to source control (Android build file).

## Trust Boundaries

- **Browser/Client → API server** — all HTTP requests cross this boundary. The server **does not authenticate or authorize** most requests; callers supply their own `sessionId`/`userId` in query params, path params, or request body. This boundary is effectively unguarded.
- **API server → PostgreSQL (Neon)** — Drizzle ORM; SQL injection not observed but parameterization relies on ORM correctness.
- **Anonymous user space → Admin space** — admin routes use `x-admin-id` header checked against the `adminUsers` table. Creation of admin accounts requires only a publicly-exposed setup key.
- **Token economy integrity boundary** — minting and transfer operations must be triggered by legitimate contributions. Currently unenforced: the reward API trusts caller-supplied contribution parameters.

## Scan Anchors

- **Production entry points:** `server/routes.ts` (all REST routes, ~65 endpoints), `server/websocket-communication.ts` (WebSocket)
- **Highest-risk areas:** token economy endpoints (`/api/tokens/award-location-data`, `/api/marketplace/transfer-tokens`), admin setup (`/api/admin/setup`), path access payment (`/api/communication/access-path/:pathId`)
- **Public surface:** all routes — there is no authentication middleware applied globally
- **Admin surface:** `/api/admin/*` routes protected by `adminAuth` middleware (header-based adminId lookup)
- **Dev-only:** `mobile/` directory (React Native app, not served by the backend)

## Threat Categories

### Spoofing

The entire application relies on caller-supplied session identifiers. Any endpoint that acts on a `sessionId` or `userId` from request body/params/query without verifying it matches a server-managed session token is vulnerable to spoofing. An attacker who knows another user's session ID can act as that user (drain tokens, submit data under their identity). Admin account creation is protected only by a hardcoded key visible in source.

**Required guarantees:**
- Session ownership MUST be verified server-side (e.g., cookie/token that the caller cannot forge) before any write or token debit operation.
- The admin setup key MUST NOT be hardcoded in source; it MUST only be provided via environment variable and treated as a secret.

### Tampering

The `/api/tokens/award-location-data` endpoint accepts arbitrary `coordinatesCount`, `accuracyMeters`, and `trackingMinutes` values from the client. An attacker can mint tokens without performing any real-world data contribution. Similarly, token transfer debits the `fromSessionId` supplied in the request body — an attacker with a victim's session ID can drain their balance.

**Required guarantees:**
- Token minting MUST be triggered server-side based on verified, server-recorded tracking events — not by client-supplied quantities.
- Token debit operations MUST verify the caller owns the session being debited.

### Information Disclosure

A real Google Maps Android API key is committed to the repository (`mobile/android/app/src/main/res/values/google_maps_api.xml`). The error handler logs IP addresses and user agents to standard error. Username/userId pairs are logged to standard output on WebSocket connect/disconnect.

**Required guarantees:**
- API keys MUST NOT be stored in source control. Use Android build secrets or environment-injected values.
- Logs MUST NOT include PII (IP, username) without proper data-handling controls.

### Elevation of Privilege

The admin setup endpoint (`POST /api/admin/setup`) accepts a hardcoded key `admin_setup_2025` to create super-admin accounts without any rate limiting or existing admin approval. This is publicly accessible on the deployed production URL, allowing any internet user to create an admin account and access full system analytics and configuration.

**Required guarantees:**
- Admin account creation MUST require prior authentication as an existing admin, or MUST be disabled after initial setup.
- The hardcoded fallback key MUST be removed; only an environment-variable-supplied secret may authorize the initial setup.

### Denial of Service

The `/api/tokens/award-location-data` endpoint has no rate limiter, allowing unlimited token-minting requests that create database writes and supply-tracking updates on every call.

**Required guarantees:**
- All unauthenticated write endpoints MUST be rate-limited.
