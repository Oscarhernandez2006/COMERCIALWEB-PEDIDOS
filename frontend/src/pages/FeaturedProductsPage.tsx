import { useMemo, useState } from 'react';
import { Search, Star, X, Sparkles } from 'lucide-react';
import {
  useProducts,
  useFeaturedProducts,
  useAddFeaturedProduct,
  useRemoveFeaturedProduct,
} from '@/hooks/useApi';
import { useCompany } from '@/company/useCompany';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export function FeaturedProductsPage() {
  const { company } = useCompany();
  const [search, setSearch] = useState('');
  const { data: products = [], isLoading } = useProducts(search);
  const { data: featured = [] } = useFeaturedProducts();
  const addFeatured = useAddFeaturedProduct();
  const removeFeatured = useRemoveFeaturedProduct();

  const featuredSkus = useMemo(
    () => new Set(featured.map((f) => f.sku)),
    [featured],
  );

  const toggle = (sku: string, name: string) => {
    if (featuredSkus.has(sku)) {
      removeFeatured.mutate(sku);
    } else {
      addFeatured.mutate({ sku, name });
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Sparkles className="h-6 w-6 text-amber-500" />
          Productos estrella
        </h2>
        <p className="text-muted-foreground">
          Marca uno o varios productos como estrella/favorito del día para{' '}
          <span className="font-medium text-foreground">
            {company?.name ?? 'la compañía'}
          </span>
          . Los vendedores los verán de primero y recibirán un aviso si crean un
          pedido sin incluirlos.
        </p>
      </div>

      {/* Productos estrella actuales */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <h3 className="text-sm font-semibold">
            Marcados actualmente ({featured.length})
          </h3>
          {featured.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay productos marcados como estrella.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {featured.map((f) => (
                <span
                  key={f.sku}
                  className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800"
                >
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                  <span className="max-w-[16rem] truncate">{f.name}</span>
                  <button
                    onClick={() => removeFeatured.mutate(f.sku)}
                    className="text-amber-500 transition-colors hover:text-amber-700"
                    aria-label={`Quitar ${f.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Buscador y catálogo */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto por nombre o SKU..."
              className="pl-9"
            />
          </div>

          <div className="max-h-[30rem] space-y-1.5 overflow-auto pr-0.5">
            {isLoading ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                Cargando productos...
              </p>
            ) : products.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                No se encontraron productos.
              </p>
            ) : (
              products.map((p) => {
                const isFeatured = featuredSkus.has(p.sku);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.sku, p.name)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                      isFeatured
                        ? 'border-amber-300 bg-amber-50'
                        : 'border-border hover:border-amber-300/60 hover:bg-accent',
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.name}</p>
                      <span className="font-mono text-xs text-muted-foreground">
                        {p.sku}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors',
                        isFeatured
                          ? 'bg-amber-400 text-amber-950'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <Star
                        className={cn(
                          'h-3.5 w-3.5',
                          isFeatured && 'fill-amber-950',
                        )}
                      />
                      {isFeatured ? 'Estrella' : 'Marcar'}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
