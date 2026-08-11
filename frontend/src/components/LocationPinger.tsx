import { useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useGeo } from '@/geo/useGeo';
import { useCompany } from '@/company/useCompany';

/** Intervalo del ping de ubicación (2 minutos). */
const PING_INTERVAL_MS = 2 * 60 * 1000;

/**
 * Envía la ubicación del vendedor al backend cada 2 minutos mientras usa la
 * app (y una vez al montar). Sin UI. Se monta dentro del área autenticada.
 */
export function LocationPinger() {
  const { coords } = useGeo();
  const { company } = useCompany();
  const coordsRef = useRef(coords);
  coordsRef.current = coords;

  useEffect(() => {
    if (!company) return;
    const send = () => {
      const c = coordsRef.current;
      if (!c) return;
      api
        .post('/geo/ping', {
          latitude: c.latitude,
          longitude: c.longitude,
          accuracy: c.accuracy,
        })
        .catch(() => {});
    };
    send();
    const id = setInterval(send, PING_INTERVAL_MS);
    return () => clearInterval(id);
  }, [company]);

  return null;
}
