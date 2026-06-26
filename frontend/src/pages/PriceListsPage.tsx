import { useEffect, useMemo, useState } from 'react';
import {
  Tags,
  RefreshCw,
  Check,
  AlertCircle,
  Search,
  Building2,
  ChevronRight,
  ChevronLeft,
  Printer,
} from 'lucide-react';
import { isAxiosError } from 'axios';
import {
  usePriceLists,
  usePriceListItems,
  useSyncPriceLists,
  downloadPriceListPdf,
} from '@/hooks/useAdminApi';
import { COMPANIES } from '@/lib/companies';
import { formatCurrency, cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

/** Extrae el mensaje de error que envía el backend, si lo hay. */
function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return 'No se pudo completar la operación.';
}

const LISTS_PER_PAGE = 5;
const ITEMS_PER_PAGE = 10;

export function PriceListsPage() {
  const [companyId, setCompanyId] = useState(COMPANIES[0].id);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [listPage, setListPage] = useState(1);
  const [itemPage, setItemPage] = useState(1);
  const [printing, setPrinting] = useState(false);

  const { data: lists = [], isLoading: loadingLists } =
    usePriceLists(companyId);
  const { data: items = [], isLoading: loadingItems } = usePriceListItems(
    companyId,
    selectedList,
    search,
  );
  const syncPriceLists = useSyncPriceLists();

  const company = COMPANIES.find((c) => c.id === companyId)!;
  const currentList = lists.find((l) => l.listCode === selectedList);

  // Listas filtradas por el buscador (nombre o código).
  const filteredLists = useMemo(() => {
    const term = listSearch.trim().toLowerCase();
    if (!term) return lists;
    return lists.filter(
      (l) =>
        l.listName.toLowerCase().includes(term) ||
        l.listCode.toLowerCase().includes(term),
    );
  }, [lists, listSearch]);

  const listTotalPages = Math.max(
    1,
    Math.ceil(filteredLists.length / LISTS_PER_PAGE),
  );
  const pagedLists = filteredLists.slice(
    (listPage - 1) * LISTS_PER_PAGE,
    listPage * LISTS_PER_PAGE,
  );

  const itemTotalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const pagedItems = items.slice(
    (itemPage - 1) * ITEMS_PER_PAGE,
    itemPage * ITEMS_PER_PAGE,
  );

  // Volver a la primera página cuando cambian los filtros o los datos.
  useEffect(() => {
    setListPage(1);
  }, [listSearch, companyId]);
  useEffect(() => {
    setItemPage(1);
  }, [search, selectedList, companyId]);

  function handleCompany(id: string) {
    setCompanyId(id);
    setSelectedList(null);
    setSearch('');
    setListSearch('');
  }

  function handleSync() {
    syncPriceLists.mutate(companyId);
  }

  async function handlePrint() {
    if (!selectedList) return;
    setPrinting(true);
    try {
      await downloadPriceListPdf(companyId, selectedList);
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Listas de precios</h2>
        <p className="text-muted-foreground">
          Listas de precios sincronizadas desde Siesa. Cada lista se asigna a
          los clientes según su tipo.
        </p>
      </div>

      {/* Selector de compañía */}
      <div className="flex flex-wrap gap-2">
        {COMPANIES.map((c) => (
          <button
            key={c.id}
            onClick={() => handleCompany(c.id)}
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

      {/* Acción de sincronización */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Tags className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Listas de precios · {company.name}</p>
              <p className="text-xs text-muted-foreground">
                La sincronización trae los cambios desde Siesa y actualiza la
                base de datos.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            disabled={syncPriceLists.isPending}
            onClick={handleSync}
          >
            <RefreshCw
              className={cn(
                'h-4 w-4',
                syncPriceLists.isPending && 'animate-spin',
              )}
            />
            {syncPriceLists.isPending ? 'Sincronizando…' : 'Sincronizar'}
          </Button>
        </CardContent>
      </Card>

      {/* Resultado de la sincronización */}
      {syncPriceLists.isSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          <Check className="h-4 w-4" />
          <span>
            {syncPriceLists.data.lists} listas ·{' '}
            {syncPriceLists.data.created} nuevas ·{' '}
            {syncPriceLists.data.updated} actualizadas ·{' '}
            {syncPriceLists.data.removed} eliminadas.
          </span>
        </div>
      )}
      {syncPriceLists.isError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{getErrorMessage(syncPriceLists.error)}</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Listado de listas */}
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle className="text-base">
              Listas ({filteredLists.length})
            </CardTitle>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Buscar lista…"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {loadingLists ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Cargando…
              </p>
            ) : lists.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No hay listas. Sincroniza desde Siesa.
              </p>
            ) : filteredLists.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Sin resultados para “{listSearch}”.
              </p>
            ) : (
              pagedLists.map((l) => (
                <button
                  key={l.listCode}
                  onClick={() => setSelectedList(l.listCode)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                    selectedList === l.listCode
                      ? 'border-primary bg-primary/10'
                      : 'border-transparent hover:bg-accent',
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{l.listName}</p>
                    <p className="text-xs text-muted-foreground">
                      #{l.listCode} · {l.itemCount} productos
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))
            )}

            {filteredLists.length > LISTS_PER_PAGE && (
              <div className="flex items-center justify-between gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={listPage <= 1}
                  onClick={() => setListPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <span className="text-xs text-muted-foreground">
                  {listPage} / {listTotalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={listPage >= listTotalPages}
                  onClick={() =>
                    setListPage((p) => Math.min(listTotalPages, p + 1))
                  }
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ítems de la lista seleccionada */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-base">
              {currentList ? currentList.listName : 'Selecciona una lista'}
            </CardTitle>
            {selectedList && (
              <div className="flex w-full max-w-xl items-center gap-2">
                <div className="relative w-full max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="Buscar producto o referencia…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  className="shrink-0 whitespace-nowrap"
                  onClick={handlePrint}
                  disabled={printing}
                >
                  <Printer className="h-4 w-4" />
                  {printing ? 'Generando…' : 'Imprimir lista de precios'}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!selectedList ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Elige una lista para ver sus productos y precios.
              </p>
            ) : loadingItems ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Cargando productos…
              </p>
            ) : items.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Sin resultados.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-2 py-2 font-medium">Referencia</th>
                      <th className="px-2 py-2 font-medium">Producto</th>
                      <th className="px-2 py-2 font-medium">U.M.</th>
                      <th className="px-2 py-2 text-right font-medium">
                        Precio
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedItems.map((it) => (
                      <tr key={it.id} className="border-b last:border-0">
                        <td className="px-2 py-2 font-mono text-xs">
                          {it.reference}
                        </td>
                        <td className="px-2 py-2">{it.productName}</td>
                        <td className="px-2 py-2">
                          {it.unitOfMeasure ? (
                            <Badge variant="secondary">{it.unitOfMeasure}</Badge>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-2 py-2 text-right font-medium">
                          {formatCurrency(Number(it.price))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex items-center justify-between gap-2 pt-3">
                  <span className="text-xs text-muted-foreground">
                    {items.length} producto{items.length === 1 ? '' : 's'}
                    {items.length === 500 && ' (máx.)'}
                  </span>
                  {items.length > ITEMS_PER_PAGE && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={itemPage <= 1}
                        onClick={() => setItemPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {itemPage} / {itemTotalPages}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={itemPage >= itemTotalPages}
                        onClick={() =>
                          setItemPage((p) => Math.min(itemTotalPages, p + 1))
                        }
                      >
                        Siguiente
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
