import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, Link, RouterProvider, useRouteError } from "react-router";
import { ApiFailure } from "./api/http";
import { ReviewPage } from "./features/review/ReviewPage";
import { Button, Message } from "./ui";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A 4xx (unknown claim, bad request) won't change on retry; network and 5xx get two more tries.
      retry: (count, error) =>
        !(error instanceof ApiFailure && error.status >= 400 && error.status < 500) && count < 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Placeholder until the queue (Slice E): links to the fixture claims.
const CLAIMS = ["CLM-2026-004817", "CLM-2026-004822", "CLM-2026-004830", "CLM-2026-004809"];

function QueuePlaceholder() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-3 p-8">
      <h1 className="font-serif text-xl tracking-tight text-ink">Claims queue</h1>
      <ul className="flex flex-col gap-1">
        {CLAIMS.map((id) => (
          <li key={id}>
            <Link to={`/claims/${id}`} className="font-mono text-md text-primary underline">
              {id}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

// One per route, so a crash in one screen doesn't blank the app.
function RouteError() {
  const error = useRouteError();
  console.error(error);
  return (
    <main>
      <Message
        error
        headline="Something went wrong"
        body="This screen hit an error. Reload to try again."
        action={
          <Button variant="primary" autoFocus onClick={() => window.location.reload()}>
            Reload
          </Button>
        }
      />
    </main>
  );
}

const router = createBrowserRouter([
  { path: "/", Component: QueuePlaceholder, ErrorBoundary: RouteError },
  { path: "/claims/:claimId", Component: ReviewPage, ErrorBoundary: RouteError },
  { path: "*", Component: QueuePlaceholder, ErrorBoundary: RouteError },
]);

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
