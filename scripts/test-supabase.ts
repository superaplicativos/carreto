import { PrismaClient } from '@prisma/client';

const urls = [
  'postgresql://postgres.ylvmpdcxltvjzdzanhgq:d-m7CjL52r76t%23G@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  'postgresql://postgres:d-m7CjL52r76t%23G@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  'postgresql://postgres.ylvmpdcxltvjzdzanhgq:d-m7CjL52r76t%23G@aws-0-sa-east-1.pooler.supabase.com:5432/postgres',
  'postgresql://postgres:d-m7CjL52r76t%23G@db.ylvmpdcxltvjzdzanhgq.supabase.co:5432/postgres',
];

for (const url of urls) {
  console.log('Testing:', url.replace(/:[^@]+@/, ':***@'));
  try {
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('  ✅ SUCCESS:', JSON.stringify(result));
    await prisma.$disconnect();
    break;
  } catch (e) {
    console.log('  ❌ FAIL:', e.message.substring(0, 200));
  }
}
