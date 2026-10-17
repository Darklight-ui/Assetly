import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { canManage, getContext } from "@/lib/organization";

const schema = z
  .object({
    name: z.string().trim().min(1).max(80),
    building: z.string().trim().max(80).nullable(),
    floor: z.string().trim().max(40).nullable(),
    room: z.string().trim().max(80).nullable(),
    department: z.string().trim().max(80).nullable(),
  })
  .partial();

const optionalFields = ["building", "floor", "room", "department"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getContext();
  if ("response" in ctx) return ctx.response;
  if (!canManage(ctx.membership.role)) {
    return NextResponse.json({ error: "You do not have permission to manage locations." }, { status: 403 });
  }

  const { id } = await params;
  const before = await prisma.location.findFirst({
    where: { id, organizationId: ctx.organization.id },
  });
  if (!before) {
    return NextResponse.json({ error: "Location not found." }, { status: 404 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid location." }, { status: 400 });
  }

  const updates: Record<string, string | null> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  for (const field of optionalFields) {
    if (parsed.data[field] !== undefined) {
      updates[field] = parsed.data[field] || null;
    }
  }

  try {
    const location = await prisma.$transaction(async (tx) => {
      const updated = await tx.location.update({
        where: { id },
        data: updates as never,
      });
      await tx.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          actorId: ctx.userId,
          action: "UPDATE",
          entityType: "LOCATION",
          entityId: id,
          changes: {
            before: {
              name: before.name,
              building: before.building,
              floor: before.floor,
              room: before.room,
              department: before.department,
            },
            after: {
              name: updated.name,
              building: updated.building,
              floor: updated.floor,
              room: updated.room,
              department: updated.department,
            },
          },
        },
      });
      return updated;
    });
    return NextResponse.json({ location });
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === "P2002") {
      return NextResponse.json({ error: "A location with this name already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to update location." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getContext();
  if ("response" in ctx) return ctx.response;
  if (!canManage(ctx.membership.role)) {
    return NextResponse.json({ error: "You do not have permission to manage locations." }, { status: 403 });
  }

  const { id } = await params;
  const before = await prisma.location.findFirst({
    where: { id, organizationId: ctx.organization.id },
    include: { _count: { select: { assets: true } } },
  });
  if (!before) {
    return NextResponse.json({ error: "Location not found." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: {
        organizationId: ctx.organization.id,
        actorId: ctx.userId,
        action: "DELETE",
        entityType: "LOCATION",
        entityId: id,
        changes: {
          before: {
            name: before.name,
            building: before.building,
            floor: before.floor,
            room: before.room,
            department: before.department,
            detachedAssets: before._count.assets,
          },
        },
      },
    });
    await tx.location.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}
