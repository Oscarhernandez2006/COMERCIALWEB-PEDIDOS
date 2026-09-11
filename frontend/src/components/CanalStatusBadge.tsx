import type { CanalOrderStatus } from '@/types';
import { cn } from '@/lib/utils';

/** Etiqueta y color por estado del flujo de canales. */
const STATUS_META: Record<
  CanalOrderStatus,
  { label: string; className: string }
> = {
  pending_control: {
    label: 'Pendiente control',
    className:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  pending_cartera: {
    label: 'Pendiente cartera',
    className:
      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  rejected: {
    label: 'Rechazado cartera',
    className:
      'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  },
  pending_dispatch: {
    label: 'Pendiente despacho',
    className:
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  },
  dispatched: {
    label: 'Despachado',
    className:
      'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  },
  syncing: {
    label: 'Enviando a Siesa',
    className:
      'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  },
  synced: {
    label: 'Enviado a Siesa',
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  failed: {
    label: 'Falló Siesa',
    className:
      'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  },
  cancelled: {
    label: 'Anulado',
    className: 'bg-muted text-muted-foreground',
  },
};

export function CanalStatusBadge({ status }: { status: CanalOrderStatus }) {
  const meta = STATUS_META[status] ?? {
    label: status,
    className: 'bg-muted text-muted-foreground',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}
