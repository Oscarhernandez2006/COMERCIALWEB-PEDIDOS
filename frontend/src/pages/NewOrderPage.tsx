import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Check,
  MapPin,
  Phone,
  Mail,
  Tag,
  CreditCard,
  Building,
  UserCircle,
  CheckCircle2,
  Download,
  Package,
  ClipboardCheck,
  ArrowRight,
  AlertCircle,
  PackageOpen,
  Boxes,
  StickyNote,
  Clock,
} from 'lucide-react';
import { isAxiosError } from 'axios';
import {
  useClients,
  useProductsForList,
  useCreateOrder,
  downloadOrderPdf,
} from '@/hooks/useApi';
import { formatCurrency, cn } from '@/lib/utils';
import { getMinOrderTotal } from '@/lib/companies';
import { useCompany } from '@/company/useCompany';
import type { CartLine, Client, Order, SellableProduct } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/** Iniciales para el avatar del cliente. */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

const STEPS = [
  { n: 1, label: 'Cliente', icon: UserCircle },
  { n: 2, label: 'Productos', icon: Package },
  { n: 3, label: 'Confirmar', icon: ClipboardCheck },
] as const;

export function NewOrderPage() {
  const navigate = useNavigate();
  const [customerSearch, setCustomerSearch] = useState('');
  const [customer, setCustomer] = useState<Client | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [notes, setNotes] = useState('');
  const [deliverySchedule, setDeliverySchedule] = useState('');
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [submitError, setSubmitError] = useState('');

  const { data: customers = [] } = useClients(customerSearch);
  const { data: products = [] } = useProductsForList(
    productSearch,
    customer?.priceList,
  );
  const createOrder = useCreateOrder();

  const totals = useMemo(() => {
    let subtotal = 0;
    for (const line of cart) {
      const gross = line.unitPrice * line.quantity;
      const net = gross - (gross * line.discountPct) / 100;
      subtotal += net;
    }
    return {
      subtotal,
      total: subtotal,
    };
  }, [cart]);

  // Tope mínimo de pedido según la compañía activa.
  const { company } = useCompany();
  const minOrderTotal = getMinOrderTotal(company?.id);
  const belowMinimum = minOrderTotal > 0 && totals.total < minOrderTotal;

  const totalUnits = useMemo(
    () => cart.reduce((acc, l) => acc + l.quantity, 0),
    [cart],
  );

  // Paso actual del flujo guiado (para el stepper).
  const currentStep = !customer ? 1 : cart.length === 0 ? 2 : 3;

  const addProduct = (product: SellableProduct) => {
    // No se puede vender lo que no hay en inventario.
    if (Number(product.stock) <= 0) return;
    const unitPrice = Number(product.price);
    setCart((prev) => {
      const existing = prev.find((l) => l.product.sku === product.sku);
      if (existing) {
        // Se vende de uno en uno: cada toque suma una unidad.
        return prev.map((l) =>
          l.product.sku === product.sku
            ? { ...l, quantity: l.quantity + 1 }
            : l,
        );
      }
      return [...prev, { product, quantity: 1, discountPct: 0, unitPrice }];
    });
  };

  const updateQty = (sku: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.product.sku === sku
            ? { ...l, quantity: Math.max(0, l.quantity + delta) }
            : l,
        )
        .filter((l) => l.quantity > 0),
    );
  };

  const updateDiscount = (sku: string, discountPct: number) => {
    setCart((prev) =>
      prev.map((l) =>
        l.product.sku === sku
          ? { ...l, discountPct: Math.min(100, Math.max(0, discountPct)) }
          : l,
      ),
    );
  };

  const removeLine = (sku: string) => {
    setCart((prev) => prev.filter((l) => l.product.sku !== sku));
  };

  const handleSubmit = async () => {
    if (!customer || cart.length === 0) return;
    setSubmitError('');
    let order: Order;
    try {
      order = await createOrder.mutateAsync({
        customerId: customer.id,
        notes: notes || undefined,
        deliverySchedule: deliverySchedule || undefined,
        items: cart.map((l) => ({
          sku: l.product.sku,
          quantity: l.quantity,
          discountPct: l.discountPct,
        })),
      });
    } catch (err) {
      if (isAxiosError(err)) {
        const msg = err.response?.data?.message;
        setSubmitError(
          (Array.isArray(msg) ? msg.join(', ') : msg) ||
            'No se pudo crear el pedido. Intenta de nuevo.',
        );
      } else {
        setSubmitError('No se pudo crear el pedido. Intenta de nuevo.');
      }
      return;
    }
    // Genera/descarga el documento y muestra la confirmación.
    try {
      await downloadOrderPdf(order.id, order.orderNumber);
    } catch {
      // Si falla la descarga automática, igual se puede descargar desde Pedidos.
    }
    setCreatedOrder(order);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado + stepper guiado */}
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Nuevo pedido</h2>
          <p className="text-muted-foreground">
            Sigue los pasos: elige el cliente, agrega productos y confirma.
          </p>
        </div>

        <ol className="flex items-center gap-2">
          {STEPS.map((step, i) => {
            const done = currentStep > step.n;
            const active = currentStep === step.n;
            return (
              <li key={step.n} className="flex flex-1 items-center gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                      done &&
                        'border-primary bg-primary text-primary-foreground',
                      active &&
                        'border-primary bg-primary/10 text-primary ring-4 ring-primary/10',
                      !done &&
                        !active &&
                        'border-border bg-card text-muted-foreground',
                    )}
                  >
                    {done ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <step.icon className="h-4 w-4" />
                    )}
                  </span>
                  <div className="hidden sm:block">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Paso {step.n}
                    </p>
                    <p
                      className={cn(
                        'text-sm font-semibold leading-none',
                        active || done
                          ? 'text-foreground'
                          : 'text-muted-foreground',
                      )}
                    >
                      {step.label}
                    </p>
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 flex-1 rounded-full transition-colors',
                      done ? 'bg-primary' : 'bg-border',
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Paso 1 · Cliente */}
          <Card className="overflow-hidden">
            <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-5 py-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                1
              </span>
              <div>
                <p className="text-sm font-semibold leading-none">Cliente</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Define la cartera y la lista de precios del pedido
                </p>
              </div>
            </div>
            <CardContent className="space-y-3 p-5">
              {customer ? (
                <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
                      {initials(customer.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold leading-tight">
                            {customer.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            NIT {customer.code}
                            {customer.branch ? ` · Sucursal ${customer.branch}` : ''}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCustomer(null);
                            setCart([]);
                            setProductSearch('');
                          }}
                        >
                          Cambiar
                        </Button>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        <p className="flex items-center gap-2">
                          <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
                          {customer.priceList ? (
                            <span>
                              Lista de precios:{' '}
                              <span className="font-medium text-[var(--success)]">
                                {customer.priceListName || customer.priceList}
                              </span>
                            </span>
                          ) : (
                            <span className="font-medium text-destructive">
                              Sin lista de precios
                            </span>
                          )}
                        </p>
                        <p className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
                          {customer.paymentTerm ? (
                            <span>
                              Cond. pago:{' '}
                              <span className="font-medium text-[var(--success)]">
                                {customer.paymentTerm}
                              </span>
                            </span>
                          ) : (
                            <span>Sin condición de pago</span>
                          )}
                        </p>
                        <p className="flex items-center gap-2">
                          <UserCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                          {customer.sellerCode ? (
                            <span>
                              Vendedor:{' '}
                              <span className="font-medium text-[var(--success)]">
                                {customer.sellerName || customer.sellerCode}
                              </span>
                              {customer.sellerName ? ` (${customer.sellerCode})` : ''}
                            </span>
                          ) : (
                            <span>Sin vendedor</span>
                          )}
                        </p>
                        <p className="flex items-center gap-2">
                          <Building className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span>
                            Sucursal:{' '}
                            <span className="font-medium text-[var(--success)]">
                              {customer.branchName || customer.branch || '—'}
                            </span>
                            {customer.branchName && customer.branch
                              ? ` (${customer.branch})`
                              : ''}
                          </span>
                        </p>
                        {customer.address && (
                          <p className="flex items-center gap-2 sm:col-span-2">
                            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span>
                              Dirección:{' '}
                              <span className="font-medium text-[var(--success)]">
                                {customer.address}
                              </span>
                            </span>
                          </p>
                        )}
                        {customer.neighborhood && (
                          <p className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span>
                              Barrio:{' '}
                              <span className="font-medium text-[var(--success)]">
                                {customer.neighborhood}
                              </span>
                            </span>
                          </p>
                        )}
                        {customer.city && (
                          <p className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span>
                              Ciudad:{' '}
                              <span className="font-medium text-[var(--success)]">
                                {customer.city}
                              </span>
                            </span>
                          </p>
                        )}
                        {customer.department && (
                          <p className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span>
                              Departamento:{' '}
                              <span className="font-medium text-[var(--success)]">
                                {customer.department}
                              </span>
                            </span>
                          </p>
                        )}
                        {customer.phone && (
                          <p className="flex items-center gap-2">
                            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span>
                              Teléfono:{' '}
                              <span className="font-medium text-[var(--success)]">
                                {customer.phone}
                              </span>
                            </span>
                          </p>
                        )}
                        {customer.email && (
                          <p className="flex items-center gap-2 break-all">
                            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span>
                              Email:{' '}
                              <span className="font-medium text-[var(--success)]">
                                {customer.email}
                              </span>
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Buscar cliente por nombre o NIT..."
                      className="pl-9"
                    />
                  </div>
                  {customerSearch ? (
                    <div className="max-h-80 space-y-1 overflow-auto">
                      {customers.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground">
                          No se encontraron clientes en tu cartera.
                        </p>
                      ) : (
                        customers.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setCustomer(c);
                              setCustomerSearch('');
                            }}
                            className="flex w-full items-start gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left text-sm transition-colors hover:border-border hover:bg-accent"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                              {initials(c.name)}
                            </div>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <p className="truncate font-medium">{c.name}</p>
                              <p className="text-xs font-medium text-foreground">
                                Sucursal:{' '}
                                <span className="text-[var(--success)]">
                                  {c.branchName || c.branch || '—'}
                                </span>
                                {c.branchName && c.branch ? ` (${c.branch})` : ''}
                                <span className="text-muted-foreground">
                                  {' '}
                                  · NIT {c.code}
                                </span>
                              </p>
                              <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                <span>
                                  Lista:{' '}
                                  <span className="font-medium text-[var(--success)]">
                                    {c.priceListName || c.priceList || '—'}
                                  </span>
                                </span>
                                <span>
                                  · Cond. pago:{' '}
                                  <span className="font-medium text-[var(--success)]">
                                    {c.paymentTerm || '—'}
                                  </span>
                                </span>
                                <span>
                                  · Vendedor:{' '}
                                  <span className="font-medium text-[var(--success)]">
                                    {c.sellerName || c.sellerCode || '—'}
                                  </span>
                                  {c.sellerName && c.sellerCode
                                    ? ` (${c.sellerCode})`
                                    : ''}
                                </span>
                              </div>
                              {c.address && (
                                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  Dirección:{' '}
                                  <span className="font-medium text-[var(--success)]">
                                    {c.address}
                                  </span>
                                </p>
                              )}
                              {(c.neighborhood || c.city || c.department) && (
                                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  Ubicación:{' '}
                                  <span className="font-medium text-[var(--success)]">
                                    {[c.neighborhood, c.city, c.department]
                                      .filter(Boolean)
                                      .join(', ')}
                                  </span>
                                </p>
                              )}
                              {c.phone && (
                                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3 shrink-0" />
                                  Teléfono:{' '}
                                  <span className="font-medium text-[var(--success)]">
                                    {c.phone}
                                  </span>
                                </p>
                              )}
                              {c.email && (
                                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                  <Mail className="h-3 w-3 shrink-0" />
                                  Email:{' '}
                                  <span className="font-medium text-[var(--success)]">
                                    {c.email}
                                  </span>
                                </p>
                              )}
                            </div>
                            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          </button>
                        ))
                      )}
                    </div>
                  ) : (
                    <p className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
                      <Search className="h-3.5 w-3.5 shrink-0" />
                      Escribe el nombre o NIT del cliente para empezar.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Paso 2 · Productos */}
          <Card className={cn('overflow-hidden', !customer && 'opacity-60')}>
            <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-5 py-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                2
              </span>
              <div>
                <p className="text-sm font-semibold leading-none">Productos</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Precios según la lista del cliente · stock en tiempo real
                </p>
              </div>
            </div>
            <CardContent className="space-y-3 p-5">
              {!customer ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <PackageOpen className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Selecciona primero un cliente para ver los precios de su
                    lista.
                  </p>
                </div>
              ) : !customer.priceList ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 py-8 text-center">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <p className="px-4 text-sm font-medium text-destructive">
                    El cliente no tiene una lista de precios asignada. No es
                    posible tomar el pedido.
                  </p>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Buscar producto por nombre o SKU..."
                      className="pl-9"
                    />
                  </div>
                  <div className="max-h-[26rem] space-y-1.5 overflow-auto pr-0.5">
                    {products.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground">
                        No hay productos en la lista del cliente.
                      </p>
                    ) : (
                      products.map((p) => {
                        const inCart = cart.find(
                          (l) => l.product.sku === p.sku,
                        );
                        const hasStock = Number(p.stock) > 0;
                        return (
                          <button
                            key={p.sku}
                            onClick={() => addProduct(p)}
                            disabled={!hasStock}
                            className={cn(
                              'group flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                              !hasStock
                                ? 'cursor-not-allowed border-border opacity-60'
                                : inCart
                                  ? 'border-primary bg-primary/[0.06]'
                                  : 'border-border hover:border-primary/40 hover:bg-accent',
                            )}
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium">{p.name}</p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                                <span className="font-mono text-muted-foreground">
                                  {p.sku}
                                </span>
                                {p.unitOfMeasure && (
                                  <span className="rounded bg-secondary px-1.5 py-0.5 font-semibold text-secondary-foreground">
                                    {p.unitOfMeasure}
                                  </span>
                                )}
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium',
                                    hasStock
                                      ? 'bg-[var(--success)]/10 text-[var(--success)]'
                                      : 'bg-destructive/10 text-destructive',
                                  )}
                                >
                                  <Boxes className="h-3 w-3" />
                                  {hasStock
                                    ? `Stock ${Number(p.stock)}`
                                    : 'Sin stock'}
                                </span>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2.5">
                              <span
                                className={cn(
                                  'font-semibold',
                                  hasStock
                                    ? 'text-foreground'
                                    : 'text-muted-foreground',
                                )}
                              >
                                {formatCurrency(Number(p.price))}
                              </span>
                              {hasStock && (
                                <span
                                  className={cn(
                                    'flex h-7 w-7 items-center justify-center rounded-full transition-colors',
                                    inCart
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground',
                                  )}
                                >
                                  {inCart ? (
                                    <span className="text-xs font-bold">
                                      {inCart.quantity}
                                    </span>
                                  ) : (
                                    <Plus className="h-4 w-4" />
                                  )}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Paso 3 · Carrito / resumen */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6 overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-border bg-primary/5 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ShoppingCart className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold leading-none">
                    Resumen del pedido
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {cart.length === 0
                      ? 'Aún sin productos'
                      : `${cart.length} producto${cart.length === 1 ? '' : 's'} · ${totalUnits} und.`}
                  </p>
                </div>
              </div>
            </div>
            <CardContent className="space-y-4 p-5">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <ShoppingCart className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Toca un producto para agregarlo al pedido.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {cart.map((line) => {
                    const lineTotal =
                      line.unitPrice *
                      line.quantity *
                      (1 - line.discountPct / 100);
                    return (
                      <div
                        key={line.product.sku}
                        className="space-y-2.5 rounded-lg border border-border p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-tight">
                              {line.product.name}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span>{formatCurrency(line.unitPrice)} c/u</span>
                              {line.product.unitOfMeasure && (
                                <span className="rounded bg-secondary px-1.5 py-0.5 font-semibold text-secondary-foreground">
                                  {line.product.unitOfMeasure}
                                </span>
                              )}
                            </p>
                          </div>
                          <button
                            onClick={() => removeLine(line.product.sku)}
                            className="text-muted-foreground transition-colors hover:text-destructive"
                            aria-label="Quitar producto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQty(line.product.sku, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-semibold">
                              {line.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQty(line.product.sku, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={line.discountPct}
                              onChange={(e) =>
                                updateDiscount(
                                  line.product.sku,
                                  Number(e.target.value),
                                )
                              }
                              className="h-7 w-14 text-right text-xs"
                            />
                            <span className="text-xs text-muted-foreground">
                              % dto
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-semibold">
                            {formatCurrency(lineTotal)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-1.5 border-t border-border pt-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-semibold">Total</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(totals.total)}
                  </span>
                </div>
              </div>

              <div className="relative">
                <StickyNote className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas del pedido (opcional)"
                  className="pl-9"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Horario de recibido de pedidos
                </label>
                <p className="text-xs text-muted-foreground">
                  Días y horas en que el cliente puede recibir la mercancía.
                </p>
                <Input
                  value={deliverySchedule}
                  onChange={(e) => setDeliverySchedule(e.target.value)}
                  placeholder="Ej: Lunes a viernes de 7 am a 5 pm"
                />
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={
                  !customer ||
                  cart.length === 0 ||
                  belowMinimum ||
                  createOrder.isPending
                }
                onClick={handleSubmit}
              >
                {createOrder.isPending ? (
                  'Guardando...'
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Crear pedido
                  </>
                )}
              </Button>
              {submitError ? (
                <p className="flex items-start gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-center text-xs text-destructive">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{submitError}</span>
                </p>
              ) : belowMinimum ? (
                <p className="flex items-start gap-1.5 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/5 px-3 py-2 text-center text-xs text-[var(--warning)]">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    El pedido mínimo para esta compañía es{' '}
                    {formatCurrency(minOrderTotal)}. Te faltan{' '}
                    {formatCurrency(minOrderTotal - totals.total)}.
                  </span>
                </p>
              ) : (
                cart.length > 0 && (
                  <p className="text-center text-xs text-muted-foreground">
                    Al crear el pedido se generará el documento PDF.
                  </p>
                )
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de confirmación del pedido creado */}
      {createdOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success)]/10">
                <CheckCircle2 className="h-9 w-9 text-[var(--success)]" />
              </div>
              <h3 className="text-lg font-semibold">¡Pedido creado!</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Pedido N° {createdOrder.orderNumber} registrado correctamente.
                El documento se descargó automáticamente.
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight">
                {formatCurrency(Number(createdOrder.total))}
              </p>
            </div>

            {createdOrder.status === 'pending_approval' && (
              <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                <p className="font-medium">Pendiente por aprobación en cartera</p>
                <p className="mt-1 text-xs">
                  El cliente registra cartera pendiente, por lo que el pedido
                  quedó retenido. Cartera tiene 2 horas para aprobarlo o será
                  desaprobado automáticamente.
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  downloadOrderPdf(
                    createdOrder.id,
                    createdOrder.orderNumber,
                  )
                }
              >
                <Download className="h-4 w-4" />
                Descargar documento
              </Button>
              <Button onClick={() => navigate('/pedidos')}>
                Ir a pedidos
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
