"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, MapPin, UserCheck, X } from "lucide-react";

export type AssignmentView = {
  id: string;
  employeeName: string;
  employeeEmail: string | null;
  department: string | null;
  notes: string | null;
  status: string;
  checkedOutAt: string;
  checkedInAt: string | null;
};

const inputClass =
  "mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm text-white outline-none focus:border-blue-400";

const emptyForm = {
  employeeName: "",
  employeeEmail: "",
  department: "",
  notes: "",
};

export function AssignmentPanel({
  assetId,
  assignments,
  canManage,
}: {
  assetId: string;
  assignments: AssignmentView[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [formBusy, setFormBusy] = useState(false);
  const [checkInId, setCheckInId] = useState<string | null>(null);
  const [listError, setListError] = useState("");
  const router = useRouter();

  const active = assignments.find(
    (assignment) => assignment.status === "CHECKED_OUT",
  );

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !formBusy) {
        setOpen(false);
        setFormError("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, formBusy]);

  function openCheckout() {
    setForm(emptyForm);
    setFormError("");
    setOpen(true);
  }

  async function checkOut(event: React.FormEvent) {
    event.preventDefault();
    setFormBusy(true);
    setFormError("");

    const response = await fetch(`/api/assets/${assetId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeName: form.employeeName,
        employeeEmail: form.employeeEmail || null,
        department: form.department || null,
        notes: form.notes || null,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setFormBusy(false);

    if (!response.ok) {
      setFormError(data.error ?? "Could not check out the asset.");
      return;
    }

    setOpen(false);
    setForm(emptyForm);
    router.refresh();
  }

  async function checkIn(assignmentId: string) {
    setCheckInId(assignmentId);
    setListError("");
    const response = await fetch(`/api/assignments/${assignmentId}`, {
      method: "PATCH",
    });
    const data = await response.json().catch(() => ({}));
    setCheckInId(null);

    if (!response.ok) {
      setListError(data.error ?? "Could not check in the asset.");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <section className="rounded-2xl border border-white/[.08] bg-[#0d121d] p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="text-blue-300" size={18} />
            <h2 className="font-semibold">Assignments</h2>
          </div>
          {canManage && !active && (
            <button
              type="button"
              onClick={openCheckout}
              className="rounded-xl bg-blue-500 px-3 py-2 text-xs font-semibold hover:bg-blue-400"
            >
              Check out
            </button>
          )}
        </div>

        {listError && (
          <p role="alert" className="mt-4 rounded-xl bg-red-400/10 p-3 text-sm text-red-300">
            {listError}
          </p>
        )}

        {active ? (
          <div className="mt-4 rounded-xl border border-blue-400/20 bg-blue-500/[.06] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-blue-300">
              Checked out
            </p>
            <p className="mt-2 font-medium">{active.employeeName}</p>
            <p className="mt-1 text-xs text-slate-500">
              {[active.employeeEmail, active.department]
                .filter(Boolean)
                .join(" · ") || "No contact details"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Since {active.checkedOutAt}
            </p>
            {active.notes && (
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {active.notes}
              </p>
            )}
            {canManage && (
              <button
                type="button"
                onClick={() => checkIn(active.id)}
                disabled={checkInId === active.id}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium disabled:opacity-60"
              >
                <UserCheck size={14} />
                {checkInId === active.id ? "Checking in…" : "Check in"}
              </button>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            This asset is not currently checked out.
          </p>
        )}

        {assignments.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-medium text-slate-400">History</p>
            <ul className="mt-2 space-y-3">
              {assignments.map((assignment) => (
                <li
                  key={assignment.id}
                  className="border-t border-white/[.06] pt-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate">{assignment.employeeName}</span>
                    <span
                      className={
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] " +
                        (assignment.status === "CHECKED_OUT"
                          ? "bg-amber-400/10 text-amber-300"
                          : "bg-emerald-400/10 text-emerald-300")
                      }
                    >
                      {assignment.status === "CHECKED_OUT" ? "Out" : "In"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Out {assignment.checkedOutAt}
                    {assignment.checkedInAt
                      ? ` · In ${assignment.checkedInAt}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !formBusy) {
              setOpen(false);
              setFormError("");
            }
          }}
        >
          <form
            onSubmit={checkOut}
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-title"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d121d] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <LogOut className="text-blue-300" size={18} />
                <h2 id="checkout-title" className="text-lg font-semibold">
                  Check out asset
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setFormError("");
                }}
                className="text-slate-500 hover:text-white"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <label className="block text-sm text-slate-300">
                Employee name *
                <input
                  value={form.employeeName}
                  onChange={(event) =>
                    setForm({ ...form, employeeName: event.target.value })
                  }
                  required
                  maxLength={120}
                  autoFocus
                  className={inputClass}
                />
              </label>
              <label className="block text-sm text-slate-300">
                Employee email
                <input
                  type="email"
                  value={form.employeeEmail}
                  onChange={(event) =>
                    setForm({ ...form, employeeEmail: event.target.value })
                  }
                  maxLength={254}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm text-slate-300">
                Department
                <input
                  value={form.department}
                  onChange={(event) =>
                    setForm({ ...form, department: event.target.value })
                  }
                  maxLength={100}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm text-slate-300">
                Notes
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm({ ...form, notes: event.target.value })
                  }
                  rows={2}
                  maxLength={1000}
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
                onClick={() => {
                  setOpen(false);
                  setFormError("");
                }}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                disabled={formBusy}
                className="rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
              >
                {formBusy ? "Checking out…" : "Check out asset"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
