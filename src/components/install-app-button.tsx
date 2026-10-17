"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import {
  clearDeferredPrompt,
  getDeferredPrompt,
  subscribeToInstallPrompt,
  type InstallPromptEvent,
} from "@/components/install-prompt";

/**
 * Shows the browser's native install prompt when available (Chromium-based
 * browsers). iOS Safari does not fire this event; users install via
 * Share > Add to Home Screen.
 */
export function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const sync = () => setPromptEvent(getDeferredPrompt());
    sync();

    return subscribeToInstallPrompt(sync);
  }, []);

  if (!promptEvent) return null;

  async function install() {
    if (!promptEvent) return;
    setBusy(true);
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } catch {
      // The prompt can only be used once; ignore a stale event.
    } finally {
      clearDeferredPrompt();
      setPromptEvent(null);
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={install}
      disabled={busy}
      className="inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-300 hover:bg-white/[.04] hover:text-white disabled:opacity-60"
    >
      <Download className="mr-2" size={16} />
      {busy ? "Installing…" : "Install app"}
    </button>
  );
}
