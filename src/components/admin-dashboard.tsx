"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  LineChart, Line, AreaChart, Area,
} from "recharts";
import { toast } from "sonner";
import {
  Building2, Users, DollarSign, TrendingUp, Shield, FileText,
  Loader2, Mail, Phone, Activity, Banknote, PieChart as PieIcon,
} from "lucide-react";
import { CATEGORY_INFO, STATUS_INFO, ROLE_INFO, formatBRL, formatDateTime, timeAgo } from "@/lib/constants";

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

interface UserRow {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: keyof typeof ROLE_INFO;
  status: string;
  createdAt: string;
  lojistaProfile?: { storeName: string; shopping: { name: string } } | null;
  entregadorProfile?: { vehicleCategory: keyof typeof CATEGORY_INFO; uniformKit: string | null; status: string } | null;
}

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
  user?: { name: string; email: string; role: string } | null;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [statsRes, usersRes, logsRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/users"),
        fetch("/api/audit?limit=80"),
      ]);
      const [statsData, usersData, logsData] = await Promise.all([
        statsRes.json(),
        usersRes.json(),
        logsRes.json(),
      ]);
      setStats(statsData);
      setUsers(usersData.users || []);
      setLogs(logsData.logs || []);
    } catch {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 20000);
    return () => clearInterval(t);
  }, [fetchAll]);

  if (loading || !stats) {
    return <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  }

  const s = stats.summary;

  // Split financeiro: 10% holding, 50% operador, 40% entregador
  const holdingShare = s.totalRevenue * 0.1;
  const operatorShare = s.totalRevenue * 0.5;
  const courierShare = s.totalRevenue * 0.4;

  // Receita por categoria (para gráfico)
  const revenueByCategory = stats.requestsByCategory.map((r) => ({
    name: CATEGORY_INFO[r.category]?.name || r.category,
    Receita: r.revenue,
    Pedidos: r.count,
    Holding: +(r.revenue * 0.1).toFixed(2),
    Operador: +(r.revenue * 0.5).toFixed(2),
    Entregador: +(r.revenue * 0.4).toFixed(2),
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6 text-primary" /> Holding Aerobraslog
        </h1>
        <p className="text-muted-foreground text-sm">
          Painel executivo · multi-célula operacional · governança e BI consolidado
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Receita total"
          value={formatBRL(s.totalRevenue)}
          icon={<DollarSign className="w-5 h-5" />}
          subtitle={`${formatBRL(s.revenueToday)} hoje`}
          color="text-emerald-600"
        />
        <KpiCard
          title="Repasse Holding (10%)"
          value={formatBRL(holdingShare)}
          icon={<Building2 className="w-5 h-5" />}
          subtitle="Receita consolidada"
          color="text-orange-600"
        />
        <KpiCard
          title="Pedidos processados"
          value={s.totalRequests}
          icon={<Activity className="w-5 h-5" />}
          subtitle={`${s.requestsToday} hoje`}
          color="text-blue-600"
        />
        <KpiCard
          title="Base ativa"
          value={s.lojistasAtivos + s.entregadoresAtivos}
          icon={<Users className="w-5 h-5" />}
          subtitle={`${s.lojistasAtivos} lojistas · ${s.entregadoresAtivos} entregadores`}
          color="text-purple-600"
        />
      </div>

      <Tabs defaultValue="bi">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="bi">BI Consolidado</TabsTrigger>
          <TabsTrigger value="split">Split Financeiro</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
        </TabsList>

        {/* ===== BI ===== */}
        <TabsContent value="bi" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Evolução de receita (7 dias)
                </CardTitle>
                <CardDescription>Receita paga por dia — visão consolidada</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={stats.dailyRevenue}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      fontSize={11}
                    />
                    <YAxis fontSize={11} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip
                      formatter={(v: number) => formatBRL(v)}
                      labelFormatter={(d) => new Date(d).toLocaleDateString("pt-BR")}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#f97316" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-primary" /> Receita por categoria
                </CardTitle>
                <CardDescription>Volume financeiro por modal de transporte</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={revenueByCategory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="name" fontSize={10} />
                    <YAxis fontSize={11} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip formatter={(v: number) => formatBRL(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Receita" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== SPLIT ===== */}
        <TabsContent value="split" className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-3">
            <Card className="border-orange-300 bg-orange-50/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground uppercase">Holding (Aerobraslog)</span>
                  <Building2 className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-3xl font-black text-orange-700">{formatBRL(holdingShare)}</div>
                <div className="text-xs text-muted-foreground mt-1">10% de cada frete</div>
              </CardContent>
            </Card>
            <Card className="border-cyan-300 bg-cyan-50/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground uppercase">Operador (Carreto Brás)</span>
                  <Banknote className="w-5 h-5 text-cyan-600" />
                </div>
                <div className="text-3xl font-black text-cyan-700">{formatBRL(operatorShare)}</div>
                <div className="text-xs text-muted-foreground mt-1">50% — custos de box e operação</div>
              </CardContent>
            </Card>
            <Card className="border-emerald-300 bg-emerald-50/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground uppercase">Entregadores</span>
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-3xl font-black text-emerald-700">{formatBRL(courierShare)}</div>
                <div className="text-xs text-muted-foreground mt-1">40% — repasse via Pix</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalhamento por categoria</CardTitle>
              <CardDescription>Split aplicado por modal de transporte</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-2">Categoria</th>
                      <th className="py-2 px-2 text-right">Pedidos</th>
                      <th className="py-2 px-2 text-right">Receita total</th>
                      <th className="py-2 px-2 text-right">Holding (10%)</th>
                      <th className="py-2 px-2 text-right">Operador (50%)</th>
                      <th className="py-2 px-2 text-right">Entregadores (40%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueByCategory.map((r) => (
                      <tr key={r.name} className="border-b last:border-0">
                        <td className="py-2 pr-2 font-medium">{r.name}</td>
                        <td className="py-2 px-2 text-right">{r.Pedidos}</td>
                        <td className="py-2 px-2 text-right font-semibold">{formatBRL(r.Receita)}</td>
                        <td className="py-2 px-2 text-right text-orange-700">{formatBRL(r.Holding)}</td>
                        <td className="py-2 px-2 text-right text-cyan-700">{formatBRL(r.Operador)}</td>
                        <td className="py-2 px-2 text-right text-emerald-700">{formatBRL(r.Entregador)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold border-t-2">
                      <td className="py-3 pr-2">Total</td>
                      <td className="py-3 px-2 text-right">{s.totalRequests}</td>
                      <td className="py-3 px-2 text-right">{formatBRL(s.totalRevenue)}</td>
                      <td className="py-3 px-2 text-right text-orange-700">{formatBRL(holdingShare)}</td>
                      <td className="py-3 px-2 text-right text-cyan-700">{formatBRL(operatorShare)}</td>
                      <td className="py-3 px-2 text-right text-emerald-700">{formatBRL(courierShare)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== USUÁRIOS ===== */}
        <TabsContent value="usuarios">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-primary" /> Usuários da Plataforma
              </CardTitle>
              <CardDescription>{users.length} usuário(s) cadastrado(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-2 pr-2">
                  {users.map((u) => (
                    <div key={u.id} className="rounded-lg border p-3 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${ROLE_INFO[u.role].color}`}>
                        {ROLE_INFO[u.role].icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{u.name}</span>
                          <Badge variant="outline" className="text-xs">{ROLE_INFO[u.role].label}</Badge>
                          <Badge variant={u.status === "ATIVO" ? "default" : "destructive"} className="text-xs">
                            {u.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {u.email}</span>
                          {u.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {u.phone}</span>}
                        </div>
                        {u.lojistaProfile && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            🏪 {u.lojistaProfile.storeName} — {u.lojistaProfile.shopping.name}
                          </div>
                        )}
                        {u.entregadorProfile && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {CATEGORY_INFO[u.entregadorProfile.vehicleCategory]?.icon} {CATEGORY_INFO[u.entregadorProfile.vehicleCategory]?.name}
                            {u.entregadorProfile.uniformKit && ` · Kit: ${u.entregadorProfile.uniformKit}`}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(u.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== AUDIT ===== */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5 text-primary" /> Log de Auditoria
              </CardTitle>
              <CardDescription>{logs.length} evento(s) recentes — rastreabilidade total</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-1 pr-2">
                  {logs.map((log) => (
                    <div key={log.id} className="rounded border p-2 text-xs hover:bg-muted/30">
                      <div className="flex items-start gap-2">
                        <FileText className="w-3 h-3 mt-0.5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px]">{log.action}</Badge>
                            {log.user && (
                              <span className="text-muted-foreground">
                                por <span className="font-medium">{log.user.name}</span> ({log.user.role})
                              </span>
                            )}
                            <span className="text-muted-foreground ml-auto">{timeAgo(log.createdAt)}</span>
                          </div>
                          {log.details && (
                            <div className="text-muted-foreground mt-1 break-words">{log.details}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

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
