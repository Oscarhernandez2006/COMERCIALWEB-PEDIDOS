import {
  TrendingUp,
  ShoppingCart,
  Receipt,
  Clock,
  Users,
  RefreshCw,
  Building2,
  Trophy,
  ArrowUpRight,
} from 'lucide-react';
import { useAdminDashboard } from '@/hooks/useAdminApi';
import { formatCurrency, cn } from '@/lib/utils';
import { COMPANIES } from '@/lib/companies';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { SalesTrendChart } from '@/components/SalesTrendChart';
import type { OrderStatus } from '@/types';

const COMPANY_ACCENT: Record<
  string,
  { ring: string; dot: string; text: string }
> = {
  '3': {
    ring: 'border-emerald-500/30 bg-emerald-500/5',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  '8': {
    ring: 'border-amber-500/30 bg-amber-500/5',
    dot: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
  },
  '4': {
    ring: 'border-rose-500/30 bg-rose-500/5',
    dot: 'bg-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
  },
};

/** Nombre de compañía por id (desde el catálogo compartido). */
const companyName = (id: string): string =>
  COMPANIES.find((c) => c.id === id)?.name ?? `Compañía ${id}`;

export function AdminDashboardPage() {
  const { data, isLoading, isFetching, refetch } = useAdminDashboard();

  const totals = data?.totals;
  const maxCompanyRevenue = Math.max(
    1,
    ...(data?.byCompany.map((c) => c.revenue) ?? [1]),
  );

  const kpis = [
    {
      label: 'Ventas totales',
      value: formatCurrency(totals?.revenue ?? 0),
      hint: 'Pedidos confirmados y en Siesa',
      icon: TrendingUp,
      accent: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Pedidos',
      value: (totals?.orders ?? 0).toLocaleString('es-CO'),
      hint: 'Total de ventas registradas',
      icon: ShoppingCart,
      accent: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-500/10',
    },
    {
      label: 'Ticket promedio',
      value: formatCurrency(totals?.avgTicket ?? 0),
      hint: 'Valor medio por pedido',
      icon: Receipt,
      accent: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-500/10',
    },
    {
      label: 'Pendientes',
      value: (totals?.pendingOrders ?? 0).toLocaleString('es-CO'),
      hint: 'Borradores y por sincronizar',
      icon: Clock,
      accent: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Panel de control
          </h2>
          <p className="text-muted-foreground">
            Vista consolidada de todas las compañías.
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

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-xl',
                    kpi.bg,
                    kpi.accent,
                  )}
                >
                  <kpi.icon className="h-5 w-5" />
                </div>
              </div>
              <p
                className={cn(
                  'mt-4 text-2xl font-bold tracking-tight',
                  isLoading && 'animate-pulse text-muted-foreground/40',
                )}
              >
                {isLoading ? '—' : kpi.value}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground/80">
                {kpi.label}
              </p>
              <p className="text-xs text-muted-foreground">{kpi.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tendencia + estados */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">
              Ventas — últimos 14 días
            </CardTitle>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              Ingresos
            </span>
          </CardHeader>
          <CardContent>
            <SalesTrendChart data={data?.salesTrend ?? []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pedidos por estado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.ordersByStatus.length ?? 0) === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aún no hay pedidos.
              </p>
            ) : (
              data?.ordersByStatus.map((s) => (
                <div
                  key={s.status}
                  className="flex items-center justify-between"
                >
                  <OrderStatusBadge status={s.status as OrderStatus} />
                  <span className="text-sm font-semibold">{s.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparativa por compañía */}
      <div className="grid gap-4 md:grid-cols-2">
        {data?.byCompany.map((c) => {
          const accent = COMPANY_ACCENT[c.companyId] ?? COMPANY_ACCENT['3'];
          const share = Math.round((c.revenue / maxCompanyRevenue) * 100);
          return (
            <Card key={c.companyId} className={cn('border', accent.ring)}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background">
                      <Building2 className={cn('h-5 w-5', accent.text)} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Compañía {c.companyId}
                      </p>
                      <p className="font-semibold">{c.name}</p>
                    </div>
                  </div>
                  <span className={cn('text-lg font-bold', accent.text)}>
                    {formatCurrency(c.revenue)}
                  </span>
                </div>

                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-background">
                  <div
                    className={cn('h-full rounded-full', accent.dot)}
                    style={{ width: `${share}%` }}
                  />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-background/60 py-2">
                    <p className="text-sm font-bold">{c.orders}</p>
                    <p className="text-[11px] text-muted-foreground">Pedidos</p>
                  </div>
                  <div className="rounded-lg bg-background/60 py-2">
                    <p className="text-sm font-bold">{c.customers}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Clientes
                    </p>
                  </div>
                  <div className="rounded-lg bg-background/60 py-2">
                    <p className="text-sm font-bold">{c.products}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Productos
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Top productos + Top clientes */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-amber-500" />
              Productos más vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.topProducts.length ?? 0) === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sin datos de ventas.
              </p>
            ) : (
              <ol className="space-y-3">
                {data?.topProducts.map((p, i) => (
                  <li
                    key={p.name}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="truncate text-sm font-medium">
                        {p.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {formatCurrency(p.revenue)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.quantity} und.
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Mejores clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.topCustomers.length ?? 0) === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sin datos de ventas.
              </p>
            ) : (
              <ol className="space-y-3">
                {data?.topCustomers.map((c, i) => (
                  <li
                    key={c.name}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="truncate text-sm font-medium">
                        {c.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {formatCurrency(c.revenue)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {c.orders} pedidos
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pedidos recientes */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Pedidos recientes</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {(data?.recentOrders.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aún no se han registrado pedidos.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-6 py-2 font-medium">Pedido</th>
                    <th className="px-6 py-2 font-medium">Cliente</th>
                    <th className="px-6 py-2 font-medium">Compañía</th>
                    <th className="px-6 py-2 text-right font-medium">Total</th>
                    <th className="px-6 py-2 text-right font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.recentOrders.map((o) => (
                    <tr
                      key={o.id}
                      className="border-b border-border/60 last:border-0 hover:bg-muted/40"
                    >
                      <td className="px-6 py-3 font-medium">{o.orderNumber}</td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {o.customerName}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 text-xs',
                            COMPANY_ACCENT[o.companyId]?.text,
                          )}
                        >
                          <span
                            className={cn(
                              'h-2 w-2 rounded-full',
                              COMPANY_ACCENT[o.companyId]?.dot,
                            )}
                          />
                          {companyName(o.companyId)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-semibold">
                        {formatCurrency(o.total)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <OrderStatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="flex items-center justify-center gap-1 pt-2 text-xs text-muted-foreground">
        <ArrowUpRight className="h-3 w-3" />
        Administración unificada · Datos en tiempo real de ambas compañías
      </p>
    </div>
  );
}
