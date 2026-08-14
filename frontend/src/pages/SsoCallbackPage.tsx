import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { api, setToken } from '@/lib/api';
import { useAuth } from '@/auth/useAuth';

/**
 * Punto de entrada del SSO desde la suite (SCTOOLS).
 * La suite redirige aquí con "?ticket=...". Canjeamos el ticket contra el
 * backend, que valida al usuario por su cédula y devuelve un JWT propio.
 */
export function SsoCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [error, setError] = useState('');
  // Evita canjear el ticket dos veces (React StrictMode monta el efecto 2 veces).
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const ticket = params.get('ticket');
    if (!ticket) {
      setError('Falta el ticket de acceso.');
      return;
    }

    api
      .post<{ accessToken: string; user: Parameters<typeof setUser>[0] }>(
        '/auth/sso',
        { ticket },
      )
      .then((res) => {
        setToken(res.data.accessToken);
        setUser(res.data.user);
        navigate('/', { replace: true });
      })
      .catch((err) => {
        const message =
          err?.response?.data?.message ??
          'No se pudo iniciar sesión desde la suite.';
        setError(Array.isArray(message) ? message.join(', ') : message);
      });
  }, [params, navigate, setUser]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-accent/30 p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-center shadow-sm">
        {error ? (
          <>
            <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-destructive" />
            <h1 className="mb-2 text-lg font-semibold">No se pudo entrar</h1>
            <p className="mb-6 text-sm text-muted-foreground">{error}</p>
            <button
              className="text-sm font-medium text-primary underline"
              onClick={() => navigate('/login', { replace: true })}
            >
              Ir al inicio de sesión
            </button>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
            <h1 className="mb-2 text-lg font-semibold">Iniciando sesión…</h1>
            <p className="text-sm text-muted-foreground">
              Validando tu acceso desde la suite.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
