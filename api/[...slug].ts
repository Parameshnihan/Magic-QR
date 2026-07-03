/**
 * Vercel serverless function — catch-all for /api/* routes.
 *
 * This file re-exports the Express application from the api-server
 * artifact.  We import from `app.ts` (not `index.ts`) so that
 * `app.listen()` is never called; Vercel's @vercel/node runtime
 * invokes the Express handler directly for each incoming request.
 *
 * All application routes, middleware, and business logic are defined
 * in `artifacts/api-server/src/` and remain unchanged.
 */
import app from "../artifacts/api-server/src/app";

export default app;
