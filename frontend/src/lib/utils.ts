import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Combina clases de Tailwind resolviendo conflictos. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatea un numero como moneda colombiana (COP). */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Formatea una fecha "YYYY-MM-DD" (o ISO) como "DD/MM/YYYY". */
export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

/**
 * Número(s) de pedido para mostrar. Los subproductos divididos tienen dos
 * consecutivos (uno por documento en Siesa); se muestran ambos ("3638 / 3735").
 */
export function orderNos(
  orderNumber: string,
  secondNumber?: string | null,
): string {
  return secondNumber ? `${orderNumber} / ${secondNumber}` : orderNumber;
}
