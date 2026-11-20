// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClaimDetail } from "@shared/contract";
import { TEST_CLAIM, extracted, started } from "@shared/domain/test-events";
import { queryKeys } from "./queries";
import { useRunStore } from "./runStore";
import { useRunSubscription } from "./subscribe";

// A stand-in EventSource: the test plays the server by calling emit().
class FakeEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;
  static instances: FakeEventSource[] = [];
  readyState = FakeEventSource.CONNECTING;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private listeners = new Map<string, ((e: { data: string }) => void)[]>();
  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }
  addEventListener(type: string, fn: (e: { data: string }) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  close() {
    this.readyState = FakeEventSource.CLOSED;
  }
  emit(type: string, data: unknown = {}) {
    for (const fn of this.listeners.get(type) ?? []) fn({ data: JSON.stringify(data) });
  }
}

const latest = () => FakeEventSource.instances.at(-1) as FakeEventSource;

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const hook = renderHook(() => useRunSubscription(TEST_CLAIM), { wrapper });
  return { client, ...hook };
}

beforeEach(() => {
  FakeEventSource.instances = [];
  vi.stubGlobal("EventSource", FakeEventSource);
  // The reset handler refetches; nothing answers in a unit test.
  vi.stubGlobal("fetch", () => new Promise(() => {}));
  useRunStore.setState({ runs: {}, connection: {}, synced: {} });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useRunSubscription", () => {
  it("clears the claim's run state and synced when the screen leaves", () => {
    const { unmount } = setup();
    act(() => {
      latest().emit("run", started(1));
      latest().emit("synced");
    });
    expect(TEST_CLAIM in useRunStore.getState().synced).toBe(true);
    unmount();
    expect(useRunStore.getState().runs[TEST_CLAIM]).toBeUndefined();
    expect(TEST_CLAIM in useRunStore.getState().synced).toBe(false);
  });

  it("drops the old replay's decisions and completion on reset", () => {
    const { client } = setup();
    const decided = { decisions: [{ action: "accept", claim_id: TEST_CLAIM, field_id: "total", based_on: 1, at: "2026-11-20T10:00:00.000Z" }] };
    client.setQueryData(queryKeys.decisions(TEST_CLAIM), decided);
    client.setQueryData(queryKeys.claim(TEST_CLAIM), { claim: { completed_at: "2026-11-20T10:05:00.000Z" } } as unknown as ClaimDetail);
    act(() => latest().emit("reset"));
    expect(client.getQueryData(queryKeys.decisions(TEST_CLAIM))).toBeUndefined();
    expect(client.getQueryData<ClaimDetail>(queryKeys.claim(TEST_CLAIM))?.claim.completed_at).toBeNull();
  });

  it("keeps synced and run state through a reset-free reconnect", () => {
    setup();
    act(() => {
      latest().emit("run", started(1));
      latest().emit("run", extracted(2, "total", "10"));
      latest().emit("synced");
      latest().onerror?.(); // the browser retries on its own: same EventSource
      latest().emit("synced");
    });
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(useRunStore.getState().synced[TEST_CLAIM]).toBe(1);
  });
});
