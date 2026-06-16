import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api, getCompanyId, setCompanyId } from '@/lib/api';
import type { Company } from '@/types';
import { useAuth } from '@/auth/useAuth';
import { CompanyContext } from './company-context';

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargamos las compañías disponibles del usuario al iniciar sesion.
  useEffect(() => {
    if (!user) {
      setCompanies([]);
      setCompany(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    api
      .get<Company[]>('/auth/companies')
      .then((res) => {
        if (!active) return;
        setCompanies(res.data);
        // Restauramos la compañía persistida si sigue siendo valida.
        const savedId = getCompanyId();
        const saved = res.data.find((c) => c.id === savedId) ?? null;
        setCompany(saved);
        if (!saved) setCompanyId(null);
      })
      .catch(() => {
        if (!active) return;
        setCompanies([]);
        setCompany(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const selectCompany = useCallback((next: Company) => {
    setCompany(next);
    setCompanyId(next.id);
  }, []);

  const clearCompany = useCallback(() => {
    setCompany(null);
    setCompanyId(null);
  }, []);

  return (
    <CompanyContext.Provider
      value={{ company, companies, loading, selectCompany, clearCompany }}
    >
      {children}
    </CompanyContext.Provider>
  );
}
