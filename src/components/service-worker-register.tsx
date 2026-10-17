"use client";

import { useEffect } from "react";

/**
 * Registers the service worker in production. In development any previously
 * registered worker is removed so Next.js hot reload is never served stale
 * cached assets.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          registrations.forEach((registration) => registration.unregister()),
        )
        .catch(() => {});
      return;
    }

    function register() {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
