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
  KeyRound,
  LayoutGrid,
  Pencil,
  Trash2,
  Search,
} from 'lucide-react';
import {
  useAdminUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useSetUserActive,
  useAssignCompany,
  useRemoveCompany,
  useSetCompanyPermissions,
} from '@/hooks/useAdminApi';
import { COMPANIES } from '@/lib/companies';
import { MODULE_GROUPS, ALL_MODULES, areaLabel } from '@/lib/modules';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { AdminUser } from '@/types';

export function UsersPage() {
  const { data: users = [], isLoading } = useAdminUsers();
  const setActive = useSetUserActive();
  const deleteUser = useDeleteUser();

  const [showCreate, setShowCreate] = useState(false);
  const [companiesUser, setCompaniesUser] = useState<AdminUser | null>(null);
  const [permsUser, setPermsUser] = useState<AdminUser | null>(null);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [search, setSearch] = useState('');

  const term = search.trim().toLowerCase();
  const filtered = term
    ? users.filter((u) =>
        [u.name, u.documentId, u.email ?? '']
          .join(' ')
          .toLowerCase()
          .includes(term),
      )
    : users;

  function handleDelete(u: AdminUser) {
    const ok = window.confirm(
      `¿Eliminar al usuario "${u.name}" (cédula ${u.documentId})? Esta acción no se puede deshacer.`,
    );
    if (ok) deleteUser.mutate(u.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Usuarios</h2>
          <p className="text-muted-foreground">
            Vendedores y administradores · acceso por compañía y permisos por
            módulo.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <UserPlus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      {/* Filtro de búsqueda */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, cédula o correo..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Listado de usuarios */}
      <Card>
        <CardContent className="px-0 py-0">
          {isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Cargando usuarios...
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {term ? 'No hay usuarios que coincidan.' : 'No hay usuarios.'}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((u) => (
                <li key={u.id}>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-6 py-4">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
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

                    <div className="min-w-[180px] flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{u.name}</p>
                        {!u.active && (
                          <Badge variant="secondary">Inactivo</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Cédula {u.documentId} · {areaLabel(u.role)}
                      </p>
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPermsUser(u)}
                      >
                        <KeyRound className="h-4 w-4" />
                        Permisos
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCompaniesUser(u)}
                      >
                        <Building2 className="h-4 w-4" />
                        Compañías
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditUser(u)}
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
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
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Eliminar usuario"
                        onClick={() => handleDelete(u)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    {/* Compañías (en su propia línea para que no se amontonen) */}
                    <div className="flex w-full flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
                      {u.companies.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          Sin compañías
                        </span>
                      ) : (
                        u.companies.map((c) => (
                          <Badge key={c.companyId} variant="default">
                            {c.name}
                            {c.siesaSellerCode ? ` · ${c.siesaSellerCode}` : ''}
                            {c.permissions && c.permissions.length > 0
                              ? ` · ${c.permissions.length} mód.`
                              : ''}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}
      {companiesUser && (
        <CompaniesModal
          user={companiesUser}
          onClose={() => setCompaniesUser(null)}
        />
      )}
      {permsUser && (
        <PermissionsModal
          user={permsUser}
          onClose={() => setPermsUser(null)}
        />
      )}
      {editUser && (
        <EditUserModal user={editUser} onClose={() => setEditUser(null)} />
      )}
    </div>
  );
}

/** Modal para crear un usuario (área según el rol + módulos visibles). */
function CreateUserModal({ onClose }: { onClose: () => void }) {
  const createUser = useCreateUser();
  const [form, setForm] = useState({
    documentId: '',
    name: '',
    password: '',
    role: 'seller' as 'admin' | 'seller' | 'cartera' | 'alistador',
  });

  function setRole(role: 'admin' | 'seller' | 'cartera' | 'alistador') {
    setForm((f) => ({ ...f, role }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createUser.mutate({ ...form, permissions: [] }, { onSuccess: onClose });
  }

  return (
    <ModalShell title="Crear usuario" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
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
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">Área / Rol</Label>
            <select
              id="role"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={form.role}
              onChange={(e) =>
                setRole(
                  e.target.value as
                    | 'admin'
                    | 'seller'
                    | 'cartera'
                    | 'alistador',
                )
              }
            >
              <option value="seller">Vendedor</option>
              <option value="admin">Administrador · Administrativa</option>
              <option value="cartera">Cartera</option>
              <option value="alistador">Alistador</option>
            </select>
          </div>
        </div>

        {/* Los módulos visibles se asignan por compañía después de crear el
            usuario y asignarle compañías (botón "Permisos"). */}
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <LayoutGrid className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Después de crear el usuario, asígnale sus compañías y luego define
            qué módulos puede ver <strong>en cada compañía</strong> desde el botón
            “Permisos”. Sin módulos marcados, verá los de su rol por defecto.
          </p>
        </div>

        {createUser.isError && (
          <p className="text-sm text-destructive">
            No se pudo crear. ¿La cédula ya existe?
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={createUser.isPending}>
            <Check className="h-4 w-4" />
            {createUser.isPending ? 'Creando...' : 'Crear usuario'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

/** Modal para editar la información de un usuario. */
function EditUserModal({
  user,
  onClose,
}: {
  user: AdminUser;
  onClose: () => void;
}) {
  const updateUser = useUpdateUser();
  const [form, setForm] = useState({
    documentId: user.documentId,
    name: user.name,
    email: user.email ?? '',
    role: user.role as 'admin' | 'seller' | 'cartera' | 'alistador',
    password: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateUser.mutate(
      {
        id: user.id,
        documentId: form.documentId,
        name: form.name,
        email: form.email ? form.email : undefined,
        role: form.role,
        // Solo enviamos la contraseña si se escribió una nueva.
        ...(form.password ? { password: form.password } : {}),
      },
      { onSuccess: onClose },
    );
  }

  return (
    <ModalShell title={`Editar · ${user.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-documentId">Cédula</Label>
            <Input
              id="edit-documentId"
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
            <Label htmlFor="edit-name">Nombre</Label>
            <Input
              id="edit-name"
              required
              minLength={2}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Correo (opcional)</Label>
            <Input
              id="edit-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-role">Área / Rol</Label>
            <select
              id="edit-role"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={form.role}
              onChange={(e) =>
                setForm({
                  ...form,
                  role: e.target.value as
                    | 'admin'
                    | 'seller'
                    | 'cartera'
                    | 'alistador',
                })
              }
            >
              <option value="seller">Vendedor</option>
              <option value="admin">Administrador · Administrativa</option>
              <option value="cartera">Cartera</option>
              <option value="alistador">Alistador</option>
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="edit-password">Nueva contraseña (opcional)</Label>
            <Input
              id="edit-password"
              type="password"
              placeholder="Dejar en blanco para no cambiarla"
              minLength={4}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
        </div>

        {updateUser.isError && (
          <p className="text-sm text-destructive">
            No se pudieron guardar los cambios. ¿La cédula ya existe?
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={updateUser.isPending}>
            <Check className="h-4 w-4" />
            {updateUser.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

/** Modal para activar/desactivar los módulos visibles de un usuario POR compañía. */
function PermissionsModal({
  user,
  onClose,
}: {
  user: AdminUser;
  onClose: () => void;
}) {
  const setCompanyPermissions = useSetCompanyPermissions();
  const companies = user.companies ?? [];
  const [activeCompany, setActiveCompany] = useState<string>(
    companies[0]?.companyId ?? '',
  );
  // Permisos por compañía, inicializados desde lo que ya tiene el usuario.
  const [byCompany, setByCompany] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      companies.map((c) => [c.companyId, c.permissions ?? []]),
    ),
  );

  const selected = byCompany[activeCompany] ?? [];

  function toggle(key: string) {
    setByCompany((prev) => {
      const current = prev[activeCompany] ?? [];
      const next = current.includes(key)
        ? current.filter((k) => k !== key)
        : [...current, key];
      return { ...prev, [activeCompany]: next };
    });
  }

  function setSelected(next: string[]) {
    setByCompany((prev) => ({ ...prev, [activeCompany]: next }));
  }

  function handleSave() {
    setCompanyPermissions.mutate(
      { id: user.id, companyId: activeCompany, permissions: selected },
      { onSuccess: onClose },
    );
  }

  if (companies.length === 0) {
    return (
      <ModalShell title={`Permisos · ${user.name}`} onClose={onClose}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Este usuario no tiene compañías asignadas. Asigna primero una
            compañía para poder definir sus módulos por empresa.
          </p>
          <div className="flex justify-end border-t border-border pt-4">
            <Button variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell title={`Permisos · ${user.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Rol principal</span>
          <Badge variant="secondary">{areaLabel(user.role)}</Badge>
        </div>

        {/* Selector de compañía: los módulos se asignan por empresa. */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Compañía
          </p>
          <div className="flex flex-wrap gap-2">
            {companies.map((c) => (
              <button
                key={c.companyId}
                type="button"
                onClick={() => setActiveCompany(c.companyId)}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-sm transition-colors',
                  c.companyId === activeCompany
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted/50',
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Marca los módulos que este usuario podrá ver en esta compañía. Sin
            ninguno marcado, verá los módulos por defecto de su rol.
          </p>
          <button
            type="button"
            className="shrink-0 text-xs text-primary hover:underline"
            onClick={() =>
              setSelected(
                selected.length === ALL_MODULES.length
                  ? []
                  : ALL_MODULES.map((m) => m.key),
              )
            }
          >
            {selected.length === ALL_MODULES.length
              ? 'Quitar todos'
              : 'Seleccionar todos'}
          </button>
        </div>

        <ModuleGroupsPicker selected={selected} onToggle={toggle} />

        {setCompanyPermissions.isError && (
          <p className="text-sm text-destructive">
            No se pudieron guardar los permisos.
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={setCompanyPermissions.isPending}
          >
            <Check className="h-4 w-4" />
            {setCompanyPermissions.isPending
              ? 'Guardando...'
              : 'Guardar permisos'}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

/** Selector de módulos agrupado por área (operativo + administrativo). */
function ModuleGroupsPicker({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className="space-y-4">
      {MODULE_GROUPS.map((group) => (
        <div key={group.area} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.modules.map((m) => (
              <ModuleToggle
                key={m.key}
                label={m.label}
                checked={selected.includes(m.key)}
                onToggle={() => onToggle(m.key)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Casilla de módulo (toggle visual). */
function ModuleToggle({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
        checked
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:bg-accent',
      )}
    >
      <span className="font-medium">{label}</span>
      <span
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-md border',
          checked
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border',
        )}
      >
        {checked && <Check className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}

/** Contenedor genérico de modal. */
function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-2xl rounded-2xl border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/** Modal para asignar/quitar compañías y códigos de vendedor a un usuario. */
function CompaniesModal({
  user,
  onClose,
}: {
  user: AdminUser;
  onClose: () => void;
}) {
  const assign = useAssignCompany();
  const remove = useRemoveCompany();
  const [codes, setCodes] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      user.companies.map((c) => [c.companyId, c.siesaSellerCode ?? '']),
    ),
  );

  return (
    <ModalShell title={`Compañías · ${user.name}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Acceso por compañía y código de vendedor en Siesa
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
        {COMPANIES.map((c) => {
          const has = user.companies.find((x) => x.companyId === c.id);
          return (
            <div
              key={c.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4"
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm font-semibold">{c.name}</span>
                {has ? (
                  <Badge variant="secondary" className="ml-auto">
                    Asignada
                  </Badge>
                ) : (
                  <Badge variant="outline" className="ml-auto">
                    Sin asignar
                  </Badge>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`code-${c.id}`} className="text-xs">
                  Código de vendedor en Siesa
                </Label>
                <Input
                  id={`code-${c.id}`}
                  placeholder="Ej. 0033"
                  value={codes[c.id] ?? ''}
                  onChange={(e) =>
                    setCodes({ ...codes, [c.id]: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="flex-1"
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
                  {has ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {has ? 'Guardar código' : 'Asignar compañía'}
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
            </div>
          );
        })}
        </div>
      </div>
    </ModalShell>
  );
}
