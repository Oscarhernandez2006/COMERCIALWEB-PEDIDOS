import { CheckCircle2, XCircle } from 'lucide-react';
import {
  useOrderNotifications,
  useAcknowledgeNotification,
} from '@/hooks/useApi';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * Muestra un modal al vendedor cuando cartera aprueba o desaprueba alguno de
 * sus pedidos. Consulta los avisos pendientes en segundo plano y, al cerrarlos,
 * los marca como vistos.
 */
export function CarteraNotifications() {
  const { data: notifications = [] } = useOrderNotifications();
  const acknowledge = useAcknowledgeNotification();

  if (notifications.length === 0) return null;

  const order = notifications[0];
  // Tras aprobar en cartera, el pedido se sube al ERP y su estado pasa a
  // syncing/synced/failed (ya no queda en "confirmed"). Por eso un aviso es de
  // aprobación cuando el estado NO es desaprobado ni vencido.
  const disapproved = order.status === 'disapproved';
  const expired = order.status === 'expired';
  const approved = !disapproved && !expired;

  const handleClose = () => {
    acknowledge.mutate(order.id);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <div
            className={`mb-3 flex h-16 w-16 items-center justify-center rounded-full ${
              approved
                ? 'bg-[var(--success)]/10'
                : 'bg-destructive/10'
            }`}
          >
            {approved ? (
              <CheckCircle2 className="h-9 w-9 text-[var(--success)]" />
            ) : (
              <XCircle className="h-9 w-9 text-destructive" />
            )}
          </div>
          <h3 className="text-lg font-semibold">
            {approved
              ? 'Pedido aprobado por cartera'
              : expired
                ? 'Pedido vencido en cartera'
                : 'Pedido desaprobado por cartera'}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            El pedido #<span className="font-semibold">{order.orderNumber}</span>{' '}
            del cliente{' '}
            <span className="font-semibold">{order.customer.name}</span>{' '}
            {approved
              ? 'fue aprobado y quedó pendiente por envío a Siesa.'
              : expired
                ? 'no fue aprobado dentro de las 2 horas, por lo que venció y el inventario fue devuelto.'
                : 'fue desaprobado y se canceló. El inventario fue liberado.'}
          </p>
          <p className="mt-3 text-2xl font-bold tracking-tight">
            {formatCurrency(Number(order.total))}
          </p>
          {!approved && order.disapprovalReason && (
            <p className="mt-2 text-xs text-destructive">
              Motivo: {order.disapprovalReason}
            </p>
          )}
        </div>

        <div className="mt-6">
          <Button
            className="w-full"
            disabled={acknowledge.isPending}
            onClick={handleClose}
          >
            Entendido
          </Button>
        </div>

        {notifications.length > 1 && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Tienes {notifications.length - 1} aviso(s) más.
          </p>
        )}
      </div>
    </div>
  );
}
