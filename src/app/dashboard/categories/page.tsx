import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage, getActiveMembership } from "@/lib/organization";
import { TaxonomyManager } from "@/components/taxonomy-manager";

export default async function CategoriesPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const membership = await getActiveMembership(userId);
  if (!membership) redirect("/register");

  const categories = await prisma.assetCategory.findMany({
    where: { organizationId: membership.organizationId },
    include: { _count: { select: { assets: true } } },
    orderBy: { name: "asc" },
  });

  const items = categories.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    assetCount: category._count.assets,
  }));

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-8 lg:px-10">
      <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">
        ← Dashboard
      </Link>
      <header className="mt-6">
        <p className="text-xs uppercase tracking-[.18em] text-blue-300">
          Workspace setup
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Asset categories</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Group inventory into shared categories for {membership.organization.name}.
          Deleting a category leaves its assets in place, uncategorized.
        </p>
      </header>
      <TaxonomyManager
        kind="category"
        items={items}
        canManage={canManage(membership.role)}
      />
    </main>
  );
}
