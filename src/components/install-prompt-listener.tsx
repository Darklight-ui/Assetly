"use client";

import { useEffect } from "react";
import { initInstallPrompt } from "@/components/install-prompt";

/** Captures the browser install prompt for pages that render the button. */
export function InstallPromptListener() {
  useEffect(() => initInstallPrompt(), []);
  return null;
}
