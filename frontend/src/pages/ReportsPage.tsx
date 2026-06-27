import { useEffect, useState } from 'react';
import {
  FileBarChart,
  Building2,
  Calendar,
  Download,
  FileSpreadsheet,
  Package,
  AlertCircle,
  ShoppingCart,
  Search,
  Loader2,
  X,
  ChevronRight,
  EyeOff,
  Users,
  Trophy,
  UserSearch,
  Crown,
} from 'lucide-react';
import { isAxiosError } from 'axios';
import {
  downloadInventoryReport,
  downloadInventoryExcel,
  downloadProductSalesReport,
  downloadProductSalesExcel,
  downloadSalesSummaryReport,
  downloadSalesSummaryExcel,
  downloadSellerRankingReport,
  downloadSellerRankingExcel,
  downloadSellerProductReport,
  downloadSellerProductExcel,
  downloadProductSellerReport,
  downloadProductSellerExcel,
  useInventoryReport,
  useProductSalesReport,
  useSalesSummaryReport,
  useSellerRankingReport,
  useSellerProductReport,
  useProductSellerReport,
} from '@/hooks/useAdminApi';
import { COMPANIES } from '@/lib/companies';
import { cn, formatCurrency } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** Fecha de hoy en formato YYYY-MM-DD (hora local del navegador). */
function todayStr(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

/** Formatea una cantidad con separador de miles colombiano. */
function num(value: number): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(
    value,
  );
}

function errorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const msg = err.response?.data?.message;
    return (
      (Array.isArray(msg) ? msg.join(', ') : msg) ||
      'No se pudo generar el reporte.'
    );
  }
  return 'No se pudo generar el reporte.';
}

type ReportKey =
  | 'inventory'
  | 'product-sales'
  | 'sales-summary'
  | 'seller-ranking'
  | 'seller-product'
  | 'product-seller';

const REPORTS: {
  key: ReportKey;
  title: string;
  description: string;
  icon: typeof FileBarChart;
}[] = [
  {
    key: 'inventory',
    title: 'Resumen de inventario por día',
    description:
      'Lo vendido en el día, el stock que queda y las referencias agotadas.',
    icon: FileBarChart,
  },
  {
    key: 'product-sales',
    title: 'Productos vendidos por compañía',
    description:
      'Cantidad vendida e ingresos por producto en un rango de fechas.',
    icon: ShoppingCart,
  },
  {
    key: 'sales-summary',
    title: 'Resumen de ventas por cliente y producto',
    description:
      'Cuánto se ha vendido a cada cliente o de cada producto en un rango de fechas.',
    icon: Users,
  },
  {
    key: 'seller-ranking',
    title: 'Ranking de vendedores',
    description:
      'Los vendedores que más venden y los que menos en un rango de fechas.',
    icon: Trophy,
  },
  {
    key: 'seller-product',
    title: 'Ventas por vendedor y producto',
    description:
      'Cuánto vendió un vendedor de un producto en un rango de fechas.',
    icon: UserSearch,
  },
  {
    key: 'product-seller',
    title: 'Mejor vendedor por producto',
    description:
      'Por cada producto, quién fue el vendedor que más lo vendió (ranking).',
    icon: Crown,
  },
];

export function ReportsPage() {
  const [open, setOpen] = useState<ReportKey | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reportes</h2>
        <p className="text-muted-foreground">
          Selecciona un reporte para consultarlo y exportarlo a PDF o Excel.
        </p>
      </div>

      {/* Lista de reportes */}
      <Card>
        <CardContent className="divide-y divide-border p-0">
          {REPORTS.map((r) => (
            <button
              key={r.key}
              onClick={() => setOpen(r.key)}
              className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-accent"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <r.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{r.title}</span>
                <span className="block truncate text-sm text-muted-foreground">
                  {r.description}
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </CardContent>
      </Card>

      {open === 'inventory' && (
        <ReportModalShell
          title="Resumen de inventario por día"
          icon={FileBarChart}
          onClose={() => setOpen(null)}
        >
          <InventoryReportBody />
        </ReportModalShell>
      )}

      {open === 'product-sales' && (
        <ReportModalShell
          title="Productos vendidos por compañía"
          icon={ShoppingCart}
          onClose={() => setOpen(null)}
        >
          <ProductSalesReportBody />
        </ReportModalShell>
      )}

      {open === 'sales-summary' && (
        <ReportModalShell
          title="Resumen de ventas por cliente y producto"
          icon={Users}
          onClose={() => setOpen(null)}
        >
          <SalesSummaryReportBody />
        </ReportModalShell>
      )}

      {open === 'seller-ranking' && (
        <ReportModalShell
          title="Ranking de vendedores"
          icon={Trophy}
          onClose={() => setOpen(null)}
        >
          <SellerRankingReportBody />
        </ReportModalShell>
      )}

      {open === 'seller-product' && (
        <ReportModalShell
          title="Ventas por vendedor y producto"
          icon={UserSearch}
          onClose={() => setOpen(null)}
        >
          <SellerProductReportBody />
        </ReportModalShell>
      )}

      {open === 'product-seller' && (
        <ReportModalShell
          title="Mejor vendedor por producto"
          icon={Crown}
          onClose={() => setOpen(null)}
        >
          <ProductSellerReportBody />
        </ReportModalShell>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Marco del modal                                                     */
/* ------------------------------------------------------------------ */

function ReportModalShell({
  title,
  icon: Icon,
  onClose,
  children,
}: {
  title: string;
  icon: typeof FileBarChart;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Cerrar con la tecla Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-auto p-5">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Resumen de inventario por día                                       */
/* ------------------------------------------------------------------ */

function InventoryReportBody() {
  const [companyId, setCompanyId] = useState(COMPANIES[0].id);
  const [date, setDate] = useState(todayStr());

  const [applied, setApplied] = useState<{
    companyId: string;
    date: string;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [exporting, setExporting] = useState<null | 'pdf' | 'excel'>(null);
  const [error, setError] = useState('');

  const query = useInventoryReport(
    applied?.companyId ?? '',
    applied?.date,
    !!applied,
  );

  const company = COMPANIES.find((c) => c.id === companyId)!;

  function handleToggle() {
    if (showPreview) {
      setShowPreview(false);
      return;
    }
    setError('');
    setApplied({ companyId, date: date || todayStr() });
    setShowPreview(true);
  }

  async function handleExport(kind: 'pdf' | 'excel') {
    setExporting(kind);
    setError('');
    try {
      if (kind === 'pdf') {
        await downloadInventoryReport(companyId, date || undefined);
      } else {
        await downloadInventoryExcel(companyId, date || undefined);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setExporting(null);
    }
  }

  const data = query.data;

  return (
    <>
      <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
        <Package className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Por cada referencia muestra lo <strong>vendido</strong> en el día, el{' '}
          <strong>stock que queda</strong> y si tiene o no existencias.
        </span>
      </p>

      {/* Compañía */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Compañía</label>
        <div className="flex flex-wrap gap-2">
          {COMPANIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCompanyId(c.id)}
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
      </div>

      {/* Fecha */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Día del reporte</label>
        <div className="relative max-w-xs">
          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-1 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleToggle} disabled={query.isFetching}>
          {query.isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : showPreview ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {showPreview ? 'Ocultar' : 'Consultar'}
        </Button>
        <Button
          variant="outline"
          onClick={() => handleExport('pdf')}
          disabled={exporting !== null}
        >
          <Download
            className={cn('h-4 w-4', exporting === 'pdf' && 'animate-pulse')}
          />
          Exportar PDF
        </Button>
        <Button
          variant="outline"
          onClick={() => handleExport('excel')}
          disabled={exporting !== null}
        >
          <FileSpreadsheet
            className={cn('h-4 w-4', exporting === 'excel' && 'animate-pulse')}
          />
          Exportar Excel
        </Button>
        <span className="text-xs text-muted-foreground">
          {company.name} · {date || 'hoy'}
        </span>
      </div>

      {/* Vista previa */}
      {showPreview && query.isError && (
        <p className="flex items-center gap-1 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {errorMessage(query.error)}
        </p>
      )}

      {showPreview && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <SummaryTile label="Referencias" value={num(data.summary.totalRefs)} />
            <SummaryTile
              label="Con stock"
              value={num(data.summary.refsWithStock)}
              tone="ok"
            />
            <SummaryTile
              label="Sin stock"
              value={num(data.summary.refsWithoutStock)}
              tone="warn"
            />
            <SummaryTile label="Vendido" value={num(data.summary.totalSold)} />
            <SummaryTile label="Stock total" value={num(data.summary.totalStock)} />
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Referencia</th>
                  <th className="px-4 py-2 font-medium">Producto</th>
                  <th className="px-4 py-2 font-medium">UM</th>
                  <th className="px-4 py-2 text-right font-medium">Vendido</th>
                  <th className="px-4 py-2 text-right font-medium">Stock</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Sin productos para esta compañía.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((r) => (
                    <tr
                      key={r.sku}
                      className="border-t border-border/60 hover:bg-muted/40"
                    >
                      <td className="px-4 py-2 font-mono text-xs">{r.sku}</td>
                      <td className="px-4 py-2">{r.name}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {r.unitOfMeasure ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {num(r.sold)}
                      </td>
                      <td
                        className={cn(
                          'px-4 py-2 text-right font-medium tabular-nums',
                          r.stock <= 0 && 'text-destructive',
                        )}
                      >
                        {num(r.stock)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Productos vendidos por compañía                                     */
/* ------------------------------------------------------------------ */

function ProductSalesReportBody() {
  const [companyId, setCompanyId] = useState(COMPANIES[0].id);
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());

  const [applied, setApplied] = useState<{
    from: string;
    to: string;
    companyId: string;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [exporting, setExporting] = useState<null | 'pdf' | 'excel'>(null);
  const [error, setError] = useState('');

  const query = useProductSalesReport(
    applied?.from,
    applied?.to,
    applied?.companyId,
    !!applied,
  );

  function handleToggle() {
    if (showPreview) {
      setShowPreview(false);
      return;
    }
    if (from && to && from > to) {
      setError('La fecha inicial no puede ser mayor que la final.');
      return;
    }
    setError('');
    setApplied({ from: from || todayStr(), to: to || todayStr(), companyId });
    setShowPreview(true);
  }

  async function handleExport(kind: 'pdf' | 'excel') {
    if (from && to && from > to) {
      setError('La fecha inicial no puede ser mayor que la final.');
      return;
    }
    setExporting(kind);
    setError('');
    try {
      if (kind === 'pdf') {
        await downloadProductSalesReport(from || undefined, to || undefined, companyId);
      } else {
        await downloadProductSalesExcel(from || undefined, to || undefined, companyId);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setExporting(null);
    }
  }

  const data = query.data;

  return (
    <>
      <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
        <Package className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Por cada producto vendido en el rango muestra la{' '}
          <strong>referencia</strong>, la <strong>cantidad vendida</strong> y los{' '}
          <strong>ingresos</strong> (precio × cantidad).
        </span>
      </p>

      {/* Compañía */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Compañía</label>
        <div className="flex flex-wrap gap-2">
          {COMPANIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCompanyId(c.id)}
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
      </div>

      {/* Rango de fechas */}
      <div className="grid max-w-md gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Desde</label>
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
        <div className="space-y-2">
          <label className="text-sm font-medium">Hasta</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={to}
              max={todayStr()}
              onChange={(e) => setTo(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-1 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleToggle} disabled={query.isFetching}>
          {query.isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : showPreview ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {showPreview ? 'Ocultar' : 'Consultar'}
        </Button>
        <Button
          variant="outline"
          onClick={() => handleExport('pdf')}
          disabled={exporting !== null}
        >
          <Download
            className={cn('h-4 w-4', exporting === 'pdf' && 'animate-pulse')}
          />
          Exportar PDF
        </Button>
        <Button
          variant="outline"
          onClick={() => handleExport('excel')}
          disabled={exporting !== null}
        >
          <FileSpreadsheet
            className={cn('h-4 w-4', exporting === 'excel' && 'animate-pulse')}
          />
          Exportar Excel
        </Button>
        <span className="text-xs text-muted-foreground">
          {COMPANIES.find((c) => c.id === companyId)?.name} ·{' '}
          {from === to ? from || 'hoy' : `${from} a ${to}`}
        </span>
      </div>

      {/* Vista previa */}
      {showPreview && query.isError && (
        <p className="flex items-center gap-1 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {errorMessage(query.error)}
        </p>
      )}

      {showPreview &&
        data &&
        data.companies.map((company) => (
          <div key={company.companyId} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <SummaryTile
                label="Productos"
                value={num(company.summary.totalProducts)}
              />
              <SummaryTile
                label="Cantidad"
                value={num(company.summary.totalQuantity)}
              />
              <SummaryTile
                label="Ingresos"
                value={formatCurrency(company.summary.totalRevenue)}
                tone="ok"
              />
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Referencia</th>
                    <th className="px-4 py-2 font-medium">Producto</th>
                    <th className="px-4 py-2 font-medium">UM</th>
                    <th className="px-4 py-2 text-right font-medium">Cantidad</th>
                    <th className="px-4 py-2 text-right font-medium">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {company.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        Sin ventas en el rango seleccionado.
                      </td>
                    </tr>
                  ) : (
                    company.rows.map((r) => (
                      <tr
                        key={r.sku}
                        className="border-t border-border/60 hover:bg-muted/40"
                      >
                        <td className="px-4 py-2 font-mono text-xs">{r.sku}</td>
                        <td className="px-4 py-2">{r.name}</td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {r.unitOfMeasure ?? '—'}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {num(r.quantity)}
                        </td>
                        <td className="px-4 py-2 text-right font-medium tabular-nums">
                          {formatCurrency(r.revenue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Resumen de ventas por cliente y producto                            */
/* ------------------------------------------------------------------ */

function SalesSummaryReportBody() {
  const [companyId, setCompanyId] = useState(COMPANIES[0].id);
  const [groupBy, setGroupBy] = useState<'customer' | 'product'>('customer');
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [search, setSearch] = useState('');

  const [applied, setApplied] = useState<{
    companyId: string;
    groupBy: 'customer' | 'product';
    from: string;
    to: string;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [exporting, setExporting] = useState<null | 'pdf' | 'excel'>(null);
  const [error, setError] = useState('');

  const query = useSalesSummaryReport(
    applied?.companyId,
    applied?.groupBy ?? 'customer',
    applied?.from,
    applied?.to,
    !!applied,
  );

  const byCustomer = groupBy === 'customer';

  function handleToggle() {
    if (showPreview) {
      setShowPreview(false);
      return;
    }
    if (from && to && from > to) {
      setError('La fecha inicial no puede ser mayor que la final.');
      return;
    }
    setError('');
    setApplied({
      companyId,
      groupBy,
      from: from || todayStr(),
      to: to || todayStr(),
    });
    setShowPreview(true);
  }

  async function handleExport(kind: 'pdf' | 'excel') {
    if (from && to && from > to) {
      setError('La fecha inicial no puede ser mayor que la final.');
      return;
    }
    setExporting(kind);
    setError('');
    try {
      if (kind === 'pdf') {
        await downloadSalesSummaryReport(
          companyId,
          groupBy,
          from || undefined,
          to || undefined,
        );
      } else {
        await downloadSalesSummaryExcel(
          companyId,
          groupBy,
          from || undefined,
          to || undefined,
        );
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setExporting(null);
    }
  }

  const data = query.data;
  const term = search.trim().toLowerCase();
  const rows = data
    ? term
      ? data.rows.filter(
          (r) =>
            r.name.toLowerCase().includes(term) ||
            r.reference.toLowerCase().includes(term),
        )
      : data.rows
    : [];

  return (
    <>
      <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
        <Users className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Filtra un rango de fechas y consulta{' '}
          <strong>cuánto se ha vendido a cada cliente</strong> o{' '}
          <strong>cuánto se ha vendido de cada producto</strong>, ordenado de
          mayor a menor por ingresos.
        </span>
      </p>

      {/* Agrupar por */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Ver ventas por</label>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'customer', label: 'Cliente', icon: Users },
              { id: 'product', label: 'Producto', icon: Package },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setGroupBy(opt.id)}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                groupBy === opt.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-accent',
              )}
            >
              <opt.icon className="h-4 w-4" />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Compañía */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Compañía</label>
        <div className="flex flex-wrap gap-2">
          {COMPANIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCompanyId(c.id)}
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
      </div>

      {/* Rango de fechas */}
      <div className="grid max-w-md gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Desde</label>
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
        <div className="space-y-2">
          <label className="text-sm font-medium">Hasta</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={to}
              max={todayStr()}
              onChange={(e) => setTo(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-1 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleToggle} disabled={query.isFetching}>
          {query.isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : showPreview ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {showPreview ? 'Ocultar' : 'Consultar'}
        </Button>
        <Button
          variant="outline"
          onClick={() => handleExport('pdf')}
          disabled={exporting !== null}
        >
          <Download
            className={cn('h-4 w-4', exporting === 'pdf' && 'animate-pulse')}
          />
          Exportar PDF
        </Button>
        <Button
          variant="outline"
          onClick={() => handleExport('excel')}
          disabled={exporting !== null}
        >
          <FileSpreadsheet
            className={cn('h-4 w-4', exporting === 'excel' && 'animate-pulse')}
          />
          Exportar Excel
        </Button>
        <span className="text-xs text-muted-foreground">
          {COMPANIES.find((c) => c.id === companyId)?.name} ·{' '}
          {byCustomer ? 'por cliente' : 'por producto'} ·{' '}
          {from === to ? from || 'hoy' : `${from} a ${to}`}
        </span>
      </div>

      {/* Vista previa */}
      {showPreview && query.isError && (
        <p className="flex items-center gap-1 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {errorMessage(query.error)}
        </p>
      )}

      {showPreview && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryTile
              label={byCustomer ? 'Clientes' : 'Productos'}
              value={num(data.summary.totalRows)}
            />
            <SummaryTile label="Pedidos" value={num(data.summary.totalOrders)} />
            <SummaryTile
              label="Unidades"
              value={num(data.summary.totalUnits)}
            />
            <SummaryTile
              label="Ingresos"
              value={formatCurrency(data.summary.totalRevenue)}
              tone="ok"
            />
          </div>

          {/* Búsqueda local */}
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={
                byCustomer ? 'Buscar cliente…' : 'Buscar producto…'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">
                    {byCustomer ? 'Código' : 'Referencia'}
                  </th>
                  <th className="px-4 py-2 font-medium">
                    {byCustomer ? 'Cliente' : 'Producto'}
                  </th>
                  <th className="px-4 py-2 text-right font-medium">
                    {byCustomer ? 'Pedidos' : 'UM'}
                  </th>
                  <th className="px-4 py-2 text-right font-medium">
                    {byCustomer ? 'Unidades' : 'Cantidad'}
                  </th>
                  <th className="px-4 py-2 text-right font-medium">Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      {term
                        ? 'Sin resultados para la búsqueda.'
                        : 'Sin ventas en el rango seleccionado.'}
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr
                      key={r.reference}
                      className="border-t border-border/60 hover:bg-muted/40"
                    >
                      <td className="px-4 py-2 font-mono text-xs">
                        {r.reference}
                      </td>
                      <td className="px-4 py-2">{r.name}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                        {byCustomer ? num(r.orders ?? 0) : r.unitOfMeasure ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {num(r.units)}
                      </td>
                      <td className="px-4 py-2 text-right font-medium tabular-nums">
                        {formatCurrency(r.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Ranking de vendedores                                               */
/* ------------------------------------------------------------------ */

function SellerRankingReportBody() {
  const [companyId, setCompanyId] = useState(COMPANIES[0].id);
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());

  const [applied, setApplied] = useState<{
    companyId: string;
    from: string;
    to: string;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [exporting, setExporting] = useState<null | 'pdf' | 'excel'>(null);
  const [error, setError] = useState('');

  const query = useSellerRankingReport(
    applied?.companyId,
    applied?.from,
    applied?.to,
    !!applied,
  );

  function handleToggle() {
    if (showPreview) {
      setShowPreview(false);
      return;
    }
    if (from && to && from > to) {
      setError('La fecha inicial no puede ser mayor que la final.');
      return;
    }
    setError('');
    setApplied({ companyId, from: from || todayStr(), to: to || todayStr() });
    setShowPreview(true);
  }

  async function handleExport(kind: 'pdf' | 'excel') {
    if (from && to && from > to) {
      setError('La fecha inicial no puede ser mayor que la final.');
      return;
    }
    setExporting(kind);
    setError('');
    try {
      if (kind === 'pdf') {
        await downloadSellerRankingReport(
          companyId,
          from || undefined,
          to || undefined,
        );
      } else {
        await downloadSellerRankingExcel(
          companyId,
          from || undefined,
          to || undefined,
        );
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setExporting(null);
    }
  }

  const data = query.data;

  return (
    <>
      <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
        <Trophy className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Lista los vendedores ordenados del{' '}
          <strong>que más vende al que menos</strong>, con sus pedidos, unidades
          e ingresos en el rango de fechas.
        </span>
      </p>

      {/* Compañía */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Compañía</label>
        <div className="flex flex-wrap gap-2">
          {COMPANIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCompanyId(c.id)}
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
      </div>

      {/* Rango de fechas */}
      <div className="grid max-w-md gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Desde</label>
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
        <div className="space-y-2">
          <label className="text-sm font-medium">Hasta</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={to}
              max={todayStr()}
              onChange={(e) => setTo(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-1 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleToggle} disabled={query.isFetching}>
          {query.isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : showPreview ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {showPreview ? 'Ocultar' : 'Consultar'}
        </Button>
        <Button
          variant="outline"
          onClick={() => handleExport('pdf')}
          disabled={exporting !== null}
        >
          <Download
            className={cn('h-4 w-4', exporting === 'pdf' && 'animate-pulse')}
          />
          Exportar PDF
        </Button>
        <Button
          variant="outline"
          onClick={() => handleExport('excel')}
          disabled={exporting !== null}
        >
          <FileSpreadsheet
            className={cn('h-4 w-4', exporting === 'excel' && 'animate-pulse')}
          />
          Exportar Excel
        </Button>
        <span className="text-xs text-muted-foreground">
          {COMPANIES.find((c) => c.id === companyId)?.name} ·{' '}
          {from === to ? from || 'hoy' : `${from} a ${to}`}
        </span>
      </div>

      {/* Vista previa */}
      {showPreview && query.isError && (
        <p className="flex items-center gap-1 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {errorMessage(query.error)}
        </p>
      )}

      {showPreview && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryTile
              label="Vendedores"
              value={num(data.summary.totalSellers)}
            />
            <SummaryTile label="Pedidos" value={num(data.summary.totalOrders)} />
            <SummaryTile
              label="Unidades"
              value={num(data.summary.totalUnits)}
            />
            <SummaryTile
              label="Ingresos"
              value={formatCurrency(data.summary.totalRevenue)}
              tone="ok"
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Vendedor</th>
                  <th className="px-4 py-2 font-medium">Cédula</th>
                  <th className="px-4 py-2 font-medium">Código</th>
                  <th className="px-4 py-2 text-right font-medium">Pedidos</th>
                  <th className="px-4 py-2 text-right font-medium">Unidades</th>
                  <th className="px-4 py-2 text-right font-medium">Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Sin ventas en el rango seleccionado.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((r) => (
                    <tr
                      key={`${r.position}-${r.name}`}
                      className="border-t border-border/60 hover:bg-muted/40"
                    >
                      <td className="px-4 py-2 font-semibold tabular-nums">
                        {r.position <= 3 ? (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1',
                              r.position === 1 && 'text-amber-500',
                              r.position === 2 && 'text-slate-400',
                              r.position === 3 && 'text-orange-700 dark:text-orange-500',
                            )}
                          >
                            <Crown className="h-4 w-4 fill-current" />
                            {r.position}
                          </span>
                        ) : (
                          r.position
                        )}
                      </td>
                      <td className="px-4 py-2">{r.name}</td>
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                        {r.documentId ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {r.sellerCode ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {num(r.orders)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {num(r.units)}
                      </td>
                      <td className="px-4 py-2 text-right font-medium tabular-nums">
                        {formatCurrency(r.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Ventas por vendedor y producto                                      */
/* ------------------------------------------------------------------ */

function SellerProductReportBody() {
  const [companyId, setCompanyId] = useState(COMPANIES[0].id);
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [sellerId, setSellerId] = useState('');
  const [sku, setSku] = useState('');

  const [applied, setApplied] = useState<{
    companyId: string;
    from: string;
    to: string;
    sellerId: string;
    sku: string;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [exporting, setExporting] = useState<null | 'pdf' | 'excel'>(null);
  const [error, setError] = useState('');

  const query = useSellerProductReport(
    applied?.companyId,
    applied?.from,
    applied?.to,
    applied?.sellerId || undefined,
    applied?.sku || undefined,
    !!applied,
  );

  function handleToggle() {
    if (showPreview) {
      setShowPreview(false);
      return;
    }
    if (from && to && from > to) {
      setError('La fecha inicial no puede ser mayor que la final.');
      return;
    }
    setError('');
    setApplied({
      companyId,
      from: from || todayStr(),
      to: to || todayStr(),
      sellerId,
      sku,
    });
    setShowPreview(true);
  }

  async function handleExport(kind: 'pdf' | 'excel') {
    if (from && to && from > to) {
      setError('La fecha inicial no puede ser mayor que la final.');
      return;
    }
    setExporting(kind);
    setError('');
    try {
      const args = [
        companyId,
        from || undefined,
        to || undefined,
        sellerId || undefined,
        sku || undefined,
      ] as const;
      if (kind === 'pdf') {
        await downloadSellerProductReport(...args);
      } else {
        await downloadSellerProductExcel(...args);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setExporting(null);
    }
  }

  const data = query.data;
  // Vendedores y productos disponibles: los de la última consulta.
  const sellers = data?.sellers ?? [];
  const products = data?.products ?? [];

  return (
    <>
      <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
        <UserSearch className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Consulta <strong>cuánto vendió un vendedor de un producto</strong> en
          el rango. Elige <strong>todos</strong> o un vendedor/producto concreto
          de las listas.
        </span>
      </p>

      {/* Compañía */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Compañía</label>
        <div className="flex flex-wrap gap-2">
          {COMPANIES.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setCompanyId(c.id);
                setSellerId('');
                setSku('');
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
      </div>

      {/* Rango de fechas */}
      <div className="grid max-w-md gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Desde</label>
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
        <div className="space-y-2">
          <label className="text-sm font-medium">Hasta</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={to}
              max={todayStr()}
              onChange={(e) => setTo(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Filtros vendedor / producto */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Vendedor</label>
          <select
            value={sellerId}
            onChange={(e) => setSellerId(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todos los vendedores</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {sellers.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Consulta una vez para cargar la lista de vendedores con ventas.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Producto</label>
          <select
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todos los productos</option>
            {products.map((p) => (
              <option key={p.sku} value={p.sku}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
          {products.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Consulta una vez para cargar la lista de productos con ventas.
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-1 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleToggle} disabled={query.isFetching}>
          {query.isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : showPreview ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {showPreview ? 'Ocultar' : 'Consultar'}
        </Button>
        <Button
          variant="outline"
          onClick={() => handleExport('pdf')}
          disabled={exporting !== null}
        >
          <Download
            className={cn('h-4 w-4', exporting === 'pdf' && 'animate-pulse')}
          />
          Exportar PDF
        </Button>
        <Button
          variant="outline"
          onClick={() => handleExport('excel')}
          disabled={exporting !== null}
        >
          <FileSpreadsheet
            className={cn('h-4 w-4', exporting === 'excel' && 'animate-pulse')}
          />
          Exportar Excel
        </Button>
        <span className="text-xs text-muted-foreground">
          {COMPANIES.find((c) => c.id === companyId)?.name} ·{' '}
          {from === to ? from || 'hoy' : `${from} a ${to}`}
        </span>
      </div>

      {/* Vista previa */}
      {showPreview && query.isError && (
        <p className="flex items-center gap-1 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {errorMessage(query.error)}
        </p>
      )}

      {showPreview && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <SummaryTile label="Líneas" value={num(data.summary.totalRows)} />
            <SummaryTile
              label="Unidades"
              value={num(data.summary.totalQuantity)}
            />
            <SummaryTile
              label="Ingresos"
              value={formatCurrency(data.summary.totalRevenue)}
              tone="ok"
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Vendedor</th>
                  <th className="px-4 py-2 font-medium">Referencia</th>
                  <th className="px-4 py-2 font-medium">Producto</th>
                  <th className="px-4 py-2 text-right font-medium">Cantidad</th>
                  <th className="px-4 py-2 text-right font-medium">Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Sin ventas con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((r) => (
                    <tr
                      key={`${r.sellerId}-${r.sku}`}
                      className="border-t border-border/60 hover:bg-muted/40"
                    >
                      <td className="px-4 py-2">{r.sellerName}</td>
                      <td className="px-4 py-2 font-mono text-xs">{r.sku}</td>
                      <td className="px-4 py-2">{r.productName}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {num(r.quantity)}
                        {r.unitOfMeasure ? (
                          <span className="ml-1 text-xs text-muted-foreground">
                            {r.unitOfMeasure}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2 text-right font-medium tabular-nums">
                        {formatCurrency(r.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Reporte: mejor vendedor por producto                                */
/* ------------------------------------------------------------------ */
function ProductSellerReportBody() {
  const [companyId, setCompanyId] = useState(COMPANIES[0].id);
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [sku, setSku] = useState('');

  const [applied, setApplied] = useState<{
    companyId: string;
    from: string;
    to: string;
    sku: string;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [exporting, setExporting] = useState<null | 'pdf' | 'excel'>(null);
  const [error, setError] = useState('');

  const query = useProductSellerReport(
    applied?.companyId,
    applied?.from,
    applied?.to,
    applied?.sku || undefined,
    !!applied,
  );

  function handleToggle() {
    if (showPreview) {
      setShowPreview(false);
      return;
    }
    if (from && to && from > to) {
      setError('La fecha inicial no puede ser mayor que la final.');
      return;
    }
    setError('');
    setApplied({
      companyId,
      from: from || todayStr(),
      to: to || todayStr(),
      sku,
    });
    setShowPreview(true);
  }

  async function handleExport(kind: 'pdf' | 'excel') {
    if (from && to && from > to) {
      setError('La fecha inicial no puede ser mayor que la final.');
      return;
    }
    setExporting(kind);
    setError('');
    try {
      const args = [
        companyId,
        from || undefined,
        to || undefined,
        sku || undefined,
      ] as const;
      if (kind === 'pdf') {
        await downloadProductSellerReport(...args);
      } else {
        await downloadProductSellerExcel(...args);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setExporting(null);
    }
  }

  const data = query.data;
  // Productos disponibles: los de la última consulta (con ventas en el rango).
  const products = data?.products ?? [];

  return (
    <>
      <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
        <Crown className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Por cada producto verás el <strong>ranking de vendedores</strong>{' '}
          ordenado por unidades: el <strong>#1</strong> es quien más lo vendió.
          Consulta todos o filtra un producto concreto.
        </span>
      </p>

      {/* Compañía */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Compañía</label>
        <div className="flex flex-wrap gap-2">
          {COMPANIES.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setCompanyId(c.id);
                setSku('');
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
      </div>

      {/* Rango de fechas */}
      <div className="grid max-w-md gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Desde</label>
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
        <div className="space-y-2">
          <label className="text-sm font-medium">Hasta</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={to}
              max={todayStr()}
              onChange={(e) => setTo(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Filtro de producto */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Producto</label>
          <select
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todos los productos</option>
            {products.map((p) => (
              <option key={p.sku} value={p.sku}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
          {products.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Consulta una vez para cargar la lista de productos con ventas.
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-1 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleToggle} disabled={query.isFetching}>
          {query.isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : showPreview ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {showPreview ? 'Ocultar' : 'Consultar'}
        </Button>
        <Button
          variant="outline"
          onClick={() => handleExport('pdf')}
          disabled={exporting !== null}
        >
          <Download
            className={cn('h-4 w-4', exporting === 'pdf' && 'animate-pulse')}
          />
          Exportar PDF
        </Button>
        <Button
          variant="outline"
          onClick={() => handleExport('excel')}
          disabled={exporting !== null}
        >
          <FileSpreadsheet
            className={cn('h-4 w-4', exporting === 'excel' && 'animate-pulse')}
          />
          Exportar Excel
        </Button>
        <span className="text-xs text-muted-foreground">
          {COMPANIES.find((c) => c.id === companyId)?.name} ·{' '}
          {from === to ? from || 'hoy' : `${from} a ${to}`}
        </span>
      </div>

      {/* Vista previa */}
      {showPreview && query.isError && (
        <p className="flex items-center gap-1 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {errorMessage(query.error)}
        </p>
      )}

      {showPreview && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <SummaryTile
              label="Productos"
              value={num(data.summary.totalProducts)}
            />
            <SummaryTile
              label="Unidades"
              value={num(data.summary.totalQuantity)}
            />
            <SummaryTile
              label="Ingresos"
              value={formatCurrency(data.summary.totalRevenue)}
              tone="ok"
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Producto</th>
                  <th className="px-4 py-2 text-right font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Vendedor</th>
                  <th className="px-4 py-2 text-right font-medium">Cantidad</th>
                  <th className="px-4 py-2 text-right font-medium">Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Sin ventas con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((r, idx) => {
                    const prev = data.rows[idx - 1];
                    const firstOfProduct = !prev || prev.sku !== r.sku;
                    return (
                      <tr
                        key={`${r.sku}-${r.sellerId}`}
                        className={cn(
                          'border-t border-border/60 hover:bg-muted/40',
                          firstOfProduct && 'border-t-2 border-border',
                        )}
                      >
                        <td className="px-4 py-2">
                          {firstOfProduct ? (
                            <span>
                              <span className="font-medium">
                                {r.productName}
                              </span>{' '}
                              <span className="font-mono text-xs text-muted-foreground">
                                {r.sku}
                              </span>
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {r.isTop ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                              <Crown className="h-3.5 w-3.5" />
                              {r.position}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              {r.position}
                            </span>
                          )}
                        </td>
                        <td
                          className={cn(
                            'px-4 py-2',
                            r.isTop && 'font-medium',
                          )}
                        >
                          {r.sellerName}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {num(r.quantity)}
                          {r.unitOfMeasure ? (
                            <span className="ml-1 text-xs text-muted-foreground">
                              {r.unitOfMeasure}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-2 text-right font-medium tabular-nums">
                          {formatCurrency(r.revenue)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

/** Tarjeta pequeña de resumen (KPI) usada en las vistas previas. */
function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'ok' | 'warn';
}) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3">
      <p
        className={cn(
          'text-base font-bold tracking-tight',
          tone === 'ok' && 'text-emerald-600 dark:text-emerald-400',
          tone === 'warn' && 'text-amber-600 dark:text-amber-400',
        )}
      >
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
