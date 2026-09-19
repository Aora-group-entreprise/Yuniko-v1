import { createRootRoute, HeadContent, Scripts, Outlet } from "@tanstack/react-router";
import type { ReactNode } from "react";
import "../styles.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0d0b14" },
      { title: "Yuniko" },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  return <DocumentShell><Outlet /></DocumentShell>;
}

function DocumentShell({ children }: { children: ReactNode }) {
  return <html lang="en"><head><HeadContent /></head><body>{children}<Scripts /></body></html>;
}
