import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import { api } from "./api.js";
import { connectEvents } from "./sse.js";
import { actions, handleEvent, hydrate, setLoadError } from "./store.js";
import "./styles/fonts.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/app.css";

async function boot(): Promise<void> {
  try {
    hydrate(await api.state());
  } catch (err) {
    setLoadError(err instanceof Error ? err.message : String(err));
  }
  connectEvents(handleEvent);
  api.claudeStatus().then(actions.setClaude).catch(() => actions.setClaude(null));
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
void boot();
