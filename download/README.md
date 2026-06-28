# Carreto Brás × Aerobraslog — Demo

Sistema web de logística urbana para o Polo Comercial do Brás, com 5 perfis de usuário, fluxo completo de pedido → box → entrega, PIN de segurança, QR Codes, cronômetro de 2h no box, foto+assinatura de entrega, e BI consolidado para a Holding.

## Stack

- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui
- **Backend**: API Routes do Next.js + Prisma ORM
- **Banco**: SQLite (demo local) → pronto para Supabase Postgres
- **Auth**: cookies httpOnly (demo) → pronto para Supabase Auth
- **Realtime**: polling (demo) → pronto para Supabase Realtime
- **Gráficos**: Recharts (BI do gerente/admin)
- **PWA**: instalável no celular (manifest.json)

## Como rodar local

```bash
bun install
bun run db:push       # cria tabelas
bun run scripts/seed.ts  # popula dados de exemplo
bun run dev
```

Acesse `http://localhost:3000`.

## Contas demo (senha: `demo123`)

| Perfil | Email | O que faz |
|---|---|---|
| Admin (Holding) | admin@aerobraslog.com.br | BI consolidado, split financeiro, gestão de usuários, auditoria |
| Gerente | gerente@carretobras.com.br | Dashboard operacional, monitor de boxes, pedidos ao vivo |
| Atendente | atendente@carretobras.com.br | Bipar QR, etiquetar, organizar prateleiras, cronômetro 2h |
| Lojista | lojista@vautier.com.br | Solicitar frete, ver histórico, liberar entrega, ver PIN |
| Entregador (4 perfis) | entregador1@carretobras.com.br | Fila virtual, aceitar com PIN, foto+assinatura, repasse |

## Funcionalidades implementadas

### Motor de precificação (regras de negócio)
- ✅ Trava de cubagem (redireciona categoria se peso exceder limite)
- ✅ Preço base interpolado por peso dentro da faixa
- ✅ Adicional de R$ 2/km para Bike/E-Mob além do raio
- ✅ Taxa de retirada = valor base do frete

### Fluxo de pedido completo
1. **Lojista** solicita frete (declara peso, volume, origem, destino)
2. Sistema calcula preço automaticamente
3. Lojista recebe PIN de 4 dígitos
4. **Atendente** bipa QR Code do pacote → inicia cronômetro de 2h
5. Atendente etiqueta e organiza na prateleira de destino
6. Lojista clica em "Liberar Entrega"
7. **Entregador** vê na fila, aceita informando PIN
8. Entregador confirma entrega com foto + assinatura
9. Pagamento liberado → split 10% Holding / 50% Operador / 40% Entregador

### BI Consolidado (Admin/Holding)
- Receita total / hoje / por categoria
- Split financeiro detalhado por modal
- Evolução de receita (7 dias, área chart)
- Pedidos por categoria (bar chart)
- Status dos pedidos (pie chart)
- Gestão de usuários (10 cadastrados)
- Log de auditoria com rastreabilidade total

### Monitor operacional (Gerente)
- KPIs: pedidos hoje, em andamento, entregues, faturamento
- Monitor de 11 shoppings
- Pedidos ao vivo com atualização a cada 15s
- Métricas: conversão, cancelamento, eficiência, ocupação

## Deploy em produção (Vercel + Supabase)

1. **Criar projeto no Supabase** → pegar `DATABASE_URL` (Pooler URL)
2. **Trocar** `provider = "sqlite"` para `provider = "postgresql"` no `prisma/schema.prisma`
3. **Configurar variáveis no Vercel**:
   - `DATABASE_URL` = URL do Supabase
   - (futuro) `NEXTAUTH_SECRET` para JWT
4. **Deploy** via `vercel` CLI ou GitHub integration
5. **Rodar** `prisma db push` no Supabase para criar tabelas
6. **Rodar** seed adaptado para criar admin/gerente/lojistas/entregadores

### Migração para Supabase Auth
- Substituir `src/lib/auth.ts` por `@supabase/supabase-js` auth
- Adicionar RLS (Row Level Security) por role nas tabelas
- Trocar cookies por session do Supabase

### Migração para Supabase Realtime
- Substituir polling por `supabase.channel()` subscriptions
- Painel do box pisca em tempo real ao liberar entrega
- Fila do entregador atualiza instantaneamente

## Estrutura

```
prisma/schema.prisma        # 9 models (User, LojistaProfile, EntregadorProfile,
                            # Location, Box, DeliveryRequest, Package, Transaction, AuditLog)
scripts/seed.ts             # Seed com 11 shoppings, 7 destinos, 10 usuários, 4 pedidos
src/lib/business.ts         # Engine de precificação + PIN + QR + cronômetro
src/lib/auth.ts             # Auth demo com cookies
src/lib/constants.ts        # Categorias, status, roles, formatadores
src/app/api/                # 8 routes: auth, requests, requests/[id], pricing,
                            # locations, queue, box, stats, users, audit
src/components/             # 5 dashboards por perfil + login + shell
```

## Licença

Propriedade de Aerobraslog Holding × Carreto Brás — 2026.
