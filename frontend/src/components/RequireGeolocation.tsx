import type { ReactNode } from 'react';

/**
 * La ubicación ya NO es obligatoria: quien no la conceda (o no la tenga
 * disponible) puede entrar igual. La posición se sigue capturando en segundo
 * plano (GeoProvider / LocationPinger) cuando el usuario sí la permite.
 */
export function RequireGeolocation({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
