export type UserRole = 'admin' | 'seller' | 'cartera';

export interface Company {
  id: string;
  name: string;
}

export interface User {
  id: string;
  documentId: string;
  email?: string;
  name: string;
  role: UserRole;
  siesaSellerCode?: string;
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
}

export interface PortfolioDocument {
  branch: string;
  costCenter?: string;
  docType?: string;
  description?: string;
  documentNumber: number;
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
  | 'expired';

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
  deliverySchedule?: string;
  cancelReason?: string;
  carteraBalance?: number;
  approvalDeadline?: string;
  approvedAt?: string;
  approvedBy?: string;
  disapprovalReason?: string;
  sellerNotificationPending?: boolean;
  companyId?: string;
  siesaDocumentId?: string;
  syncError?: string;
  createdAt: string;
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

/** Corte de carga a Siesa (rango horario según hora de creación del pedido). */
export interface Corte {
  id: string;
  label: string;
  startHour: number;
  endHour: number;
}

/** Resultado de subir un lote de pedidos (un corte) a Siesa. */
export interface UploadBatchResult {
  total: number;
  uploaded: number;
  failed: number;
  errors: { orderNumber: string; message: string }[];
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

export interface UserCompanyAccess {
  companyId: string;
  name: string;
  siesaSellerCode?: string;
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
}
