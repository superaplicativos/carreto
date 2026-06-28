// Teste com SNI explicitamente configurado via sni object
import pg from 'pg';
import dns from 'dns/promises';

// Resolve primeiro o hostname
console.log('=== Resolving DNS ===');
try {
  const records = await dns.resolve4('aws-0-sa-east-1.pooler.supabase.com');
  console.log('DNS resolved to:', records);
} catch (e) {
  console.log('DNS error:', e.message);
}

// Teste com opções avançadas de SNI
const configs = [
  {
    name: 'Pooler 6543 + project ref in user + SNI via options',
    config: {
      host: 'aws-0-sa-east-1.pooler.supabase.com',
      port: 6543,
      user: 'postgres.ylvmpdcxltvjzdzanhgq',
      password: 'd-m7CjL52r76t#G',
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      options: '-c search_path=public',
    },
  },
  {
    name: 'Pooler 6543 + project ref in user + SSL required',
    config: {
      host: 'aws-0-sa-east-1.pooler.supabase.com',
      port: 6543,
      user: 'postgres.ylvmpdcxltvjzdzanhgq',
      password: 'd-m7CjL52r76t#G',
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    },
  },
  {
    name: 'Direct DB host with project ref in user',
    config: {
      host: 'db.ylvmpdcxltvjzdzanhgq.supabase.co',
      port: 5432,
      user: 'postgres',
      password: 'd-m7CjL52r76t#G',
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    },
  },
];

for (const { name, config } of configs) {
  console.log(`\n=== ${name} ===`);
  console.log('Config:', { ...config, password: '***' });
  const client = new pg.Client(config);
  try {
    await client.connect();
    const res = await client.query('SELECT 1 as test, current_database() as db');
    console.log('✅ SUCCESS:', res.rows[0]);
    await client.end();
    break;
  } catch (e) {
    console.log('❌ FAIL:', e.message);
    try { await client.end(); } catch {}
  }
}
