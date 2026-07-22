import type { CanalItemDef } from '@/types';

/**
 * Ítems de canal disponibles para tomar pedidos. Corresponden a las dos
 * referencias/productos que bajan del canal en las ventas (más novillo/novilla
 * como RES). La especie se deriva del ítem seleccionado.
 */
export const CANAL_ITEMS: CanalItemDef[] = [
  { ref: '2003', name: 'CANAL DE CERDO', especie: 'CERDO' },
  { ref: '1980', name: 'CANAL DE NOVILLA', especie: 'RES' },
  { ref: '1981', name: 'CANAL DE NOVILLO', especie: 'RES' },
];
