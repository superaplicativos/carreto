import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  calculatePrice,
  generatePin,
  generateRequestCode,
  generateQrCode,
  VEHICLE_CATEGORIES,
  type VehicleCategoryId,
} from "@/lib/business";

// GET /api/requests — lista pedidos (filtro por perfil)
export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const onlyMine = searchParams.get("mine") === "1";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  if (onlyMine) {
    if (user.role === "LOJISTA") where.lojistaId = user.id;
    else if (user.role === "ENTREGADOR") where.entregadorId = user.id;
  }

  if (user.role === "ATENDENTE") {
    // Atendente vê apenas pedidos do shopping do box dele
    const box = await db.box.findFirst({
      where: { attendantId: user.id },
      include: { shopping: true },
    });
    if (box) where.originLocationId = box.shoppingId;
  }

  const requests = await db.deliveryRequest.findMany({
    where,
    include: {
      lojista: { select: { id: true, name: true, email: true, phone: true } },
      entregador: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          entregadorProfile: {
            select: {
              vehicleCategory: true,
              uniformKit: true,
              cpf: true,
              photoUrl: true,
              status: true,
            },
          },
        },
      },
      originLocation: true,
      destLocation: true,
      packages: true,
      transactions: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ requests });
}

// POST /api/requests — cria novo pedido
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (user.role !== "LOJISTA") {
    return NextResponse.json({ error: "Apenas lojistas podem criar pedidos" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      originLocationId,
      destLocationId,
      declaredWeightKg,
      declaredVolume,
      distanceKm,
      preferredCategory,
      packages: packagesInput = [],
    } = body;

    if (!originLocationId || !destLocationId || !declaredWeightKg || !declaredVolume) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
    }

    const pricing = calculatePrice({
      weightKg: Number(declaredWeightKg),
      distanceKm: Number(distanceKm) || 0,
      preferredCategory: preferredCategory as VehicleCategoryId | undefined,
    });

    const code = await generateRequestCode();
    const pin = generatePin();

    const request = await db.deliveryRequest.create({
      data: {
        code,
        lojistaId: user.id,
        originLocationId,
        destLocationId,
        vehicleCategory: pricing.category,
        declaredWeightKg: Number(declaredWeightKg),
        declaredVolume,
        distanceKm: Number(distanceKm) || 0,
        basePrice: pricing.basePrice,
        kmAdditional: pricing.kmAdditional,
        withdrawalFee: pricing.withdrawalFee,
        totalPrice: pricing.totalPrice,
        status: "SOLICITADO",
        pin,
        pinGeneratedAt: new Date(),
        packages:
          packagesInput.length > 0
            ? {
                create: packagesInput.map((p: { weightKg: number; description: string }, idx: number) => ({
                  qrCode: generateQrCode(code, idx + 1),
                  weightKg: p.weightKg,
                  description: p.description,
                })),
              }
            : {
                create: [
                  {
                    qrCode: generateQrCode(code, 1),
                    weightKg: Number(declaredWeightKg),
                    description: declaredVolume,
                  },
                ],
              },
        transactions: {
          create: [
            {
              amount: pricing.totalPrice,
              type: "FRETE",
              status: "PENDENTE",
              method: "PIX",
              splitHolding: +(pricing.totalPrice * 0.1).toFixed(2),
              splitOperator: +(pricing.totalPrice * 0.5).toFixed(2),
              splitCourier: +(pricing.totalPrice * 0.4).toFixed(2),
            },
          ],
        },
      },
      include: { packages: true, transactions: true },
    });

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "REQUEST_CREATED",
        entity: "DeliveryRequest",
        entityId: request.id,
        details: `Pedido ${code} criado | Categoria: ${VEHICLE_CATEGORIES[pricing.category].name} | Valor: R$ ${pricing.totalPrice.toFixed(2)} | PIN: ${pin}`,
      },
    });

    return NextResponse.json({ request, pricing, pin });
  } catch (e) {
    return NextResponse.json({ error: "Erro ao criar pedido", detail: String(e) }, { status: 500 });
  }
}
