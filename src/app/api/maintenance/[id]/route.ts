import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { canAdminister, canManage, getContext } from "@/lib/organization";

const dateString = z
  .string()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "Enter a valid date.");

const schema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(2000).nullable(),
    vendor: z.string().trim().max(160).nullable(),
    cost: z.coerce.number().min(0).nullable(),
    performedAt: dateString.nullable(),
    nextDueAt: dateString.nullable(),
  })
  .partial();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getContext();
  if ("response" in ctx) return ctx.response;
  if (!canManage(ctx.membership.role)) {
    return NextResponse.json({ error: "You do not have permission to update maintenance records." }, { status: 403 });
  }

  const { id } = await params;
  const before = await prisma.maintenanceRecord.findFirst({
    where: { id, asset: { organizationId: ctx.organization.id } },
  });
  if (!before) {
    return NextResponse.json({ error: "Maintenance record not found." }, { status: 404 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid maintenance record." }, { status: 400 });
  }

  const data = parsed.data;
  const updates: Record<string, unknown> = {};
  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description || null;
  if (data.vendor !== undefined) updates.vendor = data.vendor || null;
  if (data.cost !== undefined) updates.cost = data.cost;
  if (data.performedAt !== undefined) {
    updates.performedAt = data.performedAt ? new Date(data.performedAt) : before.performedAt;
  }
  if (data.nextDueAt !== undefined) {
    updates.nextDueAt = data.nextDueAt ? new Date(data.nextDueAt) : null;
  }

  try {
    const record = await prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRecord.update({
        where: { id },
        data: updates as never,
      });
      await tx.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          assetId: before.assetId,
          actorId: ctx.userId,
          action: "UPDATE",
          entityType: "MAINTENANCE_RECORD",
          entityId: id,
          changes: {
            before: {
              title: before.title,
              vendor: before.vendor,
              cost: before.cost?.toString() ?? null,
              performedAt: before.performedAt.toISOString(),
              nextDueAt: before.nextDueAt?.toISOString() ?? null,
            },
            after: {
              title: updated.title,
              vendor: updated.vendor,
              cost: updated.cost?.toString() ?? null,
              performedAt: updated.performedAt.toISOString(),
              nextDueAt: updated.nextDueAt?.toISOString() ?? null,
            },
          },
        },
      });
      return updated;
    });
    return NextResponse.json({ record });
  } catch {
    return NextResponse.json({ error: "Unable to update the maintenance record." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getContext();
  if ("response" in ctx) return ctx.response;
  if (!canAdminister(ctx.membership.role)) {
    return NextResponse.json({ error: "Only an owner or admin can delete maintenance records." }, { status: 403 });
  }

  const { id } = await params;
  const before = await prisma.maintenanceRecord.findFirst({
    where: { id, asset: { organizationId: ctx.organization.id } },
  });
  if (!before) {
    return NextResponse.json({ error: "Maintenance record not found." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: {
        organizationId: ctx.organization.id,
        assetId: before.assetId,
        actorId: ctx.userId,
        action: "DELETE",
        entityType: "MAINTENANCE_RECORD",
        entityId: id,
        changes: {
          before: {
            title: before.title,
            vendor: before.vendor,
            cost: before.cost?.toString() ?? null,
            performedAt: before.performedAt.toISOString(),
          },
        },
      },
    });
    await tx.maintenanceRecord.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}
