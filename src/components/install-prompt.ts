/**
 * Shared store for the Chromium install prompt.
 *
 * `beforeinstallprompt` fires once per page load, possibly before the login
 * page mounts, and the event object cannot be re-requested. A listener in the
 * root layout captures it here so the install button can use it later.
 */
export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

let deferredPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function getDeferredPrompt() {
  return deferredPrompt;
}

export function subscribeToInstallPrompt(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clearDeferredPrompt() {
  deferredPrompt = null;
}

function onBeforeInstall(event: Event) {
  event.preventDefault();
  deferredPrompt = event as InstallPromptEvent;
  emit();
}

function onInstalled() {
  deferredPrompt = null;
  emit();
}

export function initInstallPrompt() {
  window.addEventListener("beforeinstallprompt", onBeforeInstall);
  window.addEventListener("appinstalled", onInstalled);

  return () => {
    window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    window.removeEventListener("appinstalled", onInstalled);
  };
}
