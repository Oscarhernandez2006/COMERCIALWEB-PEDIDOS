/**
 * Compañías del negocio. Cada compañía es un "tenant" aislado:
 * vendedores, códigos, clientes, productos y pedidos son independientes.
 * El id corresponde al ID de compañía en Siesa.
 */
export interface Company {
  id: string;
  name: string;
}

export const COMPANIES: Company[] = [
  { id: '3', name: 'AGROPECUARIA' },
  { id: '8', name: 'CARNES FRIAS' },
  { id: '4', name: 'CARNES SANTACRUZ' },
];

export const COMPANY_IDS = COMPANIES.map((c) => c.id);

export function isValidCompany(id: string | undefined): id is string {
  return !!id && COMPANY_IDS.includes(id);
}

/**
 * Monto mínimo (en pesos) para poder realizar un pedido, por compañía.
 * Las compañías sin tope definido no tienen mínimo (0).
 */
export const MIN_ORDER_TOTAL: Record<string, number> = {
  '3': 150000, // AGROPECUARIA
  '8': 50000, // CARNES FRIAS
};

/** Devuelve el monto mínimo de pedido de una compañía (0 si no tiene tope). */
export function getMinOrderTotal(companyId: string): number {
  return MIN_ORDER_TOTAL[companyId] ?? 0;
}
