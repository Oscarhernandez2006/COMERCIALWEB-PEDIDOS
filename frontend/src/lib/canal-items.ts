import type { CanalItemDef } from '@/types';

/**
 * Ítems de canal disponibles para tomar pedidos. Corresponden a las dos
 * referencias/productos que bajan del canal en las ventas (más novillo/novilla
 * como RES). La especie se deriva del ítem seleccionado.
 */
export const CANAL_ITEMS: CanalItemDef[] = [
  {
    ref: '2003',
    name: 'CANAL DE CERDO',
    especie: 'CERDO',
    specs: ['60 A 70 KG', '70 A 80 KG', '80 A 90 KG', '90 KG EN ADELANTE'],
  },
  {
    ref: '1980',
    name: 'CANAL DE NOVILLA',
    especie: 'RES',
    specs: ['INFERIOR A 180 KG', 'SUPERIOR A 180 KG'],
  },
  {
    ref: '1981',
    name: 'CANAL DE NOVILLO',
    especie: 'RES',
    specs: ['INFERIOR A 200 KG', 'SUPERIOR A 200 KG'],
  },
];
