import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, Download, Eye, X, Clock } from 'lucide-react';
import { useQuotes, downloadQuotePdf } from '@/hooks/useApi';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Quote } from '@/types';

/** Indica si una cotización sigue vigente según su fecha de vencimiento. */
function isExpired(quote: Quote): boolean {
  if (!quote.validUntil) return false;
  return new Date(quote.validUntil).getTime() < Date.now();
}

export function QuotesPage() {
  const { data: quotes = [], isLoading } = useQuotes();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [detailTarget, setDetailTarget] = useState<Quote | null>(null);

  const handleDownload = async (quote: Quote) => {
    setDownloadingId(quote.id);
    try {
      await downloadQuotePdf(quote.id, quote.quoteNumber);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cotizaciones</h2>
          <p className="text-muted-foreground">
            Genera cotizaciones con la lista de precios del cliente.
          </p>
        </div>
        <Button asChild>
          <Link to="/cotizaciones/nueva">
            <Plus className="h-4 w-4" />
            Nueva
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : quotes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aún no tienes cotizaciones.
            </p>
            <Button asChild size="sm" className="mt-2">
              <Link to="/cotizaciones/nueva">
                <Plus className="h-4 w-4" />
                Crear cotización
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {quotes.map((quote) => {
            const expired = isExpired(quote);
            return (
              <Card key={quote.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{quote.quoteNumber}</p>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          expired
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        <Clock className="h-3 w-3" />
                        {expired ? 'Vencida' : 'Vigente'}
                      </span>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {quote.customer.name} · {quote.items.length} items
                    </p>
                    {quote.validUntil && (
                      <p className="text-xs text-muted-foreground">
                        Válida hasta{' '}
                        {new Date(quote.validUntil).toLocaleDateString('es-CO')}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-2 font-semibold">
                      {formatCurrency(Number(quote.total))}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDetailTarget(quote)}
                    >
                      <Eye className="h-4 w-4" />
                      Detalles
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={downloadingId === quote.id}
                      onClick={() => handleDownload(quote)}
                    >
                      <Download className="h-4 w-4" />
                      {downloadingId === quote.id ? 'Generando...' : 'Documento'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de detalle */}
      {detailTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDetailTarget(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border p-5">
              <div>
                <h3 className="text-lg font-semibold">
                  Cotización {detailTarget.quoteNumber}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {detailTarget.customer.name}
                </p>
              </div>
              <button
                onClick={() => setDetailTarget(null)}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="pb-2">Producto</th>
                    <th className="pb-2 text-right">Cant.</th>
                    <th className="pb-2 text-right">Precio</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detailTarget.items.map((item) => (
                    <tr key={item.id} className="border-b border-border/50">
                      <td className="py-2">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.sku}
                          {item.discountPct > 0
                            ? ` · -${Number(item.discountPct)}%`
                            : ''}
                        </p>
                      </td>
                      <td className="py-2 text-right">
                        {Number(item.quantity)}
                      </td>
                      <td className="py-2 text-right">
                        {formatCurrency(Number(item.unitPrice))}
                      </td>
                      <td className="py-2 text-right font-medium">
                        {formatCurrency(Number(item.lineTotal))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(Number(detailTarget.subtotal))}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Impuestos</span>
                  <span>{formatCurrency(Number(detailTarget.taxes))}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-semibold">Total</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(Number(detailTarget.total))}
                  </span>
                </div>
              </div>

              {detailTarget.notes && (
                <div className="mt-4 rounded-lg border border-border p-3 text-sm">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Notas
                  </p>
                  <p className="mt-1">{detailTarget.notes}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-border p-4">
              <Button
                variant="outline"
                onClick={() => handleDownload(detailTarget)}
                disabled={downloadingId === detailTarget.id}
              >
                <Download className="h-4 w-4" />
                Documento
              </Button>
              <Button onClick={() => setDetailTarget(null)}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
