import type { Company } from '@/types';

/**
 * Compañías del negocio (mismo catálogo que el backend).
 * Cada compañía es un entorno aislado.
 */
export const COMPANIES: Company[] = [
  { id: '3', name: 'AGROPECUARIA' },
  { id: '8', name: 'CARNES FRIAS' },
  { id: '4', name: 'CARNES SANTACRUZ' },
];

/**
 * Monto mínimo (en pesos) para poder realizar un pedido, por compañía.
 * Las compañías sin tope definido no tienen mínimo (0).
 */
export const MIN_ORDER_TOTAL: Record<string, number> = {
  '3': 150000, // AGROPECUARIA
  '8': 50000, // CARNES FRIAS
};

/** Devuelve el monto mínimo de pedido de una compañía (0 si no tiene tope). */
export function getMinOrderTotal(companyId?: string): number {
  return (companyId && MIN_ORDER_TOTAL[companyId]) || 0;
}
