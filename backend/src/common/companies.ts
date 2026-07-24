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
  { id: 'MTAT', name: 'MONTERIA TAT AGROPECUARIA' },
];

export const COMPANY_IDS = COMPANIES.map((c) => c.id);

export function isValidCompany(id: string | undefined): id is string {
  return !!id && COMPANY_IDS.includes(id);
}

/**
 * Compañías "virtuales": entornos propios en nuestro sistema (sus pedidos,
 * canales y presupuestos son independientes) pero que consultan el ERP/catálogo
 * de otra compañía real de Siesa. MONTERIA TAT usa el catálogo de AGROPECUARIA.
 */
export const SIESA_ID_BY_COMPANY: Record<string, string> = {
  '3': '3',
  '8': '8',
  MTAT: '3', // MONTERIA TAT AGROPECUARIA consulta el ERP/catálogo de AGROPECUARIA (3)
};

/**
 * Devuelve el id de compañía "base" (real en Siesa) para las consultas al ERP
 * y para leer el catálogo compartido (productos, clientes, listas de precios).
 * Para las compañías reales devuelve el mismo id; para las virtuales, su base.
 */
export function baseCompanyId(companyId: string): string {
  return SIESA_ID_BY_COMPANY[companyId] ?? companyId;
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
  return MIN_ORDER_TOTAL[baseCompanyId(companyId)] ?? 0;
}

/**
 * Bodega (almacén) que se envía al ERP por compañía. La referencia se despacha
 * desde la bodega configurada para cada compañía.
 */
export const WAREHOUSE_BY_COMPANY: Record<string, string> = {
  '3': '30103', // AGROPECUARIA
  '8': '80101', // CARNES FRIAS
};

/**
 * Devuelve la bodega del ERP para una compañía. Lanza si no está configurada,
 * para evitar enviar un pedido con una bodega inválida.
 */
export function getWarehouse(companyId: string): string {
  const warehouse = WAREHOUSE_BY_COMPANY[baseCompanyId(companyId)];
  if (!warehouse) {
    throw new Error(
      `La compañía ${companyId} no tiene una bodega configurada para enviar pedidos al ERP.`,
    );
  }
  return warehouse;
}

/**
 * Ruta (path) del endpoint del ERP para subir pedidos, por compañía. Cada
 * compañía tiene su propio endpoint (p. ej. `pedidos-agropecuaria`).
 */
export const ORDER_ENDPOINT_BY_COMPANY: Record<string, string> = {
  '3': 'ventas/pedidos-agropecuaria', // AGROPECUARIA
  '8': 'ventas/pedidos/carnesfrias', // CARNES FRIAS
  MTAT: 'ventas/pedidos-monteria', // MONTERIA TAT AGROPECUARIA
};

/**
 * Devuelve la ruta del endpoint de carga de pedidos del ERP para una compañía.
 * Lanza si no está configurada, para evitar subir el pedido a una ruta inválida.
 */
export function getOrderEndpoint(companyId: string): string {
  // El endpoint es propio de cada compañía (p. ej. MONTERIA TAT tiene el suyo);
  // si no hay uno específico, se usa el de su compañía base.
  const endpoint =
    ORDER_ENDPOINT_BY_COMPANY[companyId] ??
    ORDER_ENDPOINT_BY_COMPANY[baseCompanyId(companyId)];
  if (!endpoint) {
    throw new Error(
      `La compañía ${companyId} no tiene un endpoint configurado para enviar pedidos al ERP.`,
    );
  }
  return endpoint;
}

/**
 * Tipo de documento (TIPO_DOC) que identifica los pedidos de cada compañía en
 * Siesa. Se usa al consultar los estados; el consecutivo de este tipo de
 * documento coincide con nuestro `orderNumber`.
 */
export const ORDER_DOC_TYPE_BY_COMPANY: Record<string, string> = {
  '3': 'PVA', // AGROPECUARIA
  '8': 'PVA', // CARNES FRIAS
};

/** Tipo de documento de pedidos en Siesa para una compañía (por defecto PVA). */
export function getOrderDocType(companyId: string): string {
  return ORDER_DOC_TYPE_BY_COMPANY[baseCompanyId(companyId)] ?? 'PVA';
}
