import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Check,
  ArrowRight,
  MapPin,
  Phone,
  PackageOpen,
  StickyNote,
  Clock,
  FileText,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { isAxiosError } from 'axios';
import {
  useClients,
  useProductsForList,
  useCreateQuote,
  downloadQuotePdf,
} from '@/hooks/useApi';
import { formatCurrency, cn } from '@/lib/utils';
import type { CartLine, Client, Quote, SellableProduct } from '@/types';
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

export function NewQuotePage() {
  const navigate = useNavigate();
  const [customerSearch, setCustomerSearch] = useState('');
  const [customer, setCustomer] = useState<Client | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [notes, setNotes] = useState('');
  const [validityDays, setValidityDays] = useState(15);
  const [createdQuote, setCreatedQuote] = useState<Quote | null>(null);
  const [submitError, setSubmitError] = useState('');

  const { data: customers = [] } = useClients(customerSearch);
  const { data: products = [] } = useProductsForList(
    productSearch,
    customer?.priceList,
  );
  const createQuote = useCreateQuote();

  const totals = useMemo(() => {
    let subtotal = 0;
    for (const line of cart) {
      const gross = line.unitPrice * line.quantity;
      const net = gross - (gross * line.discountPct) / 100;
      subtotal += net;
    }
    return { subtotal, total: subtotal };
  }, [cart]);

  const addProduct = (product: SellableProduct) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.sku === product.sku);
      if (existing) {
        return prev.map((l) =>
          l.product.sku === product.sku
            ? { ...l, quantity: l.quantity + 1 }
            : l,
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          discountPct: 0,
          unitPrice: product.price,
        },
      ];
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
    let quote: Quote;
    try {
      quote = await createQuote.mutateAsync({
        customerId: customer.id,
        notes: notes || undefined,
        validityDays,
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
            'No se pudo crear la cotización. Intenta de nuevo.',
        );
      } else {
        setSubmitError('No se pudo crear la cotización. Intenta de nuevo.');
      }
      return;
    }
    try {
      await downloadQuotePdf(quote.id, quote.quoteNumber);
    } catch {
      // Si falla la descarga automática, se puede descargar desde Cotizaciones.
    }
    setCreatedQuote(quote);
  };

  // Confirmación tras crear la cotización.
  if (createdQuote) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Cotización generada
          </h2>
          <p className="mt-1 text-muted-foreground">
            La cotización N° {createdQuote.quoteNumber} de{' '}
            {createdQuote.customer.name} se creó correctamente.
          </p>
        </div>
        <Card>
          <CardContent className="space-y-1 p-5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(Number(createdQuote.subtotal))}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Impuestos</span>
              <span>{formatCurrency(Number(createdQuote.taxes))}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-base font-semibold">Total</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(Number(createdQuote.total))}
              </span>
            </div>
            {createdQuote.validUntil && (
              <p className="pt-2 text-xs text-muted-foreground">
                Válida hasta{' '}
                {new Date(createdQuote.validUntil).toLocaleDateString('es-CO')}
              </p>
            )}
          </CardContent>
        </Card>
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            variant="outline"
            onClick={() =>
              downloadQuotePdf(createdQuote.id, createdQuote.quoteNumber)
            }
          >
            <Download className="h-4 w-4" />
            Descargar documento
          </Button>
          <Button onClick={() => navigate('/cotizaciones')}>
            Ir a cotizaciones
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Nueva cotización</h2>
        <p className="text-muted-foreground">
          Elige el cliente y agrega productos con los precios de su lista.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Paso 1 · Cliente */}
          <Card className="overflow-hidden">
            <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-5 py-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                1
              </span>
              <p className="text-sm font-semibold leading-none">Cliente</p>
            </div>
            <CardContent className="space-y-3 p-5">
              {customer ? (
                <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/[0.03] p-4">
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
                          {customer.branch
                            ? ` · Sucursal ${customer.branch}`
                            : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Lista:{' '}
                          <span className="font-medium text-foreground">
                            {customer.priceListName || customer.priceList || '—'}
                          </span>
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCustomer(null);
                          setCart([]);
                        }}
                      >
                        Cambiar
                      </Button>
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
                              <p className="text-xs text-muted-foreground">
                                NIT {c.code} · Lista{' '}
                                {c.priceListName || c.priceList || '—'}
                              </p>
                              {c.address && (
                                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  {c.address}
                                </p>
                              )}
                              {c.phone && (
                                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3 shrink-0" />
                                  {c.phone}
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
                  Precios según la lista del cliente
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
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Buscar producto por nombre o referencia..."
                      className="pl-9"
                    />
                  </div>
                  {productSearch && (
                    <div className="max-h-80 space-y-1 overflow-auto">
                      {products.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground">
                          No se encontraron productos en la lista.
                        </p>
                      ) : (
                        products.map((p) => (
                          <button
                            key={p.sku}
                            onClick={() => addProduct(p)}
                            className="flex w-full items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left text-sm transition-colors hover:border-border hover:bg-accent"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium">{p.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Ref. {p.sku} · {p.unitOfMeasure || 'UND'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-primary">
                                {formatCurrency(p.price)}
                              </span>
                              <Plus className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Resumen / carrito */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-5 py-3">
              <FileText className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold leading-none">
                Resumen de la cotización
              </p>
            </div>
            <CardContent className="space-y-4 p-5">
              {cart.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Aún no has agregado productos.
                </p>
              ) : (
                <div className="space-y-3">
                  {cart.map((line) => (
                    <div
                      key={line.product.sku}
                      className="space-y-2 rounded-lg border border-border p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {line.product.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(line.unitPrice)} c/u
                          </p>
                        </div>
                        <button
                          onClick={() => removeLine(line.product.sku)}
                          className="text-muted-foreground transition-colors hover:text-destructive"
                          aria-label="Quitar"
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
                          <span className="w-8 text-center text-sm font-medium">
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
                            className="h-7 w-16 text-right text-sm"
                          />
                          <span className="text-xs text-muted-foreground">
                            % desc.
                          </span>
                        </div>
                      </div>
                      <p className="text-right text-sm font-semibold">
                        {formatCurrency(
                          line.unitPrice *
                            line.quantity *
                            (1 - line.discountPct / 100),
                        )}
                      </p>
                    </div>
                  ))}
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

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Vigencia de la cotización (días)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={validityDays}
                  onChange={(e) =>
                    setValidityDays(Math.max(1, Number(e.target.value) || 1))
                  }
                />
              </div>

              <div className="relative">
                <StickyNote className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas de la cotización (opcional)"
                  className="pl-9"
                />
              </div>

              {submitError && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {submitError}
                </p>
              )}

              <Button
                className="w-full"
                size="lg"
                disabled={
                  !customer || cart.length === 0 || createQuote.isPending
                }
                onClick={handleSubmit}
              >
                {createQuote.isPending ? (
                  'Generando...'
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Generar cotización
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
