/**
 * Tipos de la respuesta cruda de Siesa. Ajusta segun tu instancia real.
 * Se mantienen separados de las entidades de dominio para aislar cambios.
 */
export interface SiesaCustomerRaw {
  f200_id?: string;
  f200_nit?: string;
  f200_razon_social?: string;
  f200_ind_estado?: string;
  direccion?: string;
  ciudad?: string;
  telefono?: string;
  email?: string;
  lista_precio?: string;
  cupo_credito?: number;
}

export interface SiesaProductRaw {
  f120_id?: string;
  f120_referencia?: string;
  f120_descripcion?: string;
  categoria?: string;
  unidad_medida?: string;
  precio?: number;
  iva?: number;
  existencia?: number;
  f120_ind_estado?: string;
}

export interface SiesaOrderLinePayload {
  itemSiesaId: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
}

export interface SiesaOrderPayload {
  companyId: string;
  customerSiesaId: string;
  sellerCode?: string;
  notes?: string;
  lines: SiesaOrderLinePayload[];
}

export interface SiesaOrderResponse {
  documentId: string;
  status: string;
}
