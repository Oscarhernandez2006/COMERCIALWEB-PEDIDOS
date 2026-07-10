import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Package,
  ClipboardList,
  LogOut,
  Moon,
  Sun,
  RefreshCw,
  Building2,
  Tags,
  FileBarChart,
  FileDown,
  Boxes,
  Wallet,
  FileText,
  Clock,
  Target,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { useCompany } from '@/company/useCompany';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CarteraNotifications } from '@/components/CarteraNotifications';
import { SiesaStateNotifications } from '@/components/SiesaStateNotifications';

const sellerNav = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/pedidos', label: 'Pedidos', icon: ClipboardList },
  { to: '/cotizaciones', label: 'Cotizaciones', icon: FileText },
  { to: '/clientes', label: 'Cartera de Clientes', icon: Users },
  { to: '/disponibilidad', label: 'Disponibilidad', icon: Boxes },
];

const adminNav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/inventario', label: 'Inventario', icon: Package },
  { to: '/admin/pedidos', label: 'Administración de pedidos', icon: ClipboardList },
  { to: '/admin/reportes', label: 'Reportes', icon: FileBarChart },
  { to: '/admin/descargar-pedidos', label: 'Descargar pedidos', icon: FileDown },
  { to: '/admin/listas-precios', label: 'Listas de precios', icon: Tags },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/presupuestos', label: 'Presupuestos', icon: Target },
  { to: '/admin/cartera', label: 'Aprobación de cartera', icon: Wallet },
  { to: '/admin/horario-pedidos', label: 'Horario de pedidos', icon: Clock },
  { to: '/admin/usuarios', label: 'Usuarios', icon: Users },
];

const carteraNav = [
  { to: '/cartera', label: 'Aprobación de cartera', icon: Wallet, end: true },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const { company, clearCompany } = useCompany();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdminArea = location.pathname.startsWith('/admin');
  const isCarteraArea = location.pathname.startsWith('/cartera');

  // Cierra el menú móvil al cambiar de ruta.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Bloquea el scroll del fondo cuando el menú móvil está abierto.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // El menú combina los módulos operativos y administrativos según los
  // permisos asignados al usuario EN LA COMPAÑÍA ACTUAL. Si tiene permisos
  // definidos para esa compañía, se muestran solo esos módulos. Si no tiene
  // permisos (lista vacía) ve los módulos por defecto de su área. El admin
  // siempre ve los módulos por defecto de su área (sin restricción por empresa).
  const perms = user?.role === 'admin' ? undefined : company?.permissions;
  let navItems: typeof sellerNav;
  if (isCarteraArea) {
    navItems = carteraNav;
  } else if (perms && perms.length > 0) {
    navItems = [...sellerNav, ...adminNav].filter((item) =>
      perms.includes(item.to),
    );
  } else {
    navItems = isAdminArea ? adminNav : sellerNav;
  }

  const handleExit = () => {
    if (user?.role === 'admin') {
      navigate('/seleccionar');
    } else if (user?.role === 'cartera') {
      logout();
      navigate('/login');
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

  // Contenido compartido entre la barra lateral de escritorio y el menú
  // deslizable de móvil. `mobile` muestra el botón de cierre.
  const renderSidebar = (mobile = false) => (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <img
          src="/SIGCOM.png"
          alt="SIGCOM"
          className="h-10 w-10 object-contain"
        />
        <span className="text-lg font-semibold tracking-tight">SIGCOM</span>
        {mobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {!isAdminArea && !isCarteraArea && company && (
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

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
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
              {user?.role === 'admin'
                ? 'Administrador'
                : user?.role === 'cartera'
                  ? 'Cartera'
                  : user?.role === 'alistador'
                    ? 'Alistador'
                    : 'Vendedor'}
            </p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Barra lateral fija en escritorio */}
      <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex">
        {renderSidebar()}
      </aside>

      {/* Fondo oscuro del menú móvil */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Menú deslizable en móvil */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col border-r border-border bg-card transition-transform duration-200 ease-in-out md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {renderSidebar(true)}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-2 border-b border-border bg-card px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="hidden truncate text-sm font-medium text-muted-foreground sm:block">
              {isAdminArea
                ? 'Panel de administración'
                : isCarteraArea
                  ? 'Aprobación de cartera'
                  : 'Sistema de toma de pedidos'}
            </h1>
            {!isAdminArea && !isCarteraArea && company && (
              <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{company.name}</span>
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggle}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExit}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {user?.role === 'seller' && <CarteraNotifications />}
      {user?.role === 'seller' && <SiesaStateNotifications />}
    </div>
  );
}
