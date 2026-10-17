import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email().max(254), password: z.string().min(10).max(128), organizationName: z.string().trim().min(2).max(100) });
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid name, email, password (at least 10 characters), and organization name." }, { status: 400 });
  const { name, email, password, organizationName } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email: normalizedEmail } })) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  const slug = `${organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${crypto.randomUUID().slice(0,6)}`;
  try {
    const user = await prisma.$transaction(async tx => {
      const createdUser = await tx.user.create({ data: { name, email: normalizedEmail, passwordHash: await hash(password, 12) } });
      const org = await tx.organization.create({ data: { name: organizationName, slug, memberships: { create: { userId: createdUser.id, role: "OWNER" } }, categories: { create: [{ name: "IT Equipment" }, { name: "Furniture" }, { name: "Appliances" }, { name: "Vehicles" }, { name: "Other" }] }, locations: { create: [{ name: "Main Office" }] }, subscriptions: { create: { planKey: "free", status: "ACTIVE" } } } });
      await tx.analyticsEvent.create({ data: { organizationId: org.id, actorId: createdUser.id, eventName: "organization.created", properties: { source: "registration" } } });
      return createdUser;
    });
    return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
  } catch { return NextResponse.json({ error: "Could not create the account. Please try again." }, { status: 500 }); }
}
