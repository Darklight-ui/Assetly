import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { canManage, getContext } from "@/lib/organization";

const dateString = z
  .string()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "Enter a valid date.");

const schema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional().nullable(),
  vendor: z.string().trim().max(160).optional().nullable(),
  cost: z.coerce.number().min(0).optional().nullable(),
  performedAt: dateString.optional().nullable(),
  nextDueAt: dateString.optional().nullable(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getContext();
  if ("response" in ctx) return ctx.response;

  const { id } = await params;
  const asset = await prisma.asset.findFirst({
    where: { id, organizationId: ctx.organization.id },
    select: { id: true },
  });
  if (!asset) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  const records = await prisma.maintenanceRecord.findMany({
    where: { assetId: id },
    orderBy: { performedAt: "desc" },
  });
  return NextResponse.json({ records });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getContext();
  if ("response" in ctx) return ctx.response;
  if (!canManage(ctx.membership.role)) {
    return NextResponse.json({ error: "You do not have permission to log maintenance." }, { status: 403 });
  }

  const { id } = await params;
  const asset = await prisma.asset.findFirst({
    where: { id, organizationId: ctx.organization.id },
  });
  if (!asset) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid maintenance record." }, { status: 400 });
  }

  const data = parsed.data;
  try {
    const record = await prisma.$transaction(async (tx) => {
      const created = await tx.maintenanceRecord.create({
        data: {
          assetId: id,
          createdById: ctx.userId,
          title: data.title,
          description: data.description || null,
          vendor: data.vendor || null,
          cost: data.cost == null ? null : data.cost,
          performedAt: data.performedAt ? new Date(data.performedAt) : new Date(),
          nextDueAt: data.nextDueAt ? new Date(data.nextDueAt) : null,
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          assetId: id,
          actorId: ctx.userId,
          action: "CREATE",
          entityType: "MAINTENANCE_RECORD",
          entityId: created.id,
          changes: {
            after: {
              title: created.title,
              vendor: created.vendor,
              cost: created.cost?.toString() ?? null,
              performedAt: created.performedAt.toISOString(),
              nextDueAt: created.nextDueAt?.toISOString() ?? null,
            },
          },
        },
      });
      await tx.analyticsEvent.create({
        data: {
          organizationId: ctx.organization.id,
          actorId: ctx.userId,
          eventName: "maintenance.recorded",
          properties: { assetId: id, maintenanceId: created.id },
        },
      });
      return created;
    });
    return NextResponse.json({ record }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to save the maintenance record." }, { status: 500 });
  }
}
