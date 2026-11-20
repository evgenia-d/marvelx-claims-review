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
  private listeners = new Map<string, ((e: { data: string; lastEventId: string }) => void)[]>();
  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }
  addEventListener(type: string, fn: (e: { data: string; lastEventId: string }) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  close() {
    this.readyState = FakeEventSource.CLOSED;
  }
  emit(type: string, data: unknown = {}, lastEventId = "") {
    for (const fn of this.listeners.get(type) ?? []) fn({ data: JSON.stringify(data), lastEventId });
  }
}

const latest = () => FakeEventSource.instances.at(-1) as FakeEventSource;

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const hook = renderHook(({ enabled }) => useRunSubscription(TEST_CLAIM, enabled), { wrapper, initialProps: { enabled: true } });
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

  describe("after the browser gives up on the stream", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const giveUp = () => {
      const es = latest();
      es.readyState = FakeEventSource.CLOSED;
      act(() => es.onerror?.());
    };

    it("reopens with the last event id after the browser gives up on the stream", () => {
      setup();
      act(() => {
        latest().emit("run", started(1), "r1.1");
        latest().emit("run", extracted(2, "total", "10"), "r1.2");
        latest().emit("synced");
      });
      giveUp();
      expect(useRunStore.getState().connection[TEST_CLAIM]).toBe("reconnecting");
      expect(FakeEventSource.instances).toHaveLength(1);
      act(() => vi.advanceTimersByTime(2000));
      expect(FakeEventSource.instances).toHaveLength(2);
      expect(latest().url).toBe(`/api/claims/${TEST_CLAIM}/events?lastEventId=r1.2`);
      expect(useRunStore.getState().runs[TEST_CLAIM]).toBeDefined();
      expect(useRunStore.getState().synced[TEST_CLAIM]).toBe(1);
      expect(useRunStore.getState().connection[TEST_CLAIM]).toBe("reconnecting");
      act(() => latest().onopen?.());
      expect(useRunStore.getState().connection[TEST_CLAIM]).toBe("live");
    });

    it("keeps retrying every 2 seconds while the stream keeps closing", () => {
      setup();
      giveUp();
      act(() => vi.advanceTimersByTime(2000));
      expect(latest().url).toBe(`/api/claims/${TEST_CLAIM}/events`);
      giveUp();
      act(() => vi.advanceTimersByTime(2000));
      expect(FakeEventSource.instances).toHaveLength(3);
    });

    it("stops reopening when the claim does not exist", () => {
      const { rerender } = setup();
      giveUp();
      rerender({ enabled: false });
      act(() => vi.advanceTimersByTime(5000));
      expect(FakeEventSource.instances).toHaveLength(1);
    });

    it("reopens when the stream goes silent for 7 s", () => {
      setup();
      act(() => {
        latest().onopen?.();
        latest().emit("run", started(1), "r1.1");
        latest().emit("synced");
      });
      act(() => vi.advanceTimersByTime(7000));
      expect(useRunStore.getState().connection[TEST_CLAIM]).toBe("reconnecting");
      act(() => vi.advanceTimersByTime(2000));
      expect(FakeEventSource.instances).toHaveLength(2);
      expect(latest().url).toBe(`/api/claims/${TEST_CLAIM}/events?lastEventId=r1.1`);
      expect(useRunStore.getState().runs[TEST_CLAIM]).toBeDefined();
    });

    it("a heartbeat keeps the stream open", () => {
      setup();
      act(() => latest().onopen?.());
      for (let i = 0; i < 5; i++) {
        act(() => vi.advanceTimersByTime(3000));
        act(() => latest().emit("hb"));
      }
      expect(FakeEventSource.instances).toHaveLength(1);
      expect(useRunStore.getState().connection[TEST_CLAIM]).toBe("live");
    });

    it("does not reopen after the screen leaves", () => {
      const { unmount } = setup();
      giveUp();
      unmount();
      act(() => vi.advanceTimersByTime(5000));
      expect(FakeEventSource.instances).toHaveLength(1);
    });
  });
});
