"use client";

import { useEffect, useRef } from "react";
import { getSupabase, isRealtimeEnabled } from "@/lib/supabase-client";

/**
 * Hook que escuta mudanças em uma tabela do Supabase Realtime
 * e chama um callback quando algo mudar.
 *
 * Se Supabase não estiver configurado, cai automaticamente pra polling.
 *
 * @param table Nome da tabela (ex: "DeliveryRequest")
 * @param callback Função chamada quando há mudança
 * @param pollingMs Intervalo de polling (fallback), default 10s
 */
export function useRealtime(
  table: string,
  callback: () => void,
  pollingMs: number = 10000
) {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const supabase = getSupabase();

    // === MODO REALTIME (Supabase configurado) ===
    if (supabase && isRealtimeEnabled) {
      const channel = supabase
        .channel(`realtime-${table}-${Math.random().toString(36).slice(2, 6)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          () => {
            callbackRef.current();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    // === FALLBACK: POLLING ===
    const interval = setInterval(() => {
      callbackRef.current();
    }, pollingMs);

    return () => clearInterval(interval);
  }, [table, pollingMs]);
}

/**
 * Hook que escuta mudanças em MÚLTIPLAS tabelas ao mesmo tempo.
 * Útil pra dashboards que precisam reagir a mudanças em várias tabelas.
 */
export function useRealtimeMulti(
  tables: string[],
  callback: () => void,
  pollingMs: number = 10000
) {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const tablesKey = tables.join(",");

  useEffect(() => {
    const supabase = getSupabase();

    if (supabase && isRealtimeEnabled) {
      const channelName = `realtime-multi-${tablesKey}-${Math.random().toString(36).slice(2, 6)}`;
      let channel = supabase.channel(channelName);

      for (const table of tables) {
        channel = channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          () => callbackRef.current()
        );
      }
      channel.subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    const interval = setInterval(() => {
      callbackRef.current();
    }, pollingMs);

    return () => clearInterval(interval);
  }, [tablesKey, pollingMs]);
}
