import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, useRouteError } from "react-router";
import { ApiFailure } from "./api/http";
import { QueuePage } from "./features/queue/QueuePage";
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
  { path: "/", Component: QueuePage, ErrorBoundary: RouteError },
  { path: "/claims/:claimId", Component: ReviewPage, ErrorBoundary: RouteError },
  { path: "*", Component: QueuePage, ErrorBoundary: RouteError },
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
