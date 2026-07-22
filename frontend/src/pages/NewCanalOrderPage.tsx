import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  UserCircle,
  Plus,
  Trash2,
  Beef,
  CheckCircle2,
  ArrowRight,
  CalendarDays,
  MapPin,
  ListChecks,
} from 'lucide-react';
import { isAxiosError } from 'axios';
import { useClients, useCreateCanalOrder } from '@/hooks/useApi';
import { CANAL_ITEMS } from '@/lib/canal-items';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Client } from '@/types';

/** Fecha de hoy en formato YYYY-MM-DD. */
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

/** Deja dígitos y un único punto decimal. */
function cleanNumeric(value: string): string {
  let clean = value.replace(/[^\d.]/g, '');
  const dot = clean.indexOf('.');
  if (dot !== -1) {
    clean = clean.slice(0, dot + 1) + clean.slice(dot + 1).replace(/\./g, '');
  }
  return clean;
}

interface Line {
  id: number;
  itemRef: string;
  quantity: string;
  specifications: string;
  price: string;
  freight: string;
}

function emptyLine(id: number): Line {
  return {
    id,
    itemRef: CANAL_ITEMS[0].ref,
    quantity: '',
    specifications: '',
    price: '',
    freight: '',
  };
}

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return 'No se pudo montar el pedido de canales.';
}

export function NewCanalOrderPage() {
  const navigate = useNavigate();
  const [customerSearch, setCustomerSearch] = useState('');
  const [customer, setCustomer] = useState<Client | null>(null);
  const [dispatchDate, setDispatchDate] = useState(todayISO());
  const [lines, setLines] = useState<Line[]>([emptyLine(1)]);
  const [nextId, setNextId] = useState(2);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);

  const { data: clients = [], isLoading } = useClients(customerSearch);
  const createMutation = useCreateCanalOrder();

  const setLine = (id: number, patch: Partial<Line>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    setError('');
  };

  const addLine = () => {
    setLines((prev) => [...prev, emptyLine(nextId)]);
    setNextId((n) => n + 1);
  };

  const removeLine = (id: number) => {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  };

  const totalQuantity = useMemo(
    () => lines.reduce((acc, l) => acc + Number(l.quantity || 0), 0),
    [lines],
  );

  const canSubmit =
    !!customer &&
    !!dispatchDate &&
    lines.some((l) => Number(l.quantity || 0) > 0);

  const handleSubmit = async () => {
    if (!customer) {
      setError('Selecciona un cliente.');
      return;
    }
    const validLines = lines.filter((l) => Number(l.quantity || 0) > 0);
    if (validLines.length === 0) {
      setError('Agrega al menos una línea con cantidad.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        dispatchDate,
        clientCode: customer.code.trim(),
        clientName: customer.name,
        clientAddress: customer.address,
        clientCity: customer.city,
        items: validLines.map((l) => {
          const def =
            CANAL_ITEMS.find((i) => i.ref === l.itemRef) ?? CANAL_ITEMS[0];
          return {
            itemRef: def.ref,
            itemName: def.name,
            especie: def.especie,
            quantity: Number(l.quantity || 0),
            specifications: l.specifications.trim(),
            price: Number(l.price || 0),
            freight: Number(l.freight || 0),
          };
        }),
      });
      setCreated(true);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const resetForm = () => {
    setCustomer(null);
    setCustomerSearch('');
    setDispatchDate(todayISO());
    setLines([emptyLine(nextId)]);
    setNextId((n) => n + 1);
    setError('');
    setCreated(false);
  };

  if (created) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-[var(--success)]" />
            <h2 className="text-xl font-bold">Pedido de canales registrado</h2>
            <p className="text-sm text-muted-foreground">
              El pedido quedó guardado en el consolidado de canales.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={resetForm}>
                <Plus className="h-4 w-4" />
                Nuevo pedido
              </Button>
              <Button onClick={() => navigate('/pedidos/canales')}>
                Ver consolidado
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Beef className="h-6 w-6 text-primary" />
            Nuevo pedido de canales
          </h2>
        </div>
        <Button variant="outline" onClick={() => navigate('/pedidos/canales')}>
          Ver consolidado
        </Button>
      </div>

      {/* Cliente */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <UserCircle className="h-4 w-4 text-primary" />
            Cliente
          </h3>
          {customer ? (
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="min-w-0">
                <p className="font-medium">{customer.name}</p>
                <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                  <span>NIT {customer.code.trim()}</span>
                  {customer.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {customer.city}
                    </span>
                  )}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCustomer(null)}
              >
                Cambiar
              </Button>
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
              <div className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                {isLoading ? (
                  <p className="p-3 text-sm text-muted-foreground">Cargando…</p>
                ) : clients.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    No se encontraron clientes.
                  </p>
                ) : (
                  clients.slice(0, 30).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCustomer(c);
                        setError('');
                      }}
                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-muted/50"
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs text-muted-foreground">
                        NIT {c.code.trim()}
                        {c.city ? ` · ${c.city}` : ''}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Fecha de despacho */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Fecha de despacho
            </label>
            <input
              type="date"
              value={dispatchDate}
              onChange={(e) => setDispatchDate(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Líneas del pedido */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <ListChecks className="h-4 w-4 text-primary" />
              Detalle del pedido
            </h3>
            <Button size="sm" variant="outline" onClick={addLine}>
              <Plus className="h-4 w-4" />
              Agregar línea
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="w-44 px-2 py-2 font-medium">Ítem</th>
                  <th className="w-20 px-2 py-2 font-medium">Especie</th>
                  <th className="w-24 px-2 py-2 text-right font-medium">
                    Cantidad
                  </th>
                  <th className="px-2 py-2 font-medium">
                    Especificaciones / Novedades
                  </th>
                  <th className="w-28 px-2 py-2 text-right font-medium">
                    Precio
                  </th>
                  <th className="w-24 px-2 py-2 text-right font-medium">Flete</th>
                  <th className="w-10 px-2 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lines.map((l) => {
                  const def = CANAL_ITEMS.find((i) => i.ref === l.itemRef);
                  return (
                    <tr key={l.id} className="align-top">
                      <td className="px-2 py-2">
                        <select
                          value={l.itemRef}
                          onChange={(e) =>
                            setLine(l.id, { itemRef: e.target.value })
                          }
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                        >
                          {CANAL_ITEMS.map((i) => (
                            <option key={i.ref} value={i.ref}>
                              {i.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium">
                          {def?.especie ?? '—'}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          inputMode="decimal"
                          value={l.quantity}
                          onChange={(e) =>
                            setLine(l.id, {
                              quantity: cleanNumeric(e.target.value),
                            })
                          }
                          placeholder="0"
                          className="w-full rounded-md border border-input bg-background px-2 py-1 text-right tabular-nums outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          value={l.specifications}
                          onChange={(e) =>
                            setLine(l.id, { specifications: e.target.value })
                          }
                          placeholder="Ej. CERDO 60 A 70 KG"
                          className="w-full rounded-md border border-input bg-background px-2 py-1 outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          inputMode="decimal"
                          value={l.price}
                          onChange={(e) =>
                            setLine(l.id, {
                              price: cleanNumeric(e.target.value),
                            })
                          }
                          placeholder="0"
                          className="w-full rounded-md border border-input bg-background px-2 py-1 text-right tabular-nums outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          inputMode="decimal"
                          value={l.freight}
                          onChange={(e) =>
                            setLine(l.id, {
                              freight: cleanNumeric(e.target.value),
                            })
                          }
                          placeholder="0"
                          className="w-full rounded-md border border-input bg-background px-2 py-1 text-right tabular-nums outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeLine(l.id)}
                          disabled={lines.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-border font-semibold">
                <tr>
                  <td className="px-2 py-2" colSpan={2}>
                    Total canales
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {totalQuantity.toLocaleString('es-CO')}
                  </td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/pedidos')}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || createMutation.isPending}
        >
          {createMutation.isPending ? 'Montando…' : 'Montar pedido'}
          {!createMutation.isPending && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
