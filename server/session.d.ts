import "express-session";

declare module "express-session" {
  interface SessionData {
    /** Server-generated opaque identity for this HTTP session. Never accepted
     *  from the client — the server creates it on first call to GET /api/session/me.
     *  Sensitive endpoints (token transfer, path-access purchase) derive the
     *  caller's identity exclusively from this field. */
    serverId: string | undefined;
  }
}
