"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Truck, MapPin, Weight, KeyRound, Camera, CheckCircle2, Clock,
  Loader2, Package, ListChecks, History, User, Phone, Navigation,
} from "lucide-react";
import { CATEGORY_INFO, STATUS_INFO, formatBRL, formatDateTime, timeAgo } from "@/lib/constants";
import { useAuth } from "@/lib/auth-client";

interface QueueRequest {
  id: string;
  code: string;
  status: string;
  vehicleCategory: keyof typeof CATEGORY_INFO;
  declaredWeightKg: number;
  declaredVolume: string;
  distanceKm: number;
  totalPrice: number;
  basePrice: number;
  kmAdditional: number;
  createdAt: string;
  dispatchedAt: string | null;
  lojista: { name: string };
  originLocation: { name: string };
  destLocation: { name: string };
  packages: { id: string; qrCode: string; weightKg: number; description: string; shelfCode: string | null }[];
  pin?: string | null;
}

interface Profile {
  vehicleCategory: keyof typeof CATEGORY_INFO;
  status: string;
  uniformKit: string | null;
  cpf: string;
}

export function EntregadorDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [availableRequests, setAvailableRequests] = useState<QueueRequest[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<QueueRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinDialog, setPinDialog] = useState<QueueRequest | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<QueueRequest | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");

  const fetchAll = useCallback(async () => {
    try {
      const [queueRes, mineRes] = await Promise.all([
        fetch("/api/queue"),
        fetch("/api/requests?mine=1"),
      ]);
      const [queueData, mineData] = await Promise.all([queueRes.json(), mineRes.json()]);

      const found = (queueData.entregadores as Array<{ user: { id: string }; vehicleCategory: keyof typeof CATEGORY_INFO; status: string; uniformKit: string | null; cpf: string }>)
        .find((e) => e.user.id === user?.id);
      if (found) setProfile(found);

      setAvailableRequests(queueData.availableRequests || []);
      setMyDeliveries(mineData.requests || []);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 8000);
    return () => clearInterval(t);
  }, [fetchAll]);

  async function handleAcceptWithPin() {
    if (!pinDialog || pinInput.length !== 4) {
      toast.error("PIN deve ter 4 dígitos");
      return;
    }
    try {
      const res = await fetch(`/api/requests/${pinDialog.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACCEPT_DELIVERY", pin: pinInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Pedido ${pinDialog.code} aceito! Boa entrega.`);
      setPinDialog(null);
      setPinInput("");
      fetchAll();
    } catch (e) {
      toast.error("Erro: " + (e as Error).message);
    }
  }

  async function handleConfirmDelivery() {
    if (!confirmDialog || !photoUrl) {
      toast.error("Foto de entrega é obrigatória");
      return;
    }
    try {
      const res = await fetch(`/api/requests/${confirmDialog.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CONFIRM_DELIVERY",
          photoUrl,
          signatureUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Pedido ${confirmDialog.code} entregue! Pagamento liberado.`);
      setConfirmDialog(null);
      setPhotoUrl("");
      setSignatureUrl("");
      fetchAll();
    } catch (e) {
      toast.error("Erro: " + (e as Error).message);
    }
  }

  function simulatePhoto() {
    setPhotoUrl(`data:image/png;base64,${btoa("photo-" + Date.now())}`);
    toast.success("Foto simulada anexada");
  }

  function simulateSignature() {
    setSignatureUrl(`data:image/svg+xml;base64,${btoa("signature-" + Date.now())}`);
    toast.success("Assinatura simulada coletada");
  }

  const emAndamento = myDeliveries.filter((r) => r.status === "EM_ENTREGA");
  const historico = myDeliveries.filter((r) => r.status === "ENTREGUE" || r.status === "CANCELADO");
  const totalGanho = historico
    .filter((r) => r.status === "ENTREGUE")
    .reduce((acc, r) => acc + r.totalPrice * 0.4, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" /> {user?.name}
          </h1>
          <div className="flex items-center gap-2">
            {profile && (
              <>
                <Badge className={CATEGORY_INFO[profile.vehicleCategory].colorLight}>
                  {CATEGORY_INFO[profile.vehicleCategory].icon} {CATEGORY_INFO[profile.vehicleCategory].name}
                </Badge>
                <Badge variant="outline">Kit: {profile.uniformKit || "—"}</Badge>
                <Badge className={profile.status === "DISPONIVEL" ? "bg-emerald-100 text-emerald-700" : "bg-cyan-100 text-cyan-700"}>
                  {profile.status === "DISPONIVEL" ? "🟢 Disponível" : "🛵 Em entrega"}
                </Badge>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Entregas hoje (em andamento)</div>
            <div className="text-2xl font-bold">{emAndamento.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total entregue (histórico)</div>
            <div className="text-2xl font-bold">{historico.filter((r) => r.status === "ENTREGUE").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Ganhos (40% repasse)</div>
            <div className="text-2xl font-bold text-emerald-600">{formatBRL(totalGanho)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="fila">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="fila">Fila ({availableRequests.length})</TabsTrigger>
          <TabsTrigger value="andamento">Em Entrega ({emAndamento.length})</TabsTrigger>
          <TabsTrigger value="historico">Histórico ({historico.length})</TabsTrigger>
        </TabsList>

        {/* ===== FILA ===== */}
        <TabsContent value="fila">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ListChecks className="w-5 h-5 text-primary" /> Pedidos Disponíveis
              </CardTitle>
              <CardDescription>
                Aceite um pedido informando o PIN de segurança fornecido pelo lojista
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
              ) : availableRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  Nenhum pedido disponível no momento. Aguarde o lojista liberar.
                </div>
              ) : (
                <ScrollArea className="max-h-[600px]">
                  <div className="space-y-3 pr-2">
                    {availableRequests.map((r) => (
                      <QueueCard key={r.id} request={r} onAccept={() => { setPinDialog(r); setPinInput(""); }} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== EM ENTREGA ===== */}
        <TabsContent value="andamento">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Navigation className="w-5 h-5 text-primary" /> Entregas em Andamento
              </CardTitle>
              <CardDescription>Confirme a entrega com foto + assinatura ao finalizar</CardDescription>
            </CardHeader>
            <CardContent>
              {emAndamento.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  Nenhuma entrega em andamento.
                </div>
              ) : (
                <div className="space-y-3">
                  {emAndamento.map((r) => (
                    <Card key={r.id} className="border-cyan-300 bg-cyan-50/50">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold">{r.code}</div>
                            <div className="text-xs text-muted-foreground">{timeAgo(r.dispatchedAt || r.createdAt)}</div>
                          </div>
                          <Badge className="bg-cyan-100 text-cyan-700">🚀 Em entrega</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Origem</div>
                            <div className="font-medium text-xs">{r.originLocation.name}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Destino</div>
                            <div className="font-medium text-xs">{r.destLocation.name}</div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <Weight className="w-3 h-3 inline" /> {r.declaredWeightKg}kg · {r.declaredVolume}
                        </div>
                        <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 rounded p-2">
                          <KeyRound className="w-3 h-3 text-amber-600" />
                          <span className="text-amber-900">PIN do lojista:</span>
                          <span className="font-mono font-bold text-amber-900">{r.pin}</span>
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => { setConfirmDialog(r); setPhotoUrl(""); setSignatureUrl(""); }}
                        >
                          <Camera className="w-4 h-4" /> Confirmar Entrega
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== HISTÓRICO ===== */}
        <TabsContent value="historico">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="w-5 h-5 text-primary" /> Histórico de Entregas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historico.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma entrega finalizada ainda.
                </div>
              ) : (
                <ScrollArea className="max-h-[600px]">
                  <div className="space-y-3 pr-2">
                    {historico.map((r) => (
                      <div key={r.id} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <div className="font-bold text-sm">{r.code}</div>
                            <div className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</div>
                          </div>
                          <Badge variant="outline" className={STATUS_INFO[r.status as keyof typeof STATUS_INFO]?.color || ""}>
                            {STATUS_INFO[r.status as keyof typeof STATUS_INFO]?.icon} {STATUS_INFO[r.status as keyof typeof STATUS_INFO]?.label}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {r.destLocation.name} · {r.declaredWeightKg}kg
                        </div>
                        {r.status === "ENTREGUE" && (
                          <div className="text-xs font-medium text-emerald-600 mt-1">
                            Repasse: {formatBRL(r.totalPrice * 0.4)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal PIN */}
      <Dialog open={!!pinDialog} onOpenChange={(v) => !v && setPinDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" /> Informe o PIN do Lojista
            </DialogTitle>
            <DialogDescription>
              O lojista deve ter fornecido o PIN de 4 dígitos para liberar a coleta.
            </DialogDescription>
          </DialogHeader>
          {pinDialog && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded p-3 text-sm">
                <div className="font-semibold">{pinDialog.code}</div>
                <div className="text-xs text-muted-foreground">
                  {pinDialog.lojista.name} · {pinDialog.destLocation.name}
                </div>
                <div className="text-xs mt-1">{pinDialog.declaredWeightKg}kg · {pinDialog.declaredVolume}</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin">PIN de 4 dígitos</Label>
                <Input
                  id="pin"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="0000"
                  className="text-center text-2xl tracking-[0.5em] font-bold"
                  inputMode="numeric"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleAcceptWithPin()}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinDialog(null)}>Cancelar</Button>
            <Button onClick={handleAcceptWithPin} disabled={pinInput.length !== 4}>
              <CheckCircle2 className="w-4 h-4" /> Aceitar e Iniciar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal confirmação de entrega */}
      <Dialog open={!!confirmDialog} onOpenChange={(v) => !v && setConfirmDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" /> Confirmar Entrega
            </DialogTitle>
            <DialogDescription>
              Foto obrigatória do fardo no bagageiro + assinatura do responsável no ônibus.
            </DialogDescription>
          </DialogHeader>
          {confirmDialog && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded p-3 text-sm">
                <div className="font-semibold">{confirmDialog.code}</div>
                <div className="text-xs text-muted-foreground">
                  Destino: {confirmDialog.destLocation.name}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Foto do fardo no bagageiro *</Label>
                {photoUrl ? (
                  <div className="border-2 border-emerald-300 bg-emerald-50 rounded p-4 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1" />
                    <div className="text-xs text-emerald-700 font-medium">Foto anexada</div>
                    <Button variant="ghost" size="sm" onClick={() => setPhotoUrl("")}>Refazer</Button>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full" onClick={simulatePhoto}>
                    <Camera className="w-4 h-4" /> Simular Captura de Foto
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Assinatura do responsável (opcional)</Label>
                {signatureUrl ? (
                  <div className="border-2 border-emerald-300 bg-emerald-50 rounded p-3 text-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                    <div className="text-xs text-emerald-700">Assinatura coletada</div>
                    <Button variant="ghost" size="sm" onClick={() => setSignatureUrl("")}>Refazer</Button>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full" onClick={simulateSignature}>
                    Simular Coleta de Assinatura
                  </Button>
                )}
              </div>

              <Alert>
                <KeyRound className="w-4 h-4" />
                <AlertDescription className="text-xs">
                  Ao confirmar, o pagamento será liberado e o split (10% holding / 50% operador / 40% você) será processado.
                </AlertDescription>
              </Alert>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancelar</Button>
            <Button onClick={handleConfirmDelivery} disabled={!photoUrl}>
              <CheckCircle2 className="w-4 h-4" /> Confirmar Entrega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QueueCard({
  request,
  onAccept,
}: {
  request: QueueRequest;
  onAccept: () => void;
}) {
  const cat = CATEGORY_INFO[request.vehicleCategory];
  return (
    <div className="rounded-lg border p-4 hover:border-primary/40 transition">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="font-bold">{request.code}</div>
          <div className="text-xs text-muted-foreground">{timeAgo(request.dispatchedAt || request.createdAt)}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-primary">{formatBRL(request.totalPrice)}</div>
          <Badge className={cat.colorLight + " text-xs"}>{cat.icon} {cat.name}</Badge>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
        <div>
          <div className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Origem</div>
          <div className="font-medium truncate">{request.originLocation.name}</div>
        </div>
        <div>
          <div className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Destino</div>
          <div className="font-medium truncate">{request.destLocation.name}</div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
        <Weight className="w-3 h-3" /> {request.declaredWeightKg}kg · {request.declaredVolume}
        <span className="ml-auto">Distância: {request.distanceKm}km</span>
      </div>
      {request.kmAdditional > 0 && (
        <div className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mb-3">
          + {formatBRL(request.kmAdditional)} de adicional de km
        </div>
      )}
      <Button onClick={onAccept} className="w-full">
        <KeyRound className="w-4 h-4" /> Aceitar (informar PIN)
      </Button>
    </div>
  );
}
