import { PrismaClient } from "@prisma/client";
const prisma=new PrismaClient();
async function main(){console.log("No demo user is seeded by default. Register through /register to create a real account and organization.");}
main().finally(()=>prisma.$disconnect());
