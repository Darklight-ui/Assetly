"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export type AssetFormValues = {
  name: string;
  assetTag: string;
  description: string;
  serialNumber: string;
  condition: string;
  categoryId: string;
  locationId: string;
  quantity: string;
  quantityGood: string;
  quantityDamaged: string;
  quantityUnaccounted: string;
  purchaseCost: string;
  purchaseDate: string;
  supplier: string;
  warrantyExpiry: string;
  custodianName: string;
  notes: string;
  publicEnabled: boolean;
  publicDescription: string;
};

export const emptyAssetFormValues: AssetFormValues = {
  name: "",
  assetTag: "",
  description: "",
  serialNumber: "",
  condition: "GOOD",
  categoryId: "",
  locationId: "",
  quantity: "1",
  quantityGood: "1",
  quantityDamaged: "0",
  quantityUnaccounted: "0",
  purchaseCost: "",
  purchaseDate: "",
  supplier: "",
  warrantyExpiry: "",
  custodianName: "",
  notes: "",
  publicEnabled: false,
  publicDescription: "",
};

const conditions = ["GOOD", "DAMAGED", "UNDER_REPAIR", "MISSING", "DISPOSED"];
const inputClass =
  "mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm text-white outline-none focus:border-blue-400";

export function AssetForm({
  mode,
  assetId,
  initial,
  categories = [],
  locations = [],
}: {
  mode: "create" | "edit";
  assetId?: string;
  initial?: Partial<AssetFormValues>;
  categories?: { id: string; name: string }[];
  locations?: { id: string; name: string }[];
}) {
  const [values, setValues] = useState<AssetFormValues>({
    ...emptyAssetFormValues,
    ...initial,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  function setField<K extends keyof AssetFormValues>(
    key: K,
    value: AssetFormValues[K],
  ) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  function change(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const key = event.target.name as Exclude<
      keyof AssetFormValues,
      "publicEnabled"
    >;
    setField(key, event.target.value);
  }

  function toggle(event: React.ChangeEvent<HTMLInputElement>) {
    setField("publicEnabled", event.target.checked);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    const total = Number(values.quantity);
    const good = Number(values.quantityGood);
    const damaged = Number(values.quantityDamaged);
    const unaccounted = Number(values.quantityUnaccounted);

    if (![total, good, damaged, unaccounted].every(Number.isFinite)) {
      setError("Enter valid quantities for the asset.");
      return;
    }
    if (total < 1) {
      setError("Total quantity must be at least 1.");
      return;
    }
    if (good + damaged + unaccounted > total) {
      setError(
        "Good, damaged and unaccounted quantities cannot exceed total quantity.",
      );
      return;
    }
    if (
      values.purchaseCost !== "" &&
      !Number.isFinite(Number(values.purchaseCost))
    ) {
      setError("Enter a valid purchase cost.");
      return;
    }

    const nullable = (value: string) => (value.trim() ? value : null);
    const payload = {
      name: values.name.trim(),
      assetTag: values.assetTag.trim(),
      description: nullable(values.description),
      serialNumber: nullable(values.serialNumber),
      condition: values.condition,
      categoryId: values.categoryId || null,
      locationId: values.locationId || null,
      quantity: total,
      quantityGood: good,
      quantityDamaged: damaged,
      quantityUnaccounted: unaccounted,
      purchaseCost:
        values.purchaseCost === "" ? null : Number(values.purchaseCost),
      purchaseDate: values.purchaseDate || null,
      supplier: nullable(values.supplier),
      warrantyExpiry: values.warrantyExpiry || null,
      custodianName: nullable(values.custodianName),
      notes: nullable(values.notes),
      publicEnabled: values.publicEnabled,
      publicDescription: nullable(values.publicDescription),
    };

    setBusy(true);
    const response = await fetch(
      mode === "edit" ? `/api/assets/${assetId}` : "/api/assets",
      {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setError(data.error ?? "Could not save asset.");
      return;
    }

    router.push(`/dashboard/assets/${data.asset.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-6">
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300"
        >
          {error}
        </p>
      )}

      <section className="grid gap-5 rounded-2xl border border-white/[.08] bg-[#0d121d] p-5 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Asset details</h2>
        <Field
          name="name"
          label="Asset name *"
          value={values.name}
          change={change}
          required
          placeholder="e.g. Dell Latitude 5440"
        />
        <Field
          name="assetTag"
          label="Internal asset tag *"
          value={values.assetTag}
          change={change}
          required
          placeholder="e.g. AST-00001"
        />
        <Field
          name="serialNumber"
          label="Serial number"
          value={values.serialNumber}
          change={change}
          placeholder="Manufacturer serial number"
        />
        <label className="block text-sm text-slate-300">
          Condition
          <select
            name="condition"
            value={values.condition}
            onChange={change}
            className={inputClass}
          >
            {conditions.map((condition) => (
              <option key={condition} value={condition}>
                {condition.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-slate-300">
          Category
          <select
            name="categoryId"
            value={values.categoryId}
            onChange={change}
            className={inputClass}
          >
            <option value="">Uncategorized</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-slate-300">
          Location
          <select
            name="locationId"
            value={values.locationId}
            onChange={change}
            className={inputClass}
          >
            <option value="">Location not set</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-slate-300 sm:col-span-2">
          Description
          <textarea
            name="description"
            value={values.description}
            onChange={change}
            rows={3}
            className={inputClass}
            placeholder="Optional description, model or distinguishing details"
          />
        </label>
      </section>

      <section className="grid gap-5 rounded-2xl border border-white/[.08] bg-[#0d121d] p-5 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Quantity tracking</h2>
        <Field
          name="quantity"
          label="Total quantity *"
          value={values.quantity}
          change={change}
          type="number"
          required
        />
        <Field
          name="quantityGood"
          label="In good condition *"
          value={values.quantityGood}
          change={change}
          type="number"
          required
        />
        <Field
          name="quantityDamaged"
          label="Damaged *"
          value={values.quantityDamaged}
          change={change}
          type="number"
          required
        />
        <Field
          name="quantityUnaccounted"
          label="Unaccounted / under repair *"
          value={values.quantityUnaccounted}
          change={change}
          type="number"
          required
        />
        <p className="text-xs leading-5 text-slate-500 sm:col-span-2">
          Good + damaged + unaccounted quantities must not exceed total
          quantity. Condition is also recorded at the asset-record level.
        </p>
      </section>

      <section className="grid gap-5 rounded-2xl border border-white/[.08] bg-[#0d121d] p-5 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Purchase and warranty</h2>
        <Field
          name="purchaseCost"
          label="Purchase cost (₦)"
          value={values.purchaseCost}
          change={change}
          type="number"
        />
        <Field
          name="supplier"
          label="Supplier / vendor"
          value={values.supplier}
          change={change}
        />
        <Field
          name="purchaseDate"
          label="Purchase date"
          value={values.purchaseDate}
          change={change}
          type="date"
        />
        <Field
          name="warrantyExpiry"
          label="Warranty expiry"
          value={values.warrantyExpiry}
          change={change}
          type="date"
        />
        <Field
          name="custodianName"
          label="Assigned custodian"
          value={values.custodianName}
          change={change}
          placeholder="Employee or team name"
        />
        <label className="block text-sm text-slate-300 sm:col-span-2">
          Notes
          <textarea
            name="notes"
            value={values.notes}
            onChange={change}
            rows={3}
            className={inputClass}
            placeholder="Additional context, condition notes or useful identifiers"
          />
        </label>
      </section>

      <section className="grid gap-5 rounded-2xl border border-white/[.08] bg-[#0d121d] p-5">
        <h2 className="font-semibold">Public QR page</h2>
        <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
          <input
            type="checkbox"
            name="publicEnabled"
            checked={values.publicEnabled}
            onChange={toggle}
            className="mt-0.5 size-4 accent-blue-500"
          />
          <span>
            <span className="block font-medium">Allow public QR tag page</span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              When enabled, anyone with the QR link can see the asset name, tag,
              condition and the public description below. No other fields are
              exposed.
            </span>
          </span>
        </label>
        <label className="block text-sm text-slate-300">
          Public description
          <textarea
            name="publicDescription"
            value={values.publicDescription}
            onChange={change}
            rows={2}
            maxLength={500}
            className={inputClass}
            placeholder="Optional text safe to show publicly, such as the item's purpose"
          />
        </label>
      </section>

      <div className="flex justify-end gap-3">
        <Link
          href={
            mode === "edit" && assetId
              ? `/dashboard/assets/${assetId}`
              : "/dashboard/assets"
          }
          className="rounded-xl border border-white/10 px-4 py-3 text-sm"
        >
          Cancel
        </Link>
        <button
          disabled={busy}
          className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold disabled:opacity-60"
        >
          {busy
            ? "Saving…"
            : mode === "edit"
              ? "Save changes"
              : "Save asset"}
        </button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  value,
  change,
  type = "text",
  required = false,
  placeholder = "",
}: {
  name: string;
  label: string;
  value: string;
  change: (event: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm text-slate-300">
      {label}
      <input
        name={name}
        type={type}
        value={value}
        onChange={change}
        required={required}
        min={type === "number" ? 0 : undefined}
        step={
          name === "purchaseCost"
            ? "0.01"
            : type === "number"
              ? "1"
              : undefined
        }
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}
