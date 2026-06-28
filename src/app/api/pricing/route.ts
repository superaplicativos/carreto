import { NextRequest, NextResponse } from "next/server";
import { calculatePrice, type VehicleCategoryId } from "@/lib/business";

// POST /api/pricing — calcula preço sem criar pedido
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { weightKg, distanceKm, preferredCategory } = body;

    if (!weightKg || weightKg <= 0) {
      return NextResponse.json({ error: "Peso inválido" }, { status: 400 });
    }

    const pricing = calculatePrice({
      weightKg: Number(weightKg),
      distanceKm: Number(distanceKm) || 0,
      preferredCategory: preferredCategory as VehicleCategoryId | undefined,
    });

    return NextResponse.json({ pricing });
  } catch (e) {
    return NextResponse.json({ error: "Erro no cálculo", detail: String(e) }, { status: 500 });
  }
}
