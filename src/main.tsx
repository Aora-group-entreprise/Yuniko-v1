import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { initObservability } from "./lib/observability-init";
import "./styles.css";
import "./yunikov1-reference.css";
import "./yunikov1-final.css";

const stopObservability=initObservability();
window.addEventListener("beforeunload",stopObservability,{once:true});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><App /></React.StrictMode>,
);