import Link from "next/link";
import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  History,
  MapPin,
  QrCode,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/organization";
import {
  ConditionQuickActions,
  DeleteAssetButton,
} from "./asset-actions";

export default async function AssetDetail({
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
    include: {
      category: true,
      location: true,
      tags: true,
      assignments: { orderBy: { checkedOutAt: "desc" }, take: 10 },
      maintenanceRecords: { orderBy: { performedAt: "desc" }, take: 10 },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          actor: { select: { name: true, email: true } },
        },
      },
    },
  });
  if (!asset) notFound();

  const canEdit = canManage(membership.role);
  const canDelete = ["OWNER", "ADMIN"].includes(membership.role);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-8 lg:px-10">
      <Link
        href="/dashboard/assets"
        className="text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="mr-2 inline" size={15} />
        Back to assets
      </Link>

      <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="font-mono text-xs text-blue-300">{asset.assetTag}</p>
          <h1 className="mt-2 text-3xl font-semibold">{asset.name}</h1>
          <p className="mt-2 text-sm text-slate-400">
            {asset.category?.name ?? "Uncategorized"} ·{" "}
            {asset.location?.name ?? "Location not set"}
          </p>
        </div>
        <ConditionQuickActions
          assetId={asset.id}
          current={asset.condition}
          canManage={canEdit}
        />
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <Stat label="Total quantity" value={asset.quantity.toString()} />
        <Stat label="Good condition" value={asset.quantityGood.toString()} />
        <Stat
          label="Damaged / unaccounted"
          value={`${asset.quantityDamaged} / ${asset.quantityUnaccounted}`}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_.8fr]">
        <section className="rounded-2xl border border-white/[.08] bg-[#0d121d] p-5">
          <h2 className="font-semibold">Asset information</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              ["Serial number", asset.serialNumber],
              ["Custodian", asset.custodianName],
              ["Supplier", asset.supplier],
              [
                "Purchase date",
                asset.purchaseDate?.toLocaleDateString("en-NG"),
              ],
              [
                "Warranty expiry",
                asset.warrantyExpiry?.toLocaleDateString("en-NG"),
              ],
              [
                "Purchase cost",
                asset.purchaseCost == null
                  ? null
                  : new Intl.NumberFormat("en-NG", {
                      style: "currency",
                      currency: "NGN",
                    }).format(Number(asset.purchaseCost)),
              ],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-sm">
                  {value == null || value === ""
                    ? "Not recorded"
                    : String(value)}
                </p>
              </div>
            ))}
          </div>
          {asset.description && (
            <p className="mt-5 border-t border-white/[.07] pt-4 text-sm leading-6 text-slate-400">
              {asset.description}
            </p>
          )}
          {asset.notes && (
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {asset.notes}
            </p>
          )}
          {canEdit && (
            <Link
              href={`/dashboard/assets/${asset.id}/edit`}
              className="mt-6 inline-block rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold"
            >
              Edit asset
            </Link>
          )}
        </section>

        <section className="rounded-2xl border border-white/[.08] bg-[#0d121d] p-5">
          <QrCode className="text-blue-300" size={21} />
          <h2 className="mt-3 font-semibold">QR asset tag</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Generate a QR code that opens this asset&apos;s public-safe tag
            page. Public display is disabled until you explicitly enable it.
          </p>
          <Link
            href={`/dashboard/tags?assetId=${asset.id}`}
            className="mt-4 inline-block text-sm text-blue-300"
          >
            Open label generator →
          </Link>
          <p className="mt-5 text-xs text-slate-500">
            Public page: {asset.publicEnabled ? "Enabled" : "Disabled"}
          </p>
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-white/[.08] bg-[#0d121d] p-5">
        <div className="flex items-center gap-2">
          <History className="text-blue-300" size={19} />
          <h2 className="font-semibold">Audit history</h2>
        </div>
        {asset.auditLogs.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No changes recorded yet.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {asset.auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex gap-3 border-t border-white/[.06] pt-4"
              >
                <div className="mt-1 size-2 shrink-0 rounded-full bg-blue-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{log.action} asset</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {log.actor?.name ?? log.actor?.email ?? "System"} ·{" "}
                    {log.createdAt.toLocaleString("en-NG")}
                  </p>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-[11px] text-slate-400">
                    {JSON.stringify(log.changes, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-5 grid gap-5 sm:grid-cols-2">
        <HistoryCard
          title="Assignments"
          icon={<MapPin size={18} />}
          rows={asset.assignments.map(
            (assignment) =>
              `${assignment.employeeName} · ${assignment.status.replaceAll("_", " ")} · ${assignment.checkedOutAt.toLocaleDateString("en-NG")}`,
          )}
        />
        <HistoryCard
          title="Maintenance"
          icon={<CalendarClock size={18} />}
          rows={asset.maintenanceRecords.map(
            (record) =>
              `${record.title} · ${record.performedAt.toLocaleDateString("en-NG")}`,
          )}
        />
      </section>

      {canDelete && (
        <section className="mt-5 rounded-2xl border border-red-400/15 bg-[#0d121d] p-5">
          <h2 className="font-semibold text-red-300">Danger zone</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
            Deleting this asset removes its record, QR tag, assignments and
            maintenance history. The deletion is recorded in your organization
            audit log.
          </p>
          <div className="mt-4">
            <DeleteAssetButton
              assetId={asset.id}
              assetName={asset.name}
              assetTag={asset.assetTag}
            />
          </div>
        </section>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[.08] bg-[#0d121d] p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function HistoryCard({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: ReactNode;
  rows: string[];
}) {
  return (
    <section className="rounded-2xl border border-white/[.08] bg-[#0d121d] p-5">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-semibold">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No records yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row, index) => (
            <li
              key={index}
              className="border-t border-white/[.06] pt-3 text-sm text-slate-400"
            >
              {row}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
