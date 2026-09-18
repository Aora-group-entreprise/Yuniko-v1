import { QueryClientProvider } from "@tanstack/react-query";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { AppRoutes } from "./routes";
import { queryClient } from "./lib/query-client";

export function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppRoutes />
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
