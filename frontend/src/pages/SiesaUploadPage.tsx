import { useMemo, useState } from 'react';
import {
  Building2,
  UploadCloud,
  Clock,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  Loader2,
} from 'lucide-react';
import { COMPANIES } from '@/lib/companies';
import { cn, formatCurrency } from '@/lib/utils';
import { useUploadPreview, useUploadBatch } from '@/hooks/useAdminApi';
import type { UploadBatchResult } from '@/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** Cortes diarios (deben coincidir con el backend: order-cortes.ts). */
const CORTES = [
  { id: '1', label: 'Corte 1', range: '7:00 a 10:00 a.m.' },
  { id: '2', label: 'Corte 2', range: '10:00 a.m. a 1:00 p.m.' },
  { id: '3', label: 'Corte 3', range: '1:00 a 4:00 p.m.' },
];

/** Fecha de hoy (YYYY-MM-DD) en horario local para el input date. */
function todayStr(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

/** Hora de creación (HH:mm) en horario de Colombia. */
function bogotaTime(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso));
}

export function SiesaUploadPage() {
  const [companyId, setCompanyId] = useState(COMPANIES[0].id);
  const [corte, setCorte] = useState('1');
  const [date, setDate] = useState(todayStr());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<UploadBatchResult | null>(null);

  const company = COMPANIES.find((c) => c.id === companyId)!;
  const { data: orders = [], isLoading } = useUploadPreview(
    companyId,
    corte,
    date,
  );
  const uploadBatch = useUploadBatch();

  const total = useMemo(
    () => orders.reduce((acc, o) => acc + Number(o.total), 0),
    [orders],
  );

  async function handleUpload() {
    setConfirmOpen(false);
    setResult(null);
    const res = await uploadBatch.mutateAsync({ companyId, corte, date });
    setResult(res);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Subir pedidos a Siesa</h2>
        <p className="text-muted-foreground">
          Sube al ERP los pedidos pendientes por envío según el corte y su hora
          de creación. Una vez cargados ya no se pueden anular.
        </p>
      </div>

      {/* Selector de compañía */}
      <div className="flex flex-wrap gap-2">
        {COMPANIES.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setCompanyId(c.id);
              setResult(null);
            }}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
              companyId === c.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-accent',
            )}
          >
            <Building2 className="h-4 w-4" />
            {c.name}
            <span className="text-xs opacity-70">#{c.id}</span>
          </button>
        ))}
      </div>

      {/* Corte + fecha */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="grid gap-2 sm:grid-cols-3">
            {CORTES.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setCorte(c.id);
                  setResult(null);
                }}
                className={cn(
                  'flex flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition-colors',
                  corte === c.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-accent',
                )}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="h-4 w-4" />
                  {c.label}
                </span>
                <span className="text-xs text-muted-foreground">{c.range}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Fecha
              </label>
              <Input
                type="date"
                value={date}
                max={todayStr()}
                onChange={(e) => {
                  setDate(e.target.value);
                  setResult(null);
                }}
                className="w-44"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultado de la última subida */}
      {result && (
        <Card>
          <CardContent className="flex flex-col gap-2 p-5">
            <p className="flex items-center gap-2 font-semibold text-[var(--success)]">
              <CheckCircle2 className="h-5 w-5" />
              {result.uploaded} de {result.total} pedidos cargados en Siesa
            </p>
            {result.failed > 0 && (
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {result.failed} con error
                </p>
                <ul className="ml-6 list-disc text-xs text-muted-foreground">
                  {result.errors.map((e) => (
                    <li key={e.orderNumber}>
                      Pedido {e.orderNumber}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Previa de pedidos */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">
            Pedidos a subir · {company.name}
          </CardTitle>
          <Button
            disabled={orders.length === 0 || uploadBatch.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            {uploadBatch.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            Subir pedidos a Siesa
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Cargando…
            </p>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <ClipboardList className="h-8 w-8 opacity-50" />
              <p className="text-sm">
                No hay pedidos pendientes por envío en este corte.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Pedido</th>
                      <th className="py-2 pr-4 font-medium">Cliente</th>
                      <th className="py-2 pr-4 font-medium">Vendedor</th>
                      <th className="py-2 pr-4 font-medium">Creado</th>
                      <th className="py-2 pr-4 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-b border-border/50">
                        <td className="py-2 pr-4 font-mono font-medium">
                          {o.orderNumber}
                        </td>
                        <td className="py-2 pr-4">{o.customer?.name}</td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {o.seller?.name}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {bogotaTime(o.createdAt)}
                        </td>
                        <td className="py-2 pr-4 text-right font-medium">
                          {formatCurrency(Number(o.total))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                <span className="text-muted-foreground">
                  {orders.length} pedido{orders.length === 1 ? '' : 's'}
                </span>
                <span className="font-semibold">{formatCurrency(total)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de confirmación */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Confirmar carga a Siesa</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Se subirán <strong>{orders.length}</strong> pedido
              {orders.length === 1 ? '' : 's'} de{' '}
              <strong>{company.name}</strong> por un total de{' '}
              <strong>{formatCurrency(total)}</strong>. Los pedidos cargados
              correctamente ya no se podrán anular.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                disabled={uploadBatch.isPending}
              >
                Cancelar
              </Button>
              <Button onClick={handleUpload} disabled={uploadBatch.isPending}>
                {uploadBatch.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Subir pedidos
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
