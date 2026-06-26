import { useEffect, useState } from 'react';
import { Clock, AlertCircle, CheckCircle2, Save } from 'lucide-react';
import { isAxiosError } from 'axios';
import {
  useOrderSchedule,
  useUpdateOrderSchedule,
} from '@/hooks/useAdminApi';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** "HH:MM" (24h) a partir de hora y minuto. */
function toTimeValue(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** Convierte "HH:MM" a { hour, minute }. */
function fromTimeValue(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(':');
  return { hour: Number(h) || 0, minute: Number(m) || 0 };
}

export function OrderSchedulePage() {
  const { data, isLoading } = useOrderSchedule();
  const update = useUpdateOrderSchedule();

  const [enabled, setEnabled] = useState(true);
  const [open, setOpen] = useState('07:00');
  const [close, setClose] = useState('16:30');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // Carga los valores actuales cuando llegan del backend.
  useEffect(() => {
    if (!data) return;
    setEnabled(data.enabled);
    setOpen(toTimeValue(data.openHour, data.openMinute));
    setClose(toTimeValue(data.closeHour, data.closeMinute));
  }, [data]);

  async function handleSave() {
    setError('');
    setSaved(false);

    const o = fromTimeValue(open);
    const c = fromTimeValue(close);
    const openMin = o.hour * 60 + o.minute;
    const closeMin = c.hour * 60 + c.minute;

    if (enabled && closeMin <= openMin) {
      setError('La hora de cierre debe ser mayor que la de apertura.');
      return;
    }

    try {
      await update.mutateAsync({
        enabled,
        openHour: o.hour,
        openMinute: o.minute,
        closeHour: c.hour,
        closeMinute: c.minute,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      if (isAxiosError(err)) {
        const msg = err.response?.data?.message;
        setError(
          (Array.isArray(msg) ? msg.join(', ') : msg) ||
            'No se pudo guardar la configuración.',
        );
      } else {
        setError('No se pudo guardar la configuración.');
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Horario de pedidos</h2>
        <p className="text-muted-foreground">
          Define el rango de horas (Colombia) en el que los vendedores pueden
          crear pedidos.
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock className="h-5 w-5" />
            </span>
            Ventana para crear pedidos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Activar / desactivar la restricción */}
          <label className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <span className="text-sm">
              <span className="font-medium">Restringir el horario</span>
              <span className="block text-muted-foreground">
                Si lo desactivas, los pedidos se pueden crear a cualquier hora.
              </span>
            </span>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Desde</label>
              <Input
                type="time"
                value={open}
                disabled={!enabled}
                onChange={(e) => setOpen(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Hasta</label>
              <Input
                type="time"
                value={close}
                disabled={!enabled}
                onChange={(e) => setClose(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          {saved && (
            <p className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Configuración guardada.
            </p>
          )}

          <Button
            onClick={handleSave}
            disabled={isLoading || update.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {update.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
