import type { ReactNode } from 'react';
import { useAuth } from '@/auth/useAuth';
import { ChangePasswordPage } from '@/pages/ChangePasswordPage';

interface Props {
  children: ReactNode;
}

/**
 * Si el usuario autenticado tiene mustChangePassword = true,
 * muestra la página de cambio de contraseña obligatorio.
 * De lo contrario, muestra los children normalmente.
 */
export function RequirePasswordChange({ children }: Props) {
  const { user } = useAuth();

  // Si el usuario está logueado y debe cambiar contraseña, forzar la página
  if (user && user.mustChangePassword) {
    return <ChangePasswordPage />;
  }

  return <>{children}</>;
}
