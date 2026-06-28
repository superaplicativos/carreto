export const CATEGORY_INFO = {
  BRAS_A_PE: {
    id: "BRAS_A_PE",
    name: "Brás A Pé",
    icon: "🚶",
    vehicle: "Mochila / Bag",
    maxWeightKg: 8,
    basePriceMin: 10,
    basePriceMax: 12,
    radiusKm: 1.5,
    color: "bg-emerald-500",
    colorLight: "bg-emerald-100 text-emerald-700",
    description: "Pacotes pequenos, e-commerce, sacolas plásticas e aviamentos urgentes.",
  },
  BRAS_E_MOB: {
    id: "BRAS_E_MOB",
    name: "Brás E-Mob",
    icon: "🛴",
    vehicle: "Moto Elétrica",
    maxWeightKg: 15,
    basePriceMin: 15,
    basePriceMax: 20,
    radiusKm: 5,
    color: "bg-amber-500",
    colorLight: "bg-amber-100 text-amber-700",
    description: "Veículos elétricos de baixa potência para entregas regionais sem combustível.",
  },
  BRAS_BIKE: {
    id: "BRAS_BIKE",
    name: "Brás Bike",
    icon: "🚲",
    vehicle: "Bike",
    maxWeightKg: 15,
    basePriceMin: 15,
    basePriceMax: 20,
    radiusKm: 5,
    color: "bg-cyan-500",
    colorLight: "bg-cyan-100 text-cyan-700",
    description: "Entregas rápidas de médio volume num raio de até 5 km (Pari, Canindé e Centro).",
  },
  CARRETO_CARRINHO: {
    id: "CARRETO_CARRINHO",
    name: "Carreto Carrinho",
    icon: "🛒",
    vehicle: "Carrinho de Mão",
    maxWeightKg: 120,
    basePriceMin: 25,
    basePriceMax: 35,
    radiusKm: 1.5,
    color: "bg-orange-600",
    colorLight: "bg-orange-100 text-orange-700",
    description: "Fardos fechados de confecção, sacolas xadrezes gigantes e caixas pesadas.",
  },
} as const;

export type CategoryId = keyof typeof CATEGORY_INFO;

export const STATUS_INFO = {
  SOLICITADO: { label: "Solicitado", color: "bg-blue-100 text-blue-700 border-blue-200", icon: "📝" },
  RECEBIDO_BOX: { label: "Recebido no Box", color: "bg-amber-100 text-amber-700 border-amber-200", icon: "📥" },
  PRONTO_DESPACHO: { label: "Pronto p/ Despacho", color: "bg-purple-100 text-purple-700 border-purple-200", icon: "📦" },
  LIBERADO: { label: "Liberado p/ Entrega", color: "bg-orange-100 text-orange-700 border-orange-200", icon: "🔔" },
  EM_ENTREGA: { label: "Em Entrega", color: "bg-cyan-100 text-cyan-700 border-cyan-200", icon: "🚀" },
  ENTREGUE: { label: "Entregue", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: "✅" },
  CANCELADO: { label: "Cancelado", color: "bg-red-100 text-red-700 border-red-200", icon: "❌" },
  RETIRADO_LOJA: { label: "Retirado na Loja", color: "bg-zinc-100 text-zinc-700 border-zinc-200", icon: "🏪" },
} as const;

export type StatusId = keyof typeof STATUS_INFO;

export const ROLE_INFO = {
  ADMIN: { label: "Admin · Holding", icon: "🏛️", color: "bg-purple-600" },
  GERENTE: { label: "Gerente Geral", icon: "📊", color: "bg-orange-600" },
  ATENDENTE: { label: "Atendente de Box", icon: "🏷️", color: "bg-cyan-600" },
  LOJISTA: { label: "Lojista Parceiro", icon: "🏪", color: "bg-emerald-600" },
  ENTREGADOR: { label: "Entregador Parceiro", icon: "🛵", color: "bg-amber-600" },
} as const;

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function timeAgo(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}
