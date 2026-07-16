import { Navigate } from 'react-router-dom';
import { PackageOpen } from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { useCompany } from '@/company/useCompany';
import { DashboardPage } from '@/pages/DashboardPage';
import { ALL_MODULES } from '@/lib/modules';

/**
 * Página de inicio del área operativa.
 *
 * Los permisos son ESTRICTAMENTE por módulo (no por rol). El usuario solo ve lo
 * que se le habilitó en la compañía actual:
 * - Si tiene el módulo "Inicio" ('/'), ve el tablero.
 * - Si no lo tiene pero tiene otros, cae en su primer módulo habilitado.
 * - Si no tiene ningún módulo, se le informa que debe pedir acceso.
 * El admin siempre ve el tablero.
 */
export function OperationalHome() {
  const { user } = useAuth();
  const { company } = useCompany();

  // El admin ve el tablero comercial directamente. Los demás lo ven si tienen
  // habilitado el módulo '/'; si no, van a su primer módulo o al aviso.
  if (user?.role !== 'admin') {
    const perms = company?.permissions ?? [];
    if (!perms.includes('/')) {
      const first = ALL_MODULES.find((m) => perms.includes(m.key))?.key;
      if (first) return <Navigate to={first} replace />;
      return <NoModules />;
    }
  }

  return <DashboardPage />;
}

function NoModules() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <PackageOpen className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-semibold">Sin módulos habilitados</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        En esta compañía todavía no tienes módulos habilitados. Pídele al
        administrador que te asigne los permisos que necesitas.
      </p>
    </div>
  );
}
