import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  AdminDashboardStats,
  AdminUser,
  ClientPortfolio,
  Order,
  Product,
} from '@/types';

/** KPIs consolidados de ambas compañías para el panel de administración. */
export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const res = await api.get<AdminDashboardStats>('/admin/dashboard');
      return res.data;
    },
  });
}

/* ---- Usuarios ---- */

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const res = await api.get<AdminUser[]>('/admin/users');
      return res.data;
    },
  });
}

interface CreateUserInput {
  documentId: string;
  name: string;
  password: string;
  email?: string;
  role: 'admin' | 'seller' | 'cartera' | 'alistador';
  siesaSellerCode?: string;
  permissions?: string[];
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const res = await api.post<AdminUser>('/admin/users', input);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

interface UpdateUserInput {
  id: string;
  documentId?: string;
  name?: string;
  password?: string;
  email?: string;
  role?: 'admin' | 'seller' | 'cartera' | 'alistador';
  siesaSellerCode?: string;
}

/** Edita la información de un usuario. */
export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateUserInput) => {
      const res = await api.patch<AdminUser>(`/admin/users/${id}`, body);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

/** Elimina un usuario. */
export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<{ ok: boolean }>(`/admin/users/${id}`);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useSetUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; active: boolean }) => {
      const res = await api.patch<AdminUser>(
        `/admin/users/${input.id}/active`,
        { active: input.active },
      );
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

/** Define los módulos visibles (permisos) de un usuario. */
export function useSetUserPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; permissions: string[] }) => {
      const res = await api.patch<AdminUser>(
        `/admin/users/${input.id}/permissions`,
        { permissions: input.permissions },
      );
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

/** Define los módulos visibles (permisos) de un usuario EN una compañía. */
export function useSetCompanyPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      companyId: string;
      permissions: string[];
    }) => {
      const res = await api.patch<AdminUser>(
        `/admin/users/${input.id}/companies/${input.companyId}/permissions`,
        { permissions: input.permissions },
      );
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useAssignCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      companyId: string;
      siesaSellerCode?: string;
    }) => {
      const res = await api.post<AdminUser>(
        `/admin/users/${input.id}/companies`,
        { companyId: input.companyId, siesaSellerCode: input.siesaSellerCode },
      );
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useRemoveCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; companyId: string }) => {
      const res = await api.delete<AdminUser>(
        `/admin/users/${input.id}/companies/${input.companyId}`,
      );
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

/* ---- Inventario por compañía (header explícito, el admin no fija compañía) ---- */

export function useCompanyProducts(companyId: string, search: string) {
  return useQuery({
    queryKey: ['admin', 'products', companyId, search],
    queryFn: async () => {
      const res = await api.get<Product[]>('/products', {
        params: search ? { search } : undefined,
        headers: { 'X-Company-Id': companyId },
      });
      return res.data;
    },
    enabled: Boolean(companyId),
  });
}

export function useSyncCompanyProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (companyId: string) => {
      const res = await api.post<{ synced: number }>(
        '/products/sync',
        {},
        { headers: { 'X-Company-Id': companyId } },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}

export function useSyncCompanyCustomers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (companyId: string) => {
      const res = await api.post<{ synced: number }>(
        '/customers/sync',
        {},
        { headers: { 'X-Company-Id': companyId } },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}

/* ---- Inventario por Excel ---- */

export interface ImportInventoryResult {
  total: number;
  created: number;
  updated: number;
  removed: number;
}

/** Carga diaria del inventario desde Excel (reemplaza el inventario). */
export function useImportInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { companyId: string; file: File }) => {
      const form = new FormData();
      form.append('file', input.file);
      const res = await api.post<ImportInventoryResult>(
        '/products/import',
        form,
        { headers: { 'X-Company-Id': input.companyId } },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}

/** Edita únicamente el stock de un producto. */
export function useUpdateStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      companyId: string;
      id: string;
      stock: number;
    }) => {
      const res = await api.patch<Product>(
        `/products/${input.id}/stock`,
        { stock: input.stock },
        { headers: { 'X-Company-Id': input.companyId } },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}

/* ---- Reportes (PDF) ---- */

/**
 * Descarga el reporte PDF de resumen de inventario por día de una compañía.
 * Si no se indica fecha, el backend usa el día actual (hora de Colombia).
 */
export async function downloadInventoryReport(
  companyId: string,
  date?: string,
) {
  const res = await api.get('/admin/reports/inventory', {
    params: { companyId, ...(date ? { date } : {}) },
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(res.data as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `inventario-${companyId}-${date || 'hoy'}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/** Descarga la plantilla de inventario (.xlsx). */
export async function downloadInventoryTemplate() {
  const res = await api.get('/products/template', {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(res.data as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'plantilla_inventario.xlsx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/* ---- Administración de pedidos (seguimiento completo) ---- */

export interface AdminOrderItem {
  sku: string;
  productName: string;
  unitOfMeasure?: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  lineTotal: number;
}

export interface AdminOrderDetail {
  id: string;
  orderNumber: string;
  companyId: string;
  status: string;
  sellerName: string;
  sellerDocument?: string;
  sellerCode?: string;
  createdAt: string;
  deliveryDate?: string;
  customerName: string;
  customerCode: string;
  customerCity?: string;
  subtotal: number;
  taxes: number;
  total: number;
  notes?: string;
  logisticsNote?: string;
  deliveryType?: string;
  deliverySchedule?: string;
  carteraBalance?: number | null;
  approvalDeadline?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  disapprovalReason?: string | null;
  cancelReason?: string | null;
  siesaEstado?: string | null;
  siesaStatePrevious?: string | null;
  syncedAt?: string | null;
  siesaDocumentId?: string | null;
  syncError?: string | null;
  downloadCount: number;
  downloadedAt?: string | null;
  downloadedBy?: string | null;
  items: AdminOrderItem[];
}

export interface AdminOrdersFilters {
  from?: string;
  to?: string;
  status?: string;
  search?: string;
}

/** Listado administrativo de pedidos de una compañía con filtros. */
export function useAdminOrders(companyId: string, filters: AdminOrdersFilters) {
  return useQuery({
    queryKey: ['admin', 'orders', companyId, filters],
    queryFn: async () => {
      const res = await api.get<AdminOrderDetail[]>('/admin/orders', {
        params: {
          companyId,
          ...(filters.from ? { from: filters.from } : {}),
          ...(filters.to ? { to: filters.to } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.search ? { search: filters.search } : {}),
        },
      });
      return res.data;
    },
  });
}

/* ---- Descargar pedidos (descarga masiva en PDF) ---- */

export interface DownloadableOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerCode: string;
  sellerName: string;
  total: number;
  siesaEstado?: string;
  createdAt: string;
  downloadedAt?: string | null;
}

/** Pedidos subidos a Siesa (no rebotados ni anulados) de una compañía. */
export function useDownloadableOrders(companyId: string) {
  return useQuery({
    queryKey: ['admin', 'downloadable-orders', companyId],
    queryFn: async () => {
      const res = await api.get<DownloadableOrder[]>('/admin/orders/downloadable', {
        params: { companyId },
      });
      return res.data;
    },
  });
}

/**
 * Genera un único PDF con los pedidos seleccionados, los marca como
 * descargados y refresca la lista.
 */
export function useDownloadOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { companyId: string; orderIds: string[] }) => {
      const res = await api.post('/admin/orders/download', input, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(res.data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pedidos-${input.companyId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({
        queryKey: ['admin', 'downloadable-orders', input.companyId],
      });
    },
  });
}

/* ---- Listas de precios ---- */

export interface PriceListSummary {
  listCode: string;
  listName: string;
  itemCount: number;
}

export interface PriceListItem {
  id: string;
  listCode: string;
  listName: string;
  reference: string;
  productName: string;
  unitOfMeasure?: string;
  price: number;
}

export interface SyncPriceListsResult {
  lists: number;
  created: number;
  updated: number;
  removed: number;
  total: number;
}

/** Listas de precios disponibles de una compañía. */
export function usePriceLists(companyId: string) {
  return useQuery({
    queryKey: ['admin', 'price-lists', companyId],
    queryFn: async () => {
      const res = await api.get<PriceListSummary[]>('/price-lists', {
        headers: { 'X-Company-Id': companyId },
      });
      return res.data;
    },
  });
}

/** Ítems (referencias y precios) de una lista. */
export function usePriceListItems(
  companyId: string,
  listCode: string | null,
  search: string,
) {
  return useQuery({
    queryKey: ['admin', 'price-list-items', companyId, listCode, search],
    enabled: Boolean(listCode),
    queryFn: async () => {
      const res = await api.get<PriceListItem[]>(
        `/price-lists/${listCode}/items`,
        {
          params: search ? { search } : undefined,
          headers: { 'X-Company-Id': companyId },
        },
      );
      return res.data;
    },
  });
}

/** Sincroniza las listas de precios desde Siesa (solo admin). */
export function useSyncPriceLists() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (companyId: string) => {
      const res = await api.post<SyncPriceListsResult>(
        '/price-lists/sync',
        {},
        { headers: { 'X-Company-Id': companyId } },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'price-lists'] });
      qc.invalidateQueries({ queryKey: ['admin', 'price-list-items'] });
    },
  });
}

/* ---- Clientes ---- */

export interface ClientRecord {
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

export interface SyncClientsResult {
  created: number;
  updated: number;
  removed: number;
  total: number;
}

/** Clientes de una compañía, con búsqueda opcional. */
export function useClients(companyId: string, search: string) {
  return useQuery({
    queryKey: ['admin', 'clients', companyId, search],
    queryFn: async () => {
      const res = await api.get<ClientRecord[]>('/clients', {
        params: search ? { search } : undefined,
        headers: { 'X-Company-Id': companyId },
      });
      return res.data;
    },
  });
}

/** Sincroniza los clientes desde Siesa (solo admin). */
export function useSyncClients() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (companyId: string) => {
      const res = await api.post<SyncClientsResult>(
        '/clients/sync',
        {},
        { headers: { 'X-Company-Id': companyId } },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'clients'] });
    },
  });
}

/** Cartera (documentos por cobrar) de un cliente, consultada en vivo. */
export function useClientPortfolio(
  companyId: string,
  nit: string | null,
) {
  return useQuery({
    queryKey: ['admin', 'portfolio', companyId, nit],
    enabled: !!nit,
    queryFn: async () => {
      const res = await api.get<ClientPortfolio>('/clients/portfolio', {
        params: { nit },
        headers: { 'X-Company-Id': companyId },
      });
      return res.data;
    },
  });
}

/* ---- Aprobación de pedidos en cartera ---- */

/** Pedidos retenidos pendientes de aprobación en cartera (todas las compañías). */
export function useCarteraOrders() {
  return useQuery({
    queryKey: ['cartera', 'orders'],
    queryFn: async () => {
      const res = await api.get<Order[]>('/cartera/orders');
      return res.data;
    },
    refetchInterval: 30_000,
  });
}

/** Aprueba un pedido retenido: pasa a "pendiente por envío" a Siesa. */
export function useApproveOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<Order>(`/cartera/orders/${id}/approve`, {});
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cartera', 'orders'] }),
  });
}

/** Desaprueba un pedido retenido: se libera el inventario reservado. */
export function useDisapproveOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; reason?: string }) => {
      const res = await api.post<Order>(
        `/cartera/orders/${input.id}/disapprove`,
        { reason: input.reason },
      );
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cartera', 'orders'] }),
  });
}
