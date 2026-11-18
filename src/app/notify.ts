import { toast as sonner } from "sonner";

/** Toasts sit at the top so they never cover the tab bar. */
const opts = { position: "top-center" as const, duration: 2500 };

export const toast = Object.assign((msg: string) => sonner(msg, opts), {
  success: (msg: string) => sonner.success(msg, opts),
  error: (msg: string) => sonner.error(msg, opts),
});
