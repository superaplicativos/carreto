import { NextResponse } from "next/server";

/**
 * Endpoint de diagnóstico — mostra se as env vars do Supabase estão
 * acessíveis no server. NÃO expõe a chave completa.
 *
 * Acesse /api/debug-env para verificar a configuração.
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const databaseUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;

  return NextResponse.json({
    supabase: {
      url_configured: Boolean(supabaseUrl),
      url_value: supabaseUrl ? `${supabaseUrl.substring(0, 40)}...` : null,
      anon_key_configured: Boolean(supabaseAnon),
      anon_key_length: supabaseAnon?.length || 0,
      anon_key_prefix: supabaseAnon ? supabaseAnon.substring(0, 20) + "..." : null,
    },
    database: {
      database_url_configured: Boolean(databaseUrl),
      direct_url_configured: Boolean(directUrl),
    },
    node_env: process.env.NODE_ENV,
    vercel_env: process.env.VERCEL_ENV,
    timestamp: new Date().toISOString(),
  });
}
