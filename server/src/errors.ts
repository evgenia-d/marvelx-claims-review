// The one error shape, the service's Result type, and the validator hook that maps Zod failures
// to readable 400s.
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import type { ApiError } from "@shared/contract";

export type Failure = { ok: false; status: 400 | 404 | 409; code: string; message: string };
export type Result<T> = { ok: true; value: T } | Failure;

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = (status: Failure["status"], code: string, message: string): Failure => ({ ok: false, status, code, message });

export const errorBody = (code: string, message: string): ApiError => ({ error: { code, message } });
export const sendError = (c: Context, status: ContentfulStatusCode, code: string, message: string) =>
  c.json(errorBody(code, message), status);
export const sendFailure = (c: Context, f: Failure) => sendError(c, f.status, f.code, f.message);

// One readable sentence per Zod issue, e.g. "reason: Too small: expected string to have >=1 characters".
export function describeIssues(error: { issues: z.core.$ZodIssue[] }): string {
  return error.issues.map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message)).join("; ");
}
