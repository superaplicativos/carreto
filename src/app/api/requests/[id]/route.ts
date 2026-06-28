import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getBoxTimeRemaining } from "@/lib/business";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/requests/[id]
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const request = await db.deliveryRequest.findUnique({
    where: { id },
    include: {
      lojista: { select: { id: true, name: true, email: true, phone: true } },
      entregador: { select: { id: true, name: true, email: true, phone: true } },
      originLocation: true,
      destLocation: true,
      packages: true,
      transactions: true,
    },
  });

  if (!request) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  return NextResponse.json({ request });
}

// PATCH /api/requests/[id] — transições de status
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { action } = body;

  const request = await db.deliveryRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });

  const now = new Date();
  let data: Record<string, unknown> = {};
  let auditAction = "";
  let auditDetails = "";

  switch (action) {
    case "RECEIVE_AT_BOX": {
      // Atendente bipa entrada do pacote
      if (user.role !== "ATENDENTE") {
        return NextResponse.json({ error: "Apenas atendente pode bipar" }, { status: 403 });
      }
      const box = await db.box.findFirst({ where: { attendantId: user.id } });
      if (!box) return NextResponse.json({ error: "Box não encontrado" }, { status: 400 });

      data = {
        status: "RECEBIDO_BOX",
        receivedAtBox: now,
      };
      // Atribui todos os pacotes ao box e gera shelfCode
      await db.package.updateMany({
        where: { requestId: id },
        data: { boxId: box.id, receivedAt: now },
      });
      auditAction = "PACKAGE_RECEIVED";
      auditDetails = `Pacote ${request.code} bipado no box ${box.code} — cronômetro de 2h iniciado`;
      break;
    }

    case "READY_FOR_DISPATCH": {
      // Atendente etiqueta e organiza na prateleira
      if (user.role !== "ATENDENTE") {
        return NextResponse.json({ error: "Apenas atendente" }, { status: 403 });
      }
      const { shelfCodes } = body; // { packageId: shelfCode }
      if (shelfCodes) {
        for (const [pkgId, code] of Object.entries(shelfCodes as Record<string, string>)) {
          await db.package.update({ where: { id: pkgId }, data: { shelfCode: code } });
        }
      }
      data = { status: "PRONTO_DESPACHO" };
      auditAction = "PACKAGE_READY";
      auditDetails = `Pedido ${request.code} etiquetado e organizado na prateleira`;
      break;
    }

    case "RELEASE_DELIVERY": {
      // Lojista libera entrega
      if (user.role !== "LOJISTA" || request.lojistaId !== user.id) {
        return NextResponse.json({ error: "Apenas o lojista dono do pedido" }, { status: 403 });
      }
      data = { status: "LIBERADO", dispatchedAt: now };
      auditAction = "DELIVERY_RELEASED";
      auditDetails = `Lojista ${user.name} liberou entrega do pedido ${request.code}`;
      break;
    }

    case "ACCEPT_DELIVERY": {
      // Entregador aceita entrega da fila
      if (user.role !== "ENTREGADOR") {
        return NextResponse.json({ error: "Apenas entregador" }, { status: 403 });
      }
      const { pin } = body;
      if (!pin || pin !== request.pin) {
        await db.auditLog.create({
          data: {
            userId: user.id,
            action: "PIN_INVALID",
            entity: "DeliveryRequest",
            entityId: id,
            details: `PIN inválido informado por ${user.name} no pedido ${request.code}`,
          },
        });
        return NextResponse.json({ error: "PIN inválido" }, { status: 400 });
      }
      data = {
        status: "EM_ENTREGA",
        entregadorId: user.id,
        pickedUpAt: now,
      };
      auditAction = "DELIVERY_ACCEPTED";
      auditDetails = `Entregador ${user.name} aceitou pedido ${request.code} com PIN válido`;
      break;
    }

    case "CONFIRM_DELIVERY": {
      // Entregador confirma entrega com foto + assinatura
      if (user.role !== "ENTREGADOR" || request.entregadorId !== user.id) {
        return NextResponse.json({ error: "Apenas o entregador responsável" }, { status: 403 });
      }
      const { photoUrl, signatureUrl } = body;
      if (!photoUrl) {
        return NextResponse.json({ error: "Foto de entrega é obrigatória" }, { status: 400 });
      }
      data = {
        status: "ENTREGUE",
        deliveredAt: now,
      };
      // Marca transação como paga
      await db.transaction.updateMany({
        where: { requestId: id, type: "FRETE" },
        data: { status: "PAGO", paidAt: now },
      });
      auditAction = "DELIVERY_CONFIRMED";
      auditDetails = `Pedido ${request.code} entregue | Foto: ${photoUrl ? "anexada" : "—"} | Assinatura: ${signatureUrl ? "coletada" : "—"}`;
      break;
    }

    case "CANCEL": {
      if (user.role !== "LOJISTA" && user.role !== "GERENTE" && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
      }
      data = { status: "CANCELADO", cancelledAt: now };
      auditAction = "REQUEST_CANCELLED";
      auditDetails = `Pedido ${request.code} cancelado por ${user.name}`;
      break;
    }

    case "WITHDRAW_FROM_BOX": {
      // Lojista retirou no box (cobra taxa)
      if (user.role !== "LOJISTA" || request.lojistaId !== user.id) {
        return NextResponse.json({ error: "Apenas o lojista" }, { status: 403 });
      }
      const boxTime = getBoxTimeRemaining(request.receivedAtBox);
      data = { status: "RETIRADO_LOJA", cancelledAt: now };
      // Cobra taxa de retirada
      await db.transaction.create({
        data: {
          requestId: id,
          amount: request.withdrawalFee,
          type: "TAXA_RETIRADA",
          status: "PENDENTE",
          method: "PIX",
          splitHolding: +(request.withdrawalFee * 0.5).toFixed(2),
          splitOperator: +(request.withdrawalFee * 0.5).toFixed(2),
          splitCourier: 0,
        },
      });
      auditAction = "PACKAGE_WITHDRAWN";
      auditDetails = `Lojista retirou pedido ${request.code} no box | Tempo estourado: ${boxTime.expired ? "Sim" : "Não"} | Taxa: R$ ${request.withdrawalFee.toFixed(2)}`;
      break;
    }

    case "ASSIGN_ENTREGADOR": {
      // Gerente atribui entregador manualmente
      if (user.role !== "GERENTE" && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Apenas gerente/admin" }, { status: 403 });
      }
      const { entregadorId } = body;
      data = { entregadorId };
      auditAction = "ENTREGADOR_ASSIGNED";
      auditDetails = `Entregador ${entregadorId} atribuído ao pedido ${request.code} por ${user.name}`;
      break;
    }

    default:
      return NextResponse.json({ error: "Ação desconhecida" }, { status: 400 });
  }

  const updated = await db.deliveryRequest.update({
    where: { id },
    data,
    include: {
      lojista: { select: { id: true, name: true } },
      entregador: { select: { id: true, name: true } },
      originLocation: true,
      destLocation: true,
      packages: true,
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: auditAction,
      entity: "DeliveryRequest",
      entityId: id,
      details: auditDetails,
    },
  });

  return NextResponse.json({ request: updated });
}
