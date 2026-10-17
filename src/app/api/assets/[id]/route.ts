import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { canManage, getContext } from "@/lib/organization";
const schema = z.object({ name: z.string().trim().min(1).max(160).optional(), description: z.string().max(4000).nullable().optional(), assetTag: z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9_-]+$/).optional(), serialNumber: z.string().trim().max(120).nullable().optional(), categoryId: z.string().nullable().optional(), locationId: z.string().nullable().optional(), custodianName: z.string().max(120).nullable().optional(), condition: z.enum(["GOOD","DAMAGED","UNDER_REPAIR","MISSING","DISPOSED"]).optional(), quantity: z.coerce.number().int().min(1).max(100000).optional(), quantityGood: z.coerce.number().int().min(0).optional(), quantityDamaged: z.coerce.number().int().min(0).optional(), quantityUnaccounted: z.coerce.number().int().min(0).optional(), purchaseDate: z.string().nullable().optional(), purchaseCost: z.coerce.number().min(0).nullable().optional(), supplier: z.string().max(160).nullable().optional(), warrantyExpiry: z.string().nullable().optional(), notes: z.string().max(4000).nullable().optional(), publicEnabled: z.boolean().optional(), publicDescription: z.string().max(500).nullable().optional() });
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getContext();
  if ("response" in ctx) return ctx.response;

  const { id } = await params;
  const asset = await prisma.asset.findFirst({
    where: { id, organizationId: ctx.organization.id },
    include: {
      category: true,
      location: true,
      assignments: { orderBy: { checkedOutAt: "desc" } },
      maintenanceRecords: { orderBy: { performedAt: "desc" } },
      tags: true,
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          actor: { select: { name: true, email: true } },
        },
      },
    },
  });
  if (!asset) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }
  return NextResponse.json({ asset });
}
export async function PATCH(request: Request,{params}:{params:Promise<{id:string}>}) { const ctx=await getContext(); if("response" in ctx)return ctx.response; if(!canManage(ctx.membership.role))return NextResponse.json({error:"You do not have permission to update assets."},{status:403}); const {id}=await params; const before=await prisma.asset.findFirst({where:{id,organizationId:ctx.organization.id}}); if(!before)return NextResponse.json({error:"Asset not found."},{status:404}); const parsed=schema.safeParse(await request.json().catch(()=>null)); if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message??"Invalid data."},{status:400}); const data=parsed.data; const update: Record<string, unknown>={...data}; for(const key of ["purchaseDate","warrantyExpiry"] as const) if(key in data) update[key]=data[key]?new Date(data[key] as string):null; if(data.categoryId){const ok=await prisma.assetCategory.findFirst({where:{id:data.categoryId,organizationId:ctx.organization.id}});if(!ok)return NextResponse.json({error:"Invalid category."},{status:400});} if(data.locationId){const ok=await prisma.location.findFirst({where:{id:data.locationId,organizationId:ctx.organization.id}});if(!ok)return NextResponse.json({error:"Invalid location."},{status:400});} const merged={quantity:data.quantity??before.quantity,quantityGood:data.quantityGood??before.quantityGood,quantityDamaged:data.quantityDamaged??before.quantityDamaged,quantityUnaccounted:data.quantityUnaccounted??before.quantityUnaccounted}; if(merged.quantityGood+merged.quantityDamaged+merged.quantityUnaccounted>merged.quantity)return NextResponse.json({error:"Condition quantities cannot exceed total quantity."},{status:400}); try{const asset=await prisma.$transaction(async tx=>{const after=await tx.asset.update({where:{id},data:update as never,include:{category:true,location:true}}); const changes:Record<string,{from:unknown;to:unknown}>={}; for(const [key,value] of Object.entries(data)){const old=(before as unknown as Record<string,unknown>)[key]; if(String(old??"")!==String(value??""))changes[key]={from:old??null,to:value??null};} await tx.auditLog.create({data:{organizationId:ctx.organization.id,assetId:id,actorId:ctx.userId,action:"UPDATE",entityType:"ASSET",entityId:id,changes}}); await tx.analyticsEvent.create({data:{organizationId:ctx.organization.id,actorId:ctx.userId,eventName:"asset.updated",properties:{assetId:id,changedFields:Object.keys(changes)}}});return after;});return NextResponse.json({asset});}catch(e:unknown){if((e as {code?:string})?.code==="P2002")return NextResponse.json({error:"Asset tag or serial number already exists."},{status:409});return NextResponse.json({error:"Unable to update asset."},{status:500});} }
export async function DELETE(_request: Request,{params}:{params:Promise<{id:string}>}){const ctx=await getContext();if("response" in ctx)return ctx.response;if(!["OWNER","ADMIN"].includes(ctx.membership.role))return NextResponse.json({error:"Only an owner or admin can delete assets."},{status:403});const {id}=await params;const before=await prisma.asset.findFirst({where:{id,organizationId:ctx.organization.id}});if(!before)return NextResponse.json({error:"Asset not found."},{status:404});await prisma.$transaction(async tx=>{await tx.auditLog.create({data:{organizationId:ctx.organization.id,actorId:ctx.userId,action:"DELETE",entityType:"ASSET",entityId:id,changes:{before:{name:before.name,assetTag:before.assetTag,condition:before.condition,quantity:before.quantity}}}});await tx.analyticsEvent.create({data:{organizationId:ctx.organization.id,actorId:ctx.userId,eventName:"asset.deleted",properties:{assetId:id}}});await tx.asset.delete({where:{id}})});return NextResponse.json({ok:true});}
