// Teste de conexão usando pg direto (sem Prisma) com SNI
import pg from 'pg';

const configs = [
  {
    name: 'Pooler 6543 com project ref (SNI)',
    config: {
      host: 'aws-0-sa-east-1.pooler.supabase.com',
      port: 6543,
      user: 'postgres.ylvmpdcxltvjzdzanhgq',
      password: 'd-m7CjL52r76t#G',
      database: 'postgres',
      ssl: { rejectUnauthorized: false, servername: 'aws-0-sa-east-1.pooler.supabase.com' },
      connectionTimeoutMillis: 8000,
    },
  },
  {
    name: 'Pooler 5432 com project ref (SNI)',
    config: {
      host: 'aws-0-sa-east-1.pooler.supabase.com',
      port: 5432,
      user: 'postgres.ylvmpdcxltvjzdzanhgq',
      password: 'd-m7CjL52r76t#G',
      database: 'postgres',
      ssl: { rejectUnauthorized: false, servername: 'aws-0-sa-east-1.pooler.supabase.com' },
      connectionTimeoutMillis: 8000,
    },
  },
];

for (const { name, config } of configs) {
  console.log(`\n=== ${name} ===`);
  const client = new pg.Client(config);
  try {
    await client.connect();
    const res = await client.query('SELECT 1 as test, current_database() as db, current_user as user');
    console.log('✅ SUCCESS:', res.rows[0]);
  } catch (e) {
    console.log('❌ FAIL:', e.message);
  } finally {
    try { await client.end(); } catch {}
  }
}
