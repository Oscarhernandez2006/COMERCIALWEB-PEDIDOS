import { useState } from 'react';
import {
  UserPlus,
  Shield,
  User as UserIcon,
  Building2,
  Plus,
  X,
  Check,
  Power,
} from 'lucide-react';
import {
  useAdminUsers,
  useCreateUser,
  useSetUserActive,
  useAssignCompany,
  useRemoveCompany,
} from '@/hooks/useAdminApi';
import { COMPANIES } from '@/lib/companies';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { AdminUser } from '@/types';

export function UsersPage() {
  const { data: users = [], isLoading } = useAdminUsers();
  const createUser = useCreateUser();
  const setActive = useSetUserActive();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    documentId: '',
    name: '',
    password: '',
    role: 'seller' as 'admin' | 'seller',
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createUser.mutate(form, {
      onSuccess: () => {
        setForm({ documentId: '', name: '', password: '', role: 'seller' });
        setShowForm(false);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Usuarios</h2>
          <p className="text-muted-foreground">
            Vendedores y administradores · acceso por compañía.
          </p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}>
          <UserPlus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      {/* Formulario de creación */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Crear usuario</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleCreate}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="documentId">Cédula</Label>
                <Input
                  id="documentId"
                  inputMode="numeric"
                  required
                  minLength={4}
                  value={form.documentId}
                  onChange={(e) =>
                    setForm({ ...form, documentId: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  required
                  minLength={2}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={4}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role">Rol</Label>
                <select
                  id="role"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={form.role}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      role: e.target.value as 'admin' | 'seller',
                    })
                  }
                >
                  <option value="seller">Vendedor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="sm:col-span-2 lg:col-span-4">
                {createUser.isError && (
                  <p className="mb-2 text-sm text-destructive">
                    No se pudo crear. ¿La cédula ya existe?
                  </p>
                )}
                <div className="flex gap-2">
                  <Button type="submit" disabled={createUser.isPending}>
                    <Check className="h-4 w-4" />
                    {createUser.isPending ? 'Creando...' : 'Crear usuario'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowForm(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Listado de usuarios */}
      <Card>
        <CardContent className="px-0 py-0">
          {isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Cargando usuarios...
            </p>
          ) : users.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No hay usuarios.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {users.map((u) => (
                <li key={u.id}>
                  <div className="flex flex-wrap items-center gap-4 px-6 py-4">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full',
                        u.role === 'admin'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-secondary text-secondary-foreground',
                      )}
                    >
                      {u.role === 'admin' ? (
                        <Shield className="h-5 w-5" />
                      ) : (
                        <UserIcon className="h-5 w-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{u.name}</p>
                        {!u.active && (
                          <Badge variant="secondary">Inactivo</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Cédula {u.documentId} ·{' '}
                        {u.role === 'admin' ? 'Administrador' : 'Vendedor'}
                      </p>
                    </div>

                    {/* Compañías */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {u.companies.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          Sin compañías
                        </span>
                      ) : (
                        u.companies.map((c) => (
                          <Badge key={c.companyId} variant="default">
                            {c.name}
                            {c.siesaSellerCode ? ` · ${c.siesaSellerCode}` : ''}
                          </Badge>
                        ))
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setExpanded(expanded === u.id ? null : u.id)
                        }
                      >
                        <Building2 className="h-4 w-4" />
                        Compañías
                      </Button>
                      {u.role !== 'admin' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={u.active ? 'Desactivar' : 'Activar'}
                          onClick={() =>
                            setActive.mutate({ id: u.id, active: !u.active })
                          }
                        >
                          <Power
                            className={cn(
                              'h-4 w-4',
                              u.active
                                ? 'text-[var(--success)]'
                                : 'text-muted-foreground',
                            )}
                          />
                        </Button>
                      )}
                    </div>
                  </div>

                  {expanded === u.id && <CompanyManager user={u} />}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Panel para asignar/quitar compañías y códigos de vendedor a un usuario. */
function CompanyManager({ user }: { user: AdminUser }) {
  const assign = useAssignCompany();
  const remove = useRemoveCompany();
  const [codes, setCodes] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      user.companies.map((c) => [c.companyId, c.siesaSellerCode ?? '']),
    ),
  );

  return (
    <div className="border-t border-border bg-muted/30 px-6 py-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Acceso por compañía y código de vendedor en Siesa
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {COMPANIES.map((c) => {
          const has = user.companies.find((x) => x.companyId === c.id);
          return (
            <div
              key={c.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-background p-3"
            >
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="w-32 shrink-0 text-sm font-medium">
                {c.name}
              </span>
              <Input
                placeholder="Cód. vendedor"
                className="h-8"
                value={codes[c.id] ?? ''}
                onChange={(e) =>
                  setCodes({ ...codes, [c.id]: e.target.value })
                }
              />
              <Button
                size="sm"
                variant={has ? 'secondary' : 'default'}
                disabled={assign.isPending}
                onClick={() =>
                  assign.mutate({
                    id: user.id,
                    companyId: c.id,
                    siesaSellerCode: codes[c.id] || undefined,
                  })
                }
              >
                {has ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {has ? 'Guardar' : 'Asignar'}
              </Button>
              {has && (
                <Button
                  size="icon"
                  variant="ghost"
                  title="Quitar acceso"
                  disabled={remove.isPending}
                  onClick={() =>
                    remove.mutate({ id: user.id, companyId: c.id })
                  }
                >
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
