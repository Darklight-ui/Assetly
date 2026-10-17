import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { canManage, getContext } from "@/lib/organization";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  building: z.string().trim().max(80).optional().nullable(),
  floor: z.string().trim().max(40).optional().nullable(),
  room: z.string().trim().max(80).optional().nullable(),
  department: z.string().trim().max(80).optional().nullable(),
});

export async function GET() {
  const ctx = await getContext();
  if ("response" in ctx) return ctx.response;

  const locations = await prisma.location.findMany({
    where: { organizationId: ctx.organization.id },
    include: { _count: { select: { assets: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ locations });
}

export async function POST(request: Request) {
  const ctx = await getContext();
  if ("response" in ctx) return ctx.response;
  if (!canManage(ctx.membership.role)) {
    return NextResponse.json({ error: "You do not have permission to manage locations." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid location." }, { status: 400 });
  }

  const data = parsed.data;
  try {
    const location = await prisma.$transaction(async (tx) => {
      const created = await tx.location.create({
        data: {
          organizationId: ctx.organization.id,
          name: data.name,
          building: data.building || null,
          floor: data.floor || null,
          room: data.room || null,
          department: data.department || null,
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          actorId: ctx.userId,
          action: "CREATE",
          entityType: "LOCATION",
          entityId: created.id,
          changes: {
            after: {
              name: created.name,
              building: created.building,
              floor: created.floor,
              room: created.room,
              department: created.department,
            },
          },
        },
      });
      return created;
    });
    return NextResponse.json({ location }, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === "P2002") {
      return NextResponse.json({ error: "A location with this name already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to save location." }, { status: 500 });
  }
}
