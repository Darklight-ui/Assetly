"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Pencil, Trash2, Wrench, X } from "lucide-react";

export type MaintenanceView = {
  id: string;
  title: string;
  description: string | null;
  vendor: string | null;
  cost: string | null;
  performedAt: string;
  nextDueAt: string | null;
  costValue: string;
  performedAtValue: string;
  nextDueAtValue: string;
};

const inputClass =
  "mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm text-white outline-none focus:border-blue-400";

function todayValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

const emptyForm = {
  title: "",
  description: "",
  vendor: "",
  cost: "",
  performedAt: "",
  nextDueAt: "",
};

export function MaintenancePanel({
  assetId,
  records,
  canManage,
  canDelete,
}: {
  assetId: string;
  records: MaintenanceView[];
  canManage: boolean;
  canDelete: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [formBusy, setFormBusy] = useState(false);
  const [listError, setListError] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !formBusy) {
        setOpen(false);
        setEditingId(null);
        setFormError("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, formBusy]);

  function openForm() {
    setEditingId(null);
    setForm({ ...emptyForm, performedAt: todayValue() });
    setFormError("");
    setOpen(true);
  }

  function openEdit(record: MaintenanceView) {
    setEditingId(record.id);
    setForm({
      title: record.title,
      description: record.description ?? "",
      vendor: record.vendor ?? "",
      cost: record.costValue,
      performedAt: record.performedAtValue,
      nextDueAt: record.nextDueAtValue,
    });
    setFormError("");
    setOpen(true);
  }

  function closeForm() {
    if (formBusy) return;
    setOpen(false);
    setEditingId(null);
    setFormError("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormBusy(true);
    setFormError("");

    const response = await fetch(
      editingId
        ? `/api/maintenance/${editingId}`
        : `/api/assets/${assetId}/maintenance`,
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          vendor: form.vendor || null,
          cost: form.cost === "" ? null : Number(form.cost),
          performedAt: form.performedAt || null,
          nextDueAt: form.nextDueAt || null,
        }),
      },
    );
    const data = await response.json().catch(() => ({}));
    setFormBusy(false);

    if (!response.ok) {
      setFormError(data.error ?? "Could not save the maintenance record.");
      return;
    }

    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    router.refresh();
  }

  async function remove(recordId: string) {
    if (confirmingId !== recordId) {
      setConfirmingId(recordId);
      setListError("");
      return;
    }

    setDeletingId(recordId);
    setListError("");
    const response = await fetch(`/api/maintenance/${recordId}`, {
      method: "DELETE",
    });
    const data = await response.json().catch(() => ({}));
    setDeletingId(null);

    if (!response.ok) {
      setListError(data.error ?? "Could not delete the maintenance record.");
      return;
    }

    setConfirmingId(null);
    router.refresh();
  }

  return (
    <>
      <section className="rounded-2xl border border-white/[.08] bg-[#0d121d] p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="text-blue-300" size={18} />
            <h2 className="font-semibold">Maintenance</h2>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={openForm}
              className="rounded-xl bg-blue-500 px-3 py-2 text-xs font-semibold hover:bg-blue-400"
            >
              Log maintenance
            </button>
          )}
        </div>

        {listError && (
          <p role="alert" className="mt-4 rounded-xl bg-red-400/10 p-3 text-sm text-red-300">
            {listError}
          </p>
        )}

        {records.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No maintenance records yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {records.map((record) => (
              <li
                key={record.id}
                className="border-t border-white/[.06] pt-4 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{record.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {record.performedAt}
                      {record.vendor ? ` · ${record.vendor}` : ""}
                      {record.cost ? ` · ${record.cost}` : ""}
                    </p>
                    {record.description && (
                      <p className="mt-2 leading-6 text-slate-400">
                        {record.description}
                      </p>
                    )}
                    {record.nextDueAt && (
                      <p className="mt-2 text-xs text-amber-300">
                        Next due {record.nextDueAt}
                      </p>
                    )}
                  </div>
                  {(canManage || canDelete) && (
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {confirmingId === record.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => remove(record.id)}
                            disabled={deletingId === record.id}
                            className="rounded-lg bg-red-500 px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
                          >
                            {deletingId === record.id ? "Deleting…" : "Confirm"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingId(null)}
                            className="text-[11px] text-slate-400 hover:text-white"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => openEdit(record)}
                              title="Edit maintenance record"
                              className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/5 hover:text-white"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => remove(record.id)}
                              title="Delete maintenance record"
                              className="rounded-lg border border-red-400/20 p-2 text-red-300 hover:bg-red-400/10"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !formBusy) {
              closeForm();
            }
          }}
        >
          <form
            onSubmit={submit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="maintenance-title"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d121d] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Wrench className="text-blue-300" size={18} />
                <h2 id="maintenance-title" className="text-lg font-semibold">
                  {editingId ? "Edit maintenance" : "Log maintenance"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="text-slate-500 hover:text-white"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-slate-300 sm:col-span-2">
                Title *
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                  required
                  maxLength={160}
                  autoFocus
                  placeholder="e.g. Replaced laptop battery"
                  className={inputClass}
                />
              </label>
              <label className="block text-sm text-slate-300">
                Performed on
                <input
                  type="date"
                  value={form.performedAt}
                  onChange={(event) =>
                    setForm({ ...form, performedAt: event.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="block text-sm text-slate-300">
                Next due
                <input
                  type="date"
                  value={form.nextDueAt}
                  onChange={(event) =>
                    setForm({ ...form, nextDueAt: event.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="block text-sm text-slate-300">
                Vendor
                <input
                  value={form.vendor}
                  onChange={(event) =>
                    setForm({ ...form, vendor: event.target.value })
                  }
                  maxLength={160}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm text-slate-300">
                Cost (₦)
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.cost}
                  onChange={(event) =>
                    setForm({ ...form, cost: event.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="block text-sm text-slate-300 sm:col-span-2">
                Description
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  rows={2}
                  maxLength={2000}
                  className={inputClass}
                />
              </label>
            </div>

            {formError && (
              <p role="alert" className="mt-4 text-sm text-red-300">
                {formError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={formBusy}
                onClick={closeForm}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                disabled={formBusy}
                className="rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
              >
                {formBusy ? "Saving…" : editingId ? "Save changes" : "Save record"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
