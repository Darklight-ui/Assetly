"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

const conditionLabels: Record<string, string> = {
  GOOD: "Good",
  DAMAGED: "Damaged",
  UNDER_REPAIR: "Under repair",
  MISSING: "Missing",
  DISPOSED: "Disposed",
};

export function ConditionQuickActions({
  assetId,
  current,
  canManage,
}: {
  assetId: string;
  current: string;
  canManage: boolean;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  if (!canManage) {
    return (
      <span className="w-fit rounded-full bg-white/[.07] px-3 py-1.5 text-xs">
        {current.replaceAll("_", " ")}
      </span>
    );
  }

  async function update(condition: string) {
    if (condition === current || pending) return;
    setPending(condition);
    setError("");

    const response = await fetch(`/api/assets/${assetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ condition }),
    });
    const data = await response.json().catch(() => ({}));
    setPending(null);

    if (!response.ok) {
      setError(data.error ?? "Could not update condition.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(conditionLabels).map(([value, label]) => {
          const active = value === current;
          return (
            <button
              key={value}
              type="button"
              onClick={() => update(value)}
              disabled={pending !== null || active}
              aria-pressed={active}
              className={
                "rounded-full border px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed " +
                (active
                  ? "border-blue-400/40 bg-blue-500/15 text-blue-200"
                  : "border-white/10 text-slate-400 hover:border-white/25 hover:text-white") +
                (pending === value ? " opacity-50" : "")
              }
            >
              {pending === value ? "Updating…" : label}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

export function DeleteAssetButton({
  assetId,
  assetName,
  assetTag,
}: {
  assetId: string;
  assetName: string;
  assetTag: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        setOpen(false);
        setError("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy]);

  async function remove() {
    setBusy(true);
    setError("");

    const response = await fetch(`/api/assets/${assetId}`, {
      method: "DELETE",
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setError(data.error ?? "Could not delete asset.");
      return;
    }

    router.replace("/dashboard/assets");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-400/15"
      >
        <Trash2 size={15} />
        Delete asset
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) {
              setOpen(false);
              setError("");
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-asset-title"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d121d] p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-400/10 text-red-300">
                <AlertTriangle size={20} />
              </span>
              <div>
                <h2 id="delete-asset-title" className="text-lg font-semibold">
                  Delete this asset?
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  <span className="font-medium text-slate-200">
                    {assetName}
                  </span>{" "}
                  <span className="font-mono text-xs">({assetTag})</span> will be
                  permanently removed, along with its QR tag, assignments and
                  maintenance records. This cannot be undone.
                </p>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300"
              >
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                autoFocus
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  setError("");
                }}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={remove}
                className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="animate-spin" size={15} />
                ) : (
                  <Trash2 size={15} />
                )}
                {busy ? "Deleting…" : "Delete asset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
