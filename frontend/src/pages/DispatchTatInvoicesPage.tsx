import { useEffect, useMemo, useState } from 'react';
import {
  Truck,
  Check,
  RefreshCw,
  Search,
  AlertCircle,
  Calendar,
  Save,
  Send,
} from 'lucide-react';
import { useCompany } from '@/company/useCompany';
import {
  useTatInvoices,
  useSyncTatInvoices,
  useSaveTatDispatchSelection,
  usePublishTatDispatch,
} from '@/hooks/useAdminApi';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/** Fecha local de hoy en formato YYYY-MM-DD. */
function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

/** Formatea kilos con miles y hasta 2 decimales. */
function formatKg(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Despacho · Drivin TAT Facturas.
 *
 * Sincroniza desde Siesa las facturas TAT de una fecha (y los 5 días previos),
 * las lista y permite seleccionar por consecutivo cuáles se despachan en Drivin.
 * La selección se guarda en la base de datos.
 */
export function DispatchTatInvoicesPage() {
  // El módulo trabaja SIEMPRE con la compañía activa del switcher superior.
  const { company } = useCompany();
  const companyId = company?.id ?? '';
  const companyName = company?.name ?? '';

  const [date, setDate] = useState(() => todayISO());

  const { data, isLoading, error } = useTatInvoices(companyId);
  const syncMutation = useSyncTatInvoices();
  const saveMutation = useSaveTatDispatchSelection();
  const publishMutation = usePublishTatDispatch();

  // Selección local por consecutivo (se inicializa con lo guardado en BD).
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  // Facturas ya seleccionadas que el buscador intenta re-marcar: se pregunta
  // en un modal si se desean desmarcar.
  const [confirmUnselect, setConfirmUnselect] = useState<string[] | null>(null);

  useEffect(() => {
    if (!data) return;
    setSelected(
      new Set(data.filter((i) => i.selected).map((i) => i.invoiceNumber)),
    );
  }, [data]);

  const invoices = data ?? [];

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = !q
      ? invoices
      : invoices.filter(
          (i) =>
            i.invoiceNumber.toLowerCase().includes(q) ||
            i.clientName.toLowerCase().includes(q) ||
            i.clientCode.toLowerCase().includes(q) ||
            (i.branchName ?? '').toLowerCase().includes(q) ||
            (i.tipoComercial ?? '').toLowerCase().includes(q),
        );
    // Las seleccionadas van al inicio; el resto conserva el orden por fecha.
    return [...filtered].sort((a, b) => {
      const sa = selected.has(a.invoiceNumber) ? 0 : 1;
      const sb = selected.has(b.invoiceNumber) ? 0 : 1;
      return sa - sb;
    });
  }, [invoices, search, selected]);

  // Autoguardado: persiste de inmediato en la BD el estado de las facturas
  // indicadas, para no perder la selección ante un refresco o corte de red.
  const persist = (items: { invoiceNumber: string; selected: boolean }[]) => {
    if (!companyId || items.length === 0) return;
    saveMutation.mutate({ companyId, items });
  };

  const toggle = (number: string) => {
    const value = !selected.has(number);
    setSelected((prev) => {
      const next = new Set(prev);
      if (value) next.add(number);
      else next.delete(number);
      return next;
    });
    persist([{ invoiceNumber: number, selected: value }]);
  };

  const allVisibleSelected =
    visible.length > 0 && visible.every((i) => selected.has(i.invoiceNumber));

  const toggleAllVisible = () => {
    const value = !allVisibleSelected;
    setSelected((prev) => {
      const next = new Set(prev);
      visible.forEach((i) =>
        value ? next.add(i.invoiceNumber) : next.delete(i.invoiceNumber),
      );
      return next;
    });
    persist(
      visible.map((i) => ({ invoiceNumber: i.invoiceNumber, selected: value })),
    );
  };

  const handleSync = async () => {
    await syncMutation.mutateAsync({ companyId, date });
  };

  // Enter en el buscador: marca las facturas filtradas y limpia el buscador
  // para escribir el siguiente consecutivo.
  const handleSearchEnter = () => {
    if (visible.length === 0) return;
    // Si TODAS las facturas filtradas ya están seleccionadas, se pregunta en un
    // modal si se desean desmarcar (evita re-marcar sin querer una repetida).
    const allSelected = visible.every((i) => selected.has(i.invoiceNumber));
    if (allSelected) {
      setConfirmUnselect(visible.map((i) => i.invoiceNumber));
      return;
    }
    const toAdd = visible.filter((i) => !selected.has(i.invoiceNumber));
    setSelected((prev) => {
      const next = new Set(prev);
      toAdd.forEach((i) => next.add(i.invoiceNumber));
      return next;
    });
    persist(
      toAdd.map((i) => ({ invoiceNumber: i.invoiceNumber, selected: true })),
    );
    setSearch('');
  };

  // Respuesta del modal de confirmación: desmarca (Sí) o mantiene (No), y en
  // ambos casos limpia el buscador para continuar con la siguiente.
  const resolveUnselect = (unselect: boolean) => {
    if (unselect && confirmUnselect) {
      const numbers = confirmUnselect;
      setSelected((prev) => {
        const next = new Set(prev);
        numbers.forEach((n) => next.delete(n));
        return next;
      });
      persist(numbers.map((n) => ({ invoiceNumber: n, selected: false })));
    }
    setConfirmUnselect(null);
    setSearch('');
  };

  const notConfigured =
    (error as { response?: { status?: number } } | null)?.response?.status ===
    503;

  const selectedTotal = useMemo(
    () =>
      invoices
        .filter((i) => selected.has(i.invoiceNumber))
        .reduce((s, i) => s + Number(i.subtotal), 0),
    [invoices, selected],
  );

  // Facturas publicadas (las que viajan por el endpoint) y si el borrador tiene
  // cambios sin publicar respecto a lo publicado.
  const publishedSet = useMemo(
    () =>
      new Set(invoices.filter((i) => i.published).map((i) => i.invoiceNumber)),
    [invoices],
  );
  const hasUnpublishedChanges = useMemo(() => {
    if (selected.size !== publishedSet.size) return true;
    for (const n of selected) if (!publishedSet.has(n)) return true;
    return false;
  }, [selected, publishedSet]);

  const handlePublish = async () => {
    // El borrador debe estar persistido antes de publicar (autoguardado en
    // curso): se envía el estado actual y luego se publica.
    if (saveMutation.isPending) {
      await saveMutation.mutateAsync({
        companyId,
        items: invoices.map((i) => ({
          invoiceNumber: i.invoiceNumber,
          selected: selected.has(i.invoiceNumber),
        })),
      });
    }
    await publishMutation.mutateAsync({ companyId });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Truck className="h-6 w-6 text-primary" />
          Despacho · Drivin TAT Facturas
        </h2>
        <p className="text-muted-foreground">
          Facturas TAT de Siesa · {companyName}. El marcado se autoguarda como
          borrador; pulsa <span className="font-medium">Guardar</span> para que
          las facturas marcadas viajen por el endpoint.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Compañía
            </label>
            <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-medium">
              {companyName || '—'}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Fecha (hasta)
            </label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 rounded-md border border-input bg-background pl-8 pr-2 text-sm"
              />
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleSync}
            disabled={syncMutation.isPending || !date}
          >
            <RefreshCw
              className={cn('h-4 w-4', syncMutation.isPending && 'animate-spin')}
            />
            {syncMutation.isPending ? 'Sincronizando…' : 'Sincronizar'}
          </Button>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-sm text-muted-foreground">
                Marcadas:{' '}
                <span className="font-semibold text-foreground">
                  {selected.size}
                </span>{' '}
                · {formatCurrency(selectedTotal)}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                {saveMutation.isPending ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Guardando borrador…
                  </>
                ) : saveMutation.isError ? (
                  <span className="text-destructive">
                    Error al guardar, reintenta
                  </span>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 text-muted-foreground" />
                    Borrador guardado
                  </>
                )}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Button
                onClick={handlePublish}
                disabled={publishMutation.isPending || invoices.length === 0}
                className={cn(
                  hasUnpublishedChanges &&
                    'ring-2 ring-primary/40 ring-offset-2 ring-offset-background',
                )}
              >
                {publishMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : hasUnpublishedChanges ? (
                  <Send className="h-4 w-4" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {publishMutation.isPending
                  ? 'Guardando…'
                  : hasUnpublishedChanges
                    ? 'Guardar'
                    : 'Guardado'}
              </Button>
              <span className="text-xs text-muted-foreground">
                {publishedSet.size} publicada
                {publishedSet.size !== 1 ? 's' : ''}
                {hasUnpublishedChanges && (
                  <span className="ml-1 text-amber-600 dark:text-amber-400">
                    · cambios sin guardar
                  </span>
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {notConfigured ? (
        <Card>
          <CardContent className="flex items-start gap-3 p-6 text-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="font-medium">
                El endpoint de facturas TAT no está configurado.
              </p>
              <p className="text-muted-foreground">
                Define <code>DISPATCH_TAT_INVOICES_URL</code> y su token en el
                <code> .env</code> del backend.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">
              Facturas ({visible.length}
              {search ? ` de ${invoices.length}` : ''})
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchEnter();
                  }
                }}
                placeholder="Buscar consecutivo, cliente, tipo..."
                className="h-9 w-72 rounded-md border border-input bg-background pl-8 pr-2 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-6 text-sm text-muted-foreground">Cargando…</p>
            ) : invoices.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No hay facturas. Elige una fecha y pulsa «Sincronizar».
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="w-10 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleAllVisible}
                          aria-label="Seleccionar todas"
                        />
                      </th>
                      <th className="px-3 py-2">Consecutivo</th>
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2">Cliente</th>
                      <th className="px-3 py-2">Sucursal</th>
                      <th className="px-3 py-2">Tipo</th>
                      <th className="px-3 py-2 text-right">Kilos</th>
                      <th className="px-3 py-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((inv) => {
                      const isSel = selected.has(inv.invoiceNumber);
                      return (
                        <tr
                          key={inv.invoiceNumber}
                          className={cn(
                            'cursor-pointer border-b border-border/60 hover:bg-accent/40',
                            isSel && 'bg-primary/5',
                          )}
                          onClick={() => toggle(inv.invoiceNumber)}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={isSel}
                              onChange={() => toggle(inv.invoiceNumber)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Seleccionar factura ${inv.invoiceNumber}`}
                            />
                          </td>
                          <td className="px-3 py-2 font-medium">
                            {inv.invoiceNumber}
                          </td>
                          <td className="px-3 py-2">{inv.documentDate}</td>
                          <td className="px-3 py-2">
                            <div className="font-medium">{inv.clientName}</div>
                            <div className="text-xs text-muted-foreground">
                              {inv.clientCode}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="text-xs font-medium">
                              {inv.branchName || '—'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {[inv.branchCode, inv.branchAddress]
                                .filter(Boolean)
                                .join(' · ') || '—'}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {inv.tipoComercial ?? '—'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatKg(Number(inv.quantity))}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatCurrency(Number(inv.subtotal))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {confirmUnselect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-base">
                Factura ya seleccionada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {confirmUnselect.length === 1 ? (
                  <>
                    La factura{' '}
                    <span className="font-semibold text-foreground">
                      {confirmUnselect[0]}
                    </span>{' '}
                    ya está seleccionada. ¿Deseas desmarcarla?
                  </>
                ) : (
                  <>
                    Las{' '}
                    <span className="font-semibold text-foreground">
                      {confirmUnselect.length}
                    </span>{' '}
                    facturas filtradas ya están seleccionadas. ¿Deseas
                    desmarcarlas?
                  </>
                )}
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resolveUnselect(false)}
                >
                  No
                </Button>
                <Button size="sm" onClick={() => resolveUnselect(true)}>
                  Sí, desmarcar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
