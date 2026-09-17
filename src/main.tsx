import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FeedPage } from "./features/feed/FeedPage";
import "./styles.css";
import "./legacy-layout.css";
import "./phase4.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <FeedPage />
    </QueryClientProvider>
  </React.StrictMode>,
);
