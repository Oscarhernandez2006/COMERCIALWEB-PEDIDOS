import type { ReactNode } from 'react';
import { MapPin, ShieldAlert, LocateFixed } from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { useGeo } from '@/geo/useGeo';
import { Button } from '@/components/ui/button';

/**
 * Exige la geolocalización a los usuarios autenticados. Si no está concedida,
 * muestra una pantalla bloqueante con el botón para permitirla. No bloquea la
 * pantalla de login (usuarios sin sesión).
 */
export function RequireGeolocation({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { coords, status, request } = useGeo();

  // Sin sesión (login) no se exige; ya con sesión, sí.
  if (!user) return <>{children}</>;
  if (status === 'granted' && coords) return <>{children}</>;

  const denied = status === 'denied';
  const unsupported = status === 'unsupported';
  const waiting = status === 'granted' && !coords;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-accent/30 p-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
        <div
          className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
            denied || unsupported ? 'bg-destructive/10' : 'bg-primary/10'
          }`}
        >
          {denied || unsupported ? (
            <ShieldAlert className="h-8 w-8 text-destructive" />
          ) : waiting ? (
            <LocateFixed className="h-8 w-8 animate-pulse text-primary" />
          ) : (
            <MapPin className="h-8 w-8 text-primary" />
          )}
        </div>

        <h1 className="text-xl font-bold text-foreground">
          {unsupported
            ? 'Ubicación no disponible'
            : denied
              ? 'Activa la ubicación'
              : waiting
                ? 'Obteniendo tu ubicación…'
                : 'Permite tu ubicación'}
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          {unsupported
            ? 'Tu navegador o dispositivo no permite geolocalización. No es posible continuar.'
            : denied
              ? 'La ubicación es obligatoria para usar el sistema. Habilítala en el navegador (icono del candado/ubicación en la barra de direcciones) y vuelve a intentar.'
              : waiting
                ? 'Un momento, estamos tomando tu posición…'
                : 'Para tomar pedidos necesitamos tu ubicación. Es obligatoria. Pulsa "Permitir ubicación" y acepta el mensaje del navegador.'}
        </p>

        {!unsupported && (
          <Button className="mt-6 w-full" onClick={request} disabled={waiting}>
            <MapPin className="h-4 w-4" />
            {denied ? 'Volver a intentar' : 'Permitir ubicación'}
          </Button>
        )}
      </div>
    </div>
  );
}
