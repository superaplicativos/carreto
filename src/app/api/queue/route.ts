import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { VEHICLE_CATEGORIES } from "@/lib/business";

// GET /api/queue — fila de entregadores online + pedidos disponíveis
export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Não autoricado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  // Pedidos liberados e sem entregador (disponíveis para a fila)
  const availableRequests = await db.deliveryRequest.findMany({
    where: {
      status: "LIBERADO",
      entregadorId: null,
      ...(category ? { vehicleCategory: category } : {}),
    },
    include: {
      lojista: { select: { name: true } },
      originLocation: true,
      destLocation: true,
      packages: true,
    },
    orderBy: { dispatchedAt: "asc" },
  });

  // Entregadores disponíveis por categoria
  const entregadores = await db.entregadorProfile.findMany({
    where: {
      status: { in: ["DISPONIVEL", "EM_ENTREGA"] },
      ...(category ? { vehicleCategory: category } : {}),
    },
    include: {
      user: { select: { id: true, name: true, phone: true } },
    },
  });

  return NextResponse.json({
    availableRequests,
    entregadores,
    categories: Object.values(VEHICLE_CATEGORIES),
  });
}
