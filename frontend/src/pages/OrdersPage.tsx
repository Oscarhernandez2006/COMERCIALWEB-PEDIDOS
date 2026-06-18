import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ClipboardList, Download, Ban, Eye, X, Pencil } from 'lucide-react';
import {
  useOrders,
  useCancelOrder,
  downloadOrderPdf,
} from '@/hooks/useApi';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { ApprovalCountdown } from '@/components/ApprovalCountdown';
import { EditOrderModal } from '@/components/EditOrderModal';
import type { Order } from '@/types';

/** Motivos de anulación más frecuentes para seleccionar sin digitar. */
const CANCEL_REASONS = [
  'El cliente canceló el pedido',
  'Error al digitar el pedido',
  'Producto sin disponibilidad',
  'El cliente no recibe en este momento',
  'Pedido duplicado',
  'Cambio en la lista de precios',
] as const;

const OTHER_REASON = 'Otro';

export function OrdersPage() {
  const { data: orders = [], isLoading } = useOrders();
  const cancelMutation = useCancelOrder();

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [detailTarget, setDetailTarget] = useState<Order | null>(null);
  const [editTarget, setEditTarget] = useState<Order | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelOption, setCancelOption] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const handleDownload = async (order: Order) => {
    setDownloadingId(order.id);
    try {
      await downloadOrderPdf(order.id, order.orderNumber);
    } finally {
      setDownloadingId(null);
    }
  };

  const openCancel = (order: Order) => {
    setCancelTarget(order);
    setCancelOption('');
    setCancelReason('');
    setCancelError('');
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    if (!cancelOption) {
      setCancelError('Selecciona un motivo de la anulación.');
      return;
    }
    const reason =
      cancelOption === OTHER_REASON ? cancelReason.trim() : cancelOption;
    if (!reason) {
      setCancelError('Redacta lo sucedido para anular el pedido.');
      return;
    }
    try {
      await cancelMutation.mutateAsync({
        orderId: cancelTarget.id,
        reason,
      });
      setCancelTarget(null);
    } catch {
      setCancelError('No se pudo anular el pedido. Intenta de nuevo.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pedidos</h2>
          <p className="text-muted-foreground">
            Gestiona y sincroniza tus pedidos con Siesa.
          </p>
        </div>
        <Button asChild>
          <Link to="/pedidos/nuevo">
            <Plus className="h-4 w-4" />
            Nuevo
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aun no tienes pedidos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const canCancel =
              order.status !== 'cancelled' && order.status !== 'synced';
            const canEdit =
              order.status === 'confirmed' || order.status === 'failed';
            return (
              <Card key={order.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{order.orderNumber}</p>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {order.customer.name} · {order.items.length} items
                    </p>
                    {order.syncError && (
                      <p className="mt-1 text-xs text-destructive">
                        {order.syncError}
                      </p>
                    )}
                    {order.status === 'pending_approval' && (
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Retenido por cartera. Tiempo restante:
                        </span>
                        <ApprovalCountdown deadline={order.approvalDeadline} />
                      </div>
                    )}
                    {order.status === 'disapproved' && order.disapprovalReason && (
                      <p className="mt-1 text-xs text-destructive">
                        Desaprobado: {order.disapprovalReason}
                      </p>
                    )}
                    {order.status === 'expired' && (
                      <p className="mt-1 text-xs text-destructive">
                        Vencido: {order.disapprovalReason ??
                          'No se aprobó dentro de las 2 horas. El inventario fue devuelto.'}
                      </p>
                    )}
                    {order.status === 'cancelled' && order.cancelReason && (
                      <p className="mt-1 text-xs text-destructive">
                        Anulado: {order.cancelReason}
                      </p>
                    )}
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
                      <Eye className="h-4 w-4" />
                      Detalles
                    </Button>

                    {canEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditTarget(order)}
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={downloadingId === order.id}
                      onClick={() => handleDownload(order)}
                    >
                      <Download className="h-4 w-4" />
                      Documento
                    </Button>

                    {canCancel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => openCancel(order)}
                      >
                        <Ban className="h-4 w-4" />
                        Anular
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de detalle del pedido */}
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
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">
                    Pedido {detailTarget.orderNumber}
                  </h3>
                  <OrderStatusBadge status={detailTarget.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date(detailTarget.createdAt).toLocaleString('es-CO')}
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

            <div className="flex-1 space-y-5 overflow-auto p-5">
              {/* Datos del cliente */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="font-semibold leading-tight">
                  {detailTarget.customer.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  NIT {detailTarget.customer.code}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    Sucursal:{' '}
                    <span className="font-medium text-[var(--success)]">
                      {detailTarget.customer.branchName ||
                        detailTarget.customer.branch ||
                        '—'}
                    </span>
                    {detailTarget.customer.branchName &&
                    detailTarget.customer.branch
                      ? ` (${detailTarget.customer.branch})`
                      : ''}
                  </span>
                  <span>
                    Lista de precios:{' '}
                    <span className="font-medium text-[var(--success)]">
                      {detailTarget.customer.priceListName ||
                        detailTarget.customer.priceList ||
                        '—'}
                    </span>
                  </span>
                  <span>
                    Cond. pago:{' '}
                    <span className="font-medium text-[var(--success)]">
                      {detailTarget.customer.paymentTerm || '—'}
                    </span>
                  </span>
                  <span>
                    Vendedor:{' '}
                    <span className="font-medium text-[var(--success)]">
                      {detailTarget.customer.sellerName ||
                        detailTarget.customer.sellerCode ||
                        '—'}
                    </span>
                    {detailTarget.customer.sellerName &&
                    detailTarget.customer.sellerCode
                      ? ` (${detailTarget.customer.sellerCode})`
                      : ''}
                  </span>
                  {detailTarget.customer.address && (
                    <span>
                      Dirección:{' '}
                      <span className="font-medium text-[var(--success)]">
                        {detailTarget.customer.address}
                      </span>
                    </span>
                  )}
                  {(detailTarget.customer.neighborhood ||
                    detailTarget.customer.city ||
                    detailTarget.customer.department) && (
                    <span>
                      Ubicación:{' '}
                      <span className="font-medium text-[var(--success)]">
                        {[
                          detailTarget.customer.neighborhood,
                          detailTarget.customer.city,
                          detailTarget.customer.department,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </span>
                  )}
                  {detailTarget.customer.phone && (
                    <span>
                      Teléfono:{' '}
                      <span className="font-medium text-[var(--success)]">
                        {detailTarget.customer.phone}
                      </span>
                    </span>
                  )}
                  {detailTarget.customer.email && (
                    <span>
                      Email:{' '}
                      <span className="font-medium text-[var(--success)]">
                        {detailTarget.customer.email}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Productos */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Producto</th>
                      <th className="py-2 pr-3 text-center font-medium">UM</th>
                      <th className="py-2 pr-3 text-right font-medium">Cant.</th>
                      <th className="py-2 pr-3 text-right font-medium">Precio</th>
                      <th className="py-2 pr-3 text-right font-medium">Dto.</th>
                      <th className="py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailTarget.items.map((item) => (
                      <tr key={item.id} className="border-b border-border/50">
                        <td className="py-2 pr-3">
                          <p className="font-medium">{item.productName}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {item.sku}
                          </p>
                        </td>
                        <td className="py-2 pr-3 text-center text-muted-foreground">
                          {item.unitOfMeasure || '—'}
                        </td>
                        <td className="py-2 pr-3 text-right">{item.quantity}</td>
                        <td className="py-2 pr-3 text-right">
                          {formatCurrency(Number(item.unitPrice))}
                        </td>
                        <td className="py-2 pr-3 text-right text-muted-foreground">
                          {Number(item.discountPct)}%
                        </td>
                        <td className="py-2 text-right font-medium">
                          {formatCurrency(Number(item.lineTotal))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {detailTarget.notes && (
                <div className="rounded-lg border border-border p-3 text-sm">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Notas
                  </p>
                  <p className="mt-1">{detailTarget.notes}</p>
                </div>
              )}

              {detailTarget.deliverySchedule && (
                <div className="rounded-lg border border-border p-3 text-sm">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Horario de recibido de pedidos
                  </p>
                  <p className="mt-1">{detailTarget.deliverySchedule}</p>
                </div>
              )}

              {detailTarget.status === 'cancelled' &&
                detailTarget.cancelReason && (
                  <p className="text-sm text-destructive">
                    Anulado: {detailTarget.cancelReason}
                  </p>
                )}

              {/* Totales */}
              <div className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(Number(detailTarget.subtotal))}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Impuestos</span>
                  <span>{formatCurrency(Number(detailTarget.taxes))}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(Number(detailTarget.total))}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border p-4">
              <Button
                variant="outline"
                disabled={downloadingId === detailTarget.id}
                onClick={() => handleDownload(detailTarget)}
              >
                <Download className="h-4 w-4" />
                Documento
              </Button>
              <Button onClick={() => setDetailTarget(null)}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición del pedido */}
      {editTarget && (
        <EditOrderModal
          order={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Modal de anulación */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-lg">
            <h3 className="text-lg font-semibold">
              Anular pedido {cancelTarget.orderNumber}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Esta acción devuelve el stock de los productos al inventario.
              Indica el motivo de la anulación.
            </p>

            <div className="mt-4 space-y-2">
              {CANCEL_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => {
                    setCancelOption(reason);
                    setCancelError('');
                  }}
                  className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    cancelOption === reason
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-input hover:bg-muted'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      cancelOption === reason
                        ? 'border-primary'
                        : 'border-muted-foreground/40'
                    }`}
                  >
                    {cancelOption === reason && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </span>
                  {reason}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setCancelOption(OTHER_REASON);
                  setCancelError('');
                }}
                className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  cancelOption === OTHER_REASON
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-input hover:bg-muted'
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    cancelOption === OTHER_REASON
                      ? 'border-primary'
                      : 'border-muted-foreground/40'
                  }`}
                >
                  {cancelOption === OTHER_REASON && (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </span>
                Otro
              </button>
            </div>

            {cancelOption === OTHER_REASON && (
              <div className="mt-3">
                <label className="mb-1 block text-sm font-medium">
                  Redacta lo sucedido
                </label>
                <textarea
                  autoFocus
                  value={cancelReason}
                  onChange={(e) => {
                    setCancelReason(e.target.value);
                    setCancelError('');
                  }}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Describe lo que sucedió..."
                />
              </div>
            )}

            {cancelError && (
              <p className="mt-2 text-xs text-destructive">{cancelError}</p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setCancelTarget(null)}
                disabled={cancelMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmCancel}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? 'Anulando...' : 'Anular pedido'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
