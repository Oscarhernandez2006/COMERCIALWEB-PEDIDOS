import { useId } from 'react';
import { formatCurrency } from '@/lib/utils';

interface Point {
  date: string;
  revenue: number;
  orders: number;
  /** Etiqueta a mostrar en el eje X (p. ej. la hora en vista intradía). */
  label?: string;
}

/**
 * Gráfico de área de ventas (SVG puro, sin dependencias).
 * Muestra la evolución de ingresos por día.
 */
export function SalesTrendChart({ data }: { data: Point[] }) {
  const gradientId = useId();
  const width = 760;
  const height = 220;
  const padX = 8;
  const padY = 24;

  const max = Math.max(1, ...data.map((d) => d.revenue));
  const stepX =
    data.length > 1 ? (width - padX * 2) / (data.length - 1) : 0;

  const toX = (i: number) => padX + i * stepX;
  const toY = (v: number) =>
    height - padY - (v / max) * (height - padY * 2);

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(d.revenue)}`)
    .join(' ');

  const areaPath =
    data.length > 0
      ? `${linePath} L ${toX(data.length - 1)} ${height - padY} L ${toX(0)} ${
          height - padY
        } Z`
      : '';

  const hasData = data.some((d) => d.revenue > 0);

  const fmtDay = (iso: string) => {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  };

  // Usa la etiqueta provista (p. ej. la hora) o formatea la fecha por día.
  const fmtLabel = (p: Point) => p.label ?? fmtDay(p.date);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Tendencia de ventas"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--primary)"
              stopOpacity="0.35"
            />
            <stop
              offset="100%"
              stopColor="var(--primary)"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        {/* Líneas guía horizontales */}
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={padX}
            x2={width - padX}
            y1={padY + t * (height - padY * 2)}
            y2={padY + t * (height - padY * 2)}
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
        ))}

        {hasData && (
          <>
            <path d={areaPath} fill={`url(#${gradientId})`} />
            <path
              d={linePath}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {data.map((d, i) =>
              d.revenue > 0 ? (
                <circle
                  key={d.date}
                  cx={toX(i)}
                  cy={toY(d.revenue)}
                  r="3"
                  fill="var(--primary)"
                />
              ) : null,
            )}
          </>
        )}
      </svg>

      <div className="mt-1 flex justify-between px-1 text-[10px] text-muted-foreground">
        {data
          .filter((d, i) => (d.label ? true : i % 2 === 0))
          .map((d) => (
            <span key={d.date}>{fmtLabel(d)}</span>
          ))}
      </div>

      {!hasData && (
        <p className="-mt-32 mb-24 text-center text-sm text-muted-foreground">
          Sin ventas registradas todavía.
        </p>
      )}

      <p className="sr-only">Máximo: {formatCurrency(max)}</p>
    </div>
  );
}
