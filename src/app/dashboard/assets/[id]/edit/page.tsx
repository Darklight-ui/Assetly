import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/organization";
import {
  AssetForm,
  type AssetFormValues,
} from "@/components/asset-form";

function dateValue(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function EditAsset({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const membership = await prisma.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) redirect("/register");

  const { id } = await params;
  const asset = await prisma.asset.findFirst({
    where: { id, organizationId: membership.organizationId },
  });
  if (!asset) notFound();

  if (!canManage(membership.role)) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-5 py-8 lg:px-10">
        <Link
          href={`/dashboard/assets/${asset.id}`}
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Back to asset
        </Link>
        <section className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-6">
          <h1 className="text-xl font-semibold">You cannot edit this asset</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Only owners, admins and asset managers can update asset records. Ask
            a workspace manager to make the change.
          </p>
        </section>
      </main>
    );
  }

  const initial: AssetFormValues = {
    name: asset.name,
    assetTag: asset.assetTag,
    description: asset.description ?? "",
    serialNumber: asset.serialNumber ?? "",
    condition: asset.condition,
    quantity: String(asset.quantity),
    quantityGood: String(asset.quantityGood),
    quantityDamaged: String(asset.quantityDamaged),
    quantityUnaccounted: String(asset.quantityUnaccounted),
    purchaseCost: asset.purchaseCost?.toString() ?? "",
    purchaseDate: dateValue(asset.purchaseDate),
    supplier: asset.supplier ?? "",
    warrantyExpiry: dateValue(asset.warrantyExpiry),
    custodianName: asset.custodianName ?? "",
    notes: asset.notes ?? "",
    publicEnabled: asset.publicEnabled,
    publicDescription: asset.publicDescription ?? "",
  };

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-8 lg:px-10">
      <Link
        href={`/dashboard/assets/${asset.id}`}
        className="text-sm text-slate-400 hover:text-white"
      >
        ← Back to asset
      </Link>
      <div className="mt-6">
        <p className="font-mono text-xs text-blue-300">{asset.assetTag}</p>
        <h1 className="mt-2 text-3xl font-semibold">Edit asset</h1>
        <p className="mt-2 text-sm text-slate-400">
          Update the record for {asset.name}. Changes are written to the asset
          audit history.
        </p>
      </div>
      <AssetForm mode="edit" assetId={asset.id} initial={initial} />
    </main>
  );
}
