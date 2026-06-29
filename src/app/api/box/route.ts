import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getBoxTimeRemaining } from "@/lib/business";

// GET /api/box — painel do atendente
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (user.role !== "ATENDENTE" && user.role !== "GERENTE" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const box = await db.box.findFirst({
    where: user.role === "ATENDENTE" ? { attendantId: user.id } : undefined,
    include: { shopping: true, attendant: { select: { name: true } } },
  });

  if (!box) return NextResponse.json({ error: "Box não encontrado" }, { status: 404 });

  // Pedidos que chegaram ou estão prontos neste box (inclui SOLICITADO pra bipagem)
  const requests = await db.deliveryRequest.findMany({
    where: {
      originLocationId: box.shoppingId,
      status: { in: ["SOLICITADO", "RECEBIDO_BOX", "PRONTO_DESPACHO", "LIBERADO"] },
    },
    include: {
      lojista: { select: { name: true, phone: true } },
      originLocation: true,
      destLocation: true,
      packages: true,
      entregador: { select: { name: true } },
    },
    orderBy: { receivedAtBox: "asc" },
  });

  // Adiciona info de tempo de box
  const withTimers = requests.map((r) => ({
    ...r,
    boxTimer: getBoxTimeRemaining(r.receivedAtBox),
  }));

  return NextResponse.json({
    box,
    requests: withTimers,
  });
}
