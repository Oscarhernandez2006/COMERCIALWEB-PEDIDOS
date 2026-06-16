import { Badge } from '@/components/ui/badge';
import type { OrderStatus } from '@/types';

const config: Record<
  OrderStatus,
  { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' }
> = {
  draft: { label: 'Borrador', variant: 'secondary' },
  confirmed: { label: 'Pendiente por envío', variant: 'warning' },
  syncing: { label: 'Enviando', variant: 'warning' },
  synced: { label: 'Cargado en Siesa', variant: 'success' },
  failed: { label: 'Error', variant: 'destructive' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, variant } = config[status];
  return <Badge variant={variant}>{label}</Badge>;
}
