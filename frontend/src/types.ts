export type UserRole = 'admin' | 'seller' | 'cartera' | 'alistador';

export interface Company {
  id: string;
  name: string;
  /** Módulos que el usuario puede ver en esta compañía (vacío = todos los de su rol). */
  permissions?: string[];
}

export interface User {
  id: string;
  documentId: string;
  email?: string;
  name: string;
  role: UserRole;
  siesaSellerCode?: string;
  permissions?: string[];
}

export interface Customer {
  id: string;
  siesaId: string;
  nit: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  priceList?: string;
  creditLimit: number;
  active: boolean;
}

/** Cliente sincronizado desde el endpoint `clientes-por-cia`. */
export interface Client {
  id: string;
  code: string;
  name: string;
  branch: string;
  branchName?: string;
  priceList?: string;
  priceListName?: string;
  paymentTerm?: string;
  sellerCode?: string;
  sellerName?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  department?: string;
  phone?: string;
  email?: string;
  /** Horario de recibido de mercancía predeterminado del cliente. */
  deliverySchedule?: DeliverySchedule;
}

/**
 * Horario de recibido de mercancía: días seleccionados (0=Lunes … 6=Domingo)
 * y rango de horas en formato "HH:mm".
 */
export interface DeliverySchedule {
  days: number[];
  hourFrom: string;
  hourTo: string;
}

/** Tipo de entrega del pedido. */
export type DeliveryType = 'despacho' | 'recoge_en_planta';

export interface PortfolioDocument {
  branch: string;
  costCenter?: string;
  docType?: string;
  description?: string;
  documentNumber: number;
  invoiceDate?: string;
  dueDate?: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface ClientPortfolio {
  nit: string;
  name?: string;
  count: number;
  totalBalance: number;
  documents: PortfolioDocument[];
}

export interface Product {
  id: string;
  siesaId: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unitOfMeasure?: string;
  basePrice: number;
  taxRate: number;
  stock: number;
  active: boolean;
  /** Precio resuelto desde la lista de precios del cliente (si aplica). */
  price?: number | null;
}

/**
 * Producto vendible para un cliente: proviene de su lista de precios (siempre
 * con precio y unidad de medida) y trae el stock del inventario.
 */
export interface SellableProduct {
  sku: string;
  name: string;
  price: number;
  unitOfMeasure?: string;
  stock: number;
  /** Tasa de IVA (%) del producto. El IVA se agrega solo para mostrarlo. */
  taxRate: number;
}

export type OrderStatus =
  | 'draft'
  | 'pending_approval'
  | 'confirmed'
  | 'syncing'
  | 'synced'
  | 'failed'
  | 'cancelled'
  | 'disapproved'
  | 'expired'
  | 'bounced';

export interface OrderItem {
  id: string;
  product?: Product | null;
  sku: string;
  productName: string;
  unitOfMeasure?: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  taxRate: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: Client;
  seller: User;
  items: OrderItem[];
  status: OrderStatus;
  subtotal: number;
  taxes: number;
  total: number;
  notes?: string;
  logisticsNote?: string;
  deliveryType?: DeliveryType;
  deliverySchedule?: string;
  deliveryDate?: string;
  cancelReason?: string;
  carteraBalance?: number;
  approvalDeadline?: string;
  approvedAt?: string;
  approvedBy?: string;
  disapprovalReason?: string;
  sellerNotificationPending?: boolean;
  companyId?: string;
  siesaDocumentId?: string;
  siesaEstado?: string;
  siesaStatePrevious?: string;
  siesaStateNotificationPending?: boolean;
  syncError?: string;
  createdAt: string;
}

/** Trazabilidad de un pedido en Siesa (estado, facturado y despachado). */
export interface SiesaState {
  estado: string;
  facturado: boolean;
  despachado: boolean;
}

/** Línea de un ítem dentro de una cotización. */
export interface QuoteItem {
  id: string;
  sku: string;
  productName: string;
  unitOfMeasure?: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  taxRate: number;
  lineTotal: number;
}

/** Cotización de venta (informativa, no afecta el inventario). */
export interface Quote {
  id: string;
  quoteNumber: string;
  customer: Client;
  seller: User;
  items: QuoteItem[];
  subtotal: number;
  taxes: number;
  total: number;
  notes?: string;
  validityDays: number;
  validUntil?: string;
  companyId?: string;
  createdAt: string;
}

export interface CartLine {
  product: SellableProduct;
  quantity: number;
  discountPct: number;
  /** Precio unitario resuelto desde la lista del cliente. */
  unitPrice: number;
}

/* ---- Administración ---- */

export interface AdminDashboardStats {
  totals: {
    revenue: number;
    orders: number;
    customers: number;
    products: number;
    pendingOrders: number;
    avgTicket: number;
  };
  ordersByStatus: { status: OrderStatus; count: number }[];
  byCompany: {
    companyId: string;
    name: string;
    revenue: number;
    orders: number;
    customers: number;
    products: number;
  }[];
  salesTrend: { date: string; revenue: number; orders: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  topCustomers: { name: string; orders: number; revenue: number }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    companyId: string;
    total: number;
    status: OrderStatus;
    createdAt: string;
  }[];
}

/** Métricas de una compañía dentro del dashboard gerencial (rango de fechas). */
export interface ManagerialCompanyStats {
  companyId: string;
  name: string;
  totals: {
    revenue: number;
    orders: number;
    units: number;
    avgTicket: number;
    customers: number;
  };
  salesTrend: { date: string; revenue: number; orders: number }[];
  ordersByStatus: { status: OrderStatus; count: number }[];
  topProducts: {
    sku: string;
    name: string;
    quantity: number;
    revenue: number;
  }[];
  topCustomers: {
    name: string;
    code: string;
    orders: number;
    revenue: number;
  }[];
}

/** Dashboard gerencial: mismas métricas divididas por compañía y por rango. */
export interface ManagerialDashboardStats {
  from: string;
  to: string;
  companies: ManagerialCompanyStats[];
}

/** Una fila del reporte de inventario por día (un producto). */
export interface InventoryReportRow {
  sku: string;
  name: string;
  unitOfMeasure?: string;
  sold: number;
  stock: number;
}

/** Datos del reporte de inventario por día (para previsualizar). */
export interface InventoryReportData {
  companyId: string;
  date: string;
  rows: InventoryReportRow[];
  summary: {
    totalRefs: number;
    refsWithStock: number;
    refsWithoutStock: number;
    totalSold: number;
    totalStock: number;
  };
}

/** Una fila del reporte de productos vendidos (un producto). */
export interface ProductSalesRow {
  sku: string;
  name: string;
  unitOfMeasure?: string;
  quantity: number;
  revenue: number;
}

/** Sección de una compañía dentro del reporte de productos vendidos. */
export interface ProductSalesCompany {
  companyId: string;
  companyName: string;
  rows: ProductSalesRow[];
  summary: {
    totalProducts: number;
    totalQuantity: number;
    totalRevenue: number;
  };
}

/** Datos del reporte de productos vendidos divididos por compañía. */
export interface ProductSalesReportData {
  from: string;
  to: string;
  companies: ProductSalesCompany[];
}

/** Fila del resumen de ventas por cliente o por producto. */
export interface SalesSummaryRow {
  reference: string;
  name: string;
  unitOfMeasure?: string;
  orders?: number;
  units: number;
  revenue: number;
}

/** Datos del resumen de ventas por cliente o por producto. */
export interface SalesSummaryReportData {
  from: string;
  to: string;
  companyId: string;
  companyName: string;
  groupBy: 'customer' | 'product';
  rows: SalesSummaryRow[];
  summary: {
    totalRows: number;
    totalOrders: number;
    totalUnits: number;
    totalRevenue: number;
  };
}

/** Fila del ranking de vendedores. */
export interface SellerRankingRow {
  position: number;
  name: string;
  documentId?: string;
  sellerCode?: string;
  orders: number;
  units: number;
  revenue: number;
}

/** Datos del ranking de vendedores. */
export interface SellerRankingReportData {
  from: string;
  to: string;
  companyId: string;
  companyName: string;
  rows: SellerRankingRow[];
  summary: {
    totalSellers: number;
    totalOrders: number;
    totalUnits: number;
    totalRevenue: number;
  };
}

/** Fila del reporte vendedor–producto. */
export interface SellerProductRow {
  sellerId: string;
  sellerName: string;
  documentId?: string;
  sellerCode?: string;
  sku: string;
  productName: string;
  unitOfMeasure?: string;
  quantity: number;
  revenue: number;
}

/** Datos del reporte vendedor–producto. */
export interface SellerProductReportData {
  from: string;
  to: string;
  companyId: string;
  companyName: string;
  sellerName?: string;
  search?: string;
  productName?: string;
  sellers: { id: string; name: string }[];
  products: { sku: string; name: string }[];
  rows: SellerProductRow[];
  summary: {
    totalRows: number;
    totalQuantity: number;
    totalRevenue: number;
  };
}

/** Fila del reporte mejor-vendedor-por-producto. */
export interface ProductSellerRow {
  sku: string;
  productName: string;
  unitOfMeasure?: string;
  position: number;
  isTop: boolean;
  sellerId: string;
  sellerName: string;
  documentId?: string;
  sellerCode?: string;
  quantity: number;
  revenue: number;
}

/** Datos del reporte mejor-vendedor-por-producto. */
export interface ProductSellerReportData {
  from: string;
  to: string;
  companyId: string;
  companyName: string;
  search?: string;
  productName?: string;
  products: { sku: string; name: string }[];
  rows: ProductSellerRow[];
  summary: {
    totalProducts: number;
    totalQuantity: number;
    totalRevenue: number;
  };
}

export interface UserCompanyAccess {
  companyId: string;
  name: string;
  siesaSellerCode?: string;
  /** Módulos visibles del usuario en esta compañía (vacío = todos los de su rol). */
  permissions: string[];
}

export interface AdminUser {
  id: string;
  documentId: string;
  email?: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  companies: UserCompanyAccess[];
  permissions: string[];
}
