import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useCompanies } from '@/hooks/useDatabase';
import { toast } from 'sonner';

interface CompanyContextType {
  currentCompany: any | null;
  isLoading: boolean;
  error: Error | null;
  isReady: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { data: companies, isLoading, error } = useCompanies();
  const [isReady, setIsReady] = useState(false);
  const currentCompany = companies?.[0] || null;

  // Set isReady when loading is complete and we have company data or error
  useEffect(() => {
    if (!isLoading) {
      setIsReady(true);

      // Log warnings if company is not found
      if (!currentCompany && !error) {
        console.warn('No companies found for the current user');
      }

      if (error) {
        console.error('Error loading company:', error);
      }
    }
  }, [isLoading, currentCompany, error]);

  return (
    <CompanyContext.Provider value={{ currentCompany, isLoading, error, isReady }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCurrentCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCurrentCompany must be used within a CompanyProvider');
  }
  return context;
}

export function useCurrentCompanyId() {
  const { currentCompany } = useCurrentCompany();
  return currentCompany?.id;
}
