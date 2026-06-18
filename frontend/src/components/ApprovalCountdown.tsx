import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

function remainingMs(deadline: string): number {
  return new Date(deadline).getTime() - Date.now();
}

function format(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Cuenta regresiva del tiempo restante para aprobar/desaprobar un pedido
 * retenido por cartera. Se actualiza cada segundo.
 */
export function ApprovalCountdown({ deadline }: { deadline?: string }) {
  const [ms, setMs] = useState(() => (deadline ? remainingMs(deadline) : 0));

  useEffect(() => {
    if (!deadline) return;
    setMs(remainingMs(deadline));
    const id = setInterval(() => setMs(remainingMs(deadline)), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (!deadline) return null;

  const expired = ms <= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-sm font-medium tabular-nums ${
        expired ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'
      }`}
      title="Tiempo restante para aprobar en cartera"
    >
      <Clock className="h-3.5 w-3.5" />
      {expired ? 'Tiempo vencido' : format(ms)}
    </span>
  );
}
