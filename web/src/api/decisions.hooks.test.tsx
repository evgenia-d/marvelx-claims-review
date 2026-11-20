// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DecisionsResponse } from "@shared/contract";
import { TEST_CLAIM } from "@shared/domain/test-events";
import { useDecide, useUndo } from "./decisions";
import { queryKeys } from "./queries";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const serverDecision = {
  claim_id: TEST_CLAIM,
  field_id: "total",
  based_on: 1,
  at: "2026-11-20T10:06:00Z",
  action: "accept",
};

// The decision PUT answers when the test says so; every other request (the queue refetch) never does.
function setup(answer: () => Response) {
  let release = () => {};
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method !== "PUT") return new Promise<Response>(() => {});
      return new Promise<Response>((resolve, reject) => {
        release = () => {
          try {
            resolve(answer());
          } catch (e) {
            reject(e);
          }
        };
      });
    }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  client.setQueryData<DecisionsResponse>(queryKeys.decisions(TEST_CLAIM), { decisions: [] });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result } = renderHook(() => useDecide(TEST_CLAIM, "total"), { wrapper });
  const decisions = () => client.getQueryData<DecisionsResponse>(queryKeys.decisions(TEST_CLAIM))?.decisions;
  return { result, release: () => release(), decisions };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useDecide", () => {
  it("shows no decision until the server answers", async () => {
    const { result, release, decisions } = setup(() => json(200, serverDecision));
    act(() => result.current.mutate({ action: "accept", based_on: 1 }));
    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(decisions()).toEqual([]);
    await act(async () => release());
    await waitFor(() => expect(decisions()).toEqual([serverDecision]));
  });

  it("leaves the decisions unchanged when the save fails", async () => {
    const { result, release, decisions } = setup(() => json(500, { error: { code: "boom", message: "Server error" } }));
    act(() => result.current.mutate({ action: "accept", based_on: 1 }));
    await waitFor(() => expect(result.current.isPending).toBe(true));
    await act(async () => release());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(decisions()).toEqual([]);
  });
});

describe("useUndo", () => {
  it("removes the decision when the undo succeeds", async () => {
    vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) => init?.method === "DELETE" ? Promise.resolve(new Response(null, { status: 204 })) : new Promise<Response>(() => {})));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
    client.setQueryData<DecisionsResponse>(queryKeys.decisions(TEST_CLAIM), { decisions: [serverDecision as DecisionsResponse["decisions"][number]] });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useUndo(TEST_CLAIM, "total"), { wrapper });
    act(() => result.current.mutate());
    await waitFor(() => expect(client.getQueryData<DecisionsResponse>(queryKeys.decisions(TEST_CLAIM))?.decisions).toEqual([]));
  });
});
