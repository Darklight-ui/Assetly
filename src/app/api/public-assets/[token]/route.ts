import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tag = await prisma.assetTag.findFirst({ where: { publicToken: token }, include: { asset: true } });
  if (!tag || !tag.asset.publicEnabled) return NextResponse.json({ error: "This asset record is not publicly available." }, { status: 404 });
  return NextResponse.json({ asset: { name: tag.asset.name, assetTag: tag.asset.assetTag, condition: tag.asset.condition, publicDescription: tag.asset.publicDescription } });
}
