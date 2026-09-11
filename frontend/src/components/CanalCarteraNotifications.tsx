import { CheckCircle2, XCircle } from 'lucide-react';
import {
  useCanalOrderNotifications,
  useAcknowledgeCanalNotification,
} from '@/hooks/useApi';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * Aviso al vendedor cuando cartera autoriza o rechaza uno de sus pedidos de
 * canales. Consulta los avisos pendientes en segundo plano y, al cerrarlos, los
 * marca como vistos.
 */
export function CanalCarteraNotifications() {
  const { data: notifications = [] } = useCanalOrderNotifications();
  const acknowledge = useAcknowledgeCanalNotification();

  if (notifications.length === 0) return null;

  const order = notifications[0];
  const rejected = order.status === 'rejected';
  const approved = !rejected;

  const handleClose = () => {
    acknowledge.mutate(order.id);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <div
            className={`mb-3 flex h-16 w-16 items-center justify-center rounded-full ${
              approved ? 'bg-[var(--success)]/10' : 'bg-destructive/10'
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
              ? 'Pedido de canales aprobado por cartera'
              : 'Pedido de canales rechazado por cartera'}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            El pedido #<span className="font-semibold">{order.orderNumber}</span>{' '}
            del cliente{' '}
            <span className="font-semibold">{order.clientName}</span>{' '}
            {approved
              ? 'fue autorizado y pasó a despacho.'
              : 'no fue autorizado por cupo y quedó detenido.'}
          </p>
          <p className="mt-3 text-2xl font-bold tracking-tight">
            {formatCurrency(Number(order.totalValue))}
          </p>
          {rejected && order.rejectionReason && (
            <p className="mt-2 text-xs text-destructive">
              Motivo: {order.rejectionReason}
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
