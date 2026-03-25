import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import './i18n';
import { initServerSync } from "./initSync";
import { App } from "./App";

try {
  initServerSync();
} catch (error) {
  console.error("Failed to initialize server sync:", error);
  // Consider showing a fallback UI or proceeding with degraded functionality
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
