/**
 * Seed: dados completos do Carreto Brás / Aerobraslog
 * - 11 shoppings (Polos de Coleta)
 * - 6 destinos (Pátios/Estacionamentos)
 * - 5 usuários demo (1 por perfil)
 * - 1 Box piloto no Shopping Vautier Premium
 * - 3 lojistas parceiros adicionais
 * - 4 entregadores piloto (1 por categoria)
 *
 * Uso:
 *   DATABASE_URL=... DIRECT_URL=... bun run scripts/seed.ts
 */

import { db } from "../src/lib/db";

const SHOPPINGS = [
  { name: "Shopping Vautier Premium", address: "Rua Tiers, 123 - Brás, São Paulo - SP", lat: -23.5427, lng: -46.6235 },
  { name: "Shopping Total Brás", address: "Rua João Teodoro, 800 - Brás, São Paulo - SP", lat: -23.5451, lng: -46.6189 },
  { name: "Shopping Newmall", address: "Rua João Teodoro, 1150 - Brás, São Paulo - SP", lat: -23.5462, lng: -46.6175 },
  { name: "Shopping Vaultier", address: "Avenida Vautier, 250 - Brás, São Paulo - SP", lat: -23.5435, lng: -46.6241 },
  { name: "Mega Polo Moda", address: "Rua Barão de Ladário, 545 - Brás, São Paulo - SP", lat: -23.5475, lng: -46.6198 },
  { name: "Shopping Plaza Polo", address: "Rua Barão de Ladário, 700 - Brás, São Paulo - SP", lat: -23.5482, lng: -46.6205 },
  { name: "Shopping All Brás", address: "Rua Rodrigues dos Santos, 100 - Brás, São Paulo - SP", lat: -23.5495, lng: -46.6215 },
  { name: "Shopping Porto Brás", address: "Rua Brás Cubas, 90 - Brás, São Paulo - SP", lat: -23.5445, lng: -46.6258 },
  { name: "Busca Busca - Brás", address: "Rua Barão de Ladário, 1200 - Brás, São Paulo - SP", lat: -23.5489, lng: -46.6192 },
  { name: "Shopping Valtier Chiffon", address: "Rua Tiers, 200 - Brás, São Paulo - SP", lat: -23.5429, lng: -46.6238 },
  { name: "Shopping HD", address: "Rua Carneiro Leão, 350 - Brás, São Paulo - SP", lat: -23.5502, lng: -46.6225 },
];

const DESTINOS = [
  { name: "Estacionamento Superior do Shopping Vautier Premium", address: "Rua Tiers, 123 - Brás, São Paulo - SP", lat: -23.5427, lng: -46.6235 },
  { name: "Estacionamento do Shopping Total Brás", address: "Rua João Teodoro, 800 - Brás, São Paulo - SP", lat: -23.5451, lng: -46.6189 },
  { name: "Estacionamento da Coroa / Pátio da Coroa (Pari/Canindé)", address: "Rua da Coroa, 200 - Pari, São Paulo - SP", lat: -23.5345, lng: -46.6178 },
  { name: "Estacionamento e Pátio Pari (Feira da Madrugada)", address: "Av. do Estado, 1500 - Pari, São Paulo - SP", lat: -23.5329, lng: -46.6152 },
  { name: "Bolsão da Rua Japurá", address: "Rua Japurá, 200 - Brás, São Paulo - SP", lat: -23.5478, lng: -46.6195 },
  { name: "Bolsão da Rua Santa Rosa", address: "Rua Santa Rosa, 150 - Brás, São Paulo - SP", lat: -23.5485, lng: -46.6208 },
  { name: "Bolsão da Rua Monsenhor Andrade", address: "Rua Monsenhor Andrade, 300 - Brás, São Paulo - SP", lat: -23.5462, lng: -46.6222 },
];

async function seedDatabase() {
  console.log("🌱 Iniciando seed do Carreto Brás...");

  await db.auditLog.deleteMany();
  await db.transaction.deleteMany();
  await db.package.deleteMany();
  await db.deliveryRequest.deleteMany();
  await db.box.deleteMany();
  await db.lojistaProfile.deleteMany();
  await db.entregadorProfile.deleteMany();
  await db.user.deleteMany();
  await db.location.deleteMany();
  console.log("✓ Tabelas limpas");

  const shoppings = await Promise.all(
    SHOPPINGS.map((s) =>
      db.location.create({ data: { ...s, type: "SHOPPING" as const } })
    )
  );

  const destinos = await Promise.all(
    DESTINOS.map((d) =>
      db.location.create({ data: { ...d, type: "ESTACIONAMENTO" as const } })
    )
  );
  console.log(`✓ ${shoppings.length} shoppings + ${destinos.length} destinos criados`);

  const admin = await db.user.create({
    data: {
      email: "admin@aerobraslog.com.br",
      password: "demo123",
      name: "Mikael Marinho",
      phone: "(11) 99999-0000",
      role: "ADMIN",
      status: "ATIVO",
    },
  });

  const gerente = await db.user.create({
    data: {
      email: "gerente@carretobras.com.br",
      password: "demo123",
      name: "Carlos Operações",
      phone: "(11) 98888-0001",
      role: "GERENTE",
      status: "ATIVO",
    },
  });

  const atendente = await db.user.create({
    data: {
      email: "atendente@carretobras.com.br",
      password: "demo123",
      name: "Ana Atendente",
      phone: "(11) 98888-0002",
      role: "ATENDENTE",
      status: "ATIVO",
    },
  });

  const lojista = await db.user.create({
    data: {
      email: "lojista@vautier.com.br",
      password: "demo123",
      name: "Beatriz Confecções",
      phone: "(11) 97777-0001",
      role: "LOJISTA",
      status: "ATIVO",
    },
  });

  const lojista2 = await db.user.create({
    data: {
      email: "lojista2@totalbras.com.br",
      password: "demo123",
      name: "Comercial MBK",
      phone: "(11) 97777-0002",
      role: "LOJISTA",
      status: "ATIVO",
    },
  });

  const lojista3 = await db.user.create({
    data: {
      email: "lojista3@newmall.com.br",
      password: "demo123",
      name: "Distribuidora ABC",
      phone: "(11) 97777-0003",
      role: "LOJISTA",
      status: "ATIVO",
    },
  });

  await db.lojistaProfile.create({
    data: {
      userId: lojista.id,
      documentType: "CNPJ",
      document: "12.345.678/0001-90",
      storeName: "Beatriz Confecções LTDA",
      shoppingId: shoppings[0].id,
      boxNumber: "Box 142",
      floor: "Térreo",
      wing: "Ala A",
      whatsapp: "(11) 97777-0001",
      termAccepted: true,
      termAcceptedAt: new Date(),
    },
  });

  await db.lojistaProfile.create({
    data: {
      userId: lojista2.id,
      documentType: "CNPJ",
      document: "23.456.789/0001-01",
      storeName: "Comercial MBK Atacado",
      shoppingId: shoppings[1].id,
      boxNumber: "Box 28",
      floor: "1º Andar",
      wing: "Ala B",
      whatsapp: "(11) 97777-0002",
      termAccepted: true,
      termAcceptedAt: new Date(),
    },
  });

  await db.lojistaProfile.create({
    data: {
      userId: lojista3.id,
      documentType: "CPF",
      document: "123.456.789-00",
      storeName: "Distribuidora ABC Aviamentos",
      shoppingId: shoppings[2].id,
      boxNumber: "Box 56",
      floor: "Térreo",
      wing: "Ala C",
      whatsapp: "(11) 97777-0003",
      termAccepted: true,
      termAcceptedAt: new Date(),
    },
  });

  const entregadorCarrinho1 = await db.user.create({
    data: {
      email: "entregador1@carretobras.com.br",
      password: "demo123",
      name: "João Carrinho",
      phone: "(11) 96666-0001",
      role: "ENTREGADOR",
      status: "ATIVO",
    },
  });
  await db.entregadorProfile.create({
    data: {
      userId: entregadorCarrinho1.id,
      cpf: "111.222.333-44",
      rg: "12.345.678-9",
      address: "Rua do Brás, 100 - São Paulo - SP",
      pixKey: "111.222.333-44",
      vehicleCategory: "CARRETO_CARRINHO",
      uniformKit: "KIT-001",
      status: "DISPONIVEL",
    },
  });

  const entregadorBike = await db.user.create({
    data: {
      email: "entregador2@carretobras.com.br",
      password: "demo123",
      name: "Marcos Bike",
      phone: "(11) 96666-0002",
      role: "ENTREGADOR",
      status: "ATIVO",
    },
  });
  await db.entregadorProfile.create({
    data: {
      userId: entregadorBike.id,
      cpf: "222.333.444-55",
      rg: "23.456.789-0",
      address: "Rua do Pari, 200 - São Paulo - SP",
      pixKey: "222.333.444-55",
      vehicleCategory: "BRAS_BIKE",
      uniformKit: "KIT-002",
      status: "DISPONIVEL",
    },
  });

  const entregadorAPE = await db.user.create({
    data: {
      email: "entregador3@carretobras.com.br",
      password: "demo123",
      name: "Pedro A Pé",
      phone: "(11) 96666-0003",
      role: "ENTREGADOR",
      status: "ATIVO",
    },
  });
  await db.entregadorProfile.create({
    data: {
      userId: entregadorAPE.id,
      cpf: "333.444.555-66",
      rg: "34.567.890-1",
      address: "Rua Monsenhor Andrade, 50 - São Paulo - SP",
      pixKey: "333.444.555-66",
      vehicleCategory: "BRAS_A_PE",
      uniformKit: "KIT-003",
      status: "DISPONIVEL",
    },
  });

  const entregadorEMob = await db.user.create({
    data: {
      email: "entregador4@carretobras.com.br",
      password: "demo123",
      name: "Lucas E-Mob",
      phone: "(11) 96666-0004",
      role: "ENTREGADOR",
      status: "ATIVO",
    },
  });
  await db.entregadorProfile.create({
    data: {
      userId: entregadorEMob.id,
      cpf: "444.555.666-77",
      rg: "45.678.901-2",
      address: "Rua Tiers, 80 - São Paulo - SP",
      pixKey: "444.555.666-77",
      vehicleCategory: "BRAS_E_MOB",
      uniformKit: "KIT-004",
      status: "DISPONIVEL",
    },
  });
  console.log("✓ 7 usuários criados");

  const box1 = await db.box.create({
    data: {
      code: "VAUTIER-01",
      shoppingId: shoppings[0].id,
      attendantId: atendente.id,
      capacityKg: 500,
    },
  });

  const box2 = await db.box.create({
    data: {
      code: "TOTALBRAS-01",
      shoppingId: shoppings[1].id,
      capacityKg: 500,
    },
  });

  const box3 = await db.box.create({
    data: {
      code: "NEWMALL-01",
      shoppingId: shoppings[2].id,
      capacityKg: 500,
    },
  });
  console.log("✓ 3 boxes criados");

  const sampleRequests = [
    {
      lojistaId: lojista.id,
      originLocationId: shoppings[0].id,
      destLocationId: destinos[0].id,
      vehicleCategory: "CARRETO_CARRINHO" as const,
      declaredWeightKg: 80,
      declaredVolume: "2 fardos de confecção (tamanho GG)",
      distanceKm: 0.3,
      basePrice: 32,
      kmAdditional: 0,
      withdrawalFee: 32,
      totalPrice: 32,
      status: "PRONTO_DESPACHO" as const,
      pin: "4821",
      pinGeneratedAt: new Date(Date.now() - 30 * 60000),
      receivedAtBox: new Date(Date.now() - 90 * 60000),
      entregadorId: null,
      packages: [
        { weightKg: 40, description: "Fardo de camisetas", shelfCode: "PRAT-A1" },
        { weightKg: 40, description: "Fardo de calças jeans", shelfCode: "PRAT-A2" },
      ],
    },
    {
      lojistaId: lojista2.id,
      originLocationId: shoppings[1].id,
      destLocationId: destinos[2].id,
      vehicleCategory: "BRAS_BIKE" as const,
      declaredWeightKg: 12,
      declaredVolume: "8 sacolas de atacado",
      distanceKm: 4.5,
      basePrice: 18,
      kmAdditional: 4,
      withdrawalFee: 18,
      totalPrice: 22,
      status: "SOLICITADO" as const,
      pin: "7391",
      pinGeneratedAt: new Date(),
      entregadorId: null,
      packages: [{ weightKg: 12, description: "Sacolas mistas de aviamentos", shelfCode: null }],
    },
    {
      lojistaId: lojista3.id,
      originLocationId: shoppings[2].id,
      destLocationId: destinos[4].id,
      vehicleCategory: "BRAS_A_PE" as const,
      declaredWeightKg: 5,
      declaredVolume: "1 caixa pequena de aviamentos",
      distanceKm: 0.8,
      basePrice: 11,
      kmAdditional: 0,
      withdrawalFee: 11,
      totalPrice: 11,
      status: "ENTREGUE" as const,
      pin: "2045",
      pinGeneratedAt: new Date(Date.now() - 6 * 3600000),
      receivedAtBox: new Date(Date.now() - 6 * 3600000),
      dispatchedAt: new Date(Date.now() - 5.5 * 3600000),
      pickedUpAt: new Date(Date.now() - 5.5 * 3600000),
      deliveredAt: new Date(Date.now() - 5 * 3600000),
      entregadorId: entregadorAPE.id,
      packages: [{ weightKg: 5, description: "Caixa de botões e zíperes", shelfCode: "PRAT-C5" }],
    },
    {
      lojistaId: lojista.id,
      originLocationId: shoppings[0].id,
      destLocationId: destinos[1].id,
      vehicleCategory: "BRAS_E_MOB" as const,
      declaredWeightKg: 14,
      declaredVolume: "3 caixas de e-commerce",
      distanceKm: 0.6,
      basePrice: 19,
      kmAdditional: 0,
      withdrawalFee: 19,
      totalPrice: 19,
      status: "EM_ENTREGA" as const,
      pin: "1592",
      pinGeneratedAt: new Date(Date.now() - 20 * 60000),
      receivedAtBox: new Date(Date.now() - 50 * 60000),
      dispatchedAt: new Date(Date.now() - 15 * 60000),
      pickedUpAt: new Date(Date.now() - 10 * 60000),
      entregadorId: entregadorEMob.id,
      packages: [{ weightKg: 14, description: "Pedidos e-commerce (3 caixas)", shelfCode: "PRAT-B3" }],
    },
  ];

  for (let i = 0; i < sampleRequests.length; i++) {
    const r = sampleRequests[i];
    const year = new Date().getFullYear();
    const code = `CB-${year}-${String(i + 1).padStart(5, "0")}`;

    const request = await db.deliveryRequest.create({
      data: {
        code,
        lojistaId: r.lojistaId,
        originLocationId: r.originLocationId,
        destLocationId: r.destLocationId,
        entregadorId: r.entregadorId,
        vehicleCategory: r.vehicleCategory,
        declaredWeightKg: r.declaredWeightKg,
        declaredVolume: r.declaredVolume,
        distanceKm: r.distanceKm,
        basePrice: r.basePrice,
        kmAdditional: r.kmAdditional,
        withdrawalFee: r.withdrawalFee,
        totalPrice: r.totalPrice,
        status: r.status,
        pin: r.pin,
        pinGeneratedAt: r.pinGeneratedAt,
        receivedAtBox: r.receivedAtBox,
        dispatchedAt: r.dispatchedAt,
        pickedUpAt: r.pickedUpAt,
        deliveredAt: r.deliveredAt,
        packages: {
          create: r.packages.map((p, idx) => ({
            qrCode: `${code}-PKG${String(idx + 1).padStart(2, "0")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
            weightKg: p.weightKg,
            description: p.description,
            shelfCode: p.shelfCode,
            receivedAt: r.receivedAtBox,
            boxId: box1.id,
          })),
        },
        transactions: {
          create: [
            {
              amount: r.totalPrice,
              type: "FRETE" as const,
              status: r.status === "ENTREGUE" ? ("PAGO" as const) : ("PENDENTE" as const),
              method: "PIX",
              splitHolding: +(r.totalPrice * 0.1).toFixed(2),
              splitOperator: +(r.totalPrice * 0.5).toFixed(2),
              splitCourier: +(r.totalPrice * 0.4).toFixed(2),
              paidAt: r.status === "ENTREGUE" ? r.deliveredAt : null,
            },
          ],
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId: r.lojistaId,
        action: "REQUEST_CREATED",
        entity: "DeliveryRequest",
        entityId: request.id,
        details: `Pedido ${code} criado via app lojista`,
      },
    });
  }
  console.log("✓ 4 pedidos de exemplo criados");

  console.log("\n✅ Seed concluído!");
}

seedDatabase()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Erro no seed:", e);
    process.exit(1);
  });
