"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Package, MapPin, Weight, Calculator, QrCode, KeyRound, Send, CheckCircle2,
  AlertTriangle, Loader2, Plus, History, Clock, TrendingUp, Phone, Store,
} from "lucide-react";
import { CATEGORY_INFO, STATUS_INFO, formatBRL, formatDateTime, timeAgo } from "@/lib/constants";
import { useAuth } from "@/lib/auth-client";
import { useRealtime } from "@/hooks/use-realtime";

interface Location {
  id: string;
  name: string;
  type: string;
  address: string;
}
interface PricingResult {
  category: keyof typeof CATEGORY_INFO;
  basePrice: number;
  kmAdditional: number;
  withdrawalFee: number;
  totalPrice: number;
  warnings: string[];
  redirected: boolean;
  redirectedFrom?: string;
}
interface DeliveryRequest {
  id: string;
  code: string;
  status: keyof typeof STATUS_INFO;
  vehicleCategory: keyof typeof CATEGORY_INFO;
  declaredWeightKg: number;
  declaredVolume: string;
  distanceKm: number;
  basePrice: number;
  kmAdditional: number;
  withdrawalFee: number;
  totalPrice: number;
  pin?: string | null;
  pinGeneratedAt?: string | null;
  receivedAtBox?: string | null;
  dispatchedAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  lojista: { id: string; name: string };
  entregador?: { id: string; name: string } | null;
  originLocation: Location;
  destLocation: Location;
  packages: { id: string; qrCode: string; weightKg: number; description: string; shelfCode?: string | null }[];
  transactions: { id: string; amount: number; type: string; status: string }[];
}

export function LojistaDashboard() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<{ shoppings: Location[]; destinos: Location[] }>({ shoppings: [], destinos: [] });
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [originId, setOriginId] = useState("");
  const [destId, setDestId] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [volume, setVolume] = useState("");
  const [distanceKm, setDistanceKm] = useState("0.5");
  const [preferredCategory, setPreferredCategory] = useState<string>("");
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [createdPin, setCreatedPin] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    const [shopRes, destRes] = await Promise.all([
      fetch("/api/locations?type=SHOPPING"),
      fetch("/api/locations?type=ESTACIONAMENTO"),
    ]);
    const [shopData, destData] = await Promise.all([shopRes.json(), destRes.json()]);
    setLocations({ shoppings: shopData.locations, destinos: destData.locations });
  }, []);

  const fetchRequests = useCallback(async () => {
    const res = await fetch("/api/requests?mine=1");
    const data = await res.json();
    setRequests(data.requests || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLocations();
    fetchRequests();
  }, [fetchLocations, fetchRequests]);

  // Realtime: histórico do lojista atualiza quando status dos pedidos muda
  // (atendente bipa, etiqueta, entregador aceita, etc)
  useRealtime("DeliveryRequest", fetchRequests, 15000);

  // Calcular preço em tempo real
  useEffect(() => {
    if (!weightKg) {
      setPricing(null);
      return;
    }
    setCalcLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/pricing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weightKg: Number(weightKg),
            distanceKm: Number(distanceKm) || 0,
            preferredCategory: preferredCategory || undefined,
          }),
        });
        const data = await res.json();
        setPricing(data.pricing);
      } finally {
        setCalcLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [weightKg, distanceKm, preferredCategory]);

  async function handleSubmit() {
    if (!originId || !destId || !weightKg || !volume) {
      toast.error("Preencha todos os campos");
      return;
    }
    setSubmitLoading(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originLocationId: originId,
          destLocationId: destId,
          declaredWeightKg: Number(weightKg),
          declaredVolume: volume,
          distanceKm: Number(distanceKm),
          preferredCategory: preferredCategory || undefined,
          packages: [{ weightKg: Number(weightKg), description: volume }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCreatedPin(data.pin);
      setCreatedCode(data.request.code);
      toast.success(`Pedido ${data.request.code} criado!`);
      // Reset form
      setWeightKg("");
      setVolume("");
      setPreferredCategory("");
      setPricing(null);
      fetchRequests();
    } catch (e) {
      toast.error("Erro: " + (e as Error).message);
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleAction(requestId: string, action: string, extra?: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Operação realizada");
      fetchRequests();
    } catch (e) {
      toast.error("Erro: " + (e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Store className="w-6 h-6 text-primary" />
          Olá, {user?.name?.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground text-sm">
          Solicite fretes, acompanhe seus pacotes no box e libere entregas.
        </p>
      </div>

      <Tabs defaultValue="novo" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="novo">Solicitar Frete</TabsTrigger>
          <TabsTrigger value="historico">Histórico ({requests.length})</TabsTrigger>
          <TabsTrigger value="box">Meu Box</TabsTrigger>
        </TabsList>

        {/* ===== NOVO PEDIDO ===== */}
        <TabsContent value="novo" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="w-5 h-5 text-primary" /> Detalhes da Carga
                </CardTitle>
                <CardDescription>Declare o que será transportado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Shopping de Origem (seu box)</Label>
                  <Select value={originId} onValueChange={setOriginId}>
                    <SelectTrigger><SelectValue placeholder="Selecione o shopping" /></SelectTrigger>
                    <SelectContent>
                      {locations.shoppings.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Destino (Estacionamento / Pátio)</Label>
                  <Select value={destId} onValueChange={setDestId}>
                    <SelectTrigger><SelectValue placeholder="Selecione o destino" /></SelectTrigger>
                    <SelectContent>
                      {locations.destinos.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="weight">Peso estimado (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.5"
                      min="0.1"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      placeholder="ex: 80"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="distance">Distância (km)</Label>
                    <Input
                      id="distance"
                      type="number"
                      step="0.1"
                      min="0"
                      value={distanceKm}
                      onChange={(e) => setDistanceKm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="volume">Descrição do volume</Label>
                  <Textarea
                    id="volume"
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    placeholder="ex: 2 fardos de camisetas tamanho GG"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Categoria preferencial (opcional)</Label>
                  <Select value={preferredCategory} onValueChange={setPreferredCategory}>
                    <SelectTrigger><SelectValue placeholder="Sistema escolhe automaticamente" /></SelectTrigger>
                    <SelectContent>
                      {Object.values(CATEGORY_INFO).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.icon} {c.name} (até {c.maxWeightKg}kg)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calculator className="w-5 h-5 text-primary" /> Cálculo do Frete
                </CardTitle>
                <CardDescription>Regras: trava de cubagem + R$ 2/km adicional (Bike/E-Mob)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {calcLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Calculando...
                  </div>
                )}

                {!pricing && !calcLoading && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Weight className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    Informe o peso para calcular o frete
                  </div>
                )}

                {pricing && (
                  <>
                    <div className="rounded-lg p-4 border-2" style={{ borderColor: "var(--primary)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground uppercase">Categoria selecionada</span>
                        <Badge className={CATEGORY_INFO[pricing.category].colorLight}>
                          {CATEGORY_INFO[pricing.category].icon} {CATEGORY_INFO[pricing.category].name}
                        </Badge>
                      </div>
                      <div className="text-3xl font-black text-primary">
                        {formatBRL(pricing.totalPrice)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {CATEGORY_INFO[pricing.category].vehicle} · até {CATEGORY_INFO[pricing.category].maxWeightKg}kg
                      </div>
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Preço base</span>
                        <span className="font-medium">{formatBRL(pricing.basePrice)}</span>
                      </div>
                      {pricing.kmAdditional > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Adicional de km</span>
                          <span className="font-medium">+{formatBRL(pricing.kmAdditional)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs text-muted-foreground border-t pt-1 mt-1">
                        <span>Taxa de retirada (se estourar 2h)</span>
                        <span>{formatBRL(pricing.withdrawalFee)}</span>
                      </div>
                    </div>

                    {pricing.warnings.map((w, i) => (
                      <Alert key={i} className="py-2">
                        <AlertTriangle className="w-4 h-4" />
                        <AlertDescription className="text-xs">{w}</AlertDescription>
                      </Alert>
                    ))}

                    <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 space-y-1">
                      <div className="flex items-center gap-1 font-medium text-foreground">
                        <Clock className="w-3 h-3" /> Armazenagem gratuita: 2 horas no box
                      </div>
                      <div>Após 2h sem liberar entrega, será cobrada a taxa de retirada.</div>
                    </div>

                    <Button
                      onClick={handleSubmit}
                      disabled={submitLoading || !originId || !destId || !volume}
                      className="w-full"
                      size="lg"
                    >
                      {submitLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" /> Solicitar Frete
                        </>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Categorias disponíveis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Categorias disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.values(CATEGORY_INFO).map((cat) => (
                  <div key={cat.id} className="rounded-lg border p-3 hover:border-primary/40 transition">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{cat.icon}</span>
                      <Badge variant="outline" className="text-xs">{formatBRL(cat.basePriceMin)}–{formatBRL(cat.basePriceMax)}</Badge>
                    </div>
                    <div className="font-semibold text-sm">{cat.name}</div>
                    <div className="text-xs text-muted-foreground">{cat.vehicle}</div>
                    <div className="text-xs mt-1">
                      <span className="font-medium">{cat.maxWeightKg}kg</span> máx · raio {cat.radiusKm}km
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== HISTÓRICO ===== */}
        <TabsContent value="historico">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="w-5 h-5 text-primary" /> Meus Pedidos
              </CardTitle>
              <CardDescription>{requests.length} pedido(s) registrado(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
              ) : requests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  Nenhum pedido ainda. Crie seu primeiro frete!
                </div>
              ) : (
                <ScrollArea className="max-h-[600px]">
                  <div className="space-y-3 pr-2">
                    {requests.map((r) => (
                      <RequestCard key={r.id} request={r} onAction={handleAction} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== BOX INFO ===== */}
        <TabsContent value="box">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="w-5 h-5 text-primary" /> Informações do Meu Box
              </CardTitle>
              <CardDescription>Endereço e dados cadastrados para retirada</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{user?.name}</div>
                    <div className="text-sm text-muted-foreground">Lojista parceiro Carreto Brás</div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700">Ativo</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm pt-3 border-t">
                  <div>
                    <div className="text-xs text-muted-foreground">Shopping</div>
                    <div className="font-medium">{locations.shoppings.find(s => s.id === originId)?.name || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">WhatsApp</div>
                    <div className="font-medium flex items-center gap-1"><Phone className="w-3 h-3" /> {user?.phone || "—"}</div>
                  </div>
                </div>
              </div>
              <Alert>
                <CheckCircle2 className="w-4 h-4" />
                <AlertDescription className="text-xs">
                  Você aceitou o Termo de Uso atestando legalidade da mercadoria transportada.
                  Em caso de dúvida, contate o jurídico: juridico@aerobraslog.com.br
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de PIN criado */}
      <Dialog open={!!createdPin} onOpenChange={(v) => !v && setCreatedPin(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" /> Pedido criado!
            </DialogTitle>
            <DialogDescription>
              Anote o PIN de segurança. Ele será solicitado pelo entregador no momento da coleta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center py-4 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground uppercase mb-2">Código do pedido</div>
              <div className="text-xl font-bold mb-3">{createdCode}</div>
              <div className="text-xs text-muted-foreground uppercase mb-2">PIN de segurança</div>
              <div className="text-5xl font-black tracking-[0.3em] text-primary">{createdPin}</div>
            </div>
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription className="text-xs">
                O entregador só poderá iniciar a entrega após informar este PIN.
                Não compartilhe com terceiros.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedPin(null)} className="w-full">Entendi, fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestCard({
  request,
  onAction,
}: {
  request: DeliveryRequest;
  onAction: (id: string, action: string, extra?: Record<string, unknown>) => void;
}) {
  const [showPin, setShowPin] = useState(false);
  const cat = CATEGORY_INFO[request.vehicleCategory];
  const status = STATUS_INFO[request.status];

  return (
    <div className="rounded-lg border p-4 hover:shadow-sm transition">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold">{request.code}</span>
            <Badge variant="outline" className={status.color}>{status.icon} {status.label}</Badge>
          </div>
          <div className="text-xs text-muted-foreground">{timeAgo(request.createdAt)}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-primary">{formatBRL(request.totalPrice)}</div>
          <Badge className={cat.colorLight + " text-xs"}>{cat.icon} {cat.name}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Origem</div>
          <div className="font-medium truncate">{request.originLocation.name}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Destino</div>
          <div className="font-medium truncate">{request.destLocation.name}</div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground mb-3">
        <Weight className="w-3 h-3 inline mr-1" />
        {request.declaredWeightKg}kg · {request.declaredVolume}
      </div>

      {request.packages.length > 0 && (
        <div className="mb-3 space-y-1">
          {request.packages.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-xs bg-muted/40 rounded px-2 py-1">
              <QrCode className="w-3 h-3" />
              <span className="font-mono">{p.qrCode}</span>
              {p.shelfCode && <Badge variant="outline" className="text-[10px] ml-auto">{p.shelfCode}</Badge>}
            </div>
          ))}
        </div>
      )}

      {request.pin && (
        <div className="mb-3 flex items-center gap-2 text-xs">
          <KeyRound className="w-3 h-3 text-primary" />
          <span className="text-muted-foreground">PIN:</span>
          <span className="font-mono font-bold">{showPin ? request.pin : "••••"}</span>
          <Button variant="ghost" size="sm" className="h-5 text-xs" onClick={() => setShowPin(!showPin)}>
            {showPin ? "ocultar" : "mostrar"}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-3 border-t">
        {request.status === "PRONTO_DESPACHO" && (
          <Button size="sm" onClick={() => onAction(request.id, "RELEASE_DELIVERY")}>
            <Send className="w-3 h-3" /> Liberar Entrega
          </Button>
        )}
        {(request.status === "SOLICITADO" || request.status === "RECEBIDO_BOX" || request.status === "PRONTO_DESPACHO") && (
          <Button size="sm" variant="outline" onClick={() => onAction(request.id, "CANCEL")}>
            Cancelar
          </Button>
        )}
        {request.status === "RECEBIDO_BOX" && (
          <Button size="sm" variant="outline" onClick={() => onAction(request.id, "WITHDRAW_FROM_BOX")}>
            Retirar no Box (taxa)
          </Button>
        )}
        {request.status === "EM_ENTREGA" && request.entregador && (
          <Badge className="bg-cyan-100 text-cyan-700 text-xs">
            🛵 {request.entregador.name} a caminho
          </Badge>
        )}
        {request.status === "ENTREGUE" && (
          <Badge className="bg-emerald-100 text-emerald-700 text-xs">
            <CheckCircle2 className="w-3 h-3" /> Entregue em {formatDateTime(request.deliveredAt)}
          </Badge>
        )}
      </div>
    </div>
  );
}
