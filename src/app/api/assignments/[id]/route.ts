import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAdminister, canManage, getContext } from "@/lib/organization";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getContext();
  if ("response" in ctx) return ctx.response;
  if (!canManage(ctx.membership.role)) {
    return NextResponse.json({ error: "You do not have permission to check in assets." }, { status: 403 });
  }

  const { id } = await params;
  const assignment = await prisma.assetAssignment.findFirst({
    where: { id, asset: { organizationId: ctx.organization.id } },
    include: { asset: true },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }
  if (assignment.status === "CHECKED_IN") {
    return NextResponse.json({ error: "This asset has already been checked in." }, { status: 409 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const checkedIn = await tx.assetAssignment.update({
        where: { id },
        data: { status: "CHECKED_IN", checkedInAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          organizationId: ctx.organization.id,
          assetId: assignment.assetId,
          actorId: ctx.userId,
          action: "CHECK_IN",
          entityType: "ASSET_ASSIGNMENT",
          entityId: id,
          changes: {
            before: {
              status: assignment.status,
              checkedInAt: assignment.checkedInAt?.toISOString() ?? null,
            },
            after: {
              status: checkedIn.status,
              checkedInAt: checkedIn.checkedInAt?.toISOString() ?? null,
            },
          },
        },
      });
      await tx.analyticsEvent.create({
        data: {
          organizationId: ctx.organization.id,
          actorId: ctx.userId,
          eventName: "asset.checked_in",
          properties: { assetId: assignment.assetId, assignmentId: id },
        },
      });
      return checkedIn;
    });
    return NextResponse.json({ assignment: updated });
  } catch {
    return NextResponse.json({ error: "Unable to check in the asset." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getContext();
  if ("response" in ctx) return ctx.response;
  if (!canAdminister(ctx.membership.role)) {
    return NextResponse.json({ error: "Only an owner or admin can delete assignment records." }, { status: 403 });
  }

  const { id } = await params;
  const assignment = await prisma.assetAssignment.findFirst({
    where: { id, asset: { organizationId: ctx.organization.id } },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: {
        organizationId: ctx.organization.id,
        assetId: assignment.assetId,
        actorId: ctx.userId,
        action: "DELETE",
        entityType: "ASSET_ASSIGNMENT",
        entityId: id,
        changes: {
          before: {
            employeeName: assignment.employeeName,
            status: assignment.status,
            checkedOutAt: assignment.checkedOutAt.toISOString(),
          },
        },
      },
    });
    await tx.assetAssignment.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}
