import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  RefreshCw,
  Check,
  AlertCircle,
  Search,
  Building2,
  ChevronRight,
  ChevronLeft,
  Mail,
  Phone,
  Wallet,
  X,
} from 'lucide-react';
import { isAxiosError } from 'axios';
import { useClients, useSyncClients, useClientPortfolio } from '@/hooks/useAdminApi';
import { COMPANIES } from '@/lib/companies';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { Client } from '@/types';

/** Extrae el mensaje de error que envía el backend, si lo hay. */
function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return 'No se pudo completar la operación.';
}

const CLIENTS_PER_PAGE = 10;

export function ClientsPage() {
  const [companyId, setCompanyId] = useState(COMPANIES[0].id);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [portfolioClient, setPortfolioClient] = useState<Client | null>(null);

  const { data: clients = [], isLoading } = useClients(companyId, search);
  const syncClients = useSyncClients();

  const company = COMPANIES.find((c) => c.id === companyId)!;

  const totalPages = Math.max(1, Math.ceil(clients.length / CLIENTS_PER_PAGE));
  const pagedClients = useMemo(
    () =>
      clients.slice((page - 1) * CLIENTS_PER_PAGE, page * CLIENTS_PER_PAGE),
    [clients, page],
  );

  // Volver a la primera página cuando cambian los filtros o los datos.
  useEffect(() => {
    setPage(1);
  }, [search, companyId]);

  function handleCompany(id: string) {
    setCompanyId(id);
    setSearch('');
  }

  function handleSync() {
    syncClients.mutate(companyId);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Clientes</h2>
        <p className="text-muted-foreground">
          Clientes sincronizados desde Siesa. Incluye lista de precios,
          condición de pago y vendedor asignado.
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
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Clientes · {company.name}</p>
              <p className="text-xs text-muted-foreground">
                La sincronización trae los cambios desde Siesa y actualiza la
                base de datos.
              </p>
            </div>
          </div>
          <Button size="sm" disabled={syncClients.isPending} onClick={handleSync}>
            <RefreshCw
              className={cn('h-4 w-4', syncClients.isPending && 'animate-spin')}
            />
            {syncClients.isPending ? 'Sincronizando…' : 'Sincronizar'}
          </Button>
        </CardContent>
      </Card>

      {/* Resultado de la sincronización */}
      {syncClients.isSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          <Check className="h-4 w-4" />
          <span>
            {syncClients.data.total} clientes · {syncClients.data.created} nuevos
            · {syncClients.data.updated} actualizados ·{' '}
            {syncClients.data.removed} eliminados.
          </span>
        </div>
      )}
      {syncClients.isError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{getErrorMessage(syncClients.error)}</span>
        </div>
      )}

      {/* Listado de clientes */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <CardTitle className="text-base">
            Clientes ({clients.length}
            {clients.length === 500 && '+'})
          </CardTitle>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Buscar por nombre, código o vendedor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Cargando clientes…
            </p>
          ) : clients.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {search
                ? 'Sin resultados.'
                : 'No hay clientes. Sincroniza desde Siesa.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Código</th>
                    <th className="px-2 py-2 font-medium">Cliente</th>
                    <th className="px-2 py-2 font-medium">Sucursal</th>
                    <th className="px-2 py-2 font-medium">Lista</th>
                    <th className="px-2 py-2 font-medium">Cond. pago</th>
                    <th className="px-2 py-2 font-medium">Vendedor</th>
                    <th className="px-2 py-2 font-medium">Contacto</th>
                    <th className="px-2 py-2 font-medium">Cartera</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedClients.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 align-top">
                      <td className="px-2 py-2 font-mono text-xs">{c.code}</td>
                      <td className="px-2 py-2">
                        <p className="font-medium">{c.name}</p>
                        {c.address && (
                          <p className="text-xs text-muted-foreground">
                            {c.address}
                          </p>
                        )}
                        {(c.neighborhood || c.city || c.department) && (
                          <p className="text-xs text-muted-foreground">
                            {[c.neighborhood, c.city, c.department]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                        )}
                      </td>
                      <td className="px-2 py-2 text-xs">
                        {c.branchName || c.branch ? (
                          <span>
                            <span className="font-medium text-[var(--success)]">
                              {c.branchName || c.branch}
                            </span>
                            {c.branchName && c.branch ? (
                              <span className="font-mono text-muted-foreground">
                                {' '}
                                ({c.branch})
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {c.priceList ? (
                          <Badge variant="secondary">
                            {c.priceListName || c.priceList}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-2 py-2 font-medium text-[var(--success)]">
                        {c.paymentTerm ?? '—'}
                      </td>
                      <td className="px-2 py-2 text-xs">
                        {c.sellerName || c.sellerCode ? (
                          <span>
                            <span className="font-medium text-[var(--success)]">
                              {c.sellerName || c.sellerCode}
                            </span>
                            {c.sellerName && c.sellerCode ? (
                              <span className="font-mono text-muted-foreground">
                                {' '}
                                ({c.sellerCode})
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <div className="space-y-0.5 text-xs">
                          {c.phone && (
                            <p className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {c.phone}
                            </p>
                          )}
                          {c.email && (
                            <p className="flex items-center gap-1 break-all">
                              <Mail className="h-3 w-3 shrink-0 text-muted-foreground" />
                              {c.email}
                            </p>
                          )}
                          {!c.phone && !c.email && '—'}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPortfolioClient(c)}
                        >
                          <Wallet className="h-4 w-4" />
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex items-center justify-between gap-2 pt-3">
                <span className="text-xs text-muted-foreground">
                  {clients.length} cliente{clients.length === 1 ? '' : 's'}
                  {clients.length === 500 && ' (máx., refina la búsqueda)'}
                </span>
                {clients.length > CLIENTS_PER_PAGE && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {page} / {totalPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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

      {portfolioClient && (
        <PortfolioModal
          companyId={companyId}
          client={portfolioClient}
          onClose={() => setPortfolioClient(null)}
        />
      )}
    </div>
  );
}

/** Modal con la cartera (documentos por cobrar) de un cliente. */
function PortfolioModal({
  companyId,
  client,
  onClose,
}: {
  companyId: string;
  client: Client;
  onClose: () => void;
}) {
  const { data, isLoading, isError, error } = useClientPortfolio(
    companyId,
    client.code.trim(),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <Card
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-start justify-between space-y-0 border-b">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-5 w-5 text-primary" />
              Cartera · {client.name}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              NIT/Código {client.code.trim()}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Consultando cartera…
            </p>
          ) : isError ? (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{getErrorMessage(error)}</span>
            </div>
          ) : !data || data.documents.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              El cliente no tiene documentos pendientes en cartera.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
                <span className="text-sm font-medium text-primary">
                  Saldo total pendiente ({data.count} documento
                  {data.count === 1 ? '' : 's'})
                </span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(data.totalBalance)}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-2 py-2 font-medium">Documento</th>
                      <th className="px-2 py-2 font-medium">Tipo</th>
                      <th className="px-2 py-2 font-medium">Fecha factura</th>
                      <th className="px-2 py-2 font-medium">Vence</th>
                      <th className="px-2 py-2 font-medium">Sucursal</th>
                      <th className="px-2 py-2 text-right font-medium">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.documents.map((d, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-2 py-2 font-mono text-xs">
                          {d.documentNumber}
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {d.description || d.docType || '—'}
                        </td>
                        <td className="px-2 py-2 text-xs whitespace-nowrap">
                          {formatDate(d.invoiceDate)}
                        </td>
                        <td className="px-2 py-2 text-xs whitespace-nowrap">
                          {formatDate(d.dueDate)}
                        </td>
                        <td className="px-2 py-2 text-xs">{d.branch}</td>
                        <td className="px-2 py-2 text-right font-medium">
                          {formatCurrency(d.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
