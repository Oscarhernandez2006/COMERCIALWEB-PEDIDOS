import { useState } from 'react';
import { Search, Package } from 'lucide-react';
import { useProducts } from '@/hooks/useApi';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function ProductsPage() {
  const [search, setSearch] = useState('');
  const { data: products = [], isLoading } = useProducts(search);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Productos</h2>
        <p className="text-muted-foreground">
          Catalogo sincronizado desde Siesa.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o SKU..."
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Package className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No hay productos. Sincroniza el catalogo desde Siesa.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium leading-tight">{product.name}</p>
                  <Badge variant="outline">{product.sku}</Badge>
                </div>
                {product.category && (
                  <p className="text-xs text-muted-foreground">
                    {product.category}
                  </p>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">
                    Precio según la lista del cliente
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Stock: {Number(product.stock)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
