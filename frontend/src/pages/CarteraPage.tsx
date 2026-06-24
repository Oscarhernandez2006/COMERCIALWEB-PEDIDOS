import { useState } from 'react';
import { Wallet, CheckCircle2, Ban, X, ClipboardList, Building2, Loader2 } from 'lucide-react';
import {
  useCarteraOrders,
  useApproveOrder,
  useDisapproveOrder,
  useClientPortfolio,
} from '@/hooks/useAdminApi';
import { formatCurrency } from '@/lib/utils';
import { COMPANIES } from '@/lib/companies';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ApprovalCountdown } from '@/components/ApprovalCountdown';
import type { Order } from '@/types';

function companyName(id?: string): string {
  return COMPANIES.find((c) => c.id === id)?.name ?? id ?? '—';
}

export function CarteraPage() {
  const { data: orders = [], isLoading } = useCarteraOrders();
  const approve = useApproveOrder();
  const disapprove = useDisapproveOrder();

  // Los pedidos pendientes se agrupan por compañía para gestionarlos
  // distribuidos y no todos mezclados.
  const groupedByCompany = COMPANIES.map((company) => ({
    companyId: company.id,
    name: company.name,
    orders: orders.filter((o) => o.companyId === company.id),
  })).filter((group) => group.orders.length > 0);

  const [detailTarget, setDetailTarget] = useState<Order | null>(null);
  const [portfolioTarget, setPortfolioTarget] = useState<Order | null>(null);
  const [approveTarget, setApproveTarget] = useState<Order | null>(null);
  const [approvedOrder, setApprovedOrder] = useState<Order | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState('');

  const confirmApprove = async () => {
    if (!approveTarget) return;
    setActionError('');
    try {
      await approve.mutateAsync(approveTarget.id);
      setApprovedOrder(approveTarget);
      setApproveTarget(null);
    } catch {
      setActionError('No se pudo aprobar el pedido. Intenta de nuevo.');
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    setActionError('');
    try {
      await disapprove.mutateAsync({
        id: rejectTarget.id,
        reason: rejectReason.trim() || undefined,
      });
      setRejectTarget(null);
      setRejectReason('');
    } catch {
      setActionError('No se pudo desaprobar el pedido. Intenta de nuevo.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Aprobación de cartera</h2>
        <p className="text-muted-foreground">
          Pedidos retenidos por deuda del cliente. Cada uno tiene 2 horas para
          ser aprobado o se desaprueba automáticamente y se libera el inventario.
        </p>
      </div>

      {actionError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {actionError}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No hay pedidos pendientes de aprobación.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {groupedByCompany.map(({ companyId, name, orders: companyOrders }) => (
            <div key={companyId} className="space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <Building2 className="h-5 w-5 text-primary" />
                  {name}
                </h3>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {companyOrders.length} pedido(s)
                </span>
              </div>
              {companyOrders.map((order) => (
            <Card key={order.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">Pedido #{order.orderNumber}</p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {companyName(order.companyId)}
                    </span>
                    <ApprovalCountdown deadline={order.approvalDeadline} />
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {order.customer.name} · {order.items.length} items
                  </p>
                  <p className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                    <Wallet className="h-3.5 w-3.5" />
                    Cartera pendiente: {formatCurrency(Number(order.carteraBalance ?? 0))}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-2 font-semibold">
                    {formatCurrency(Number(order.total))}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDetailTarget(order)}
                  >
                    Detalles
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPortfolioTarget(order)}
                  >
                    <Wallet className="h-4 w-4" />
                    Ver cartera
                  </Button>
                  <Button
                    size="sm"
                    disabled={approve.isPending}
                    onClick={() => setApproveTarget(order)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Aprobar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setRejectTarget(order);
                      setRejectReason('');
                    }}
                  >
                    <Ban className="h-4 w-4" />
                    Desaprobar
                  </Button>
                </div>
              </CardContent>
            </Card>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Modal de detalle */}
      {detailTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDetailTarget(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border p-5">
              <div>
                <h3 className="text-lg font-semibold">
                  Pedido #{detailTarget.orderNumber}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {detailTarget.customer.name} · {companyName(detailTarget.companyId)}
                </p>
              </div>
              <button
                onClick={() => setDetailTarget(null)}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Producto</th>
                    <th className="pb-2 text-right font-medium">Cant.</th>
                    <th className="pb-2 text-right font-medium">Precio</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detailTarget.items.map((item) => (
                    <tr key={item.id} className="border-b border-border/50">
                      <td className="py-2">{item.productName}</td>
                      <td className="py-2 text-right">{item.quantity}</td>
                      <td className="py-2 text-right">
                        {formatCurrency(Number(item.unitPrice))}
                      </td>
                      <td className="py-2 text-right">
                        {formatCurrency(Number(item.lineTotal))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal de cartera del cliente (documentos del ERP) */}
      {portfolioTarget && (
        <PortfolioModal
          order={portfolioTarget}
          onClose={() => setPortfolioTarget(null)}
        />
      )}

      {/* Modal de confirmación de aprobación */}
      {approveTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !approve.isPending && setApproveTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">Aprobar pedido</h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              ¿Estás seguro de que deseas aprobar el pedido{' '}
              <span className="font-semibold text-foreground">
                #{approveTarget.orderNumber}
              </span>{' '}
              de {approveTarget.customer.name}? El pedido quedará pendiente por
              envío a Siesa.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={approve.isPending}
                onClick={() => setApproveTarget(null)}
              >
                Cancelar
              </Button>
              <Button disabled={approve.isPending} onClick={confirmApprove}>
                {approve.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Aprobando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Confirmar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de éxito tras aprobar */}
      {approvedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setApprovedOrder(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-background p-6 text-center shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">
              Pedido aprobado exitosamente
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              El pedido{' '}
              <span className="font-semibold text-foreground">
                #{approvedOrder.orderNumber}
              </span>{' '}
              de {approvedOrder.customer.name} fue aprobado. El vendedor será
              notificado del cambio de estado.
            </p>
            <Button className="mt-5 w-full" onClick={() => setApprovedOrder(null)}>
              Entendido
            </Button>
          </div>
        </div>
      )}

      {/* Modal de desaprobación */}
      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setRejectTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">Desaprobar pedido</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Se liberará el inventario reservado del pedido{' '}
              #{rejectTarget.orderNumber}.
            </p>
            <label className="mt-4 block text-sm font-medium">
              Motivo (opcional)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Ej: Cliente con cartera vencida."
            />
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectTarget(null)}>
                Cancelar
              </Button>
              <Button
                className="text-destructive-foreground"
                variant="destructive"
                disabled={disapprove.isPending}
                onClick={confirmReject}
              >
                Desaprobar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Modal que consulta en vivo la cartera (documentos por cobrar) del cliente del
 * pedido, tal como la valida cartera desde el ERP.
 */
function PortfolioModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const { data, isLoading, isError } = useClientPortfolio(
    order.companyId ?? '',
    order.customer.code,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Wallet className="h-5 w-5" />
              Cartera del cliente
            </h3>
            <p className="text-sm text-muted-foreground">
              {order.customer.name} · NIT {order.customer.code}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Consultando cartera...</p>
          ) : isError ? (
            <p className="text-sm text-destructive">
              No se pudo consultar la cartera del cliente.
            </p>
          ) : !data || data.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              El cliente no registra documentos pendientes en cartera.
            </p>
          ) : (
            <>
              {/* Datos generales del cliente */}
              <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-border p-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">NIT</p>
                  <p className="font-medium">{data.nit}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Razón social</p>
                  <p className="font-medium">{data.name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Documentos</p>
                  <p className="font-medium">{data.count}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Saldo total</p>
                  <p className="font-bold text-destructive">
                    {formatCurrency(Number(data.totalBalance))}
                  </p>
                </div>
              </div>

              {/* Detalle completo de cada documento del endpoint */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="px-2 pb-2 font-medium">Documento</th>
                      <th className="px-2 pb-2 font-medium">Tipo</th>
                      <th className="px-2 pb-2 font-medium">Descripción</th>
                      <th className="px-2 pb-2 font-medium">Sucursal</th>
                      <th className="px-2 pb-2 font-medium">C.O.</th>
                      <th className="px-2 pb-2 text-right font-medium">Débito</th>
                      <th className="px-2 pb-2 text-right font-medium">Crédito</th>
                      <th className="px-2 pb-2 text-right font-medium">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.documents.map((doc, i) => (
                      <tr
                        key={`${doc.documentNumber}-${doc.branch}-${i}`}
                        className="border-b border-border/50"
                      >
                        <td className="px-2 py-2 font-medium">
                          {doc.documentNumber}
                        </td>
                        <td className="px-2 py-2 text-muted-foreground">
                          {doc.docType ?? '—'}
                        </td>
                        <td className="px-2 py-2 text-muted-foreground">
                          {doc.description ?? '—'}
                        </td>
                        <td className="px-2 py-2 text-muted-foreground">
                          {doc.branch}
                        </td>
                        <td className="px-2 py-2 text-muted-foreground">
                          {doc.costCenter ?? '—'}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {formatCurrency(Number(doc.debit))}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {formatCurrency(Number(doc.credit))}
                        </td>
                        <td className="px-2 py-2 text-right font-medium">
                          {formatCurrency(Number(doc.balance))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border font-semibold">
                      <td className="px-2 pt-2" colSpan={7}>
                        Total
                      </td>
                      <td className="px-2 pt-2 text-right text-destructive">
                        {formatCurrency(Number(data.totalBalance))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
