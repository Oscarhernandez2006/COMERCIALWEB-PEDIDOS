import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  ClipboardList,
  LogOut,
  Moon,
  Sun,
  ShoppingCart,
  RefreshCw,
  Building2,
  Tags,
  UploadCloud,
  FileBarChart,
  Boxes,
} from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { useCompany } from '@/company/useCompany';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const sellerNav = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/pedidos', label: 'Pedidos', icon: ClipboardList },
  { to: '/disponibilidad', label: 'Disponibilidad', icon: Boxes },
];

const adminNav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/inventario', label: 'Inventario', icon: Package },
  { to: '/admin/reportes', label: 'Reportes', icon: FileBarChart },
  { to: '/admin/listas-precios', label: 'Listas de precios', icon: Tags },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/cargar-siesa', label: 'Subir a Siesa', icon: UploadCloud },
  { to: '/admin/usuarios', label: 'Usuarios', icon: Users },
];

export function AppLayout() {
  const { user } = useAuth();
  const { company, clearCompany } = useCompany();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdminArea = location.pathname.startsWith('/admin');
  const navItems = isAdminArea ? adminNav : sellerNav;

  const handleExit = () => {
    if (user?.role === 'admin') {
      navigate('/seleccionar');
    } else {
      // El vendedor vuelve a elegir compañía (ahi puede cerrar sesion).
      clearCompany();
      navigate('/seleccionar-compania');
    }
  };

  const handleChangeCompany = () => {
    clearCompany();
    navigate('/seleccionar-compania');
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShoppingCart className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Comercial
          </span>
        </div>

        {!isAdminArea && company && (
          <button
            onClick={handleChangeCompany}
            className="group mx-3 mt-3 flex items-center gap-3 rounded-lg border border-border bg-accent/40 px-3 py-2 text-left transition-colors hover:bg-accent"
            title="Cambiar de compañía"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted-foreground">
                Compañía {company.id}
              </p>
              <p className="truncate text-sm font-semibold">{company.name}</p>
            </div>
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:rotate-90" />
          </button>
        )}

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
              {user?.name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.role === 'admin' ? 'Administrador' : 'Vendedor'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-medium text-muted-foreground">
              {isAdminArea
                ? 'Panel de administración'
                : 'Sistema de toma de pedidos'}
            </h1>
            {!isAdminArea && company && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <Building2 className="h-3.5 w-3.5" />
                {company.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggle}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExit}>
              <LogOut className="h-4 w-4" />
              Salir
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
