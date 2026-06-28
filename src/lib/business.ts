import { db } from "@/lib/db";

// ============ CONSTANTES DE NEGÓCIO ============

export const VEHICLE_CATEGORIES = {
  BRAS_A_PE: {
    id: "BRAS_A_PE",
    name: "Brás A Pé",
    icon: "🚶",
    vehicle: "Mochila / Bag",
    maxWeightKg: 8,
    boxTimeHours: 2,
    basePriceMin: 10,
    basePriceMax: 12,
    radiusKm: 1.5,
    description: "Pacotes pequenos, e-commerce, sacolas plásticas e aviamentos urgentes entre lojas próximas.",
  },
  BRAS_E_MOB: {
    id: "BRAS_E_MOB",
    name: "Brás E-Mob",
    icon: "🛴",
    vehicle: "Moto Elétrica",
    maxWeightKg: 15,
    boxTimeHours: 2,
    basePriceMin: 15,
    basePriceMax: 20,
    radiusKm: 5,
    description: "Veículos elétricos de baixa potência para entregas rápidas regionais sem custo de combustível.",
  },
  BRAS_BIKE: {
    id: "BRAS_BIKE",
    name: "Brás Bike",
    icon: "🚲",
    vehicle: "Bike",
    maxWeightKg: 15,
    boxTimeHours: 2,
    basePriceMin: 15,
    basePriceMax: 20,
    radiusKm: 5,
    description: "Entregas rápidas de médio volume num raio de até 5 km (Pari, Canindé e Centro).",
  },
  CARRETO_CARRINHO: {
    id: "CARRETO_CARRINHO",
    name: "Carreto Carrinho",
    icon: "🛒",
    vehicle: "Carrinho de Mão",
    maxWeightKg: 120,
    boxTimeHours: 2,
    basePriceMin: 25,
    basePriceMax: 35,
    radiusKm: 1.5,
    description: "Focado no transporte de fardos fechados de confecção, sacolas xadrezes gigantes e caixas pesadas.",
  },
} as const;

export type VehicleCategoryId = keyof typeof VEHICLE_CATEGORIES;

export const KM_ADDITIONAL_RATE = 2.0; // R$ por km adicional além do raio
export const BOX_TIME_LIMIT_HOURS = 2;

// ============ ENGINE DE PRECIFICAÇÃO ============

export interface PricingInput {
  weightKg: number;
  distanceKm: number;
  preferredCategory?: VehicleCategoryId;
}

export interface PricingResult {
  category: VehicleCategoryId;
  basePrice: number;
  kmAdditional: number;
  withdrawalFee: number;
  totalPrice: number;
  warnings: string[];
  redirected: boolean;
  redirectedFrom?: VehicleCategoryId;
}

/**
 * Determina a categoria de veículo com base no peso (regra de trava de cubagem)
 * e calcula o preço total conforme regras:
 *  - Trava de cubagem: bloqueia categorias leves se peso exceder limite
 *  - Adicional de km: R$ 2,00 por km além do raio (apenas Bike/E-Mob)
 *  - Taxa de retirada: igual ao valor base do frete
 */
export function calculatePrice(input: PricingInput): PricingResult {
  const warnings: string[] = [];
  let redirected = false;
  let redirectedFrom: VehicleCategoryId | undefined;

  // 1. Determinar categoria por peso
  let category: VehicleCategoryId;

  if (input.preferredCategory && input.weightKg <= VEHICLE_CATEGORIES[input.preferredCategory].maxWeightKg) {
    category = input.preferredCategory;
  } else if (input.preferredCategory && input.weightKg > VEHICLE_CATEGORIES[input.preferredCategory].maxWeightKg) {
    // Trava de cubagem: redireciona para categoria superior
    redirected = true;
    redirectedFrom = input.preferredCategory;
    warnings.push(
      `Peso (${input.weightKg}kg) excede o limite da categoria ${VEHICLE_CATEGORIES[input.preferredCategory].name} (${VEHICLE_CATEGORIES[input.preferredCategory].maxWeightKg}kg). Redirecionando para categoria adequada.`
    );
    category = pickCategoryByWeight(input.weightKg);
  } else {
    category = pickCategoryByWeight(input.weightKg);
  }

  const cat = VEHICLE_CATEGORIES[category];

  // 2. Preço base — interpolação linear simples por peso
  const ratio = Math.min(input.weightKg / cat.maxWeightKg, 1);
  const basePrice = +(cat.basePriceMin + (cat.basePriceMax - cat.basePriceMin) * ratio).toFixed(2);

  // 3. Adicional de km (apenas Bike/E-Mob além do raio)
  let kmAdditional = 0;
  if ((category === "BRAS_BIKE" || category === "BRAS_E_MOB") && input.distanceKm > cat.radiusKm) {
    const extraKm = input.distanceKm - cat.radiusKm;
    kmAdditional = +(extraKm * KM_ADDITIONAL_RATE).toFixed(2);
    warnings.push(`Adicional de ${extraKm.toFixed(1)}km além do raio ${cat.radiusKm}km: +R$ ${kmAdditional.toFixed(2)}`);
  }

  // 4. Taxa de retirada = valor base do frete (cobrada se estourar tempo e retirar sem fretar)
  const withdrawalFee = basePrice;

  const totalPrice = +(basePrice + kmAdditional).toFixed(2);

  return {
    category,
    basePrice,
    kmAdditional,
    withdrawalFee,
    totalPrice,
    warnings,
    redirected,
    redirectedFrom,
  };
}

function pickCategoryByWeight(weightKg: number): VehicleCategoryId {
  if (weightKg <= 8) return "BRAS_A_PE";
  if (weightKg <= 15) return "BRAS_E_MOB"; // E-Mob como padrão para 8-15kg
  if (weightKg <= 120) return "CARRETO_CARRINHO";
  return "CARRETO_CARRINHO"; // acima de 120kg — não suportado, mas trava no carrinho
}

/**
 * Gera PIN de 4 dígitos (string com zeros à esquerda)
 */
export function generatePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Gera código de pedido sequencial
 */
export async function generateRequestCode(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.deliveryRequest.count();
  const seq = String(count + 1).padStart(5, "0");
  return `CB-${year}-${seq}`;
}

/**
 * Gera QR Code identificador do pacote
 */
export function generateQrCode(requestCode: string, packageIndex: number): string {
  return `${requestCode}-PKG${String(packageIndex).padStart(2, "0")}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

/**
 * Calcula tempo restante de box (em minutos) - limite de 2h
 */
export function getBoxTimeRemaining(receivedAtBox: Date | null): {
  remainingMinutes: number;
  expired: boolean;
  percentage: number;
} {
  if (!receivedAtBox) {
    return { remainingMinutes: 0, expired: false, percentage: 0 };
  }
  const limitMs = BOX_TIME_LIMIT_HOURS * 60 * 60 * 1000;
  const elapsed = Date.now() - receivedAtBox.getTime();
  const remaining = limitMs - elapsed;
  const remainingMinutes = Math.max(0, Math.floor(remaining / 60000));
  const percentage = Math.min(100, (elapsed / limitMs) * 100);
  return {
    remainingMinutes,
    expired: remaining <= 0,
    percentage,
  };
}
