# 🚛 Carreto Brás × Aerobraslog

Sistema web de logística urbana para o Polo Comercial do Brás — operação integrada de carreto, armazenagem temporária (2h grátis nos boxes) e entregas com frotas sustentáveis (a pé, bike, e-mob, carrinho de mão).

## 🎯 O que o sistema faz

Plataforma multi-perfil (Lojista, Atendente de Box, Entregador, Gerente e Admin/Holding) com fluxo completo:

1. **Lojista** solicita frete declarando peso, volume, origem e destino
2. Sistema calcula preço automaticamente (trava de cubagem + adicional de km)
3. Lojista recebe **PIN de 4 dígitos** de segurança
4. **Atendente de Box** bipa QR Code do pacote → inicia cronômetro de 2h
5. Atendente etiqueta e organiza na prateleira de destino
6. Lojista clica em "Liberar Entrega"
7. **Entregador** vê na fila virtual, aceita informando o PIN
8. Entregador confirma entrega com **foto + assinatura digital**
9. Pagamento liberado → split automático **10% Holding / 50% Operador / 40% Entregador**

## 🛠 Stack

- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui
- **Backend**: API Routes do Next.js + Prisma ORM
- **Banco**: PostgreSQL (Supabase)
- **Auth**: cookies httpOnly (pronto para Supabase Auth)
- **Gráficos BI**: Recharts
- **PWA**: instalável no celular (manifest.json)

## 🚀 Deploy na Vercel + Supabase

### 1. Criar projeto no Supabase
- Acesse https://supabase.com → New Project
- Region: **South America (São Paulo)**
- Anote a senha do banco
- Em **Project Settings → Database → Connection String → URI**, copie a URL

### 2. Deploy na Vercel
- Acesse https://vercel.com → New Project → importe este repositório
- Em **Environment Variables**, adicione:
  - `DATABASE_URL` = URL copiada do Supabase (a que termina com `?pgbouncer=true`)
- Clique em **Deploy**

### 3. Criar tabelas e popular dados
Após o deploy, vá em **Storage** do repositório e rode (ou rode localmente com a `DATABASE_URL` do Supabase no `.env`):

```bash
bun install
bunx prisma db push
bun run scripts/seed.ts
```

Isso cria as 9 tabelas e popula:
- 11 shoppings do Brás (Vautier Premium, Total Brás, Newmall, ...)
- 7 destinos (pátios, estacionamentos, bolsões)
- 10 usuários demo (1 admin, 1 gerente, 1 atendente, 3 lojistas, 4 entregadores)
- 4 pedidos em diferentes estados para demonstração

## 🔑 Contas demo (senha: `demo123`)

| Perfil | Email | O que faz |
|---|---|---|
| Admin (Holding) | admin@aerobraslog.com.br | BI consolidado, split financeiro, gestão de usuários, auditoria |
| Gerente | gerente@carretobras.com.br | Dashboard operacional, monitor de boxes, pedidos ao vivo |
| Atendente | atendente@carretobras.com.br | Bipar QR, etiquetar, organizar prateleiras, cronômetro 2h |
| Lojista | lojista@vautier.com.br | Solicitar frete, ver histórico, liberar entrega, ver PIN |
| Entregador (4) | entregador1@carretobras.com.br | Fila virtual, aceitar com PIN, foto+assinatura, repasse |

Entregadores 2, 3 e 4 seguem o mesmo padrão (`entregador2@`, `entregador3@`, `entregador4@`) — um para cada categoria (Bike, A Pé, E-Mob).

## 📊 Categorias de transporte e precificação

| Categoria | Veículo | Peso máx | Raio | Preço base |
|---|---|---|---|---|
| 🚶 Brás A Pé | Mochila/Bag | 8 kg | 1,5 km | R$ 10–12 |
| 🛴 Brás E-Mob | Moto Elétrica | 15 kg | 5 km | R$ 15–20 |
| 🚲 Brás Bike | Bike | 15 kg | 5 km | R$ 15–20 |
| 🛒 Carreto Carrinho | Carrinho de Mão | 120 kg | 1,5 km | R$ 25–35 |

**Regras:**
- Trava de cubagem: peso acima do limite redireciona para categoria superior
- Adicional de **R$ 2/km** além do raio (apenas Bike/E-Mob)
- **Taxa de retirada** = valor base do frete (se lojista estourar 2h e retirar no box)

## 🗺 Polos de coleta (11 shoppings)

Shopping Vautier Premium · Shopping Total Brás · Shopping Newmall · Shopping Vaultier · Mega Polo Moda · Shopping Plaza Polo · Shopping All Brás · Shopping Porto Brás · Busca Busca - Brás · Shopping Valtier Chiffon · Shopping HD

## 📁 Estrutura do projeto

```
prisma/schema.prisma              # 9 models Postgres
scripts/seed.ts                   # Seed completo (shoppings, usuários, pedidos)
src/lib/business.ts               # Engine de precificação + PIN + QR + cronômetro
src/lib/auth.ts                   # Auth com cookies httpOnly
src/lib/constants.ts              # Categorias, status, roles
src/app/api/                      # 9 routes REST (auth, requests, pricing, queue, box, stats, users, audit)
src/components/                   # 5 dashboards por perfil + login + shell
```

## 📈 Roadmap pós-piloto

- [ ] Supabase Auth + RLS por perfil
- [ ] Supabase Realtime (painel do box pisca instantâneo)
- [ ] Supabase Storage (fotos de entrega reais)
- [ ] Mercado Pago (Pix + cartão com split automático)
- [ ] App nativo (PWA com push notifications)
- [ ] Multi-célula operacional (outros polos além do Brás)

## 📝 Licença

Propriedade de **Aerobraslog Holding × Carreto Brás** — 2026.
