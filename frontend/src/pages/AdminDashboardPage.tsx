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
  BarChart3,
  Loader2,
} from 'lucide-react';
import {
  useManagerialDashboard,
  useVendorProductSalesReport,
} from '@/hooks/useAdminApi';
import { formatCurrency, cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SalesTrendChart } from '@/components/SalesTrendChart';
import type { ManagerialCompanyStats } from '@/types';

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

/**
 * Venta a mostrar de una compañía: para AGROPECUARIA (con margen) es la
 * facturación real del ERP; para las demás, el total de pedidos de la app.
 */
function companyRevenue(c: ManagerialCompanyStats): number {
  return c.margin ? c.margin.revenue : c.totals.revenue;
}

export function AdminDashboardPage() {
  // Por defecto el mes en curso, para ver a todos los vendedores y su
  // facturación acumulada (el ERP puede no tener cargado el día en curso aún).
  const [from, setFrom] = useState(() => startOfMonth());
  const [to, setTo] = useState(() => todayStr());
  // 'comparativo' = vista general que compara todas las compañías (predeterminada).
  const [selectedCompanyId, setSelectedCompanyId] = useState('comparativo');

  const { data, isLoading, isFetching, refetch } = useManagerialDashboard(
    from,
    to,
  );

  const companies = data?.companies ?? [];
  const isComparativo = selectedCompanyId === 'comparativo';
  const selectedCompany = useMemo(
    () => companies.find((c) => c.companyId === selectedCompanyId),
    [companies, selectedCompanyId],
  );
  const maxRevenue = useMemo(
    () => Math.max(1, ...companies.map((c) => companyRevenue(c))),
    [companies],
  );
  const grandTotal = useMemo(
    () => companies.reduce((acc, c) => acc + companyRevenue(c), 0),
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
            {isComparativo
              ? 'Comparativa por compañía'
              : (selectedCompany?.name ?? 'Panel')}{' '}
            · {prettyRange(from, to)}
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

      {/* Siempre visible; skeleton al cambiar fechas, datos reales cuando carga */}
      {(companies.length > 0 || isFetching) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingresos por compañía</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isFetching ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="animate-pulse space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-44 rounded bg-muted" />
                    <div className="h-4 w-28 rounded bg-muted" />
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted" />
                </div>
              ))
            ) : (
              <>
                {companies.map((c) => {
                  const accent = accentFor(c.companyId);
                  const revenue = companyRevenue(c);
                  const share = Math.round((revenue / maxRevenue) * 100);
                  const pctTotal =
                    grandTotal > 0
                      ? Math.round((revenue / grandTotal) * 100)
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
                            {formatCurrency(revenue)}
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
      )}

      {/* Venta acumulada del mes por vendedor (ERP) */}
      <VentaAcumuladaSection />

      {/* Selector de compañía */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCompanyId('comparativo')}
          className={cn(
            'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors',
            isComparativo
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:bg-accent',
          )}
        >
          <BarChart3 className="h-4 w-4" />
          Comparativo
        </button>
        {companies.map((c) => {
          const accent = accentFor(c.companyId);
          const isActive = selectedCompanyId === c.companyId;
          return (
            <button
              key={c.companyId}
              onClick={() => setSelectedCompanyId(c.companyId)}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors',
                isActive
                  ? cn(accent.ring, accent.soft, accent.text)
                  : 'border-border text-muted-foreground hover:bg-accent',
              )}
            >
              <span className={cn('h-2.5 w-2.5 rounded-full', accent.dot)} />
              {c.name}
              <span className="text-xs font-normal text-muted-foreground">
                #{c.companyId}
              </span>
            </button>
          );
        })}
      </div>

      {/* Vista */}
      {isLoading && companies.length === 0 ? (
        <Card className="animate-pulse">
          <CardContent className="h-96" />
        </Card>
      ) : companies.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Sin datos en el rango seleccionado.
          </CardContent>
        </Card>
      ) : isComparativo ? (
        <ComparativoGrid companies={companies} />
      ) : selectedCompany ? (
        <CompanyColumn company={selectedCompany} />
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Sin datos en el rango seleccionado.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Columna completa de una compañía: KPIs, tendencia, top productos y clientes. */
function CompanyColumn({ company }: { company: ManagerialCompanyStats }) {
  const accent = accentFor(company.companyId);
  const t = company.totals;
  const m = company.margin;
  // AGROPECUARIA (con margen): la venta es la facturación real del ERP y el
  // margen se muestra como un KPI; las demás compañías usan el total de la app.
  const ventas = m ? m.revenue : t.revenue;
  const kpis = m
    ? [
        {
          label: `Margen ${m.marginPct.toFixed(1)}%`,
          value: formatCurrency(m.profit),
          icon: TrendingUp,
        },
        { label: 'Pedidos', value: t.orders.toLocaleString('es-CO'), icon: ShoppingCart },
        {
          label: 'Kilos',
          value: `${m.kilos.toLocaleString('es-CO', { maximumFractionDigits: 0 })} kg`,
          icon: Boxes,
        },
        { label: 'Clientes', value: t.customers.toLocaleString('es-CO'), icon: Users },
      ]
    : [
        { label: 'Pedidos', value: t.orders.toLocaleString('es-CO'), icon: ShoppingCart },
        { label: 'Ticket promedio', value: formatCurrency(t.avgTicket), icon: Receipt },
        { label: 'Unidades', value: t.units.toLocaleString('es-CO'), icon: Boxes },
        { label: 'Clientes', value: t.customers.toLocaleString('es-CO'), icon: Users },
      ];

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
                {formatCurrency(ventas)}
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

      {/* Ventas por vendedor y productos, lado a lado */}
      <div className="grid gap-4 xl:grid-cols-2">
        <SellersCard company={company} />
        <ProductsCard company={company} />
      </div>

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
    </div>
  );
}

/**
 * Vista comparativa: una columna por compañía con las filas alineadas. Cada
 * sección (encabezado, vendedores, productos, tendencia, clientes) se renderiza
 * en fila para las N compañías, así todas quedan al mismo nivel al bajar.
 */
function ComparativoGrid({
  companies,
}: {
  companies: ManagerialCompanyStats[];
}) {
  const colsClass =
    companies.length >= 3
      ? 'lg:grid-cols-3'
      : companies.length === 2
        ? 'lg:grid-cols-2'
        : 'lg:grid-cols-1';
  return (
    <div className={cn('grid grid-cols-1 items-start gap-4', colsClass)}>
      {companies.map((c) => (
        <HeaderKpisCard key={`h-${c.companyId}`} company={c} />
      ))}
      {companies.map((c) => (
        <SellersCard key={`s-${c.companyId}`} company={c} />
      ))}
      {companies.map((c) => (
        <ProductsCard key={`p-${c.companyId}`} company={c} />
      ))}
      {companies.map((c) => (
        <TrendCard key={`t-${c.companyId}`} company={c} />
      ))}
      {companies.map((c) => (
        <CustomersCard key={`cu-${c.companyId}`} company={c} />
      ))}
    </div>
  );
}

function HeaderKpisCard({ company }: { company: ManagerialCompanyStats }) {
  const accent = accentFor(company.companyId);
  const t = company.totals;
  const m = company.margin;
  // Para AGROPECUARIA (con margen) la venta mostrada es la facturación real del
  // ERP; para las demás compañías se usa el total de pedidos de la app.
  const ventas = m ? m.revenue : t.revenue;
  // El margen (solo Agropecuaria) se muestra como un KPI más, para que todas
  // las tarjetas de encabezado mantengan la misma estructura y altura.
  const kpis = m
    ? [
        {
          label: `Margen ${m.marginPct.toFixed(1)}%`,
          value: formatCurrency(m.profit),
          icon: TrendingUp,
        },
        { label: 'Pedidos', value: t.orders.toLocaleString('es-CO'), icon: ShoppingCart },
        {
          label: 'Kilos',
          value: `${m.kilos.toLocaleString('es-CO', { maximumFractionDigits: 0 })} kg`,
          icon: Boxes,
        },
        { label: 'Clientes', value: t.customers.toLocaleString('es-CO'), icon: Users },
      ]
    : [
        { label: 'Pedidos', value: t.orders.toLocaleString('es-CO'), icon: ShoppingCart },
        { label: 'Ticket promedio', value: formatCurrency(t.avgTicket), icon: Receipt },
        { label: 'Unidades', value: t.units.toLocaleString('es-CO'), icon: Boxes },
        { label: 'Clientes', value: t.customers.toLocaleString('es-CO'), icon: Users },
      ];
  return (
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
              {formatCurrency(ventas)}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="rounded-lg border border-border bg-background/60 p-3"
            >
              <k.icon className="h-4 w-4 text-muted-foreground" />
              <p className="mt-2 text-sm font-bold tracking-tight">{k.value}</p>
              <p className="text-[11px] text-muted-foreground">{k.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SellersCard({ company }: { company: ManagerialCompanyStats }) {
  const accent = accentFor(company.companyId);
  const m = company.margin;
  // Con margen (AGROPECUARIA): ventas facturadas + margen por vendedor del ERP.
  if (m) {
    const maxRevenue = Math.max(1, ...m.bySeller.map((s) => s.revenue));
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className={cn('h-4 w-4', accent.text)} />
            Ventas y margen por vendedor
          </CardTitle>
        </CardHeader>
        <CardContent>
          {m.bySeller.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sin ventas en el rango.
            </p>
          ) : (
            <ol className="space-y-2.5">
              {m.bySeller.map((s, i) => (
                <li key={`${s.nit}-${i}`} className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="truncate text-sm font-medium">
                        {s.name}
                      </span>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={cn('text-sm font-semibold', accent.text)}>
                        {formatCurrency(s.revenue)}
                      </p>
                      <p className="text-[11px] font-medium text-emerald-600">
                        Margen {formatCurrency(s.profit)} · {s.marginPct.toFixed(1)}%
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {s.kilos.toLocaleString('es-CO', {
                          maximumFractionDigits: 1,
                        })}{' '}
                        kg
                      </p>
                    </div>
                  </div>
                  <div className="ml-7 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full', accent.bar)}
                      style={{
                        width: `${Math.round((s.revenue / maxRevenue) * 100)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    );
  }
  const maxSellerRevenue = Math.max(
    1,
    ...company.topSellers.map((s) => s.revenue),
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Users className={cn('h-4 w-4', accent.text)} />
          Ventas por vendedor
        </CardTitle>
      </CardHeader>
      <CardContent>
        {company.topSellers.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin ventas en el rango.
          </p>
        ) : (
          <ol className="space-y-2.5">
            {company.topSellers.map((s, i) => (
              <li key={`${s.documentId}-${i}`} className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="truncate text-sm font-medium">
                      {s.name}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cn('text-sm font-semibold', accent.text)}>
                      {formatCurrency(s.revenue)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {s.orders.toLocaleString('es-CO')} pedido(s)
                    </p>
                  </div>
                </div>
                <div className="ml-7 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full rounded-full', accent.bar)}
                    style={{
                      width: `${Math.round((s.revenue / maxSellerRevenue) * 100)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function ProductsCard({ company }: { company: ManagerialCompanyStats }) {
  const accent = accentFor(company.companyId);
  const m = company.margin;
  // Con margen (AGROPECUARIA): venta y margen por producto del ERP.
  if (m) {
    const maxRevenue = Math.max(1, ...m.byProduct.map((p) => p.revenue));
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Trophy className="h-4 w-4 text-amber-500" />
            Ventas y margen por producto
          </CardTitle>
        </CardHeader>
        <CardContent>
          {m.byProduct.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sin ventas en el rango.
            </p>
          ) : (
            <ol className="space-y-2.5">
              {m.byProduct.map((p, i) => (
                <li key={`${p.ref}-${i}`} className="space-y-1">
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
                        {formatCurrency(p.revenue)}
                      </p>
                      <p className="text-[11px] font-medium text-emerald-600">
                        Margen {formatCurrency(p.profit)} · {p.marginPct.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="ml-7 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full', accent.bar)}
                      style={{
                        width: `${Math.round((p.revenue / maxRevenue) * 100)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    );
  }
  const maxProductQty = Math.max(
    1,
    ...company.topProducts.map((p) => p.quantity),
  );
  return (
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
  );
}

/** Mes actual en formato YYYY-MM (para el input type="month"). */
function currentMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Venta acumulada del mes por vendedor, tomada del ERP (cortes, subproductos y
 * canales). La suma de todos los vendedores es la venta acumulada del período.
 */
function VentaAcumuladaSection() {
  const [monthStr, setMonthStr] = useState(currentMonthStr());
  // Día opcional (YYYY-MM-DD). Si está vacío se muestra el mes completo.
  const [dayStr, setDayStr] = useState('');
  const periodo = dayStr
    ? dayStr.slice(0, 4) + dayStr.slice(5, 7)
    : monthStr.replace('-', '');
  const { data, isFetching } = useVendorProductSalesReport(
    periodo,
    dayStr || undefined,
    true,
  );

  const sellers = data?.sellers ?? [];
  const maxNet = Math.max(1, ...sellers.map((s) => s.totalNet));
  const periodLabel = data?.periodLabel ?? monthStr;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            {dayStr
              ? 'Venta del día por vendedor'
              : 'Venta acumulada del mes por vendedor'}
          </CardTitle>
          <p className="mt-1 text-sm capitalize text-muted-foreground">
            {periodLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-end justify-end gap-2">
          <div className="relative w-36 shrink-0">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="month"
              value={monthStr}
              max={currentMonthStr()}
              disabled={!!dayStr}
              onChange={(e) => setMonthStr(e.target.value || currentMonthStr())}
              className="pl-9"
            />
          </div>
          <div className="relative w-40 shrink-0">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={dayStr}
              max={todayStr()}
              onChange={(e) => setDayStr(e.target.value)}
              className="pl-9"
            />
          </div>
          {dayStr && (
            <Button variant="outline" size="sm" onClick={() => setDayStr('')}>
              <RefreshCw className="h-4 w-4" />
              Mes completo
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {dayStr ? 'Venta del día' : 'Venta acumulada del período'}
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-primary">
            {isFetching && !data ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : (
              formatCurrency(data?.grandTotalNet ?? 0)
            )}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {sellers.length} vendedor(es) · suma de todas las ventas del mes
          </p>
        </div>

        {isFetching && !data ? (
          <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando ventas…
          </p>
        ) : sellers.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin ventas registradas para este período.
          </p>
        ) : (
          <ol className="space-y-2.5">
            {sellers.map((s, i) => (
              <li key={s.nit} className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="truncate text-sm font-medium">
                      {s.name}
                    </span>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                    {formatCurrency(s.totalNet)}
                  </p>
                </div>
                <div className="ml-7 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.round((s.totalNet / maxNet) * 100)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function TrendCard({ company }: { company: ManagerialCompanyStats }) {
  const accent = accentFor(company.companyId);
  return (
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
  );
}

function CustomersCard({ company }: { company: ManagerialCompanyStats }) {
  const accent = accentFor(company.companyId);
  return (
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
  );
}
