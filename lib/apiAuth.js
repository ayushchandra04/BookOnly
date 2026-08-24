import { NextResponse } from "next/server";
import { getSession } from "./auth.js";
import { ApiError } from "./errors.js";

export { ApiError };

/** Throws ApiError(401/403) if not authenticated / wrong role. Returns the session on success. */
export async function requireRole(...roles) {
  const session = await getSession();
  if (!session) throw new ApiError(401, "Not authenticated");
  if (roles.length > 0 && !roles.includes(session.role)) {
    throw new ApiError(403, "Forbidden: insufficient role");
  }
  return session;
}

export function jsonError(err) {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  const message = err instanceof Error ? err.message : "Internal server error";
  return NextResponse.json({ error: message }, { status: 500 });
}
