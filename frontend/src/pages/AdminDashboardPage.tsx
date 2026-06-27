import { useMemo, useState } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  Receipt,
  Boxes,
  Users,
  RefreshCw,
  Building2,
  Trophy,
  Calendar,
} from 'lucide-react';
import { useManagerialDashboard } from '@/hooks/useAdminApi';
import { formatCurrency, cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { SalesTrendChart } from '@/components/SalesTrendChart';
import type {
  ManagerialCompanyStats,
  OrderStatus,
} from '@/types';

const COMPANY_ACCENT: Record<
  string,
  { ring: string; dot: string; text: string; bar: string; soft: string }
> = {
  '3': {
    ring: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500',
    soft: 'bg-emerald-500/10',
  },
  '8': {
    ring: 'border-amber-500/30',
    dot: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500',
    soft: 'bg-amber-500/10',
  },
  '4': {
    ring: 'border-rose-500/30',
    dot: 'bg-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    bar: 'bg-rose-500',
    soft: 'bg-rose-500/10',
  },
};

const accentFor = (id: string) => COMPANY_ACCENT[id] ?? COMPANY_ACCENT['3'];

/** Fecha local de hoy en formato YYYY-MM-DD. */
function todayStr(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

/** Suma/resta días a una fecha YYYY-MM-DD. */
function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Primer día del mes actual (YYYY-MM-DD). */
function startOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function prettyRange(from: string, to: string): string {
  if (from === to) {
    return new Date(`${from}T12:00:00`).toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  const f = new Date(`${from}T12:00:00`).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
  });
  const t = new Date(`${to}T12:00:00`).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${f} — ${t}`;
}

export function AdminDashboardPage() {
  const [from, setFrom] = useState(() => addDays(todayStr(), -13));
  const [to, setTo] = useState(() => todayStr());

  const { data, isLoading, isFetching, refetch } = useManagerialDashboard(
    from,
    to,
  );

  const companies = data?.companies ?? [];
  const maxRevenue = useMemo(
    () => Math.max(1, ...companies.map((c) => c.totals.revenue)),
    [companies],
  );
  const grandTotal = useMemo(
    () => companies.reduce((acc, c) => acc + c.totals.revenue, 0),
    [companies],
  );

  type Preset = { label: string; from: string; to: string };
  const presets: Preset[] = useMemo(() => {
    const today = todayStr();
    return [
      { label: 'Hoy', from: today, to: today },
      { label: 'Ayer', from: addDays(today, -1), to: addDays(today, -1) },
      { label: 'Últimos 7 días', from: addDays(today, -6), to: today },
      { label: 'Últimos 14 días', from: addDays(today, -13), to: today },
      { label: 'Últimos 30 días', from: addDays(today, -29), to: today },
      { label: 'Este mes', from: startOfMonth(), to: today },
    ];
  }, []);

  const activePreset = presets.find((p) => p.from === from && p.to === to)?.label;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Panel de control
          </h2>
          <p className="text-muted-foreground">
            Comparativa por compañía · {prettyRange(from, to)}
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

      {/* Filtros de fecha */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Desde
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="date"
                  value={from}
                  max={to || todayStr()}
                  onChange={(e) => setFrom(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Hasta
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="date"
                  value={to}
                  min={from || undefined}
                  max={todayStr()}
                  onChange={(e) => setTo(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setFrom(p.from);
                  setTo(p.to);
                }}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                  activePreset === p.label
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-accent',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comparativa de ingresos (barras) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Ingresos por compañía
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Cargando…
            </p>
          ) : companies.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sin datos en el rango seleccionado.
            </p>
          ) : (
            <>
              {companies.map((c) => {
                const accent = accentFor(c.companyId);
                const share = Math.round(
                  (c.totals.revenue / maxRevenue) * 100,
                );
                const pctTotal =
                  grandTotal > 0
                    ? Math.round((c.totals.revenue / grandTotal) * 100)
                    : 0;
                return (
                  <div key={c.companyId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        <span
                          className={cn('h-2.5 w-2.5 rounded-full', accent.dot)}
                        />
                        {c.name}
                        <span className="text-xs text-muted-foreground">
                          #{c.companyId}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className={cn('font-bold', accent.text)}>
                          {formatCurrency(c.totals.revenue)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {pctTotal}%
                        </span>
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full rounded-full', accent.bar)}
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                <span className="font-medium text-muted-foreground">
                  Total general
                </span>
                <span className="text-base font-bold">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Una columna por compañía, lado a lado para comparar */}
      <div className="grid gap-5 xl:grid-cols-2">
        {isLoading && companies.length === 0
          ? [0, 1].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-96" />
              </Card>
            ))
          : companies.map((c) => (
              <CompanyColumn key={c.companyId} company={c} />
            ))}
      </div>
    </div>
  );
}

/** Columna completa de una compañía: KPIs, tendencia, top productos y clientes. */
function CompanyColumn({ company }: { company: ManagerialCompanyStats }) {
  const accent = accentFor(company.companyId);
  const t = company.totals;

  const kpis = [
    {
      label: 'Pedidos',
      value: t.orders.toLocaleString('es-CO'),
      icon: ShoppingCart,
    },
    {
      label: 'Ticket promedio',
      value: formatCurrency(t.avgTicket),
      icon: Receipt,
    },
    {
      label: 'Unidades',
      value: t.units.toLocaleString('es-CO'),
      icon: Boxes,
    },
    {
      label: 'Clientes',
      value: t.customers.toLocaleString('es-CO'),
      icon: Users,
    },
  ];

  const maxProductQty = Math.max(
    1,
    ...company.topProducts.map((p) => p.quantity),
  );

  return (
    <div className="space-y-4">
      {/* Encabezado de compañía + ventas */}
      <Card className={cn('border', accent.ring)}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-xl',
                  accent.soft,
                )}
              >
                <Building2 className={cn('h-5 w-5', accent.text)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Compañía {company.companyId}
                </p>
                <p className="font-semibold">{company.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Ventas</p>
              <p className={cn('text-xl font-bold', accent.text)}>
                {formatCurrency(t.revenue)}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {kpis.map((k) => (
              <div
                key={k.label}
                className="rounded-lg border border-border bg-background/60 p-3"
              >
                <k.icon className="h-4 w-4 text-muted-foreground" />
                <p className="mt-2 text-sm font-bold tracking-tight">
                  {k.value}
                </p>
                <p className="text-[11px] text-muted-foreground">{k.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tendencia de ventas */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className={cn('h-4 w-4', accent.text)} />
            Tendencia de ventas
          </CardTitle>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn('h-2.5 w-2.5 rounded-full', accent.dot)} />
            Ingresos
          </span>
        </CardHeader>
        <CardContent>
          <SalesTrendChart data={company.salesTrend} />
        </CardContent>
      </Card>

      {/* Productos más vendidos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Trophy className="h-4 w-4 text-amber-500" />
            Productos más vendidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {company.topProducts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sin ventas en el rango.
            </p>
          ) : (
            <ol className="space-y-2.5">
              {company.topProducts.map((p, i) => (
                <li key={p.sku} className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="truncate text-sm font-medium">
                        {p.name}
                      </span>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {p.quantity.toLocaleString('es-CO')}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatCurrency(p.revenue)}
                      </p>
                    </div>
                  </div>
                  <div className="ml-7 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full', accent.bar)}
                      style={{
                        width: `${Math.round((p.quantity / maxProductQty) * 100)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* Clientes que más pidieron */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className={cn('h-4 w-4', accent.text)} />
            Clientes que más pidieron
          </CardTitle>
        </CardHeader>
        <CardContent>
          {company.topCustomers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sin ventas en el rango.
            </p>
          ) : (
            <ol className="space-y-2.5">
              {company.topCustomers.map((cu, i) => (
                <li
                  key={`${cu.code}-${i}`}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{cu.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {cu.code}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold">
                      {formatCurrency(cu.revenue)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {cu.orders} pedido(s)
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* Pedidos por estado */}
      {company.ordersByStatus.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pedidos por estado</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {company.ordersByStatus.map((s) => (
              <span
                key={s.status}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs"
              >
                <OrderStatusBadge status={s.status as OrderStatus} />
                <span className="font-semibold">{s.count}</span>
              </span>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
