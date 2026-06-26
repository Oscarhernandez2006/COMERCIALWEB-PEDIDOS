import { useState } from 'react';
import {
  FileBarChart,
  Building2,
  Calendar,
  Download,
  Package,
  AlertCircle,
  ShoppingCart,
} from 'lucide-react';
import { isAxiosError } from 'axios';
import {
  downloadInventoryReport,
  downloadProductSalesReport,
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
import { Input } from '@/components/ui/input';

/** Fecha de hoy en formato YYYY-MM-DD (hora local del navegador). */
function todayStr(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function ReportsPage() {
  const [companyId, setCompanyId] = useState(COMPANIES[0].id);
  const [date, setDate] = useState(todayStr());
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  // Reporte de productos vendidos por compañía (rango de fechas).
  const [salesFrom, setSalesFrom] = useState(todayStr());
  const [salesTo, setSalesTo] = useState(todayStr());
  const [downloadingSales, setDownloadingSales] = useState(false);
  const [salesError, setSalesError] = useState('');

  const company = COMPANIES.find((c) => c.id === companyId)!;

  async function handleDownload() {
    setDownloading(true);
    setError('');
    try {
      await downloadInventoryReport(companyId, date || undefined);
    } catch (err) {
      if (isAxiosError(err)) {
        const msg = err.response?.data?.message;
        setError(
          (Array.isArray(msg) ? msg.join(', ') : msg) ||
            'No se pudo generar el reporte.',
        );
      } else {
        setError('No se pudo generar el reporte.');
      }
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadSales() {
    if (salesFrom && salesTo && salesFrom > salesTo) {
      setSalesError('La fecha inicial no puede ser mayor que la final.');
      return;
    }
    setDownloadingSales(true);
    setSalesError('');
    try {
      await downloadProductSalesReport(
        salesFrom || undefined,
        salesTo || undefined,
      );
    } catch (err) {
      if (isAxiosError(err)) {
        const msg = err.response?.data?.message;
        setSalesError(
          (Array.isArray(msg) ? msg.join(', ') : msg) ||
            'No se pudo generar el reporte.',
        );
      } else {
        setSalesError('No se pudo generar el reporte.');
      }
    } finally {
      setDownloadingSales(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reportes</h2>
        <p className="text-muted-foreground">
          Genera reportes en PDF del negocio.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileBarChart className="h-5 w-5" />
            </span>
            Resumen de inventario por día
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            <Package className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Por cada referencia muestra lo <strong>vendido</strong> en el día,
              el <strong>stock que queda</strong> y si tiene o no existencias.
              Incluye totales de referencias con y sin stock.
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

          <div className="flex items-center gap-3">
            <Button onClick={handleDownload} disabled={downloading}>
              <Download className={cn('h-4 w-4', downloading && 'animate-pulse')} />
              {downloading ? 'Generando...' : 'Descargar PDF'}
            </Button>
            <span className="text-xs text-muted-foreground">
              {company.name} · {date || 'hoy'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShoppingCart className="h-5 w-5" />
            </span>
            Productos vendidos por compañía
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            <Package className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Un solo PDF <strong>dividido por compañía</strong>: por cada
              producto vendido en el rango de fechas muestra la{' '}
              <strong>cantidad vendida</strong> y los{' '}
              <strong>ingresos</strong> (precio × cantidad). Por defecto el día
              de hoy.
            </span>
          </p>

          {/* Rango de fechas */}
          <div className="grid gap-3 sm:grid-cols-2 max-w-md">
            <div className="space-y-2">
              <label className="text-sm font-medium">Desde</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="date"
                  value={salesFrom}
                  max={salesTo || todayStr()}
                  onChange={(e) => setSalesFrom(e.target.value)}
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
                  value={salesTo}
                  max={todayStr()}
                  onChange={(e) => setSalesTo(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {salesError && (
            <p className="flex items-center gap-1 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {salesError}
            </p>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={handleDownloadSales} disabled={downloadingSales}>
              <Download
                className={cn('h-4 w-4', downloadingSales && 'animate-pulse')}
              />
              {downloadingSales ? 'Generando...' : 'Descargar PDF'}
            </Button>
            <span className="text-xs text-muted-foreground">
              {salesFrom === salesTo
                ? salesFrom || 'hoy'
                : `${salesFrom} a ${salesTo}`}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
