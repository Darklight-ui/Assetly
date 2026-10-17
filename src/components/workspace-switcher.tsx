"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronsUpDown } from "lucide-react";

export type WorkspaceOption = {
  organizationId: string;
  name: string;
  role: string;
};

export function WorkspaceSwitcher({
  workspaces,
  activeOrganizationId,
}: {
  workspaces: WorkspaceOption[];
  activeOrganizationId: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function switchWorkspace(organizationId: string) {
    if (!organizationId || organizationId === activeOrganizationId || busy) return;
    setBusy(true);
    setError("");

    const response = await fetch("/api/organization/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setError(data.error ?? "Could not switch workspace.");
      return;
    }
    router.refresh();
  }

  if (workspaces.length < 2) {
    return (
      <div className="rounded-xl border border-white/[.07] bg-white/[.03] px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-slate-600">
          Workspace
        </p>
        <p className="mt-1.5 truncate text-sm font-medium">
          {workspaces[0]?.name ?? "No workspace"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[.07] bg-white/[.03] px-3 py-3">
      <label
        htmlFor="workspace-switcher"
        className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-600"
      >
        <Building2 size={12} />
        Workspace
      </label>
      <div className="relative mt-1.5">
        <select
          id="workspace-switcher"
          value={activeOrganizationId}
          disabled={busy}
          onChange={(event) => switchWorkspace(event.target.value)}
          className="w-full appearance-none rounded-lg border border-white/10 bg-[#0d121d] px-2.5 py-2 pr-8 text-sm outline-none focus:border-blue-400 disabled:opacity-60"
        >
          {workspaces.map((workspace) => (
            <option key={workspace.organizationId} value={workspace.organizationId}>
              {workspace.name}
            </option>
          ))}
        </select>
        <ChevronsUpDown
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500"
        />
      </div>
      {busy && <p className="mt-2 text-[11px] text-slate-500">Switching…</p>}
      {error && (
        <p role="alert" className="mt-2 text-[11px] text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
