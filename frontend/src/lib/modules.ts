import type { UserRole } from '@/types';

/** Definición de un módulo (ítem de menú) que se puede asignar por permisos. */
export interface ModuleDef {
  /** Ruta del front que actúa como clave del permiso (p. ej. "/pedidos"). */
  key: string;
  label: string;
}

/** Área de "Toma de pedidos" (rol vendedor). */
export const SELLER_MODULES: ModuleDef[] = [
  { key: '/', label: 'Inicio' },
  { key: '/pedidos', label: 'Pedidos' },
  { key: '/cotizaciones', label: 'Cotizaciones' },
  { key: '/clientes', label: 'Cartera de Clientes' },
  { key: '/disponibilidad', label: 'Disponibilidad' },
];

/** Área "Administrativa" (rol administrador). */
export const ADMIN_MODULES: ModuleDef[] = [
  { key: '/admin', label: 'Dashboard' },
  { key: '/admin/inventario', label: 'Inventario' },
  { key: '/admin/pedidos', label: 'Administración de pedidos' },
  { key: '/admin/reportes', label: 'Reportes' },
  { key: '/admin/descargar-pedidos', label: 'Descargar pedidos' },
  { key: '/admin/listas-precios', label: 'Listas de precios' },
  { key: '/admin/clientes', label: 'Clientes' },
  { key: '/admin/cartera', label: 'Aprobación de cartera' },
  { key: '/admin/usuarios', label: 'Usuarios' },
];

/** Tipo de área a la que pertenece un módulo. */
export type ModuleArea = 'seller' | 'admin';

/** Grupos de módulos para la UI de permisos (ambas áreas a la vez). */
export const MODULE_GROUPS: {
  area: ModuleArea;
  label: string;
  modules: ModuleDef[];
}[] = [
  { area: 'seller', label: 'Operativo · Toma de pedidos', modules: SELLER_MODULES },
  { area: 'admin', label: 'Administrativo', modules: ADMIN_MODULES },
];

/** Todos los módulos asignables (operativo + administrativo). */
export const ALL_MODULES: ModuleDef[] = [...SELLER_MODULES, ...ADMIN_MODULES];

const ADMIN_KEYS = new Set(ADMIN_MODULES.map((m) => m.key));
const SELLER_KEYS = new Set(SELLER_MODULES.map((m) => m.key));

/** Módulos disponibles según el rol (área) del usuario. */
export function modulesForRole(role: UserRole): ModuleDef[] {
  if (role === 'admin') return ADMIN_MODULES;
  if (role === 'seller') return SELLER_MODULES;
  return [];
}

/**
 * Indica si un usuario puede entrar a un área (operativa/administrativa)
 * por su rol o porque se le asignaron módulos de esa área.
 */
export function canAccessArea(
  role: UserRole,
  permissions: string[] | undefined,
  area: ModuleArea,
): boolean {
  if (area === 'admin' && role === 'admin') return true;
  if (area === 'seller' && role === 'seller') return true;
  const perms = permissions ?? [];
  return area === 'admin'
    ? perms.some((p) => ADMIN_KEYS.has(p))
    : perms.some((p) => SELLER_KEYS.has(p));
}

/** Etiqueta del área según el rol. */
export function areaLabel(role: UserRole): string {
  if (role === 'admin') return 'Administrativa';
  if (role === 'seller') return 'Vendedor';
  if (role === 'alistador') return 'Alistador';
  return 'Cartera';
}

/**
 * Indica si un módulo (ruta) es visible para un usuario con esos permisos.
 * Si la lista de permisos está vacía, ve todos los módulos de su rol.
 */
export function canSeeModule(
  permissions: string[] | undefined,
  moduleKey: string,
): boolean {
  if (!permissions || permissions.length === 0) return true;
  return permissions.includes(moduleKey);
}
