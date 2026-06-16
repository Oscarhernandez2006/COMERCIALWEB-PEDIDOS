import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, LogOut, ArrowRight } from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function WorkspaceSelectPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const options = [
    {
      key: 'admin',
      title: 'Administración',
      description: 'Catálogos, sincronización con Siesa y configuración.',
      icon: LayoutDashboard,
      to: '/admin',
    },
    {
      key: 'seller',
      title: 'Toma de pedidos',
      description: 'Crear pedidos, clientes y enviarlos a Siesa.',
      icon: ShoppingCart,
      to: '/seleccionar-compania',
    },
  ];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-accent/30 p-4">
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-4 top-4"
        onClick={() => {
          logout();
          navigate('/login');
        }}
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </Button>

      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Hola, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-muted-foreground">
          ¿A qué apartado quieres ingresar?
        </p>
      </div>

      <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
        {options.map((opt) => (
          <Card
            key={opt.key}
            onClick={() => navigate(opt.to)}
            className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
          >
            <CardContent className="flex flex-col items-start gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <opt.icon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{opt.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {opt.description}
                </p>
              </div>
              <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Ingresar
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
