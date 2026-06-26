/**
 * Utilidades de horario para la subida de pedidos al ERP.
 *
 * Los pedidos se suben automáticamente al ERP al crearse (o al aprobarse en
 * cartera), siempre dentro de la ventana operativa de Colombia.
 */

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

/** ¿Ya se pueden crear pedidos? (entre las 7:00 a.m. y las 4:00 p.m.) */
export function isOrderCreationOpen(): boolean {
  const hour = bogotaCurrentHour();
  return hour >= ORDER_OPEN_HOUR && hour < ORDER_UPLOAD_CLOSE_HOUR;
}

/** ¿Todavía se pueden subir pedidos a Siesa? (antes de las 4:00 p.m.) */
export function isOrderUploadOpen(): boolean {
  return bogotaCurrentHour() < ORDER_UPLOAD_CLOSE_HOUR;
}

