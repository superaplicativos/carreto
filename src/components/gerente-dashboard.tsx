"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { toast } from "sonner";
import {
  BarChart3, Users, Truck, DollarSign, TrendingUp, Activity,
  Package, Clock, MapPin, AlertTriangle, Loader2, CheckCircle2,
} from "lucide-react";
import { CATEGORY_INFO, STATUS_INFO, formatBRL, formatDateTime, timeAgo } from "@/lib/constants";
import { useRealtimeMulti } from "@/hooks/use-realtime";

interface Stats {
  summary: {
    totalRequests: number;
    requestsToday: number;
    entregues: number;
    emAndamento: number;
    liberados: number;
    recebidosBox: number;
    cancelados: number;
    entregadoresAtivos: number;
    lojistasAtivos: number;
    totalRevenue: number;
    revenueToday: number;
  };
  requestsByCategory: { category: keyof typeof CATEGORY_INFO; count: number; revenue: number }[];
  statusCounts: { status: keyof typeof STATUS_INFO; count: number }[];
  dailyRevenue: { date: string; revenue: number }[];
}

interface Request {
  id: string;
  code: string;
  status: keyof typeof STATUS_INFO;
  vehicleCategory: keyof typeof CATEGORY_INFO;
  totalPrice: number;
  createdAt: string;
  lojista: { name: string };
  entregador?: { name: string } | null;
  originLocation: { name: string };
  destLocation: { name: string };
}

export function GerenteDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [statsRes, reqRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/requests"),
      ]);
      const [statsData, reqData] = await Promise.all([statsRes.json(), reqRes.json()]);
      setStats(statsData);
      setRequests(reqData.requests || []);
    } catch (e) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime: escuta mudanças em pedidos, transações e audit log
  // Fallback automático pra polling (15s) se Supabase não estiver configurado
  useRealtimeMulti(["DeliveryRequest", "Transaction", "AuditLog"], fetchAll, 15000);

  if (loading || !stats) {
    return <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  }

  const s = stats.summary;
  const taxaConversao = s.totalRequests > 0 ? (s.entregues / s.totalRequests) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" /> Dashboard Operacional
        </h1>
        <p className="text-muted-foreground text-sm">
          Monitor em tempo real de boxes, entregadores e entregas do dia
        </p>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Pedidos hoje"
          value={s.requestsToday}
          icon={<Package className="w-5 h-5" />}
          subtitle={`${s.totalRequests} no total`}
          color="text-blue-600"
        />
        <KpiCard
          title="Em andamento"
          value={s.emAndamento}
          icon={<Truck className="w-5 h-5" />}
          subtitle={`${s.liberados} aguardando entregador`}
          color="text-cyan-600"
        />
        <KpiCard
          title="Entregues"
          value={s.entregues}
          icon={<CheckCircle2 className="w-5 h-5" />}
          subtitle={`${taxaConversao.toFixed(1)}% de conversão`}
          color="text-emerald-600"
        />
        <KpiCard
          title="Faturamento hoje"
          value={formatBRL(s.revenueToday)}
          icon={<DollarSign className="w-5 h-5" />}
          subtitle={`${formatBRL(s.totalRevenue)} acumulado`}
          color="text-orange-600"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat label="No box" value={s.recebidosBox} icon="📥" />
        <MiniStat label="Entregadores ativos" value={s.entregadoresAtivos} icon="🛵" />
        <MiniStat label="Lojistas ativos" value={s.lojistasAtivos} icon="🏪" />
        <MiniStat label="Cancelados" value={s.cancelados} icon="❌" />
      </div>

      <Tabs defaultValue="graficos">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="graficos">Gráficos</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos ao vivo</TabsTrigger>
          <TabsTrigger value="boxes">Monitor de Boxes</TabsTrigger>
        </TabsList>

        {/* ===== GRÁFICOS ===== */}
        <TabsContent value="graficos" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Faturamento últimos 7 dias</CardTitle>
                <CardDescription>Receita paga por dia (R$)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={stats.dailyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      fontSize={11}
                    />
                    <YAxis fontSize={11} />
                    <Tooltip
                      formatter={(v: number) => formatBRL(v)}
                      labelFormatter={(d) => new Date(d).toLocaleDateString("pt-BR")}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pedidos por categoria</CardTitle>
                <CardDescription>Distribuição de volume e receita</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={stats.requestsByCategory.map((r) => ({
                    name: CATEGORY_INFO[r.category]?.name || r.category,
                    Pedidos: r.count,
                    Receita: r.revenue,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="name" fontSize={10} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Pedidos" fill="#f97316" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status dos pedidos</CardTitle>
                <CardDescription>Distribuição atual</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={stats.statusCounts.map((s) => ({
                        name: STATUS_INFO[s.status]?.label || s.status,
                        value: s.count,
                      }))}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={80}
                      label={(entry) => `${entry.value}`}
                    >
                      {stats.statusCounts.map((s, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumo operacional</CardTitle>
                <CardDescription>Indicadores principais do piloto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <RowMetric label="Taxa de conversão (entregue/total)" value={`${taxaConversao.toFixed(1)}%`} pct={taxaConversao} />
                <RowMetric
                  label="Taxa de cancelamento"
                  value={`${s.totalRequests > 0 ? ((s.cancelados / s.totalRequests) * 100).toFixed(1) : 0}%`}
                  pct={s.totalRequests > 0 ? (s.cancelados / s.totalRequests) * 100 : 0}
                  color="red"
                />
                <RowMetric
                  label="Eficiência de despacho"
                  value={`${s.totalRequests > 0 ? (((s.entregues + s.emAndamento) / s.totalRequests) * 100).toFixed(1) : 0}%`}
                  pct={s.totalRequests > 0 ? ((s.entregues + s.emAndamento) / s.totalRequests) * 100 : 0}
                  color="cyan"
                />
                <RowMetric
                  label="Ocupação de entregadores"
                  value={`${s.emAndamento}/${s.entregadoresAtivos}`}
                  pct={s.entregadoresAtivos > 0 ? (s.emAndamento / s.entregadoresAtivos) * 100 : 0}
                  color="orange"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== PEDIDOS AO VIVO ===== */}
        <TabsContent value="pedidos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="w-5 h-5 text-primary" /> Pedidos ao vivo
                <Badge variant="outline" className="ml-auto">{requests.length} total</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-2 pr-2">
                  {requests.map((r) => (
                    <div key={r.id} className="rounded-lg border p-3 flex items-center gap-3">
                      <div className="text-xl">{CATEGORY_INFO[r.vehicleCategory]?.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{r.code}</span>
                          <Badge variant="outline" className={`text-xs ${STATUS_INFO[r.status]?.color}`}>
                            {STATUS_INFO[r.status]?.icon} {STATUS_INFO[r.status]?.label}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {r.lojista.name} → {r.destLocation.name}
                        </div>
                        <div className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary text-sm">{formatBRL(r.totalPrice)}</div>
                        {r.entregador && (
                          <div className="text-xs text-muted-foreground">🛵 {r.entregador.name.split(" ")[0]}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== MONITOR DE BOXES ===== */}
        <TabsContent value="boxes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="w-5 h-5 text-primary" /> Monitor de Boxes
              </CardTitle>
              <CardDescription>11 shoppings cadastrados como polos de coleta</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {SHOPPINGS_LIST.map((shop) => {
                  const reqs = requests.filter((r) => r.originLocation.name === shop.name);
                  const ativos = reqs.filter((r) => ["RECEBIDO_BOX", "PRONTO_DESPACHO", "LIBERADO", "EM_ENTREGA"].includes(r.status)).length;
                  return (
                    <div key={shop.name} className="rounded-lg border p-3 hover:border-primary/40 transition">
                      <div className="flex items-start justify-between mb-1">
                        <div className="font-semibold text-sm leading-tight">{shop.name}</div>
                        <Badge variant={ativos > 0 ? "default" : "outline"} className="text-xs">
                          {ativos} ativos
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{shop.address}</div>
                      <div className="text-xs mt-2 text-muted-foreground">
                        {reqs.length} pedidos no total
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const PIE_COLORS = ["#f97316", "#10b981", "#3b82f6", "#a855f7", "#06b6d4", "#ef4444", "#64748b", "#f59e0b"];

const SHOPPINGS_LIST = [
  { name: "Shopping Vautier Premium", address: "Rua Tiers, 123 - Brás" },
  { name: "Shopping Total Brás", address: "Rua João Teodoro, 800 - Brás" },
  { name: "Shopping Newmall", address: "Rua João Teodoro, 1150 - Brás" },
  { name: "Shopping Vaultier", address: "Avenida Vautier, 250 - Brás" },
  { name: "Mega Polo Moda", address: "Rua Barão de Ladário, 545 - Brás" },
  { name: "Shopping Plaza Polo", address: "Rua Barão de Ladário, 700 - Brás" },
  { name: "Shopping All Brás", address: "Rua Rodrigues dos Santos, 100 - Brás" },
  { name: "Shopping Porto Brás", address: "Rua Brás Cubas, 90 - Brás" },
  { name: "Busca Busca - Brás", address: "Rua Barão de Ladário, 1200 - Brás" },
  { name: "Shopping Valtier Chiffon", address: "Rua Tiers, 200 - Brás" },
  { name: "Shopping HD", address: "Rua Carneiro Leão, 350 - Brás" },
];

function KpiCard({
  title, value, icon, subtitle, color = "text-primary",
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{title}</div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
          </div>
          <div className={`${color} opacity-30`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <div className="text-lg font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function RowMetric({
  label, value, pct, color = "orange",
}: {
  label: string;
  value: string;
  pct: number;
  color?: "orange" | "red" | "cyan" | "emerald";
}) {
  const colorClass = {
    orange: "[&>div]:bg-orange-500",
    red: "[&>div]:bg-red-500",
    cyan: "[&>div]:bg-cyan-500",
    emerald: "[&>div]:bg-emerald-500",
  }[color];
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <Progress value={pct} className={`h-2 ${colorClass}`} />
    </div>
  );
}
