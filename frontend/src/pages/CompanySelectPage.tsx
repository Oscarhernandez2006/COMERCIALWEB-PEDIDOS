import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, LogOut } from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { useCompany } from '@/company/useCompany';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Company } from '@/types';

/** Colores distintivos por compañía para reforzar que son entornos separados. */
const COMPANY_STYLES: Record<string, string> = {
  '3': 'from-emerald-500/15 to-emerald-500/5 text-emerald-600',
  '8': 'from-amber-500/15 to-amber-500/5 text-amber-600',
  '4': 'from-rose-500/15 to-rose-500/5 text-rose-600',
  MTAT: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600',
};

/** Logo (en /public) por compañía. */
const COMPANY_LOGOS: Record<string, string> = {
  '3': '/AGROPECUARIA.png',
  '8': '/CARNESFRIAS.png',
  '4': '/LOGOCARNESSANTACRUZ.png',
  MTAT: '/AGROPECUARIA.png',
};

export function CompanySelectPage() {
  const { logout } = useAuth();
  const { companies, loading, selectCompany } = useCompany();
  const navigate = useNavigate();

  const handleSelect = (company: Company) => {
    selectCompany(company);
    navigate('/');
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-accent/30 p-4">
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-4 top-4"
        onClick={() => {
          logout();
          navigate('/login');
        }}
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </Button>

      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Selecciona la compañía
        </h1>
        <p className="text-muted-foreground">
          Cada compañía es independiente: sus clientes, productos y pedidos no
          se mezclan.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando compañías…</p>
      ) : companies.length === 0 ? (
        <p className="max-w-md text-center text-sm text-muted-foreground">
          No tienes compañías asignadas. Contacta al administrador para que te
          habilite el acceso.
        </p>
      ) : (
        <div className="flex w-full max-w-4xl flex-wrap justify-center gap-4">
          {companies.map((company) => (
            <Card
              key={company.id}
              onClick={() => handleSelect(company)}
              className="group w-full max-w-xs cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
            >
              <CardContent className="flex flex-col items-start gap-3 p-5">
                {COMPANY_LOGOS[company.id] ? (
                  <img
                    src={COMPANY_LOGOS[company.id]}
                    alt={`Logo ${company.name}`}
                    className="h-28 w-28 object-contain"
                  />
                ) : (
                  <div
                    className={`flex h-24 w-24 items-center justify-center rounded-xl bg-gradient-to-br ${
                      COMPANY_STYLES[company.id] ??
                      'from-primary/15 to-primary/5 text-primary'
                    }`}
                  >
                    <Building2 className="h-10 w-10" />
                  </div>
                )}
                <div>
                  {/^\d+$/.test(company.id) && (
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Compañía {company.id}
                    </p>
                  )}
                  <h2 className="text-lg font-semibold">{company.name}</h2>
                </div>
                <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Entrar
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
