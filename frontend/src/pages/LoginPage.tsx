import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { IdCard, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { Button } from '@/components/ui/button';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      // Todos entran al área operativa y eligen compañía; ahí ven en una sola
      // barra los módulos habilitados (el admin ve todos). Divididos por compañía.
      navigate('/');
    } catch {
      setError('Credenciales inválidas. Verifica tu cédula y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-background to-accent/30 p-4">
      {/* Marca de agua */}
      <img
        src="/LOGOCARNESSANTACRUZ.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 w-[560px] max-w-[85vw] -translate-x-1/2 -translate-y-1/2 opacity-[0.04]"
      />

      <div className="flex w-full max-w-6xl items-center justify-center gap-8">
        {/* Logo Agropecuaria — mural izquierdo (solo en pantallas grandes) */}
        <div className="hidden h-96 w-72 shrink-0 items-center justify-center lg:flex">
          <img
            src="/AGROPECUARIA.png"
            alt="Agropecuaria Santacruz"
            className="max-h-full max-w-full object-contain drop-shadow-xl"
          />
        </div>

        {/* Card del login (centro) */}
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-xl shadow-black/5 sm:p-10">
            {/* Mural de logos para pantallas pequeñas */}
            <div className="mb-6 grid grid-cols-2 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-border lg:hidden">
              <div className="flex h-24 items-center justify-center p-3">
                <img
                  src="/AGROPECUARIA.png"
                  alt="Agropecuaria Santacruz"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="flex h-24 items-center justify-center border-l border-border/70 p-3">
                <img
                  src="/CARNESFRIAS.png"
                  alt="Carnes Frías Santacruz"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Bienvenido
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Ingresa tus credenciales para acceder al sistema.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="text-sm font-semibold text-foreground"
              >
                Cédula
              </label>
              <div className="relative">
                <IdCard className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="username"
                  type="text"
                  inputMode="numeric"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Número de cédula"
                  required
                  className="h-12 w-full rounded-xl border border-input bg-secondary/60 pl-11 pr-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-sm font-semibold text-foreground"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-12 w-full rounded-xl border border-input bg-secondary/60 pl-11 pr-11 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                  }
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="h-12 w-full rounded-xl text-base font-semibold"
              disabled={loading}
            >
              {loading ? (
                'Ingresando...'
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Ingresar
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            ¿Problemas para acceder? Contacta al administrador del sistema.
          </p>
          </div>

          <p className="mt-4 text-center text-xs font-semibold tracking-wide text-muted-foreground"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            SIGCOM · Sistema de Gestión Comercial
          </p>
        </div>

        {/* Logo Carnes Frías — mural derecho (solo en pantallas grandes) */}
        <div className="hidden h-96 w-72 shrink-0 items-center justify-center lg:flex">
          <img
            src="/CARNESFRIAS.png"
            alt="Carnes Frías Santacruz"
            className="max-h-full max-w-full object-contain drop-shadow-xl"
          />
        </div>
      </div>
    </div>
  );
}
