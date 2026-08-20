import { useEffect, useMemo, useState } from 'react';
import { Coins, Save, Check, RefreshCw, Plus, Trash2, Search } from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { useCompany } from '@/company/useCompany';
import { useProductCosts, useSaveProductCosts } from '@/hooks/useAdminApi';
import { COMPANIES } from '@/lib/companies';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CostDraft {
  productRef: string;
  name: string;
  unitCost: string;
}

/** Solo dígitos y un punto decimal (mismo formato que SIGCOM). */
function cleanNumber(value: string): string {
  let clean = value.replace(/[^\d.]/g, '');
  const firstDot = clean.indexOf('.');
  if (firstDot !== -1) {
    clean =
      clean.slice(0, firstDot + 1) +
      clean.slice(firstDot + 1).replace(/\./g, '');
  }
  return clean;
}

/**
 * Carga de costos estándar por producto (referencia + costo por kilo). Con
 * estos costos el tablero calcula la rentabilidad (venta − costo) de cada
 * vendedor. Aislado por compañía.
 */
export function RentabilidadPage() {
  const { user } = useAuth();
  const { companies: myCompanies } = useCompany();
  const isAdmin = user?.role === 'admin';

  const availableCompanies = useMemo(() => {
    if (isAdmin) return COMPANIES;
    return COMPANIES.filter((c) =>
      myCompanies.some(
        (mc) =>
          mc.id === c.id &&
          (mc.permissions ?? []).includes('/admin/rentabilidad'),
      ),
    );
  }, [isAdmin, myCompanies]);

  const [companyId, setCompanyId] = useState(
    () => availableCompanies[0]?.id ?? '',
  );
  useEffect(() => {
    if (!companyId && availableCompanies[0]) {
      setCompanyId(availableCompanies[0].id);
    }
  }, [availableCompanies, companyId]);

  const { data, isLoading, isFetching, refetch } = useProductCosts(companyId);
  const saveMutation = useSaveProductCosts();

  const [rows, setRows] = useState<CostDraft[]>([]);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!data) return;
    setRows(
      data.map((c) => ({
        productRef: c.productRef,
        name: c.name ?? '',
        unitCost: c.unitCost ? String(c.unitCost) : '',
      })),
    );
    setSaved(false);
  }, [data]);

  const setField = (idx: number, field: keyof CostDraft, value: string) => {
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx
          ? {
              ...r,
              [field]: field === 'unitCost' ? cleanNumber(value) : value,
            }
          : r,
      ),
    );
    setSaved(false);
  };

  const addRow = () =>
    setRows((prev) => [...prev, { productRef: '', name: '', unitCost: '' }]);

  const removeRow = (idx: number) =>
    setRows((prev) => prev.filter((_, i) => i !== idx));

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const indexed = rows.map((r, idx) => ({ r, idx }));
    if (!q) return indexed;
    return indexed.filter(
      ({ r }) =>
        r.productRef.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const handleSave = async () => {
    const items = rows
      .filter((r) => r.productRef.trim())
      .map((r) => ({
        productRef: r.productRef.trim(),
        name: r.name.trim() || undefined,
        unitCost: Number(r.unitCost || 0),
      }));
    await saveMutation.mutateAsync({ companyId, items });
    setSaved(true);
  };

  const companyName =
    availableCompanies.find((c) => c.id === companyId)?.name ?? '';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Coins className="h-6 w-6 text-primary" />
            Rentabilidad · Costos estándar
          </h2>
          <p className="text-muted-foreground">
            Costo por kilo de cada producto (referencia) · {companyName}. Con
            esto el tablero calcula la rentabilidad (venta − costo).
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            Costos ({visibleRows.length}
            {search ? ` de ${rows.length}` : ''})
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar referencia o nombre…"
                className="h-9 w-56 rounded-md border border-input bg-background pl-8 pr-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <Button size="sm" variant="outline" onClick={addRow}>
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!companyId || saveMutation.isPending}
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
                  <th className="px-4 py-2 font-medium">Referencia</th>
                  <th className="px-4 py-2 font-medium">Nombre (opcional)</th>
                  <th className="px-4 py-2 text-right font-medium">
                    Costo por kilo
                  </th>
                  <th className="px-4 py-2" />
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
                  visibleRows.map(({ r, idx }) => (
                    <tr key={idx} className="hover:bg-muted/40">
                      <td className="px-4 py-2">
                        <input
                          value={r.productRef}
                          onChange={(e) =>
                            setField(idx, 'productRef', e.target.value)
                          }
                          placeholder="Ref."
                          className="w-28 rounded-md border border-input bg-background px-2 py-1 outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={r.name}
                          onChange={(e) => setField(idx, 'name', e.target.value)}
                          placeholder="Nombre del producto"
                          className="w-full min-w-48 rounded-md border border-input bg-background px-2 py-1 outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          inputMode="numeric"
                          value={r.unitCost}
                          onChange={(e) =>
                            setField(idx, 'unitCost', e.target.value)
                          }
                          placeholder="0"
                          className="w-32 rounded-md border border-input bg-background px-2 py-1 text-right tabular-nums outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => removeRow(idx)}
                          className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
                        ? 'Ninguna referencia coincide.'
                        : 'Aún no hay costos cargados. Usa “Agregar”.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
