import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { Daily15App } from "./app/Daily15App";
import "./index.css";
import { bootstrapNative, hideSplash } from "./app/native/bootstrap";

// Restore native storage before the app reads it.
bootstrapNative().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <Daily15App />
      <Toaster position="top-center" />
    </StrictMode>,
  );
  hideSplash();
});
