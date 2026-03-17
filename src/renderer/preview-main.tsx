import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PreviewApp } from "./PreviewApp";

createRoot(document.getElementById("preview-root")!).render(
  <StrictMode>
    <PreviewApp />
  </StrictMode>
);
