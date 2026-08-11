import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, RefreshCw, Calendar, Route as RouteIcon } from 'lucide-react';
import {
  useRouteSellers,
  useSellerRoute,
  type RouteOrderPoint,
  type RoutePoint,
} from '@/hooks/useAdminApi';
import { useAuth } from '@/auth/useAuth';
import { useCompany } from '@/company/useCompany';
import { COMPANIES } from '@/lib/companies';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** Fecha local de hoy (YYYY-MM-DD). */
function todayStr(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

const ORDER_LABEL: Record<string, string> = {
  corte: 'corte',
  subproducto: 'subproducto',
  canal: 'canal',
};

/** Mapa Leaflet con el trazo del recorrido y los pedidos como marcadores. */
function RouteMap({
  points,
  orders,
}: {
  points: RoutePoint[];
  orders: RouteOrderPoint[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  // Inicializa el mapa una sola vez.
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current, {
      center: [4.65, -74.1],
      zoom: 12,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Redibuja trazo y marcadores cuando cambian los datos.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const line = points.map((p) => [p.latitude, p.longitude] as [number, number]);
    if (line.length > 1) {
      L.polyline(line, { color: '#2563eb', weight: 3, opacity: 0.7 }).addTo(
        layer,
      );
    }

    // Puntos del recorrido (pequeños).
    points.forEach((p) => {
      L.circleMarker([p.latitude, p.longitude], {
        radius: 3,
        color: '#2563eb',
        fillColor: '#2563eb',
        fillOpacity: 0.6,
        weight: 1,
      }).addTo(layer);
    });

    // Marcadores de pedidos (con tooltip al pasar el cursor).
    orders.forEach((o, i) => {
      const marker = L.marker([o.latitude, o.longitude]).addTo(layer);
      const hora = new Date(o.createdAt).toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      });
      marker.bindTooltip(
        `Tomó un pedido al cliente <b>${o.customerName}</b><br>` +
          `#${o.orderNumber} · ${ORDER_LABEL[o.type] ?? o.type} · ${hora}`,
        { direction: 'top', offset: [0, -30] },
      );
      // Inicio / fin del recorrido resaltados.
      if (i === 0) marker.bindPopup(`Inicio · #${o.orderNumber}`);
      if (i === orders.length - 1 && orders.length > 1)
        marker.bindPopup(`Fin · #${o.orderNumber}`);
    });

    // Ajusta el encuadre a todos los puntos.
    const all = [
      ...line,
      ...orders.map((o) => [o.latitude, o.longitude] as [number, number]),
    ];
    if (all.length > 0) {
      map.fitBounds(L.latLngBounds(all), { padding: [40, 40], maxZoom: 16 });
    }
  }, [points, orders]);

  return <div ref={containerRef} className="h-[65vh] w-full rounded-xl" />;
}

export function RoutesPage() {
  const { user } = useAuth();
  const { companies: myCompanies } = useCompany();
  const isAdmin = user?.role === 'admin';

  const availableCompanies = useMemo(() => {
    if (isAdmin) return COMPANIES;
    return COMPANIES.filter((c) =>
      myCompanies.some(
        (mc) => mc.id === c.id && (mc.permissions ?? []).includes('/admin/rutas'),
      ),
    );
  }, [isAdmin, myCompanies]);

  const [companyId, setCompanyId] = useState(
    availableCompanies[0]?.id ?? '3',
  );
  const [sellerId, setSellerId] = useState('');
  const [date, setDate] = useState(todayStr());

  const { data: sellers = [] } = useRouteSellers(companyId);
  const { data, isLoading, isFetching, refetch } = useSellerRoute(
    companyId,
    sellerId,
    date,
  );

  const points = data?.points ?? [];
  const orders = data?.orders ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <RouteIcon className="h-6 w-6 text-primary" />
            Rutas de vendedores
          </h2>
          <p className="text-muted-foreground">
            Recorrido y puntos donde cada vendedor tomó pedidos.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching || !sellerId}
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            {availableCompanies.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setCompanyId(c.id);
                  setSellerId('');
                }}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                  companyId === c.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-accent',
                )}
              >
                {c.name}
                <span className="text-xs opacity-70">#{c.id}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Vendedor
              </label>
              <select
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Selecciona un vendedor…</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Día
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="date"
                  value={date}
                  max={todayStr()}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          {!sellerId ? (
            <div className="flex h-[65vh] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <MapPin className="h-10 w-10 text-muted-foreground/40" />
              Selecciona un vendedor para ver su recorrido.
            </div>
          ) : isLoading ? (
            <div className="flex h-[65vh] items-center justify-center text-sm text-muted-foreground">
              Cargando recorrido…
            </div>
          ) : points.length === 0 && orders.length === 0 ? (
            <div className="flex h-[65vh] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <MapPin className="h-10 w-10 text-muted-foreground/40" />
              Sin datos de ubicación para ese día.
            </div>
          ) : (
            <RouteMap points={points} orders={orders} />
          )}
        </CardContent>
      </Card>

      {sellerId && orders.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {orders.length} pedido(s) geolocalizado(s) · {points.length} punto(s)
          de recorrido.
        </p>
      )}
    </div>
  );
}
