import {
  useQuery,
  useQueries,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCompany } from '@/company/useCompany';
import type {
  CanalOrder,
  Client,
  ClientPortfolio,
  Customer,
  DeliverySchedule,
  DeliveryType,
  Order,
  Product,
  Quote,
  SellableProduct,
  SellerCommercialDashboard,
  SiesaState,
} from '@/types';

export function useProducts(search: string) {
  const { company } = useCompany();
  return useQuery({
    queryKey: ['products', company?.id, search],
    queryFn: async () => {
      const res = await api.get<Product[]>('/products', {
        params: search ? { search } : undefined,
      });
      return res.data;
    },
  });
}

/**
 * Tablero de gestión comercial del vendedor autenticado para un mes/año y,
 * opcionalmente, un día concreto (day > 0). La compañía se toma del contexto.
 */
export function useSellerDashboard(month: number, year: number, day = 0) {
  const { company } = useCompany();
  return useQuery({
    queryKey: ['dashboard', 'commercial', company?.id, month, year, day],
    queryFn: async () => {
      const res = await api.get<SellerCommercialDashboard>(
        '/dashboard/commercial',
        { params: day > 0 ? { month, year, day } : { month, year } },
      );
      return res.data;
    },
  });
}

/**
 * Catálogo de venta para un cliente: proviene de su lista de precios (cada
 * referencia trae precio y unidad de medida) cruzado con el stock del
 * inventario. Solo se ejecuta si hay lista.
 */
export function useProductsForList(
  search: string,
  priceList?: string | null,
  type?: string,
) {
  const { company } = useCompany();
  return useQuery({
    queryKey: ['products', 'by-list', company?.id, priceList, search, type],
    enabled: Boolean(priceList),
    queryFn: async () => {
      const res = await api.get<SellableProduct[]>('/products', {
        params: {
          priceList,
          ...(type ? { type } : {}),
          ...(search ? { search } : {}),
        },
      });
      return res.data;
    },
  });
}

/** Vendedor seleccionable (para la toma de subproductos). */
export interface SellerOption {
  id: string;
  name: string;
  documentId: string;
  siesaSellerCode: string;
}

/** Vendedores de la compañía con código de vendedor en Siesa. */
export function useSellers() {
  const { company } = useCompany();
  return useQuery({
    queryKey: ['sellers', company?.id],
    queryFn: async () => {
      const res = await api.get<SellerOption[]>('/orders/sellers');
      return res.data;
    },
  });
}

/**
 * Productos con existencias (stock > 0) de la compañía, sin importar lista de
 * precios: la disponibilidad real para la venta del día.
 */
export function useProductsInStock(search: string) {
  const { company } = useCompany();
  return useQuery({
    queryKey: ['products', 'in-stock', company?.id, search],
    queryFn: async () => {
      const res = await api.get<Product[]>('/products/stock', {
        params: search ? { search } : undefined,
      });
      return res.data;
    },
  });
}

/** Descarga el PDF de productos disponibles hoy (en stock) para clientes. */
export async function downloadStockPdf(): Promise<void> {
  const res = await api.get('/products/stock/pdf', { responseType: 'blob' });
  const today = new Date().toISOString().slice(0, 10);
  const url = window.URL.createObjectURL(res.data as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `disponibles-${today}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function useCustomers(search: string) {
  const { company } = useCompany();
  return useQuery({
    queryKey: ['customers', company?.id, search],
    queryFn: async () => {
      const res = await api.get<Customer[]>('/customers', {
        params: search ? { search } : undefined,
      });
      return res.data;
    },
  });
}

/** Clientes (módulo nuevo `clientes-por-cia`) para la toma de pedidos. */
export function useClients(search: string, sellerCode?: string) {
  const { company } = useCompany();
  return useQuery({
    queryKey: ['clients', company?.id, search, sellerCode ?? ''],
    queryFn: async () => {
      const res = await api.get<Client[]>('/clients', {
        params: {
          ...(search ? { search } : {}),
          ...(sellerCode ? { sellerCode } : {}),
        },
      });
      return res.data;
    },
  });
}

/**
 * Cartera (documentos por cobrar) de un cliente del vendedor, consultada en
 * vivo a Siesa. La compañía activa se inyecta automáticamente en la petición.
 */
export function useClientPortfolio(nit: string | null) {
  const { company } = useCompany();
  return useQuery({
    queryKey: ['portfolio', company?.id, nit],
    enabled: !!nit,
    queryFn: async () => {
      const res = await api.get<ClientPortfolio>('/clients/portfolio', {
        params: { nit },
      });
      return res.data;
    },
  });
}

/**
 * Cartera de varios clientes a la vez (una consulta por NIT, en paralelo).
 * Devuelve un mapa `nit -> saldo total` y el estado de carga global, útil para
 * ordenar a los clientes por deuda.
 */
export function useClientPortfolios(nits: string[]) {
  const { company } = useCompany();
  const results = useQueries({
    queries: nits.map((nit) => ({
      queryKey: ['portfolio', company?.id, nit],
      enabled: !!nit,
      queryFn: async () => {
        const res = await api.get<ClientPortfolio>('/clients/portfolio', {
          params: { nit },
        });
        return res.data;
      },
    })),
  });

  const balances: Record<string, number> = {};
  results.forEach((res, i) => {
    if (res.data) balances[nits[i]] = res.data.totalBalance;
  });
  const isLoading = results.some((res) => res.isLoading);

  const portfolios: Record<string, ClientPortfolio> = {};
  results.forEach((res, i) => {
    if (res.data) portfolios[nits[i]] = res.data;
  });

  return { balances, portfolios, isLoading };
}

export function useOrders() {
  const { company } = useCompany();
  return useQuery({
    queryKey: ['orders', company?.id],
    queryFn: async () => {
      const res = await api.get<Order[]>('/orders');
      return res.data;
    },
  });
}

/**
 * Estado real en Siesa de los pedidos del vendedor. Devuelve un mapa
 * `orderNumber -> { estado, facturado, despachado }` para trazabilidad.
 */
export function useSiesaStates() {
  const { company } = useCompany();
  return useQuery({
    queryKey: ['siesa-states', company?.id],
    queryFn: async () => {
      const res = await api.get<Record<string, SiesaState>>(
        '/orders/siesa-states',
      );
      return res.data;
    },
    // Refresco casi en vivo. El backend cachea la respuesta del ERP (TTL ~5s)
    // y deduplica las llamadas, así que este sondeo no golpea el ERP de más.
    refetchInterval: 5_000,
    // Solo sondea con la pestaña activa (no consume recursos en segundo plano).
    refetchIntervalInBackground: false,
    staleTime: 4_000,
  });
}

interface CreateOrderInput {
  customerId: string;
  notes?: string;
  logisticsNote?: string;
  deliveryType?: DeliveryType;
  deliverySchedule?: string;
  deliveryScheduleData?: DeliverySchedule;
  deliveryDate: string;
  items: { sku: string; quantity: number; discountPct: number }[];
  /** Tipo de pedido: 'corte' (por defecto) o 'subproducto'. */
  orderType?: 'corte' | 'subproducto';
  /** Vendedor al que se asocia el pedido (solo subproductos). */
  sellerId?: string;
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      const res = await api.post<Order>('/orders', input);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

/* ---- Pedidos de canales (recepción manual, no sube al ERP) ---- */

export function useCanalOrders(from?: string, to?: string) {
  const { company } = useCompany();
  return useQuery({
    queryKey: ['canal-orders', company?.id, from ?? '', to ?? ''],
    queryFn: async () => {
      const res = await api.get<CanalOrder[]>('/canal-orders', {
        params: from && to ? { from, to } : undefined,
      });
      return res.data;
    },
  });
}

export interface CreateCanalOrderInput {
  dispatchDate: string;
  clientCode: string;
  clientName: string;
  clientAddress?: string;
  clientCity?: string;
  items: {
    itemRef: string;
    itemName: string;
    especie: string;
    quantity: number;
    specifications?: string;
    price: number;
    freight?: number;
  }[];
}

export function useCreateCanalOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCanalOrderInput) => {
      const res = await api.post<CanalOrder>('/canal-orders', input);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['canal-orders'] }),
  });
}

interface UpdateOrderInput {
  orderId: string;
  notes?: string;
  logisticsNote?: string;
  deliveryType?: DeliveryType;
  deliveryDate?: string;
  items: { sku: string; quantity: number; discountPct: number }[];
}

/** Edita un pedido pendiente por envío (líneas, cantidades y notas). */
export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, ...input }: UpdateOrderInput) => {
      const res = await api.patch<Order>(`/orders/${orderId}`, input);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useSyncOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const res = await api.post<Order>(`/orders/${orderId}/sync`);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useConfirmOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const res = await api.post<Order>(`/orders/${orderId}/confirm`);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

/** Anula un pedido (devuelve el stock). Requiere un motivo. */
export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      reason,
    }: {
      orderId: string;
      reason: string;
    }) => {
      const res = await api.post<Order>(`/orders/${orderId}/cancel`, {
        reason,
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

/**
 * Avisos para el vendedor sobre decisiones de cartera (pedidos aprobados o
 * desaprobados). Se consulta periódicamente para mostrar el modal.
 */
export function useOrderNotifications() {
  return useQuery({
    queryKey: ['orders', 'notifications'],
    queryFn: async () => {
      const res = await api.get<Order[]>('/orders/notifications');
      return res.data;
    },
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });
}

/** Marca como visto un aviso de cartera (deja de aparecer en el modal). */
export function useAcknowledgeNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const res = await api.post(`/orders/${orderId}/acknowledge`, {});
      return res.data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['orders', 'notifications'] }),
  });
}

/**
 * Avisos de cambio de estado en Siesa de los pedidos del vendedor. Se consulta
 * periódicamente para mostrar el modal cada vez que un pedido cambia de estado.
 */
export function useSiesaStateNotifications() {
  return useQuery({
    queryKey: ['orders', 'siesa-state-notifications'],
    queryFn: async () => {
      const res = await api.get<Order[]>('/orders/siesa-state-notifications');
      return res.data;
    },
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });
}

/** Marca como visto un aviso de cambio de estado en Siesa. */
export function useAcknowledgeSiesaStateNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const res = await api.post(`/orders/${orderId}/siesa-state-ack`, {});
      return res.data;
    },
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ['orders', 'siesa-state-notifications'],
      }),
  });
}

/** Descarga el PDF (documento) de un pedido y lo abre como archivo. */
export async function downloadOrderPdf(
  orderId: string,
  orderNumber: string,
  companyId?: string,
): Promise<void> {
  const res = await api.get(`/orders/${orderId}/pdf`, {
    responseType: 'blob',
    ...(companyId ? { headers: { 'X-Company-Id': companyId } } : {}),
  });
  const url = window.URL.createObjectURL(res.data as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `pedido-${orderNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/** Cotizaciones del vendedor en la compañía activa. */
export function useQuotes() {
  const { company } = useCompany();
  return useQuery({
    queryKey: ['quotes', company?.id],
    queryFn: async () => {
      const res = await api.get<Quote[]>('/quotes');
      return res.data;
    },
  });
}

interface CreateQuoteInput {
  customerId: string;
  notes?: string;
  validityDays?: number;
  items: { sku: string; quantity: number; discountPct: number }[];
}

/** Crea una cotización (no afecta el inventario). */
export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateQuoteInput) => {
      const res = await api.post<Quote>('/quotes', input);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  });
}

/** Descarga el PDF (documento) de una cotización y lo abre como archivo. */
export async function downloadQuotePdf(
  quoteId: string,
  quoteNumber: string,
): Promise<void> {
  const res = await api.get(`/quotes/${quoteId}/pdf`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(res.data as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cotizacion-${quoteNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function useSyncProductsFromSiesa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<{ synced: number }>('/products/sync');
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useSyncCustomersFromSiesa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<{ synced: number }>('/customers/sync');
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}
