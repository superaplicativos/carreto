import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/stats — dashboard gerente/admin
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (user.role !== "GERENTE" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalRequests,
    requestsToday,
    entregues,
    emAndamento,
    liberados,
    recebidosBox,
    cancelados,
    entregadoresAtivos,
    lojistasAtivos,
    totalRevenue,
    revenueToday,
  ] = await Promise.all([
    db.deliveryRequest.count(),
    db.deliveryRequest.count({ where: { createdAt: { gte: today } } }),
    db.deliveryRequest.count({ where: { status: "ENTREGUE" } }),
    db.deliveryRequest.count({ where: { status: "EM_ENTREGA" } }),
    db.deliveryRequest.count({ where: { status: "LIBERADO" } }),
    db.deliveryRequest.count({ where: { status: { in: ["RECEBIDO_BOX", "PRONTO_DESPACHO"] } } }),
    db.deliveryRequest.count({ where: { status: "CANCELADO" } }),
    db.entregadorProfile.count({ where: { status: { in: ["DISPONIVEL", "EM_ENTREGA"] } } }),
    db.user.count({ where: { role: "LOJISTA", status: "ATIVO" } }),
    db.transaction.aggregate({
      where: { status: "PAGO", type: "FRETE" },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: {
        status: "PAGO",
        type: "FRETE",
        paidAt: { gte: today },
      },
      _sum: { amount: true },
    }),
  ]);

  // Receita por categoria
  const requestsByCategoryRaw = await db.deliveryRequest.groupBy({
    by: ["vehicleCategory"],
    _count: true,
    _sum: { totalPrice: true },
  });

  const requestsByCategory = requestsByCategoryRaw.map((r) => ({
    category: r.vehicleCategory,
    count: r._count,
    revenue: r._sum.totalPrice || 0,
  }));

  // Pedidos por status (para gráfico)
  const statusCounts = await db.deliveryRequest.groupBy({
    by: ["status"],
    _count: true,
  });

  // Últimos 7 dias (faturamento)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentTransactions = await db.transaction.findMany({
    where: {
      status: "PAGO",
      type: "FRETE",
      paidAt: { gte: sevenDaysAgo },
    },
    select: { amount: true, paidAt: true },
  });

  const dailyRevenue: { date: string; revenue: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);

    const sum = recentTransactions
      .filter((t) => t.paidAt && t.paidAt >= d && t.paidAt < next)
      .reduce((acc, t) => acc + t.amount, 0);

    dailyRevenue.push({
      date: d.toISOString().split("T")[0],
      revenue: +sum.toFixed(2),
    });
  }

  return NextResponse.json({
    summary: {
      totalRequests,
      requestsToday,
      entregues,
      emAndamento,
      liberados,
      recebidosBox,
      cancelados,
      entregadoresAtivos,
      lojistasAtivos,
      totalRevenue: totalRevenue._sum.amount || 0,
      revenueToday: revenueToday._sum.amount || 0,
    },
    requestsByCategory,
    statusCounts: statusCounts.map((s) => ({ status: s.status, count: s._count })),
    dailyRevenue,
  });
}
