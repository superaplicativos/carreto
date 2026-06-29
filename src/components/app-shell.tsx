"use client";

import { useAuth } from "@/lib/auth-client";
import { LoginScreen } from "@/components/login-screen";
import { LojistaDashboard } from "@/components/lojista-dashboard";
import { AtendenteDashboard } from "@/components/atendente-dashboard";
import { EntregadorDashboard } from "@/components/entregador-dashboard";
import { GerenteDashboard } from "@/components/gerente-dashboard";
import { AdminDashboard } from "@/components/admin-dashboard";
import { ROLE_INFO } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Truck, LogOut, Loader2 } from "lucide-react";
import { isRealtimeEnabled } from "@/lib/supabase-client";

export function AppShell() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-3">Carregando Carreto Brás...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  const role = ROLE_INFO[user.role];

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      {/* Header */}
      <header className="bg-sidebar text-sidebar-foreground sticky top-0 z-40 border-b border-sidebar-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <Truck className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm leading-tight">Carreto Brás</div>
            <div className="text-[10px] text-sidebar-foreground/70 leading-tight">por Aerobraslog</div>
          </div>

          <div className="flex items-center gap-2">
            {/* Badge Realtime */}
            <div
              className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium"
              title={isRealtimeEnabled ? "Conexão Realtime ativa (Supabase)" : "Modo polling (configurar Supabase Realtime)"}
              style={{
                background: isRealtimeEnabled ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                color: isRealtimeEnabled ? "#10b981" : "#f59e0b",
              }}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isRealtimeEnabled ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              {isRealtimeEnabled ? "AO VIVO" : "POLLING"}
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium leading-tight">{user.name}</div>
              <div className="text-[10px] text-sidebar-foreground/70 leading-tight">{role.label}</div>
            </div>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base ${role.color}`}>
              {role.icon}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {user.role === "LOJISTA" && <LojistaDashboard />}
        {user.role === "ATENDENTE" && <AtendenteDashboard />}
        {user.role === "ENTREGADOR" && <EntregadorDashboard />}
        {user.role === "GERENTE" && <GerenteDashboard />}
        {user.role === "ADMIN" && <AdminDashboard />}
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-3 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <div>
            © 2026 Aerobraslog Holding × Carreto Brás — Operação de Logística Urbana do Polo do Brás
          </div>
          <div className="text-[10px]">
            Demo Vercel + Supabase · Não coleta dados reais
          </div>
        </div>
      </footer>
    </div>
  );
}
