import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { canManage, getContext } from "@/lib/organization";

const schema = z.object({
  employeeName: z.string().trim().min(1).max(120),
  employeeEmail: z
    .union([z.string().trim().email().max(254), z.literal("")])
    .optional()
    .nullable(),
  department: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
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

  const assignments = await prisma.assetAssignment.findMany({
    where: { assetId: id },
    orderBy: { checkedOutAt: "desc" },
  });
  return NextResponse.json({ assignments });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getContext();
  if ("response" in ctx) return ctx.response;
  if (!canManage(ctx.membership.role)) {
    return NextResponse.json({ error: "You do not have permission to check out assets." }, { status: 403 });
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
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid check-out details." }, { status: 400 });
  }

  const activeAssignment = await prisma.assetAssignment.findFirst({
    where: { assetId: id, status: "CHECKED_OUT" },
    select: { id: true, employeeName: true },
  });
  if (activeAssignment) {
    return NextResponse.json(
      {
        error: `${asset.name} is already checked out to ${activeAssignment.employeeName}. Check it in first.`,
      },
      { status: 409 },
    );
  }

  const data = parsed.data;
  try {
    const assignment = await prisma.$transaction(async (tx) => {
      const created = await tx.assetAssignment.create({
        data: {
          assetId: id,
          assignedById: ctx.userId,
          employeeName: data.employeeName,
          employeeEmail: data.employeeEmail || null,
          department: data.department || null,
          notes: data.notes || null,
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          assetId: id,
          actorId: ctx.userId,
          action: "CHECK_OUT",
          entityType: "ASSET_ASSIGNMENT",
          entityId: created.id,
          changes: {
            after: {
              employeeName: created.employeeName,
              employeeEmail: created.employeeEmail,
              department: created.department,
            },
          },
        },
      });
      await tx.analyticsEvent.create({
        data: {
          organizationId: ctx.organization.id,
          actorId: ctx.userId,
          eventName: "asset.checked_out",
          properties: { assetId: id, assignmentId: created.id },
        },
      });
      return created;
    });
    return NextResponse.json({ assignment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to check out the asset." }, { status: 500 });
  }
}
