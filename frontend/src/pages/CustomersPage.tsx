import { useState } from 'react';
import { Search, Users, Phone, MapPin, Tag } from 'lucide-react';
import { useClients } from '@/hooks/useApi';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const { data: customers = [], isLoading } = useClients(search);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Clientes</h2>
        <p className="text-muted-foreground">
          Terceros sincronizados desde Siesa.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o código..."
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No hay clientes. Sincroniza los terceros desde Siesa.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {customers.map((customer) => (
            <Card key={customer.id}>
              <CardContent className="space-y-2 p-4">
                <div>
                  <p className="font-medium leading-tight">{customer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Cód. {customer.code}
                  </p>
                </div>
                {customer.address && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {customer.address}
                  </p>
                )}
                {customer.phone && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {customer.phone}
                  </p>
                )}
                <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" />
                  {customer.priceList ? (
                    <span>
                      Lista de precios:{' '}
                      <span className="font-medium text-[var(--success)]">
                        {customer.priceListName || customer.priceList}
                      </span>
                    </span>
                  ) : (
                    'Sin lista de precios'
                  )}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
