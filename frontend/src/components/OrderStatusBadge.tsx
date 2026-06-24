import { Badge } from '@/components/ui/badge';
import type { OrderStatus } from '@/types';

const config: Record<
  OrderStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive';
    className?: string;
  }
> = {
  draft: { label: 'Borrador', variant: 'secondary' },
  pending_approval: {
    label: 'Pendiente por aprobación en cartera',
    variant: 'warning',
    // Amarillo
    className:
      'border-transparent bg-yellow-400/15 text-yellow-600 dark:text-yellow-400',
  },
  confirmed: {
    label: 'Pendiente por envío',
    variant: 'warning',
    // Naranja
    className:
      'border-transparent bg-orange-500/15 text-orange-600 dark:text-orange-400',
  },
  syncing: { label: 'Enviando', variant: 'warning' },
  synced: { label: 'Enviado a Siesa', variant: 'success' },
  failed: { label: 'Error', variant: 'destructive' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
  disapproved: { label: 'Desaprobado', variant: 'destructive' },
  expired: { label: 'Vencido', variant: 'destructive' },
  bounced: {
    label: 'Rebotado',
    variant: 'destructive',
    // Rosa/fucsia para distinguirlo de una anulación normal.
    className:
      'border-transparent bg-pink-500/15 text-pink-600 dark:text-pink-400',
  },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, variant, className } = config[status] ?? config.draft;
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
