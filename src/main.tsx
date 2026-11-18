import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { Daily15App } from "./app/Daily15App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Daily15App />
    <Toaster position="top-center" />
  </StrictMode>,
);
