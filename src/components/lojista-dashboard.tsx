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
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CardListSkeleton } from "@/components/skeletons";
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
  entregador?: {
    id: string;
    name: string;
    phone?: string | null;
    entregadorProfile?: {
      vehicleCategory: keyof typeof CATEGORY_INFO;
      uniformKit: string | null;
      cpf: string;
      photoUrl: string | null;
      status: string;
    } | null;
  } | null;
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

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validateForm() {
    const newErrors: Record<string, string> = {};
    if (!originId) newErrors.originId = "Selecione o shopping de origem";
    if (!destId) newErrors.destId = "Selecione o destino";
    if (!weightKg || Number(weightKg) <= 0) newErrors.weightKg = "Informe o peso (maior que 0)";
    if (Number(weightKg) > 120) newErrors.weightKg = "Peso máximo é 120kg (use Carrinho)";
    if (!volume || volume.trim().length < 3) newErrors.volume = "Descreva o volume (mín. 3 caracteres)";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm()) {
      toast.error("Corrija os campos destacados");
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
                  <Select value={originId} onValueChange={(v) => { setOriginId(v); setErrors({ ...errors, originId: "" }); }}>
                    <SelectTrigger className={errors.originId ? "border-red-500" : ""}><SelectValue placeholder="Selecione o shopping" /></SelectTrigger>
                    <SelectContent>
                      {locations.shoppings.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.originId && <p className="text-xs text-red-500">⚠ {errors.originId}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Destino (Estacionamento / Pátio)</Label>
                  <Select value={destId} onValueChange={(v) => { setDestId(v); setErrors({ ...errors, destId: "" }); }}>
                    <SelectTrigger className={errors.destId ? "border-red-500" : ""}><SelectValue placeholder="Selecione o destino" /></SelectTrigger>
                    <SelectContent>
                      {locations.destinos.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.destId && <p className="text-xs text-red-500">⚠ {errors.destId}</p>}
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
                      onChange={(e) => { setWeightKg(e.target.value); setErrors({ ...errors, weightKg: "" }); }}
                      placeholder="ex: 80"
                      className={errors.weightKg ? "border-red-500" : ""}
                    />
                    {errors.weightKg && <p className="text-xs text-red-500">⚠ {errors.weightKg}</p>}
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
                    onChange={(e) => { setVolume(e.target.value); setErrors({ ...errors, volume: "" }); }}
                    placeholder="ex: 2 fardos de camisetas tamanho GG"
                    rows={2}
                    className={errors.volume ? "border-red-500" : ""}
                  />
                  {errors.volume && <p className="text-xs text-red-500">⚠ {errors.volume}</p>}
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
                <CardListSkeleton count={3} />
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
          <ConfirmDialog
            trigger={
              <Button size="sm" variant="outline">
                Cancelar
              </Button>
            }
            title="Cancelar pedido?"
            description={`O pedido ${request.code} será cancelado. Esta ação não pode ser desfeita.`}
            confirmLabel="Sim, cancelar"
            destructive
            onConfirm={() => onAction(request.id, "CANCEL")}
          />
        )}
        {request.status === "RECEBIDO_BOX" && (
          <ConfirmDialog
            trigger={
              <Button size="sm" variant="outline">
                Retirar no Box (taxa)
              </Button>
            }
            title="Retirar no Box?"
            description={`Ao retirar no box, será cobrada a taxa de R$ ${request.withdrawalFee.toFixed(2)} (igual ao valor do frete). Esta ação não pode ser desfeita.`}
            confirmLabel={`Sim, retirar (R$ ${request.withdrawalFee.toFixed(2)})`}
            destructive
            onConfirm={() => onAction(request.id, "WITHDRAW_FROM_BOX")}
          />
        )}
        {request.status === "EM_ENTREGA" && request.entregador && (
          <div className="w-full mt-2 p-3 rounded-lg bg-cyan-50 border border-cyan-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-white text-lg shrink-0">
                {request.entregador.entregadorProfile?.vehicleCategory
                  ? CATEGORY_INFO[request.entregador.entregadorProfile.vehicleCategory].icon
                  : "🛵"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-cyan-900">
                  {request.entregador.name}
                </div>
                <div className="text-xs text-cyan-700 flex items-center gap-2 flex-wrap">
                  {request.entregador.entregadorProfile?.uniformKit && (
                    <span className="bg-cyan-200 px-1.5 py-0.5 rounded text-[10px] font-mono">
                      {request.entregador.entregadorProfile.uniformKit}
                    </span>
                  )}
                  {request.entregador.entregadorProfile?.vehicleCategory && (
                    <span>{CATEGORY_INFO[request.entregador.entregadorProfile.vehicleCategory].name}</span>
                  )}
                </div>
              </div>
              {request.entregador.phone && (
                <a
                  href={`tel:${request.entregador.phone.replace(/\D/g, "")}`}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-medium transition"
                >
                  <Phone className="w-3 h-3" />
                  <span className="hidden sm:inline">Ligar</span>
                </a>
              )}
            </div>
            <div className="mt-2 text-xs text-cyan-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              A caminho do destino · depuis {formatDateTime(request.pickedUpAt)}
            </div>
          </div>
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
