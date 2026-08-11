import { useContext } from 'react';
import { GeoContext } from './geo-context';

export function useGeo() {
  const ctx = useContext(GeoContext);
  if (!ctx) throw new Error('useGeo debe usarse dentro de GeoProvider');
  return ctx;
}
