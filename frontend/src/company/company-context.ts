import { createContext } from 'react';
import type { Company } from '@/types';

export interface CompanyContextValue {
  /** Compañía activa actualmente seleccionada (o null si aun no eligio). */
  company: Company | null;
  /** Compañías a las que el usuario tiene acceso. */
  companies: Company[];
  loading: boolean;
  /** Selecciona la compañía activa y la persiste. */
  selectCompany: (company: Company) => void;
  /** Limpia la compañía activa (al cambiar de apartado o cerrar sesion). */
  clearCompany: () => void;
}

export const CompanyContext = createContext<CompanyContextValue | undefined>(
  undefined,
);
