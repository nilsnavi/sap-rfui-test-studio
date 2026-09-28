import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@sap-rfui/ui/tokens.css";
import "./styles.css";

import { App } from "./app/App";
import { createContainer } from "./app/composition/container";

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("Не найден корневой контейнер #root в index.html");
}

// Single composition root instance for the window lifetime (ADR-001 §7).
const container = createContainer();

createRoot(rootElement).render(
  <StrictMode>
    <App container={container} />
  </StrictMode>,
);
