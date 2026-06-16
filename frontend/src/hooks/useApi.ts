import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCompany } from '@/company/useCompany';
import type { Client, Customer, Order, Product, SellableProduct } from '@/types';

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
 * Catálogo de venta para un cliente: proviene de su lista de precios (cada
 * referencia trae precio y unidad de medida) cruzado con el stock del
 * inventario. Solo se ejecuta si hay lista.
 */
export function useProductsForList(search: string, priceList?: string | null) {
  const { company } = useCompany();
  return useQuery({
    queryKey: ['products', 'by-list', company?.id, priceList, search],
    enabled: Boolean(priceList),
    queryFn: async () => {
      const res = await api.get<SellableProduct[]>('/products', {
        params: { priceList, ...(search ? { search } : {}) },
      });
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
export function useClients(search: string) {
  const { company } = useCompany();
  return useQuery({
    queryKey: ['clients', company?.id, search],
    queryFn: async () => {
      const res = await api.get<Client[]>('/clients', {
        params: search ? { search } : undefined,
      });
      return res.data;
    },
  });
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

interface CreateOrderInput {
  customerId: string;
  notes?: string;
  items: { sku: string; quantity: number; discountPct: number }[];
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

interface UpdateOrderInput {
  orderId: string;
  notes?: string;
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

/** Descarga el PDF (documento) de un pedido y lo abre como archivo. */
export async function downloadOrderPdf(
  orderId: string,
  orderNumber: string,
): Promise<void> {
  const res = await api.get(`/orders/${orderId}/pdf`, {
    responseType: 'blob',
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
