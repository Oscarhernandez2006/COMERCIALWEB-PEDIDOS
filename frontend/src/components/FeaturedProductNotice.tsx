import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useFeaturedProducts } from '@/hooks/useApi';

/** Intervalo del recordatorio (30 minutos). */
const REMINDER_MS = 30 * 60 * 1000;
/** Tiempo que permanece visible cada aviso antes de ocultarse solo. */
const VISIBLE_MS = 20 * 1000;

/**
 * Banner informativo que recuerda a los vendedores, en cualquier módulo y cada
 * 30 minutos, cuál es el producto estrella/favorito del día de la compañía
 * activa. Se puede cerrar y vuelve a aparecer en el siguiente ciclo.
 */
export function FeaturedProductNotice() {
  const { data: featured = [] } = useFeaturedProducts();
  const [visible, setVisible] = useState(false);

  // Aparece al cargar (si hay productos estrella) y luego cada 30 minutos.
  useEffect(() => {
    if (featured.length === 0) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const id = setInterval(() => setVisible(true), REMINDER_MS);
    return () => clearInterval(id);
  }, [featured.length]);

  // Cada vez que se muestra, se oculta solo tras unos segundos.
  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => setVisible(false), VISIBLE_MS);
    return () => clearTimeout(id);
  }, [visible]);

  if (!visible || featured.length === 0) return null;

  const names = featured.map((f) => f.name).join(', ');
  const isSingle = featured.length === 1;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-2xl items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-lg dark:border-amber-500/40 dark:bg-amber-500/10">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400/20">
          <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="min-w-0 flex-1 text-sm text-amber-900 dark:text-amber-200">
          <p className="font-semibold">Notificación · Producto estrella del día</p>
          <p className="mt-0.5">
            {isSingle ? 'Nuestro producto estrella del día es ' : 'Nuestros productos estrella del día son '}
            <span className="font-semibold">{names}</span>. Vendedores, recuerden
            tenerlo en cuenta al momento de crear su pedido.
          </p>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="shrink-0 rounded-md p-1 text-amber-600 transition-colors hover:bg-amber-400/20 hover:text-amber-800 dark:text-amber-400"
          aria-label="Cerrar aviso"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
