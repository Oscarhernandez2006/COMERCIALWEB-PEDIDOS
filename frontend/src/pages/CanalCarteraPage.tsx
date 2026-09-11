import { useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import {
  Wallet,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  useCanalCarteraOrders,
  useCanalCarteraDecision,
} from '@/hooks/useApi';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { CanalOrder } from '@/types';

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return 'No se pudo completar la acción.';
}

/** Fila resumen de cupo. */
function CupoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function CarteraCard({ order }: { order: CanalOrder }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const decision = useCanalCarteraDecision();

  const cupo = order.cupo;
  const projected =
    (cupo?.invoicedBalance ?? 0) +
    (cupo?.pendingOrdersTotal ?? 0) +
    Number(order.totalValue);
  const exceeds = cupo?.exceeds ?? false;

  const handleApprove = async () => {
    try {
      await decision.mutateAsync({ id: order.id, action: 'approve', note });
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) {
      setError('Indica el motivo del rechazo.');
      return;
    }
    try {
      await decision.mutateAsync({
        id: order.id,
        action: 'reject',
        reason: reason.trim(),
        note,
      });
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <Card className={cn(exceeds && 'border-rose-300 dark:border-rose-800')}>
      <CardContent className="grid gap-4 p-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="font-semibold">
            Pedido #{order.orderNumber} · {order.clientName}
          </p>
          <p className="text-xs text-muted-foreground">
            NIT {order.clientCode} · Despacho {formatDate(order.dispatchDate)} ·
            Vendedor {order.sellerName}
          </p>
          <div className="rounded-lg border border-border p-3 text-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Kilos: {Number(order.totalKg).toLocaleString('es-CO')} kg
            </p>
            {order.items.map((it, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span>
                  {it.itemName} · {it.quantity} u ·{' '}
                  {Number(it.estimatedKg).toLocaleString('es-CO')} kg
                </span>
                <span className="tabular-nums">{formatCurrency(it.price)}/kg</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5 rounded-lg border border-border p-3 text-sm">
            <CupoRow
              label="Cupo autorizado"
              value={
                cupo?.creditLimit ? formatCurrency(cupo.creditLimit) : 'Sin cupo'
              }
            />
            <CupoRow
              label="Facturado (cartera)"
              value={formatCurrency(cupo?.invoicedBalance ?? 0)}
            />
            <CupoRow
              label="Pedidos sin facturar"
              value={formatCurrency(cupo?.pendingOrdersTotal ?? 0)}
            />
            <CupoRow
              label="Este pedido"
              value={formatCurrency(Number(order.totalValue))}
            />
            <div className="my-1 border-t border-border" />
            <CupoRow label="Total proyectado" value={formatCurrency(projected)} />
            <CupoRow
              label="Disponible tras el pedido"
              value={formatCurrency(
                (cupo?.creditLimit ?? 0) - projected,
              )}
            />
          </div>

          {exceeds && (
            <p className="flex items-center gap-2 rounded-md bg-rose-100 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4" />
              El pedido supera el cupo disponible del cliente.
            </p>
          )}
          {cupo?.hasOverdue && (
            <p className="flex items-center gap-2 rounded-md bg-amber-100 px-3 py-2 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4" />
              El cliente tiene documentos en mora.
            </p>
          )}

          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota de cartera (opcional)"
          />
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo del rechazo (si aplica)"
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={decision.isPending}
            >
              <XCircle className="h-4 w-4 text-destructive" />
              Rechazar
            </Button>
            <Button onClick={handleApprove} disabled={decision.isPending}>
              <CheckCircle2 className="h-4 w-4" />
              Autorizar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CanalCarteraPage() {
  const { data: orders = [], isLoading, isFetching, refetch } =
    useCanalCarteraOrders();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.clientName.toLowerCase().includes(q) ||
        o.clientCode.toLowerCase().includes(q),
    );
  }, [orders, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Wallet className="h-6 w-6 text-primary" />
            Cartera · Canales
          </h2>
          <p className="text-muted-foreground">
            Valida el cupo del cliente y autoriza o rechaza el pedido.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          Actualizar
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por cliente o NIT..."
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No hay pedidos pendientes de validación de cartera.
          </CardContent>
        </Card>
      ) : (
        filtered.map((order) => <CarteraCard key={order.id} order={order} />)
      )}
    </div>
  );
}
