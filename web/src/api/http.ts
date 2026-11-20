// The only place the browser calls fetch. Every response body is parsed with its contract schema,
// and every failure becomes an ApiFailure the screens can show.
import type { z } from "zod";
import { ApiError } from "@shared/contract";

const BASE = "/api";

export class ApiFailure extends Error {
  readonly status: number; // 0 when the server could not be reached
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiFailure";
    this.status = status;
    this.code = code;
  }
}

type Method = "PUT" | "POST" | "DELETE";

async function request(path: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(BASE + path, init);
  } catch (error) {
    // A cancelled request (TanStack Query aborts stale ones) is not a failure to show.
    if (init.signal?.aborted) throw error;
    throw new ApiFailure(0, "unreachable", "Can't reach the server. Check your connection and try again.");
  }
  if (!res.ok) {
    const body = ApiError.safeParse(await res.json().catch(() => null));
    if (body.success) throw new ApiFailure(res.status, body.data.error.code, body.data.error.message);
    throw new ApiFailure(res.status, "unexpected_error", `The server answered with an error (${res.status}).`);
  }
  return res;
}

async function parse<T>(res: Response, schema: z.ZodType<T>): Promise<T> {
  const parsed = schema.safeParse(await res.json().catch(() => undefined));
  if (!parsed.success) throw new ApiFailure(res.status, "bad_response", "The server sent a response this app can't read.");
  return parsed.data;
}

export async function getJson<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  return parse(await request(path, { signal }), schema);
}

// Pass `null` as the schema for an endpoint that answers 204 with no body.
export async function sendJson<T>(method: Method, path: string, body: unknown, schema: z.ZodType<T>): Promise<T>;
export async function sendJson(method: Method, path: string, body: unknown, schema: null): Promise<void>;
export async function sendJson<T>(method: Method, path: string, body: unknown, schema: z.ZodType<T> | null): Promise<T | void> {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const res = await request(path, init);
  if (schema) return parse(res, schema);
}
