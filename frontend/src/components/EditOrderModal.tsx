import { useMemo, useState } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, Check, X } from 'lucide-react';
import { useProductsForList, useUpdateOrder } from '@/hooks/useApi';
import { formatCurrency, cn } from '@/lib/utils';
import type { CartLine, Order, SellableProduct } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { isAxiosError } from 'axios';

interface EditOrderModalProps {
  order: Order;
  onClose: () => void;
}

/** Construye las líneas iniciales del carrito a partir del pedido. */
function linesFromOrder(order: Order): CartLine[] {
  return order.items.map((item) => ({
    product: {
      sku: item.sku,
      name: item.productName,
      price: Number(item.unitPrice),
      unitOfMeasure: item.unitOfMeasure,
      // Stock real desconocido aquí; el backend valida al guardar.
      stock: Number.MAX_SAFE_INTEGER,
    },
    quantity: Number(item.quantity),
    discountPct: Number(item.discountPct),
    unitPrice: Number(item.unitPrice),
  }));
}

/**
 * Modal para editar un pedido pendiente por envío: permite agregar y quitar
 * productos de la lista del cliente, así como cambiar cantidades y descuentos.
 */
export function EditOrderModal({ order, onClose }: EditOrderModalProps) {
  const [lines, setLines] = useState<CartLine[]>(() => linesFromOrder(order));
  const [notes, setNotes] = useState(order.notes ?? '');
  const [logisticsNote, setLogisticsNote] = useState(order.logisticsNote ?? '');
  const [productSearch, setProductSearch] = useState('');
  const [error, setError] = useState('');

  const { data: products = [] } = useProductsForList(
    productSearch,
    order.customer.priceList,
  );
  const updateOrder = useUpdateOrder();

  const totals = useMemo(() => {
    let subtotal = 0;
    let taxes = 0;
    for (const line of lines) {
      const gross = line.unitPrice * line.quantity;
      const net = gross - (gross * line.discountPct) / 100;
      subtotal += net;
      // El IVA se agrega solo para mostrarlo (el precio base va sin IVA).
      taxes += (net * (line.product.taxRate ?? 0)) / 100;
    }
    return { subtotal, taxes, total: subtotal + taxes };
  }, [lines]);

  const totalUnits = useMemo(
    () => lines.reduce((acc, l) => acc + l.quantity, 0),
    [lines],
  );

  const addProduct = (product: SellableProduct) => {
    if (Number(product.stock) <= 0) return;
    const unitPrice = Number(product.price);
    setLines((prev) => {
      const existing = prev.find((l) => l.product.sku === product.sku);
      if (existing) {
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
    setLines((prev) =>
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
    setLines((prev) =>
      prev.map((l) =>
        l.product.sku === sku
          ? { ...l, discountPct: Math.min(100, Math.max(0, discountPct)) }
          : l,
      ),
    );
  };

  const removeLine = (sku: string) => {
    setLines((prev) => prev.filter((l) => l.product.sku !== sku));
  };

  const handleSave = async () => {
    if (lines.length === 0) {
      setError('El pedido debe tener al menos un producto.');
      return;
    }
    setError('');
    try {
      await updateOrder.mutateAsync({
        orderId: order.id,
        notes: notes.trim() || undefined,
        logisticsNote: logisticsNote.trim() || undefined,
        items: lines.map((l) => ({
          sku: l.product.sku,
          quantity: l.quantity,
          discountPct: l.discountPct,
        })),
      });
      onClose();
    } catch (err) {
      if (isAxiosError(err)) {
        const msg = err.response?.data?.message;
        setError(
          Array.isArray(msg)
            ? msg.join(', ')
            : msg || 'No se pudo guardar el pedido. Intenta de nuevo.',
        );
      } else {
        setError('No se pudo guardar el pedido. Intenta de nuevo.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-lg">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h3 className="text-lg font-semibold">
              Editar pedido #{order.orderNumber}
            </h3>
            <p className="text-sm text-muted-foreground">
              {order.customer.name} · Lista{' '}
              {order.customer.priceListName || order.customer.priceList || '—'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid flex-1 gap-0 overflow-hidden md:grid-cols-2">
          {/* Catálogo de la lista del cliente */}
          <div className="flex flex-col overflow-hidden border-b border-border md:border-b-0 md:border-r">
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Buscar producto por nombre o SKU..."
                  className="pl-9"
                />
              </div>
            </div>
            <div className="max-h-[22rem] flex-1 space-y-1.5 overflow-auto px-4 pb-4">
              {products.length === 0 ? (
                <p className="px-1 py-2 text-sm text-muted-foreground">
                  No hay productos en la lista del cliente.
                </p>
              ) : (
                products.map((p) => {
                  const inCart = lines.find((l) => l.product.sku === p.sku);
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
                            {hasStock ? `Stock ${Number(p.stock)}` : 'Sin stock'}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2.5">
                        <span className="font-semibold">
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
          </div>

          {/* Líneas del pedido */}
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">
                {lines.length === 0
                  ? 'Sin productos'
                  : `${lines.length} producto${lines.length === 1 ? '' : 's'} · ${totalUnits} und.`}
              </p>
            </div>
            <div className="flex-1 space-y-2.5 overflow-auto p-4">
              {lines.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <ShoppingCart className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Agrega productos desde el catálogo.
                  </p>
                </div>
              ) : (
                lines.map((line) => {
                  const lineTotal =
                    line.unitPrice *
                    line.quantity *
                    (1 - line.discountPct / 100);
                  const lineIva =
                    (lineTotal * (line.product.taxRate ?? 0)) / 100;
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
                      <div className="space-y-1 border-t border-border/60 pt-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-semibold">
                            {formatCurrency(lineTotal)}
                          </span>
                        </div>
                        {lineIva > 0 && (
                          <>
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span>IVA ({line.product.taxRate}%)</span>
                              <span>{formatCurrency(lineIva)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Total</span>
                              <span className="font-semibold">
                                {formatCurrency(lineTotal + lineIva)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-border p-4">
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Nota producto (opcional)"
          />
          <Input
            value={logisticsNote}
            onChange={(e) => setLogisticsNote(e.target.value)}
            placeholder="Nota logística (opcional)"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm">
              <span className="text-muted-foreground">Total: </span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(totals.total)}
              </span>
              <span className="ml-1 text-xs text-muted-foreground">
                (subtotal {formatCurrency(totals.subtotal)} + IVA{' '}
                {formatCurrency(totals.taxes)})
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={updateOrder.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateOrder.isPending || lines.length === 0}
              >
                {updateOrder.isPending ? (
                  'Guardando...'
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Guardar cambios
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
