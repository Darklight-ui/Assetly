import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveMembership } from "@/lib/organization";
import { AssetForm } from "@/components/asset-form";

export default async function NewAsset() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const membership = await getActiveMembership(userId);
  if (!membership) redirect("/register");

  const [categories, locations] = await Promise.all([
    prisma.assetCategory.findMany({
      where: { organizationId: membership.organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.location.findMany({
      where: { organizationId: membership.organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-8 lg:px-10">
      <Link href="/dashboard/assets" className="text-sm text-slate-400">
        ← Back to assets
      </Link>
      <h1 className="mt-6 text-3xl font-semibold">Add an asset</h1>
      <p className="mt-2 text-sm text-slate-400">
        Create a traceable record in {membership.organization.name} for
        equipment, furniture or other physical inventory.
      </p>
      <AssetForm
        mode="create"
        categories={categories}
        locations={locations}
      />
    </main>
  );
}
