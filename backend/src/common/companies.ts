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
