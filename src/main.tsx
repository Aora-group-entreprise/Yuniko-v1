import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import "./legacy-layout.css";
import "./phase4.css";
import "./messages.css";
import "./stories.css";
import "./security.css";
import "./settings.css";
import "./phase10.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
