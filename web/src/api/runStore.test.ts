import { beforeEach, describe, expect, it } from "vitest";
import { TEST_CLAIM, delta, extracted, started } from "@shared/domain/test-events";
import { useRunStore } from "./runStore";

const store = () => useRunStore.getState();
const run = () => useRunStore.getState().runs[TEST_CLAIM];

beforeEach(() => useRunStore.setState({ runs: {}, connection: {} }));

describe("runStore", () => {
  it("apply drops a duplicate seq and returns the same claim state", () => {
    store().apply(TEST_CLAIM, started(1));
    store().apply(TEST_CLAIM, extracted(42, "total", "10"));
    const before = run();
    const runsBefore = store().runs;
    store().apply(TEST_CLAIM, extracted(42, "total", "10"));
    expect(run()).toBe(before);
    expect(store().runs).toBe(runsBefore);
  });

  it("reset clears the claim's run state", () => {
    store().apply(TEST_CLAIM, started(1));
    store().apply(TEST_CLAIM, extracted(2, "total", "10"));
    store().reset(TEST_CLAIM);
    expect(run()).toBeUndefined();
  });

  it("applies the same seq again after a reset (a new replay starts at seq 1)", () => {
    store().apply(TEST_CLAIM, started(1));
    store().reset(TEST_CLAIM);
    store().apply(TEST_CLAIM, extracted(1, "total", "10"));
    expect(run()?.fields["total"]).toBeDefined();
  });

  it("a summary delta does not change the fields object", () => {
    store().apply(TEST_CLAIM, started(1));
    store().apply(TEST_CLAIM, extracted(2, "total", "10"));
    const fields = run()?.fields;
    store().apply(TEST_CLAIM, delta(3, "The claimant "));
    expect(run()?.summary).toBe("The claimant ");
    expect(run()?.fields).toBe(fields);
  });
});
