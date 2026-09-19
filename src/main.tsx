import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { initObservability } from "./lib/observability-init";
import "./styles.css";
import "./yunikov1-reference.css";
import "./legacy-layout.css";
import "./phase4.css";
import "./messages.css";
import "./stories.css";
import "./security.css";
import "./settings.css";
import "./phase10.css";

const stopObservability=initObservability();
window.addEventListener("beforeunload",stopObservability,{once:true});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><App /></React.StrictMode>,
);