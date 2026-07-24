import { useEffect, useRef, useState } from 'react';
import {
  Package,
  Check,
  AlertCircle,
  AlertTriangle,
  Search,
  Building2,
  Upload,
  Download,
  Pencil,
  X,
} from 'lucide-react';
import { isAxiosError } from 'axios';
import {
  useCompanyProducts,
  useImportInventory,
  useUpdateStock,
  downloadInventoryTemplate,
} from '@/hooks/useAdminApi';
import { useCompany } from '@/company/useCompany';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

/** Extrae el mensaje de error que envía el backend, si lo hay. */
function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return 'No se pudo cargar el archivo. Verifica el formato.';
}

export function InventoryPage() {
  // Solo las compañías a las que el usuario tiene acceso (admin = todas).
  const { companies } = useCompany();
  const [companyId, setCompanyId] = useState('');
  const [search, setSearch] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  // Archivo seleccionado pendiente de confirmar el cargue.
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  // Tipo de inventario a gestionar/cargar: cortes o subproductos.
  const [invType, setInvType] = useState<'corte' | 'subproducto'>('corte');

  // Selecciona la primera compañía disponible (o ajusta si la actual ya no es válida).
  useEffect(() => {
    if (companies.length > 0 && !companies.some((c) => c.id === companyId)) {
      setCompanyId(companies[0].id);
    }
  }, [companies, companyId]);

  // El inventario de subproductos se administra en AGROPECUARIA.
  const supportsSubproductos = companyId === '3';
  const effectiveType = supportsSubproductos ? invType : 'corte';

  const { data: products = [], isLoading } = useCompanyProducts(
    companyId,
    search,
    effectiveType,
  );
  const importInventory = useImportInventory();
  const updateStock = useUpdateStock();

  const company = companies.find((c) => c.id === companyId);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // No se carga de inmediato: primero se pide confirmación.
    if (file) setPendingFile(file);
    e.target.value = '';
  }

  function confirmImport() {
    if (!pendingFile) return;
    importInventory.mutate({
      companyId,
      file: pendingFile,
      type: effectiveType,
    });
    setPendingFile(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Inventario</h2>
        <p className="text-muted-foreground">
          Carga diaria del inventario desde Excel. Solo el stock es editable
          desde la web.
        </p>
      </div>

      {/* Selector de compañía */}
      <div className="flex flex-wrap gap-2">
        {companies.map((c) => (
          <button
            key={c.id}
            onClick={() => setCompanyId(c.id)}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
              companyId === c.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-accent',
            )}
          >
            <Building2 className="h-4 w-4" />
            {c.name}
            <span className="text-xs opacity-70">#{c.id}</span>
          </button>
        ))}
      </div>

      {/* Selector de tipo de inventario (solo MONTERIA TAT AGROPECUARIA) */}
      {supportsSubproductos && (
        <div className="inline-flex rounded-lg border border-input p-1">
          <button
            type="button"
            onClick={() => setInvType('corte')}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              invType === 'corte'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Cortes
          </button>
          <button
            type="button"
            onClick={() => setInvType('subproducto')}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              invType === 'subproducto'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Subproductos
          </button>
        </div>
      )}

      {/* Acciones de inventario */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Inventario · {company?.name}</p>
                <p className="text-xs text-muted-foreground">
                  La carga reemplaza todo el inventario de la compañía.
                </p>
              </div>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFile}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={importInventory.isPending}
                onClick={() => fileRef.current?.click()}
              >
                <Upload
                  className={cn(
                    'h-4 w-4',
                    importInventory.isPending && 'animate-pulse',
                  )}
                />
                Cargar Excel
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadInventoryTemplate()}
              >
                <Download className="h-4 w-4" />
                Descargar plantilla
              </Button>
            </div>

            {importInventory.isSuccess && (
              <p className="flex items-center gap-1 text-xs text-[var(--success)]">
                <Check className="h-3 w-3" />
                {importInventory.data.total} productos cargados (
                {importInventory.data.created} nuevos,{' '}
                {importInventory.data.updated} actualizados,{' '}
                {importInventory.data.removed} retirados)
              </p>
            )}
            {importInventory.isError && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                {getErrorMessage(importInventory.error)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Listado de productos */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">
            Productos de {company?.name}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {products.length}
            </span>
          </CardTitle>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar producto..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Cargando inventario...
            </p>
          ) : products.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                No hay productos en {company?.name}.
              </p>
              <p className="text-xs text-muted-foreground">
                Carga la plantilla de Excel para cargar el inventario.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-6 py-2 font-medium">Referencia</th>
                    <th className="px-6 py-2 font-medium">Producto</th>
                    <th className="px-6 py-2 text-right font-medium">Stock</th>
                    <th className="px-6 py-2 text-right font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <StockRow
                      key={p.id}
                      product={p}
                      onSave={(stock) =>
                        updateStock.mutate({ companyId, id: p.id, stock })
                      }
                      saving={updateStock.isPending}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de confirmación del cargue */}
      {pendingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--warning,#f59e0b)]/10">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold">Confirmar cargue de inventario</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Este es un <strong className="text-foreground">cargue nuevo</strong>{' '}
                  que <strong className="text-foreground">reemplaza por completo</strong>{' '}
                  el inventario de{' '}
                  <strong className="text-foreground">{company?.name}</strong>.{' '}
                  <strong className="text-amber-600 dark:text-amber-500">
                    No se suma
                  </strong>{' '}
                  al stock actual.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="flex items-center gap-2">
                <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{pendingFile.name}</span>
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setPendingFile(null)}
                disabled={importInventory.isPending}
              >
                Cancelar
              </Button>
              <Button onClick={confirmImport} disabled={importInventory.isPending}>
                {importInventory.isPending ? 'Cargando...' : 'Sí, reemplazar inventario'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StockRowProps {
  product: Product;
  onSave: (stock: number) => void;
  saving: boolean;
}

function StockRow({ product, onSave, saving }: StockRowProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(product.stock));

  function save() {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && parsed !== Number(product.stock)) {
      onSave(parsed);
    }
    setEditing(false);
  }

  return (
    <tr className="border-b border-border/60 last:border-0 hover:bg-muted/40">
      <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
        {product.sku}
      </td>
      <td className="px-6 py-3 font-medium">{product.name}</td>
      <td className="px-6 py-3 text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-1">
            <Input
              type="number"
              autoFocus
              className="h-8 w-24 text-right"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save();
                if (e.key === 'Escape') {
                  setValue(String(product.stock));
                  setEditing(false);
                }
              }}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              disabled={saving}
              onClick={save}
            >
              <Check className="h-4 w-4 text-[var(--success)]" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => {
                setValue(String(product.stock));
                setEditing(false);
              }}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <button
            className="group inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-accent"
            onClick={() => setEditing(true)}
          >
            <span className="font-medium">{Number(product.stock)}</span>
            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        )}
      </td>
      <td className="px-6 py-3 text-right">
        <Badge variant={product.active ? 'success' : 'secondary'}>
          {product.active ? 'Activo' : 'Inactivo'}
        </Badge>
      </td>
    </tr>
  );
}
