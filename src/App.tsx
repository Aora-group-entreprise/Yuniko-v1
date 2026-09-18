import { QueryClientProvider } from "@tanstack/react-query";
import { FeedPage } from "./features/feed/FeedPage";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { queryClient } from "./lib/query-client";

export function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <FeedPage />
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
