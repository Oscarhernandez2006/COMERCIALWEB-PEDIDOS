import { createContext } from 'react';

export type GeoStatus =
  | 'unknown'
  | 'prompt'
  | 'granted'
  | 'denied'
  | 'unsupported';

export interface GeoCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface GeoContextValue {
  coords: GeoCoords | null;
  status: GeoStatus;
  /** Lanza el prompt del navegador para pedir la ubicación. */
  request: () => void;
}

export const GeoContext = createContext<GeoContextValue | undefined>(undefined);
