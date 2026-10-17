import Link from "next/link";
import { AssetForm } from "@/components/asset-form";

export default function NewAsset() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-8 lg:px-10">
      <Link href="/dashboard/assets" className="text-sm text-slate-400">
        ← Back to assets
      </Link>
      <h1 className="mt-6 text-3xl font-semibold">Add an asset</h1>
      <p className="mt-2 text-sm text-slate-400">
        Create a traceable record for equipment, furniture or other physical
        inventory.
      </p>
      <AssetForm mode="create" />
    </main>
  );
}
