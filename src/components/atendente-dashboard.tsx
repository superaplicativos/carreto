"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Tag, QrCode, Clock, Package, MapPin, Bell, CheckCircle2, AlertTriangle,
  Loader2, Timer, Flame, Scale,
} from "lucide-react";
import { CATEGORY_INFO, STATUS_INFO, formatBRL, formatDateTime, timeAgo } from "@/lib/constants";

interface BoxRequest {
  id: string;
  code: string;
  status: keyof typeof STATUS_INFO;
  vehicleCategory: keyof typeof CATEGORY_INFO;
  declaredWeightKg: number;
  declaredVolume: string;
  receivedAtBox: string | null;
  createdAt: string;
  lojista: { name: string };
  originLocation: { name: string };
  destLocation: { name: string };
  packages: { id: string; qrCode: string; weightKg: number; description: string; shelfCode: string | null; boxId: string | null }[];
  entregador?: { name: string } | null;
  boxTimer: { remainingMinutes: number; expired: boolean; percentage: number };
}

export function AtendenteDashboard() {
  const [box, setBox] = useState<{ code: string; shopping: { name: string }; attendant: { name: string } } | null>(null);
  const [requests, setRequests] = useState<BoxRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanDialog, setScanDialog] = useState(false);
  const [scanCode, setScanCode] = useState("");
  const [labelDialog, setLabelDialog] = useState<BoxRequest | null>(null);
  const [shelfCodes, setShelfCodes] = useState<Record<string, string>>({});

  const fetchBox = useCallback(async () => {
    try {
      const res = await fetch("/api/box");
      if (!res.ok) return;
      const data = await res.json();
      setBox(data.box);
      setRequests(data.requests || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBox();
    // Poll a cada 10s para atualizar cronômetros
    const t = setInterval(fetchBox, 10000);
    return () => clearInterval(t);
  }, [fetchBox]);

  async function handleScan() {
    if (!scanCode.trim()) return;
    // Busca pacote por QR code (através do pedido correspondente)
    try {
      const res = await fetch(`/api/requests`);
      const data = await res.json();
      const found = (data.requests as BoxRequest[]).find(
        (r) => r.packages.some((p) => p.qrCode === scanCode.trim()) || r.code === scanCode.trim()
      );
      if (!found) {
        toast.error("QR Code não encontrado");
        return;
      }
      const result = await fetch(`/api/requests/${found.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RECEIVE_AT_BOX" }),
      });
      if (!result.ok) {
        const err = await result.json();
        throw new Error(err.error);
      }
      toast.success(`Pacote ${found.code} recebido no box! Cronômetro de 2h iniciado.`);
      setScanDialog(false);
      setScanCode("");
      fetchBox();
    } catch (e) {
      toast.error("Erro: " + (e as Error).message);
    }
  }

  async function handleLabel(req: BoxRequest) {
    setLabelDialog(req);
    setShelfCodes(
      Object.fromEntries(req.packages.map((p) => [p.id, p.shelfCode || ""]))
    );
  }

  async function handleConfirmLabel() {
    if (!labelDialog) return;
    try {
      const res = await fetch(`/api/requests/${labelDialog.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "READY_FOR_DISPATCH",
          shelfCodes,
        }),
      });
      if (!res.ok) throw new Error("Erro ao etiquetar");
      toast.success("Pacote etiquetado e organizado na prateleira!");
      setLabelDialog(null);
      fetchBox();
    } catch (e) {
      toast.error("Erro: " + (e as Error).message);
    }
  }

  const recebidos = requests.filter((r) => r.status === "RECEBIDO_BOX");
  const prontos = requests.filter((r) => r.status === "PRONTO_DESPACHO");
  const liberados = requests.filter((r) => r.status === "LIBERADO");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="w-6 h-6 text-primary" /> Box {box?.code || "..."}
          </h1>
          <p className="text-muted-foreground text-sm">{box?.shopping?.name}</p>
        </div>
        <Button onClick={() => setScanDialog(true)} size="lg" className="gap-2">
          <QrCode className="w-4 h-4" /> Bipar Entrada de Pacote
        </Button>
      </div>

      {/* Resumo rápido */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Recebidos (a etiquetar)</div>
                <div className="text-2xl font-bold">{recebidos.length}</div>
              </div>
              <Package className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Prontos p/ despacho</div>
                <div className="text-2xl font-bold">{prontos.length}</div>
              </div>
              <CheckCircle2 className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Liberados (entregar)</div>
                <div className="text-2xl font-bold">{liberados.length}</div>
              </div>
              <Bell className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Cronômetros estourados</div>
                <div className="text-2xl font-bold">
                  {requests.filter((r) => r.boxTimer.expired).length}
                </div>
              </div>
              <Flame className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {liberados.length > 0 && (
        <Alert className="border-orange-300 bg-orange-50">
          <Bell className="w-4 h-4 text-orange-600" />
          <AlertDescription className="text-orange-900 font-medium">
            🔔 {liberados.length} pedido(s) liberado(s) pelo lojista! Repasse a carga imediatamente ao entregador da fila.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="recebidos">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recebidos">Recebidos ({recebidos.length})</TabsTrigger>
          <TabsTrigger value="prontos">Prontos ({prontos.length})</TabsTrigger>
          <TabsTrigger value="liberados">Liberados ({liberados.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="recebidos">
          <RequestList
            requests={recebidos}
            loading={loading}
            emptyMsg="Nenhum pacote aguardando etiquetagem."
            actionLabel="Etiquetas e Prateleira"
            actionIcon={<Tag className="w-3 h-3" />}
            onAction={handleLabel}
          />
        </TabsContent>
        <TabsContent value="prontos">
          <RequestList
            requests={prontos}
            loading={loading}
            emptyMsg="Nenhum pacote pronto. Aguardando lojista liberar entrega."
          />
        </TabsContent>
        <TabsContent value="liberados">
          <RequestList
            requests={liberados}
            loading={loading}
            emptyMsg="Nenhum pedido liberado no momento."
            highlighted
          />
        </TabsContent>
      </Tabs>

      {/* Modal bipar QR */}
      <Dialog open={scanDialog} onOpenChange={setScanDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" /> Bipar QR Code do Pacote
            </DialogTitle>
            <DialogDescription>
              Informe o código QR do pacote (ou cole o código do pedido) para registrar a entrada no box.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="scan">QR Code</Label>
              <Input
                id="scan"
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
                placeholder="ex: CB-2026-00001-PKG01-AB12"
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
                autoFocus
              />
            </div>
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              💡 Dica demo: consulte o histórico de pedidos do lojista para copiar um QR Code válido.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScanDialog(false)}>Cancelar</Button>
            <Button onClick={handleScan} disabled={!scanCode.trim()}>
              <CheckCircle2 className="w-4 h-4" /> Confirmar Entrada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal etiquetagem */}
      <Dialog open={!!labelDialog} onOpenChange={(v) => !v && setLabelDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" /> Etiquetar Pacotes
            </DialogTitle>
            <DialogDescription>
              Atribua cada pacote a uma prateleira de destino para organizar o box.
            </DialogDescription>
          </DialogHeader>
          {labelDialog && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded p-3 text-sm">
                <div className="font-semibold">{labelDialog.code}</div>
                <div className="text-xs text-muted-foreground">
                  Lojista: {labelDialog.lojista.name} · Destino: {labelDialog.destLocation.name}
                </div>
              </div>
              {labelDialog.packages.map((p, i) => (
                <div key={p.id} className="space-y-1 border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono text-muted-foreground">{p.qrCode}</div>
                    <Badge variant="outline" className="text-xs">
                      <Scale className="w-3 h-3" /> {p.weightKg}kg
                    </Badge>
                  </div>
                  <div className="text-sm">{p.description}</div>
                  <div className="space-y-1">
                    <Label htmlFor={`shelf-${p.id}`} className="text-xs">Prateleira de destino</Label>
                    <Input
                      id={`shelf-${p.id}`}
                      value={shelfCodes[p.id] || ""}
                      onChange={(e) => setShelfCodes({ ...shelfCodes, [p.id]: e.target.value })}
                      placeholder={`ex: PRAT-A${i + 1}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLabelDialog(null)}>Cancelar</Button>
            <Button onClick={handleConfirmLabel}>
              <CheckCircle2 className="w-4 h-4" /> Confirmar e Organizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestList({
  requests,
  loading,
  emptyMsg,
  actionLabel,
  actionIcon,
  onAction,
  highlighted = false,
}: {
  requests: BoxRequest[];
  loading: boolean;
  emptyMsg: string;
  actionLabel?: string;
  actionIcon?: React.ReactNode;
  onAction?: (req: BoxRequest) => void;
  highlighted?: boolean;
}) {
  if (loading) {
    return <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  }
  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
          {emptyMsg}
        </CardContent>
      </Card>
    );
  }
  return (
    <ScrollArea className="max-h-[600px]">
      <div className="space-y-3 pr-2">
        {requests.map((r) => (
          <div
            key={r.id}
            className={`rounded-lg border p-4 ${highlighted ? "border-orange-300 box-alert-pulse" : ""}`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{r.code}</span>
                  <Badge variant="outline" className={STATUS_INFO[r.status].color}>
                    {STATUS_INFO[r.status].icon} {STATUS_INFO[r.status].label}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{timeAgo(r.createdAt)}</div>
              </div>
              <Badge className={CATEGORY_INFO[r.vehicleCategory].colorLight}>
                {CATEGORY_INFO[r.vehicleCategory].icon} {CATEGORY_INFO[r.vehicleCategory].name}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
              <div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Destino
                </div>
                <div className="font-medium truncate">{r.destLocation.name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Lojista</div>
                <div className="font-medium truncate">{r.lojista.name}</div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground mb-2">
              {r.declaredWeightKg}kg · {r.declaredVolume}
            </div>

            {r.packages.length > 0 && (
              <div className="space-y-1 mb-3">
                {r.packages.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-xs bg-muted/40 rounded px-2 py-1">
                    <QrCode className="w-3 h-3" />
                    <span className="font-mono">{p.qrCode}</span>
                    {p.shelfCode && <Badge variant="outline" className="ml-auto text-[10px]">{p.shelfCode}</Badge>}
                  </div>
                ))}
              </div>
            )}

            {/* Cronômetro de 2h */}
            {r.receivedAtBox && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Timer className="w-3 h-3" /> Tempo no box
                  </span>
                  <span className={r.boxTimer.expired ? "text-red-600 font-bold" : "font-medium"}>
                    {r.boxTimer.expired
                      ? "⏰ Estourou 2h!"
                      : `${r.boxTimer.remainingMinutes}min restantes`}
                  </span>
                </div>
                <Progress
                  value={r.boxTimer.percentage}
                  className={`h-2 ${r.boxTimer.expired ? "[&>div]:bg-red-500" : r.boxTimer.percentage > 75 ? "[&>div]:bg-orange-500" : ""}`}
                />
              </div>
            )}

            {actionLabel && onAction && (
              <Button size="sm" variant="outline" onClick={() => onAction(r)} className="w-full">
                {actionIcon} {actionLabel}
              </Button>
            )}

            {r.entregador && (
              <Badge className="bg-cyan-100 text-cyan-700 text-xs">
                🛵 Atribuído a: {r.entregador.name}
              </Badge>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
