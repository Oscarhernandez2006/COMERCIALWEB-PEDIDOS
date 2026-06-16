import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useCompany } from '@/company/useCompany';

/**
 * Exige que haya una compañía seleccionada para entrar al area de
 * toma de pedidos. Si no, redirige a la pantalla de seleccion.
 */
export function RequireCompany({ children }: { children: ReactNode }) {
  const { company, loading } = useCompany();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!company) {
    return <Navigate to="/seleccionar-compania" replace />;
  }

  return <>{children}</>;
}
