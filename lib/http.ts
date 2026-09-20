import "server-only";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { ChaincodeError } from "@/contracts/trustline-chaincode/src/logic";
import { ServiceError, badRequest } from "@/lib/services/errors";

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw badRequest("Request body must be JSON");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw badRequest(issue ? `${issue.path.join(".") || "body"}: ${issue.message}` : "Invalid request");
  }
  return parsed.data;
}

/** Wraps a route handler with consistent error handling and no data leakage in logs. */
export function route<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof ServiceError) {
        return json({ error: { code: error.code, message: error.message } }, { status: error.status });
      }
      if (error instanceof ChaincodeError) {
        return json({ error: { code: error.code, message: error.message } }, { status: 422 });
      }
      console.error("[trustline] unhandled error:", error instanceof Error ? error.message : "unknown");
      return json({ error: { code: "INTERNAL", message: "Something went wrong" } }, { status: 500 });
    }
  };
}
