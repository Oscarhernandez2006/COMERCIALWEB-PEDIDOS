import { useMemo, useState } from 'react';
import {
  Wallet,
  DollarSign,
  Gauge,
  Users,
  ReceiptText,
  TrendingUp,
  Construction,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { useSellerDashboard } from '@/hooks/useApi';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SalesTrendChart } from '@/components/SalesTrendChart';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/** Etiqueta reutilizable para datos que aún no están disponibles. */
function EnConstruccion({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        className,
      )}
    >
      <Construction className="h-3 w-3" />
      En construcción
    </span>
  );
}

/** Medidor circular de cumplimiento (porcentaje). */
function RingGauge({ pct, label }: { pct: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ - (clamped / 100) * circ;
  const color =
    clamped >= 100
      ? 'var(--primary)'
      : clamped >= 70
        ? '#16a34a'
        : clamped >= 40
          ? '#d97706'
          : '#dc2626';
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth="9"
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{clamped.toFixed(1)}%</span>
        </div>
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

interface KpiProps {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  subLabel: string;
  subValue: React.ReactNode;
}

function KpiCard({ label, value, icon: Icon, accent, subLabel, subValue }: KpiProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <div className="mt-1 text-xl font-bold">{value}</div>
          </div>
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              accent,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 border-t border-border pt-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {subLabel}
          </p>
          <div className="text-sm font-semibold">{subValue}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading, isFetching, refetch } = useSellerDashboard(
    month,
    year,
  );

  const years = useMemo(() => {
    return [new Date().getFullYear()];
  }, []);

  const totals = data?.totals;
  const growth = data?.growth.revenuePct ?? null;
  const growthKilos = data?.growth.kilosPct ?? null;

  // Presupuesto del mes (si está cargado) y cumplimiento en pesos.
  const budget = data?.budget ?? null;
  const pptoRevenue = budget?.expectedRevenue ?? null;
  const pptoKilos = budget?.targetKilos ?? null;
  const cumplimientoPesos =
    pptoRevenue && pptoRevenue > 0 && totals
      ? (totals.revenue / pptoRevenue) * 100
      : null;
  const kilosSold = totals?.kilosSold ?? 0;
  const cumplimientoKilos =
    pptoKilos && pptoKilos > 0 && totals ? (kilosSold / pptoKilos) * 100 : null;

  // Meta acumulada (pesos): presupuesto del mes repartido lineal por día.
  const metaSeries = useMemo(() => {
    if (!data || pptoRevenue == null || pptoRevenue <= 0) return undefined;
    const daysInMonth = new Date(year, month, 0).getDate();
    return data.salesTrend.map((p) => {
      const day = Number(p.date.slice(8, 10));
      return (pptoRevenue / daysInMonth) * day;
    });
  }, [data, pptoRevenue, month, year]);

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-primary/10 to-transparent p-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            Tablero de Gestión Comercial
          </h2>
          <p className="text-sm text-muted-foreground">
            Vendedor:{' '}
            <span className="font-medium">
              {data?.seller.name ?? user?.name}
            </span>
            {data && (
              <>
                {' · '}
                Última actualización:{' '}
                {new Date(data.generatedAt).toLocaleString('es-CO', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Mes
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Año
            </label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Ppto Mes (Pesos)"
          value={
            isLoading ? (
              '…'
            ) : pptoRevenue != null ? (
              formatCurrency(pptoRevenue)
            ) : (
              <EnConstruccion />
            )
          }
          icon={Wallet}
          accent="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"
          subLabel="Ppto (Kilos)"
          subValue={
            isLoading ? (
              '…'
            ) : pptoKilos != null ? (
              `${pptoKilos.toLocaleString('es-CO')} kg`
            ) : (
              <EnConstruccion />
            )
          }
        />
        <KpiCard
          label="Ventas Acumuladas"
          value={isLoading ? '…' : formatCurrency(totals?.revenue ?? 0)}
          icon={DollarSign}
          accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300"
          subLabel="Kilos Vendidos"
          subValue={
            isLoading ? '…' : `${kilosSold.toLocaleString('es-CO')} kg`
          }
        />
        <KpiCard
          label="Cumplimiento (Pesos)"
          value={
            isLoading ? (
              '…'
            ) : cumplimientoPesos != null ? (
              `${cumplimientoPesos.toFixed(1)}%`
            ) : (
              <EnConstruccion />
            )
          }
          icon={Gauge}
          accent="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300"
          subLabel="Cumplimiento (Kilos)"
          subValue={
            isLoading ? (
              '…'
            ) : cumplimientoKilos != null ? (
              `${cumplimientoKilos.toFixed(1)}%`
            ) : (
              <EnConstruccion />
            )
          }
        />
        <KpiCard
          label="Clientes Atendidos"
          value={isLoading ? '…' : (totals?.customersServed ?? 0)}
          icon={Users}
          accent="bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/40 dark:text-fuchsia-300"
          subLabel="Clientes Activos"
          subValue={isLoading ? '…' : (totals?.activeCustomers ?? 0)}
        />
        <KpiCard
          label="Tickets Facturados"
          value={isLoading ? '…' : (totals?.orders ?? 0)}
          icon={ReceiptText}
          accent="bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-300"
          subLabel="Ticket Promedio"
          subValue={isLoading ? '…' : formatCurrency(totals?.avgTicket ?? 0)}
        />
      </div>

      {/* Cumplimiento + Tendencia + Mis clientes */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cumplimiento del Mes</CardTitle>
          </CardHeader>
          <CardContent className="flex h-56 items-center justify-around gap-2">
            {cumplimientoPesos != null ? (
              <RingGauge pct={cumplimientoPesos} label="Pesos" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <Gauge className="h-9 w-9 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  Pesos
                </span>
                <EnConstruccion />
              </div>
            )}
            {cumplimientoKilos != null ? (
              <RingGauge pct={cumplimientoKilos} label="Kilos" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <Gauge className="h-9 w-9 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  Kilos
                </span>
                <EnConstruccion />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Tendencia de Ventas Diarias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data ? (
              <SalesTrendChart data={data.salesTrend} metaSeries={metaSeries} />
            ) : (
              <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                Cargando…
              </div>
            )}
            {data && !metaSeries && (
              <p className="mt-1 flex items-center justify-center gap-1 text-center text-[11px] text-muted-foreground">
                Meta acumulada: <EnConstruccion /> — carga el presupuesto del mes.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mis Clientes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-56 divide-y divide-border overflow-y-auto">
              {data && data.topCustomers.length > 0 ? (
                data.topCustomers.map((c, i) => (
                  <div
                    key={`${c.code}-${i}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" title={c.name}>
                        {c.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.city ?? 'Sin ciudad'}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatCurrency(c.revenue)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(c.lastPurchase)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {isLoading ? 'Cargando…' : 'Sin ventas en el período.'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Canales (en construcción) y cortes (real) */}
      <div className="grid gap-4 lg:grid-cols-3">
        {['Ventas por Canal (Pesos)', 'Ventas en Canales'].map((title) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex h-40 flex-col items-center justify-center gap-3 text-center">
              <Construction className="h-9 w-9 text-muted-foreground" />
              <EnConstruccion />
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ventas en Cortes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-56 divide-y divide-border overflow-y-auto">
              {data && data.salesByCut.length > 0 ? (
                (() => {
                  const totalCut = data.salesByCut.reduce(
                    (s, c) => s + c.revenue,
                    0,
                  );
                  return data.salesByCut.map((c, i) => {
                    const pct =
                      totalCut > 0 ? (c.revenue / totalCut) * 100 : 0;
                    return (
                      <div key={`${c.name}-${i}`} className="px-4 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <p
                            className="min-w-0 flex-1 truncate text-sm font-medium"
                            title={c.name}
                          >
                            {c.name}
                          </p>
                          <span className="shrink-0 text-sm font-semibold tabular-nums">
                            {formatCurrency(c.revenue)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-10 shrink-0 text-right text-[11px] text-muted-foreground">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {isLoading ? 'Cargando…' : 'Sin ventas en el período.'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking personal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ranking Personal</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <RankItem
            label="Clientes Activos"
            value={isLoading ? '…' : String(totals?.activeCustomers ?? 0)}
          />
          <RankItem
            label="Tickets Facturados"
            value={isLoading ? '…' : String(totals?.orders ?? 0)}
          />
          <RankItem
            label="Ticket Promedio"
            value={isLoading ? '…' : formatCurrency(totals?.avgTicket ?? 0)}
          />
          <RankItem
            label="Crecimiento Ventas ($)"
            value={
              growth === null ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                <span
                  className={cn(
                    'inline-flex items-center gap-1',
                    growth >= 0 ? 'text-emerald-600' : 'text-red-600',
                  )}
                >
                  {growth >= 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {Math.abs(growth)}%
                </span>
              )
            }
            hint="Vs. mes anterior"
          />
          <RankItem
            label="Crecimiento Kilos (Kg)"
            value={
              growthKilos === null ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                <span
                  className={cn(
                    'inline-flex items-center gap-1',
                    growthKilos >= 0 ? 'text-emerald-600' : 'text-red-600',
                  )}
                >
                  {growthKilos >= 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {Math.abs(growthKilos)}%
                </span>
              )
            }
            hint="Vs. mes anterior"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function RankItem({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 text-lg font-bold">{value}</div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
