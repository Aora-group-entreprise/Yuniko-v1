import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FeedPage } from "./features/feed/FeedPage";
import { AppErrorBoundary } from "./AppErrorBoundary";
import "./styles.css";
import "./legacy-layout.css";
import "./phase4.css";
import "./messages.css";
import "./stories.css";
import "./security.css";
import "./settings.css";
import "./phase10.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <FeedPage />
      </QueryClientProvider>
    </AppErrorBoundary>
  </React.StrictMode>,
);
