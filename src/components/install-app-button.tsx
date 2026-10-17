"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

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

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    }

    function onInstalled() {
      setPromptEvent(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!promptEvent) return null;

  async function install() {
    if (!promptEvent) return;
    setBusy(true);
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } finally {
      setBusy(false);
      setPromptEvent(null);
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
