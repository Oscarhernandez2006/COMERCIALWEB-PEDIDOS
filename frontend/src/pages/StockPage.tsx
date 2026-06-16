import { useState } from 'react';
import { Search, Boxes, Download, PackageOpen } from 'lucide-react';
import { useProductsInStock, downloadStockPdf } from '@/hooks/useApi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * Disponibilidad de stock para el vendedor: muestra solo los productos que
 * tienen existencias (sin importar lista de precios) y permite descargar un
 * PDF para compartir con los clientes lo que hay disponible hoy.
 */
export function StockPage() {
  const [search, setSearch] = useState('');
  const [downloading, setDownloading] = useState(false);
  const { data: products = [], isLoading } = useProductsInStock(search);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadStockPdf();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Disponibilidad</h2>
          <p className="text-muted-foreground">
            Productos con existencias para vender hoy. Descarga el PDF para
            compartirlo con tus clientes.
          </p>
        </div>
        <Button onClick={handleDownload} disabled={downloading}>
          <Download className={downloading ? 'h-4 w-4 animate-pulse' : 'h-4 w-4'} />
          {downloading ? 'Generando...' : 'Descargar PDF'}
        </Button>
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
            <PackageOpen className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {search
                ? 'No hay productos disponibles con esa búsqueda.'
                : 'No hay productos con existencias en este momento.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {products.length} referencia{products.length === 1 ? '' : 's'}{' '}
            disponible{products.length === 1 ? '' : 's'}.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Card key={product.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium leading-tight">{product.name}</p>
                    <Badge variant="outline">{product.sku}</Badge>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    {product.unitOfMeasure ? (
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                        {product.unitOfMeasure}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--success)]">
                      <Boxes className="h-3 w-3" />
                      {Number(product.stock)} disp.
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
