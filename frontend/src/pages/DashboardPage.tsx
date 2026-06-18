import { Link } from 'react-router-dom';
import { ShoppingCart, ClipboardList, Package } from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { useOrders } from '@/hooks/useApi';
import { formatCurrency } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';

export function DashboardPage() {
  const { user } = useAuth();
  const { data: orders = [] } = useOrders();

  const today = new Date().toDateString();
  const ordersToday = orders.filter(
    (o) => new Date(o.createdAt).toDateString() === today,
  );
  const totalToday = ordersToday.reduce((sum, o) => sum + Number(o.total), 0);
  const pending = orders.filter(
    (o) => o.status === 'draft' || o.status === 'confirmed',
  ).length;

  const stats = [
    {
      label: 'Pedidos hoy',
      value: ordersToday.length.toString(),
      icon: ClipboardList,
    },
    {
      label: 'Venta hoy',
      value: formatCurrency(totalToday),
      icon: ShoppingCart,
    },
    { label: 'Pendientes', value: pending.toString(), icon: Package },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Hola, {user?.name?.split(' ')[0]} 👋
        </h2>
        <p className="text-muted-foreground">
          Este es el resumen de tu actividad comercial.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/pedidos/nuevo">
            <ShoppingCart className="h-4 w-4" />
            Nuevo pedido
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aun no tienes pedidos. Crea el primero.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {orders.slice(0, 6).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="font-medium">{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.customer.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold">
                      {formatCurrency(Number(order.total))}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
