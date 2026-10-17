import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage, getActiveMembership } from "@/lib/organization";
import { TaxonomyManager } from "@/components/taxonomy-manager";

export default async function LocationsPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const membership = await getActiveMembership(userId);
  if (!membership) redirect("/register");

  const locations = await prisma.location.findMany({
    where: { organizationId: membership.organizationId },
    include: { _count: { select: { assets: true } } },
    orderBy: { name: "asc" },
  });

  const items = locations.map((location) => ({
    id: location.id,
    name: location.name,
    building: location.building,
    floor: location.floor,
    room: location.room,
    department: location.department,
    assetCount: location._count.assets,
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
        <h1 className="mt-2 text-3xl font-semibold">Locations</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Track where equipment lives across {membership.organization.name}.
          Deleting a location clears it from its assets without deleting the
          asset records.
        </p>
      </header>
      <TaxonomyManager
        kind="location"
        items={items}
        canManage={canManage(membership.role)}
      />
    </main>
  );
}
