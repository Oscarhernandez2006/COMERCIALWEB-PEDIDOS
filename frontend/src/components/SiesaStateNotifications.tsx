import { PackageCheck } from 'lucide-react';
import {
  useSiesaStateNotifications,
  useAcknowledgeSiesaStateNotification,
} from '@/hooks/useApi';
import { Button } from '@/components/ui/button';

/** Color del círculo/ícono según el estado de Siesa. */
function toneFor(estado: string): { ring: string; text: string } {
  const e = estado.toLowerCase();
  if (e.includes('anulad') || e.includes('rebot'))
    return { ring: 'bg-destructive/10', text: 'text-destructive' };
  if (e.includes('cumplid'))
    return {
      ring: 'bg-[var(--success)]/10',
      text: 'text-[var(--success)]',
    };
  if (e.includes('retenid'))
    return {
      ring: 'bg-orange-500/10',
      text: 'text-orange-600 dark:text-orange-400',
    };
  return {
    ring: 'bg-sky-500/10',
    text: 'text-sky-600 dark:text-sky-400',
  };
}

/**
 * Muestra un modal al vendedor cada vez que uno de sus pedidos cambia de estado
 * en Siesa (En elaboración, Aprobado, Cumplido, Anulado, Retenido, Rebotado).
 * Consulta los avisos pendientes en segundo plano y, al cerrarlos, los marca
 * como vistos.
 */
export function SiesaStateNotifications() {
  const { data: notifications = [] } = useSiesaStateNotifications();
  const acknowledge = useAcknowledgeSiesaStateNotification();

  if (notifications.length === 0) return null;

  const order = notifications[0];
  const estado = order.siesaEstado ?? 'Actualizado';
  const previo = order.siesaStatePrevious;
  const tone = toneFor(estado);

  const handleClose = () => {
    acknowledge.mutate(order.id);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <div
            className={`mb-3 flex h-16 w-16 items-center justify-center rounded-full ${tone.ring}`}
          >
            <PackageCheck className={`h-9 w-9 ${tone.text}`} />
          </div>
          <h3 className="text-lg font-semibold">Cambio de estado en Siesa</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu pedido #
            <span className="font-semibold">{order.orderNumber}</span> del
            cliente{' '}
            <span className="font-semibold">{order.customer.name}</span>{' '}
            {previo ? (
              <>
                pasó de <span className="font-semibold">{previo}</span> a{' '}
              </>
            ) : (
              <>ahora está en </>
            )}
            <span className={`font-semibold ${tone.text}`}>{estado}</span>.
          </p>
          {(estado.toLowerCase().includes('anulad') ||
            estado.toLowerCase().includes('rebot')) && (
            <p className="mt-2 text-xs text-destructive">
              El pedido fue cancelado y el inventario se devolvió.
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
