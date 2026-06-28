"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Truck, Loader2, ArrowRight } from "lucide-react";

const DEMO_ACCOUNTS = [
  { email: "admin@aerobraslog.com.br", name: "Mikael Marinho", role: "Admin · Holding", icon: "🏛️" },
  { email: "gerente@carretobras.com.br", name: "Carlos Operações", role: "Gerente Geral", icon: "📊" },
  { email: "atendente@carretobras.com.br", name: "Ana Atendente", role: "Atendente de Box", icon: "🏷️" },
  { email: "lojista@vautier.com.br", name: "Beatriz Confecções", role: "Lojista Parceira", icon: "🏪" },
  { email: "entregador1@carretobras.com.br", name: "João Carrinho", role: "Entregador (Carrinho)", icon: "🛒" },
  { email: "entregador2@carretobras.com.br", name: "Marcos Bike", role: "Entregador (Bike)", icon: "🚲" },
  { email: "entregador3@carretobras.com.br", name: "Pedro A Pé", role: "Entregador (A Pé)", icon: "🚶" },
  { email: "entregador4@carretobras.com.br", name: "Lucas E-Mob", role: "Entregador (E-Mob)", icon: "🛴" },
];

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await login(email, password);
    if (!result.ok) setError(result.error || "Erro ao entrar");
    setLoading(false);
  }

  async function quickLogin(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("demo123");
    setLoading(true);
    setError("");
    const result = await login(demoEmail, "demo123");
    if (!result.ok) setError(result.error || "Erro ao entrar");
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Lado esquerdo — branding */}
      <div className="lg:w-1/2 bg-gradient-to-br from-orange-600 via-orange-500 to-amber-600 text-white p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-white" />
          <div className="absolute bottom-10 -left-20 w-80 h-80 rounded-full bg-white" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Carreto Brás</h1>
              <p className="text-xs text-white/80 font-medium">por Aerobraslog</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6 my-12">
          <h2 className="text-3xl lg:text-5xl font-black leading-tight">
            Logística leve,<br />
            rápida e<br />
            <span className="text-amber-200">conectada.</span>
          </h2>
          <p className="text-white/90 text-lg max-w-md">
            Operação integrada de carreto, armazenagem temporária e entregas urbanas
            no Polo Comercial do Brás — de fardos de confecção a pacotes de e-commerce.
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {[
              { icon: "🛒", label: "Carrinho até 120kg" },
              { icon: "🛴", label: "E-Mob sustentável" },
              { icon: "🚲", label: "Bike até 5km" },
              { icon: "🚶", label: "A pé, ultra-rápido" },
            ].map((item) => (
              <div key={item.label} className="bg-white/10 backdrop-blur rounded-lg p-3 border border-white/20">
                <div className="text-2xl mb-1">{item.icon}</div>
                <div className="text-xs font-semibold">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/70">
          © 2026 Aerobraslog · Holding de Tecnologia e Gestão · Carreto Brás · CNPJ operacional
        </div>
      </div>

      {/* Lado direito — login */}
      <div className="lg:w-1/2 p-6 lg:p-12 flex items-center justify-center bg-muted/30">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Entrar na plataforma</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Use suas credenciais ou escolha uma conta demo abaixo.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-muted/30 px-2 text-muted-foreground">Contas demo — toque para entrar</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                onClick={() => quickLogin(acc.email)}
                disabled={loading}
                className="text-left p-3 rounded-lg border bg-card hover:bg-accent hover:border-primary/40 transition-all group disabled:opacity-50"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{acc.icon}</span>
                  <ArrowRight className="w-3 h-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                </div>
                <div className="text-xs font-semibold truncate">{acc.name}</div>
                <div className="text-[10px] text-muted-foreground">{acc.role}</div>
              </button>
            ))}
          </div>

          <Card className="bg-orange-50 border-orange-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-orange-900">🔑 Senha demo: demo123</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-orange-800 text-xs">
                Ambiente de demonstração com dados de exemplo já populados. Em produção:
                Supabase Auth + RLS por perfil.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
