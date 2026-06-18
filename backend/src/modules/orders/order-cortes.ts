/**
 * Cortes de carga a Siesa.
 *
 * Los pedidos se suben al ERP en tres cortes diarios según la HORA DE CREACIÓN
 * del pedido (hora de Colombia):
 *   - Corte 1: 7:00 a 10:00 a.m.
 *   - Corte 2: 10:00 a.m. a 1:00 p.m.
 *   - Corte 3: 1:00 a 4:00 p.m.
 *
 * Para no perder ningún pedido en los bordes:
 *   - Los pedidos creados antes de las 10:00 entran al Corte 1.
 *   - Los pedidos creados después de la hora del último corte (4:00 p.m.)
 *     entran al Corte 3.
 */
export interface Corte {
  id: string;
  label: string;
  /** Hora de inicio (informativa, formato 24h). */
  startHour: number;
  /** Hora de fin (informativa, formato 24h). */
  endHour: number;
}

export const CORTES: Corte[] = [
  { id: '1', label: 'Corte 1 · 7:00 a 10:00 a.m.', startHour: 7, endHour: 10 },
  { id: '2', label: 'Corte 2 · 10:00 a.m. a 1:00 p.m.', startHour: 10, endHour: 13 },
  { id: '3', label: 'Corte 3 · 1:00 a 4:00 p.m.', startHour: 13, endHour: 16 },
];

export function isValidCorte(id: string | undefined): id is string {
  return !!id && CORTES.some((c) => c.id === id);
}

/**
 * Devuelve el id del corte al que pertenece una hora (0-23) de Colombia.
 *   - hora < 10  → Corte 1 (incluye lo creado antes de las 7).
 *   - 10 a < 13  → Corte 2.
 *   - hora >= 13 → Corte 3 (incluye lo creado después de las 4 p.m.).
 */
export function corteForHour(hour: number): string {
  if (hour < 10) return '1';
  if (hour < 13) return '2';
  return '3';
}

/**
 * Extrae la fecha (YYYY-MM-DD) y la hora (0-23) de una fecha en horario de
 * Colombia (America/Bogota), independientemente de la zona del servidor.
 */
export function bogotaParts(date: Date): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  // 'en-CA' entrega 24h pero puede devolver '24' a medianoche: lo normalizamos.
  const rawHour = Number(get('hour'));
  const hour = rawHour === 24 ? 0 : rawHour;

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour,
  };
}

/** Fecha de hoy (YYYY-MM-DD) en horario de Colombia. */
export function bogotaToday(): string {
  return bogotaParts(new Date()).date;
}

/**
 * Ventana operativa diaria (hora de Colombia):
 *   - Los pedidos solo se pueden CREAR a partir de las 7:00 a.m.
 *   - Los pedidos ya no se pueden SUBIR a Siesa después de las 4:00 p.m.
 */
export const ORDER_OPEN_HOUR = 7;
export const ORDER_UPLOAD_CLOSE_HOUR = 16;

/**
 * Horas que tiene un pedido retenido por cartera para ser aprobado o
 * desaprobado. Al vencer, se libera el inventario y queda DISAPPROVED.
 */
export const APPROVAL_WINDOW_HOURS = 2;

/** Hora actual (0-23) en horario de Colombia. */
export function bogotaCurrentHour(): number {
  return bogotaParts(new Date()).hour;
}

/** ¿Ya se pueden crear pedidos? (a partir de las 7:00 a.m.) */
export function isOrderCreationOpen(): boolean {
  return bogotaCurrentHour() >= ORDER_OPEN_HOUR;
}

/** ¿Todavía se pueden subir pedidos a Siesa? (antes de las 4:00 p.m.) */
export function isOrderUploadOpen(): boolean {
  return bogotaCurrentHour() < ORDER_UPLOAD_CLOSE_HOUR;
}

