import { useContext } from 'react';
import { CompanyContext } from './company-context';

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) {
    throw new Error('useCompany debe usarse dentro de CompanyProvider');
  }
  return ctx;
}
