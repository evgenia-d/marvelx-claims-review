// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyEvents, fieldView, initialRunState, type FieldState } from "@shared/domain";
import { TEST_CLAIM, extracted, m, revised } from "@shared/domain/test-events";
import { queryKeys, useDecisions } from "../../api/queries";
import { FieldCard } from "./FieldCard";

const fieldAfter = (...events: Parameters<typeof applyEvents>[1]) =>
  applyEvents(initialRunState(TEST_CLAIM), events).fields.total as FieldState;
const first = extracted(1, "total", m("3605.80"));
const field = fieldAfter(first);
const fieldRevised = fieldAfter(first, revised(2, "total", m("4415.30")));

// The card gets its view from the decisions cache, as ReviewPage does through useFieldViews.
// The field is a prop so a test can deliver an agent revision while the card is open.
function Card({ field, onDecided }: { field: FieldState; onDecided?: () => void }) {
  const decision = useDecisions(TEST_CLAIM).data?.decisions.find((d) => d.field_id === "total");
  const view = fieldView(field, decision, { cited: "€ 3,605.80", stepOutcome: "ok" });
  return (
    <FieldCard
      claimId={TEST_CLAIM}
      view={view}
      field={field}
      group="Repair costs"
      startedAt={null}
      completedAt={null}
      documents={[]}
      onDecided={onDecided}
    />
  );
}

function renderCard(onDecided?: () => void, start: { field?: FieldState; decisions?: unknown[] } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  client.setQueryData(queryKeys.decisions(TEST_CLAIM), { decisions: start.decisions ?? [] });
  const ui = (f: FieldState) => (
    <QueryClientProvider client={client}>
      <Card field={f} onDecided={onDecided} />
    </QueryClientProvider>
  );
  const result = render(ui(start.field ?? field));
  return { client, agentRevises: () => result.rerender(ui(fieldRevised)) };
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const accepted = () =>
  json(200, { action: "accept", based_on: 1, claim_id: TEST_CLAIM, field_id: "total", at: "2026-11-20T10:06:00Z" });

// The decision PUT waits until the test calls answer(); every other request answers at once.
function holdThePut() {
  let answer = () => {};
  let sent = false;
  const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
    if (init?.method === "PUT") return new Promise<Response>((resolve) => ((sent = true), (answer = () => resolve(accepted()))));
    return Promise.resolve(init?.method === "DELETE" ? new Response(null, { status: 204 }) : json(200, { decisions: [] }));
  });
  vi.stubGlobal("fetch", fetchMock);
  // Waits until the PUT has gone out, so a test can answer right after the click.
  return { answer: async () => { await waitFor(() => expect(sent).toBe(true)); answer(); } };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("FieldCard on a phone", () => {
  it("puts the decisions in the action bar, which is gone while a draft is open", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json(200, { decisions: [] }))));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Card field={field} />
      </QueryClientProvider>,
    );
    const bar = screen.getByRole("group", { name: "Decisions" });
    expect(bar.contains(screen.getByRole("button", { name: "Accept" }))).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Correct" }));
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Your value" }), { key: "Escape" });
    // Escape closes the form and the Correct button that opened it has focus again.
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Correct" }));
  });
});

describe("FieldCard decisions", () => {
  it("calls onDecided once a decision is saved", async () => {
    const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
      Promise.resolve(init?.method === "PUT" ? accepted() : json(200, { decisions: [] })),
    );
    vi.stubGlobal("fetch", fetchMock);
    const onDecided = vi.fn();
    renderCard(onDecided);

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(onDecided).toHaveBeenCalledTimes(1));
  });

  it("stays on the field when the save fails", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))));
    const onDecided = vi.fn();
    renderCard(onDecided);

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    await screen.findByRole("alert");
    expect(onDecided).not.toHaveBeenCalled();
  });

  it("blocks the decision buttons while a save is in flight", async () => {
    const put = holdThePut();
    const fetchMock = vi.mocked(fetch);
    const puts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT").length;
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Accept" }).getAttribute("aria-disabled")).toBe("true"));
    expect(screen.getByRole("button", { name: "Correct" }).getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByRole("button", { name: "Reject" }).getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByRole("button", { name: "Accept" }).parentElement?.getAttribute("aria-busy")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(puts()).toBe(1);
    await put.answer();
    await screen.findByText(/You · accepted/);
  });

  it("blocks Undo while a save is in flight", async () => {
    const put = holdThePut();
    const fetchMock = vi.mocked(fetch);
    const deletes = () => fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE").length;
    const stored = { action: "accept", based_on: 1, claim_id: TEST_CLAIM, field_id: "total", at: "2026-11-20T10:06:00Z" };
    renderCard(undefined, { field: fieldRevised, decisions: [stored] });

    fireEvent.click(screen.getByRole("button", { name: "Keep mine" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Undo decision" }).getAttribute("aria-disabled")).toBe("true"));
    fireEvent.click(screen.getByRole("button", { name: "Undo decision" }));
    await act(() => new Promise((resolve) => setTimeout(resolve, 30)));
    expect(deletes()).toBe(0);
    await put.answer();
  });

  it("shows the busy dot only on the button that started the save", async () => {
    const put = holdThePut();
    const stored = { action: "accept", based_on: 1, claim_id: TEST_CLAIM, field_id: "total", at: "2026-11-20T10:06:00Z" };
    renderCard(undefined, { field: fieldRevised, decisions: [stored] });

    fireEvent.click(screen.getByRole("button", { name: "Keep mine" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Use new" }).getAttribute("aria-disabled")).toBe("true"));
    // The dot is aria-hidden, so it is found by its animation class: the least brittle handle it has.
    expect(screen.getByRole("button", { name: "Use new" }).querySelector(".animate-live")).toBeNull();
    await put.answer();
  });

  it("blocks Accept once the agent's value is accepted", async () => {
    const put = holdThePut();
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    await put.answer();
    await screen.findByText(/You · accepted/);
    expect(screen.getByRole("button", { name: "Accept" }).getAttribute("aria-disabled")).toBe("true");
  });

  it("blocks Accept after a correction, so one click can't replace the typed value", async () => {
    const saved = { action: "correct", based_on: 1, value: { amount: "3999.99", currency: "EUR" }, claim_id: TEST_CLAIM, field_id: "total", at: "2026-11-20T10:06:00Z" };
    let stored = false;
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        stored = true;
        return Promise.resolve(json(200, saved));
      }
      return Promise.resolve(json(200, { decisions: stored ? [saved] : [] }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const puts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT").length;
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Correct" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Your value" }), { target: { value: "3999.99" } });
    fireEvent.submit((screen.getByRole("textbox", { name: "Your value" }) as HTMLInputElement).form as HTMLFormElement);
    await screen.findByText(/You · corrected/);
    await waitFor(() => expect(puts()).toBe(1));

    const accept = screen.getByRole("button", { name: "Accept" });
    expect(accept.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(accept);
    await act(() => new Promise((resolve) => setTimeout(resolve, 30)));
    expect(puts()).toBe(1);
  });

  it("keeps the field undecided and says Couldn't save when the save fails", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))));
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't save. Try again");
    expect(screen.queryByText(/You · accepted/)).toBeNull();
    expect(screen.getByText("Not decided")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Accept" }).getAttribute("aria-disabled")).toBeNull();
  });

  it("shows the agent's value next to the reviewer's after a correction", async () => {
    const saved = { action: "correct", based_on: 1, value: { amount: "3700.00", currency: "EUR" }, claim_id: TEST_CLAIM, field_id: "total", at: "2026-11-20T10:06:00Z" };
    let stored = false;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        if (init?.method === "PUT") {
          stored = true;
          return Promise.resolve(json(200, saved));
        }
        return Promise.resolve(json(200, { decisions: stored ? [saved] : [] }));
      }),
    );
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Correct" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Your value" }), { target: { value: "3700.00" } });
    fireEvent.submit((screen.getByRole("textbox", { name: "Your value" }) as HTMLInputElement).form as HTMLFormElement);
    await screen.findByText(/You · corrected/);

    expect(screen.getByRole("group", { name: "Agent's value" }).textContent).toContain("3,605.80");
    expect(screen.getByRole("group", { name: "Your value" }).textContent).toContain("3,700.00");
  });

  const completedElsewhere = () =>
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) =>
        Promise.resolve(
          init?.method === "PUT"
            ? json(409, { error: { code: "claim_completed", message: "This claim's review is already complete." } })
            : json(200, { decisions: [] }),
        ),
      ),
    );

  it("shows the server's message when the claim was completed elsewhere", async () => {
    completedElsewhere();
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("This claim's review is already complete.");
    expect(alert.textContent).not.toContain("Try again");
  });

  it("refetches the claim when the save finds it already completed", async () => {
    completedElsewhere();
    const { client } = renderCard();
    const invalidate = vi.spyOn(client, "invalidateQueries");

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.claim(TEST_CLAIM) }));
  });

  it("keeps the typed value when the save is refused with 409", async () => {
    const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
      Promise.resolve(
        init?.method === "PUT"
          ? json(409, { error: { code: "agent_revised", message: "The agent revised this field." } })
          : json(200, { decisions: [] }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const puts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT").length;
    const { agentRevises } = renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Correct" }));
    const input = screen.getByRole("textbox", { name: "Your value" }) as HTMLInputElement;
    expect(input.value).toBe("3605.80");
    fireEvent.change(input, { target: { value: "3999.99" } });
    input.focus();

    // The agent revises the field while the reviewer is typing: same input, same text, still focused.
    agentRevises();
    expect(screen.getByRole("textbox", { name: "Your value" })).toBe(input);
    expect(input.value).toBe("3999.99");
    expect(document.activeElement).toBe(input);

    // Saving against the version the reviewer saw is refused here, before anything is sent.
    fireEvent.submit(input.form as HTMLFormElement);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "The agent changed this while you were deciding. Please decide again.",
    );
    expect(puts()).toBe(0);
    expect(input.value).toBe("3999.99");

    // The next Save goes; the server refusing it (409) keeps the text too.
    fireEvent.submit(input.form as HTMLFormElement);
    await waitFor(() => expect(puts()).toBe(1));
    await waitFor(() => expect(screen.getByText("Not decided")).toBeTruthy());
    expect(screen.getByRole("alert").textContent).toContain("Please decide again.");
    expect(input.value).toBe("3999.99");
  });
});
