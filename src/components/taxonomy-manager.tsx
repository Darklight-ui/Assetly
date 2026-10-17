"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  FolderTree,
  Pencil,
  Plus,
  Trash2,
  type LucideIcon,
} from "lucide-react";

export type TaxonomyItem = {
  id: string;
  name: string;
  assetCount: number;
  description?: string | null;
  building?: string | null;
  floor?: string | null;
  room?: string | null;
  department?: string | null;
};

type FieldKey = "description" | "building" | "floor" | "room" | "department";

type TaxonomyConfig = {
  endpoint: string;
  noun: string;
  plural: string;
  icon: LucideIcon;
  fields: { key: FieldKey; label: string; placeholder: string; textarea?: boolean }[];
  summary: (item: TaxonomyItem) => string;
  detachNote: string;
};

const configs: Record<"category" | "location", TaxonomyConfig> = {
  category: {
    endpoint: "/api/categories",
    noun: "category",
    plural: "Categories",
    icon: FolderTree,
    fields: [
      {
        key: "description",
        label: "Description",
        placeholder: "What belongs in this category?",
        textarea: true,
      },
    ],
    summary: (item) => item.description || "No description",
    detachNote: "Assets in this category will become uncategorized.",
  },
  location: {
    endpoint: "/api/locations",
    noun: "location",
    plural: "Locations",
    icon: Building2,
    fields: [
      { key: "building", label: "Building", placeholder: "e.g. Head Office" },
      { key: "floor", label: "Floor", placeholder: "e.g. 2nd floor" },
      { key: "room", label: "Room", placeholder: "e.g. Room 204" },
      { key: "department", label: "Department", placeholder: "e.g. Finance" },
    ],
    summary: (item) =>
      [item.building, item.floor, item.room, item.department]
        .filter(Boolean)
        .join(" · ") || "No details",
    detachNote: "Assets assigned to this location will have their location cleared.",
  },
};

const inputClass =
  "mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm text-white outline-none focus:border-blue-400";

export function TaxonomyManager({
  kind,
  items,
  canManage,
}: {
  kind: "category" | "location";
  items: TaxonomyItem[];
  canManage: boolean;
}) {
  const config = configs[kind];
  const Icon = config.icon;
  const [editing, setEditing] = useState<TaxonomyItem | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [listError, setListError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  function resetForm() {
    setEditing(null);
    setForm({});
    setFormError("");
  }

  function startEdit(item: TaxonomyItem) {
    const next: Record<string, string> = { name: item.name };
    for (const field of config.fields) {
      next[field.key] = String(item[field.key] ?? "");
    }
    setForm(next);
    setEditing(item);
    setFormError("");
  }

  function setValue(key: string, value: string) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFormError("");

    const payload: Record<string, string | null> = {
      name: (form.name ?? "").trim(),
    };
    for (const field of config.fields) {
      const value = (form[field.key] ?? "").trim();
      payload[field.key] = value ? value : null;
    }

    const response = await fetch(
      editing ? `${config.endpoint}/${editing.id}` : config.endpoint,
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setFormError(data.error ?? `Could not save ${config.noun}.`);
      return;
    }

    resetForm();
    router.refresh();
  }

  async function remove(item: TaxonomyItem) {
    if (confirmingId !== item.id) {
      setConfirmingId(item.id);
      setListError("");
      return;
    }

    setDeletingId(item.id);
    setListError("");
    const response = await fetch(`${config.endpoint}/${item.id}`, {
      method: "DELETE",
    });
    const data = await response.json().catch(() => ({}));
    setDeletingId(null);

    if (!response.ok) {
      setListError(data.error ?? `Could not delete ${config.noun}.`);
      return;
    }

    setConfirmingId(null);
    if (editing?.id === item.id) resetForm();
    router.refresh();
  }

  return (
    <>
      {canManage && (
        <form
          onSubmit={submit}
          className="mt-7 rounded-2xl border border-white/[.08] bg-[#0d121d] p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">
              {editing ? `Edit ${config.noun}` : `Add ${config.noun}`}
            </h2>
            {editing && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel edit
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-slate-300">
              Name *
              <input
                value={form.name ?? ""}
                onChange={(event) => setValue("name", event.target.value)}
                required
                maxLength={80}
                placeholder={
                  kind === "category" ? "e.g. Networking" : "e.g. Lagos Warehouse"
                }
                className={inputClass}
              />
            </label>
            {config.fields.map((field) =>
              field.textarea ? (
                <label
                  key={field.key}
                  className="block text-sm text-slate-300 sm:col-span-2"
                >
                  {field.label}
                  <textarea
                    value={form[field.key] ?? ""}
                    onChange={(event) => setValue(field.key, event.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder={field.placeholder}
                    className={inputClass}
                  />
                </label>
              ) : (
                <label key={field.key} className="block text-sm text-slate-300">
                  {field.label}
                  <input
                    value={form[field.key] ?? ""}
                    onChange={(event) => setValue(field.key, event.target.value)}
                    maxLength={80}
                    placeholder={field.placeholder}
                    className={inputClass}
                  />
                </label>
              ),
            )}
          </div>

          {formError && (
            <p role="alert" className="mt-4 text-sm text-red-300">
              {formError}
            </p>
          )}

          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Names must be unique within your workspace.
            </p>
            <button
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {editing ? (
                <Pencil size={15} />
              ) : (
                <Plus size={15} />
              )}
              {busy
                ? "Saving…"
                : editing
                  ? `Save ${config.noun}`
                  : `Add ${config.noun}`}
            </button>
          </div>
        </form>
      )}

      <section className="mt-5 overflow-hidden rounded-2xl border border-white/[.08] bg-[#0d121d]">
        <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-4">
          <div className="flex items-center gap-2">
            <Icon className="text-blue-300" size={18} />
            <p className="text-sm font-medium">{config.plural}</p>
          </div>
          <p className="text-xs text-slate-500">
            {items.length} record{items.length === 1 ? "" : "s"}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Icon className="mx-auto text-slate-600" size={28} />
            <p className="mt-3 font-medium">No {config.plural.toLowerCase()} yet</p>
            <p className="mt-1 text-sm text-slate-500">
              {canManage
                ? `Add your first ${config.noun} above.`
                : `No ${config.plural.toLowerCase()} have been created yet.`}
            </p>
          </div>
        ) : (
          <div>
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 border-t border-white/[.05] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium">{item.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {config.summary(item)}
                  </p>
                  {confirmingId === item.id && (
                    <p className="mt-2 text-xs text-amber-300">
                      {config.detachNote} This cannot be undone.
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-3">
                  <span className="rounded-full bg-white/[.06] px-2.5 py-1 text-xs text-slate-400">
                    {item.assetCount} asset{item.assetCount === 1 ? "" : "s"}
                  </span>
                  {canManage && confirmingId === item.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => remove(item)}
                        disabled={deletingId === item.id}
                        className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-400 disabled:opacity-60"
                      >
                        {deletingId === item.id ? "Deleting…" : "Confirm delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          title={`Edit ${config.noun}`}
                          className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(item)}
                          title={`Delete ${config.noun}`}
                          className="rounded-lg border border-red-400/20 p-2 text-red-300 hover:bg-red-400/10"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {listError && (
          <p role="alert" className="border-t border-white/[.06] px-5 py-3 text-sm text-red-300">
            {listError}
          </p>
        )}
      </section>
    </>
  );
}
