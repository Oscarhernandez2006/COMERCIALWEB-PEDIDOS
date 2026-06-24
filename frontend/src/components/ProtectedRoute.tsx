import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import type { UserRole } from '@/types';
import { canAccessArea } from '@/lib/modules';

export function ProtectedRoute({
  children,
  role,
}: {
  children: ReactNode;
  role?: UserRole;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    // El área administrativa también es accesible para usuarios a quienes se
    // les asignaron módulos administrativos por permisos.
    const allowedByPermission =
      role === 'admin' && canAccessArea(user.role, user.permissions, 'admin');
    if (!allowedByPermission) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
