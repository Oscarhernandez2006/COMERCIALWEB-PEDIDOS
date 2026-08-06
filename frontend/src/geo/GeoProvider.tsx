import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GeoContext, type GeoCoords, type GeoStatus } from './geo-context';

/**
 * Mantiene la ubicación del usuario en segundo plano (watchPosition) y expone
 * el estado del permiso. Se usa para exigir la geolocalización y para sellar
 * los pedidos con las coordenadas donde se tomaron.
 */
export function GeoProvider({ children }: { children: ReactNode }) {
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [status, setStatus] = useState<GeoStatus>('unknown');
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      return;
    }

    const startWatch = () => {
      if (watchId.current != null) return;
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          setCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          setStatus('granted');
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) setStatus('denied');
        },
        { enableHighAccuracy: true, maximumAge: 60_000, timeout: 20_000 },
      );
    };

    const perms = navigator.permissions;
    if (perms && perms.query) {
      perms
        .query({ name: 'geolocation' as PermissionName })
        .then((res) => {
          setStatus(res.state as GeoStatus);
          res.onchange = () => setStatus(res.state as GeoStatus);
          startWatch();
        })
        .catch(() => startWatch());
    } else {
      startWatch();
    }

    return () => {
      if (watchId.current != null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, []);

  const request = () => {
    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setStatus('granted');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setStatus('denied');
      },
      { enableHighAccuracy: true },
    );
  };

  return (
    <GeoContext.Provider value={{ coords, status, request }}>
      {children}
    </GeoContext.Provider>
  );
}
