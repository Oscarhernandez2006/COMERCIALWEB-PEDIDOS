import { useEffect, useMemo, useState } from 'react';
import {
  Save,
  Target,
  RefreshCw,
  Check,
  Search,
  TrendingUp,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { useCompany } from '@/company/useCompany';
import {
  useBudgets,
  useSaveBudgets,
  useProjection,
  useSaveProjection,
} from '@/hooks/useAdminApi';
import { COMPANIES } from '@/lib/companies';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Formatea un valor con el mismo formato que SIGCOM: miles con coma y dos
 * decimales con punto (p. ej. "$ 342,761,789.26"). Así el valor de venta
 * coincide con lo que se ve en el ERP y no genera confusión.
 */
function formatSigcom(value: number): string {
  return (
    '$ ' +
    value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

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

interface Draft {
  targetKilos: string;
  expectedRevenue: string;
}

/** Limpia una entrada numérica dejando dígitos y un único punto decimal. */
function cleanNumeric(value: string): string {
  let clean = value.replace(/[^\d.]/g, '');
  const firstDot = clean.indexOf('.');
  if (firstDot !== -1) {
    clean =
      clean.slice(0, firstDot + 1) +
      clean.slice(firstDot + 1).replace(/\./g, '');
  }
  return clean;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Encabezados del calendario, semana iniciando en lunes. */
const WEEKDAY_LABELS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

/**
 * Sección de proyección de ventas de la compañía. Permite elegir entre asignar
 * la proyección del mes completo o por día hábil (excluyentes), con un
 * calendario para marcar los días hábiles del mes. El total del mes se muestra
 * en el dashboard.
 */
function ProjectionSection({
  companyId,
  month,
  year,
}: {
  companyId: string;
  month: number;
  year: number;
}) {
  const { data, isLoading } = useProjection(companyId, month, year);
  const saveMutation = useSaveProjection();

  const [mode, setMode] = useState<'month' | 'day'>('month');
  const [revenue, setRevenue] = useState('');
  const [kilos, setKilos] = useState('');
  const [days, setDays] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    setMode(data.mode);
    setRevenue(data.revenue ? String(data.revenue) : '');
    setKilos(data.kilos ? String(data.kilos) : '');
    setDays(new Set(data.workingDays ?? []));
    setSaved(false);
  }, [data]);

  const daysInMonth = useMemo(
    () => new Date(year, month, 0).getDate(),
    [month, year],
  );
  // Índice (0=lunes … 6=domingo) del primer día del mes.
  const firstOffset = useMemo(
    () => (new Date(year, month - 1, 1).getDay() + 6) % 7,
    [month, year],
  );

  const workingCount = days.size;

  const toggleDay = (d: number) => {
    const iso = `${year}-${pad2(month)}-${pad2(d)}`;
    setDays((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
    setSaved(false);
  };

  const selectWeekdays = (includeSaturday: boolean) => {
    const next = new Set<string>();
    for (let d = 1; d <= daysInMonth; d++) {
      const wd = new Date(year, month - 1, d).getDay(); // 0=domingo … 6=sábado
      if (wd >= 1 && wd <= (includeSaturday ? 6 : 5)) {
        next.add(`${year}-${pad2(month)}-${pad2(d)}`);
      }
    }
    setDays(next);
    setSaved(false);
  };

  // Total del mes proyectado: en modo "día" se multiplica por días hábiles.
  const monthRevenue =
    mode === 'day' ? Number(revenue || 0) * workingCount : Number(revenue || 0);
  const monthKilos =
    mode === 'day' ? Number(kilos || 0) * workingCount : Number(kilos || 0);

  const handleSave = async () => {
    await saveMutation.mutateAsync({
      companyId,
      month,
      year,
      mode,
      revenue: Number(revenue || 0),
      kilos: Number(kilos || 0),
      workingDays: Array.from(days).sort(),
    });
    setSaved(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5 text-primary" />
          Proyección de ventas · {MONTHS[month - 1]} {year}
        </CardTitle>
        <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
          {saved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saveMutation.isPending
            ? 'Guardando…'
            : saved
              ? 'Guardado'
              : 'Guardar proyección'}
        </Button>
      </CardHeader>
      <CardContent className="grid gap-5 lg:grid-cols-2">
        {/* Columna izquierda: modo + valores */}
        <div className="space-y-4">
          {/* Selector de modo (excluyente) */}
          <div className="inline-flex rounded-lg border border-input p-1">
            <button
              type="button"
              onClick={() => {
                setMode('month');
                setSaved(false);
              }}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                mode === 'month'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Proyección del mes
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('day');
                setSaved(false);
              }}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                mode === 'day'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Proyección diaria
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            {mode === 'month'
              ? 'Ingresa el total proyectado para todo el mes.'
              : 'Ingresa el valor de un día hábil; el total del mes se calcula multiplicándolo por los días hábiles seleccionados.'}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {mode === 'month' ? 'Proyección Pesos (mes)' : 'Pesos por día'}
              </label>
              <input
                inputMode="numeric"
                value={revenue}
                onChange={(e) => {
                  setRevenue(cleanNumeric(e.target.value));
                  setSaved(false);
                }}
                placeholder="0"
                disabled={isLoading}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-right tabular-nums outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {mode === 'month' ? 'Proyección Kilos (mes)' : 'Kilos por día'}
              </label>
              <input
                inputMode="numeric"
                value={kilos}
                onChange={(e) => {
                  setKilos(cleanNumeric(e.target.value));
                  setSaved(false);
                }}
                placeholder="0"
                disabled={isLoading}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-right tabular-nums outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* Total proyectado del mes */}
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total proyectado del mes
              {mode === 'day' ? ` · ${workingCount} días hábiles` : ''}
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-lg font-bold">
                {formatSigcom(monthRevenue)}
              </span>
              <span className="text-sm font-semibold text-muted-foreground">
                {monthKilos.toLocaleString('en-US', {
                  maximumFractionDigits: 2,
                })}{' '}
                kg
              </span>
            </div>
          </div>
        </div>

        {/* Columna derecha: calendario de días hábiles */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              Días hábiles ({workingCount})
            </span>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => selectWeekdays(false)}
              >
                Lun–Vie
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => selectWeekdays(true)}
              >
                Lun–Sáb
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDays(new Set());
                  setSaved(false);
                }}
              >
                Limpiar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_LABELS.map((w) => (
              <span
                key={w}
                className="py-1 text-[11px] font-semibold text-muted-foreground"
              >
                {w}
              </span>
            ))}
            {Array.from({ length: firstOffset }).map((_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const iso = `${year}-${pad2(month)}-${pad2(d)}`;
              const active = days.has(iso);
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={cn(
                    'aspect-square rounded-md text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-foreground hover:bg-muted',
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BudgetsPage() {
  const { user } = useAuth();
  const { companies: myCompanies } = useCompany();
  const isAdmin = user?.role === 'admin';

  // Compañías donde el usuario puede gestionar presupuestos.
  const availableCompanies = useMemo(() => {
    if (isAdmin) return COMPANIES;
    return COMPANIES.filter((c) =>
      myCompanies.some(
        (mc) =>
          mc.id === c.id &&
          (mc.permissions ?? []).includes('/admin/presupuestos'),
      ),
    );
  }, [isAdmin, myCompanies]);

  const now = new Date();
  const [companyId, setCompanyId] = useState(
    () => availableCompanies[0]?.id ?? '',
  );
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    if (!companyId && availableCompanies[0]) {
      setCompanyId(availableCompanies[0].id);
    }
  }, [availableCompanies, companyId]);

  const { data, isLoading, isFetching, refetch } = useBudgets(
    companyId,
    month,
    year,
  );
  const saveMutation = useSaveBudgets();

  // Borrador editable indexado por vendedor.
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!data) return;
    const next: Record<string, Draft> = {};
    for (const row of data) {
      next[row.sellerId] = {
        targetKilos: row.targetKilos ? String(row.targetKilos) : '',
        expectedRevenue: row.expectedRevenue ? String(row.expectedRevenue) : '',
      };
    }
    setDrafts(next);
    setSaved(false);
  }, [data]);

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return [y + 1, y, y - 1, y - 2];
  }, []);

  const setField = (sellerId: string, field: keyof Draft, value: string) => {
    // Permite dígitos y un único punto decimal (mismo formato que SIGCOM,
    // p. ej. 342761789.26). Se descartan otros caracteres.
    let clean = value.replace(/[^\d.]/g, '');
    const firstDot = clean.indexOf('.');
    if (firstDot !== -1) {
      clean =
        clean.slice(0, firstDot + 1) +
        clean.slice(firstDot + 1).replace(/\./g, '');
    }
    setDrafts((prev) => ({
      ...prev,
      [sellerId]: { ...prev[sellerId], [field]: clean },
    }));
    setSaved(false);
  };

  const totals = useMemo(() => {
    let kilos = 0;
    let revenue = 0;
    for (const d of Object.values(drafts)) {
      kilos += Number(d.targetKilos || 0);
      revenue += Number(d.expectedRevenue || 0);
    }
    return { kilos, revenue };
  }, [drafts]);

  const handleSave = async () => {
    if (!data) return;
    const items = data.map((row) => ({
      sellerId: row.sellerId,
      targetKilos: Number(drafts[row.sellerId]?.targetKilos || 0),
      expectedRevenue: Number(drafts[row.sellerId]?.expectedRevenue || 0),
    }));
    await saveMutation.mutateAsync({ companyId, month, year, items });
    setSaved(true);
  };

  const companyName =
    availableCompanies.find((c) => c.id === companyId)?.name ?? '';

  // Vendedores visibles según el buscador (por nombre o código).
  const visibleRows = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (r) =>
        r.sellerName.toLowerCase().includes(q) ||
        (r.siesaSellerCode ?? '').toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Target className="h-6 w-6 text-primary" />
            Presupuestos
          </h2>
          <p className="text-muted-foreground">
            Meta de kilos y valor de venta por vendedor · {companyName} ·{' '}
            {MONTHS[month - 1]} {year}
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

      {/* Filtros */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Compañía
            </label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              {availableCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
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
        </CardContent>
      </Card>

      {/* Proyección de ventas de la compañía */}
      {companyId && (
        <ProjectionSection companyId={companyId} month={month} year={year} />
      )}

      {/* Tabla editable */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            Vendedores ({visibleRows.length}
            {search ? ` de ${data?.length ?? 0}` : ''})
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar vendedor…"
                className="h-9 w-52 rounded-md border border-input bg-background pl-8 pr-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!companyId || saveMutation.isPending || !data?.length}
            >
              {saved ? (
                <Check className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saveMutation.isPending
                ? 'Guardando…'
                : saved
                  ? 'Guardado'
                  : 'Guardar'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Vendedor</th>
                  <th className="px-4 py-2 font-medium">Código</th>
                  <th className="px-4 py-2 text-right font-medium">
                    Ppto Kilos
                  </th>
                  <th className="px-4 py-2 text-right font-medium">
                    Venta Esperada
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      Cargando…
                    </td>
                  </tr>
                ) : visibleRows.length > 0 ? (
                  visibleRows.map((row) => (
                    <tr key={row.sellerId} className="hover:bg-muted/40">
                      <td className="px-4 py-2 font-medium">{row.sellerName}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {row.siesaSellerCode ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          inputMode="numeric"
                          value={drafts[row.sellerId]?.targetKilos ?? ''}
                          onChange={(e) =>
                            setField(row.sellerId, 'targetKilos', e.target.value)
                          }
                          placeholder="0"
                          className="w-28 rounded-md border border-input bg-background px-2 py-1 text-right tabular-nums outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          inputMode="numeric"
                          value={drafts[row.sellerId]?.expectedRevenue ?? ''}
                          onChange={(e) =>
                            setField(
                              row.sellerId,
                              'expectedRevenue',
                              e.target.value,
                            )
                          }
                          placeholder="0"
                          className="w-36 rounded-md border border-input bg-background px-2 py-1 text-right tabular-nums outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      {search
                        ? 'Ningún vendedor coincide con la búsqueda.'
                        : 'No hay vendedores asignados a esta compañía.'}
                    </td>
                  </tr>
                )}
              </tbody>
              {data && data.length > 0 && (
                <tfoot className="border-t border-border bg-muted/50 font-semibold">
                  <tr>
                    <td className="px-4 py-2" colSpan={2}>
                      TOTAL
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {totals.kilos.toLocaleString('en-US', {
                        maximumFractionDigits: 2,
                      })}{' '}
                      kg
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatSigcom(totals.revenue)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
