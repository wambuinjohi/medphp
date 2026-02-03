import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useCompanies } from '@/hooks/useDatabase';

interface CompanyContextType {
  companies: any[];
  currentCompany: any | null;
  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string | null) => void;
  switchCompany: (id: string) => void;
  isLoading: boolean;
  error: Error | null;
  isReady: boolean;
}

export const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const SELECTED_COMPANY_STORAGE_KEY = 'selected-company-id';

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { data: companies, isLoading, error } = useCompanies();
  const [isReady, setIsReady] = useState(false);
  const [loadTimeout, setLoadTimeout] = useState(false);
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(null);

  // Load selected company from localStorage on mount
  useEffect(() => {
    const storedCompanyId = localStorage.getItem(SELECTED_COMPANY_STORAGE_KEY);
    setSelectedCompanyIdState(storedCompanyId);
  }, []);

  // When companies load, set selected company if not already set
  useEffect(() => {
    if (!isLoading && companies && companies.length > 0 && !selectedCompanyId) {
      const storedCompanyId = localStorage.getItem(SELECTED_COMPANY_STORAGE_KEY);
      const companyIdToUse = storedCompanyId || companies[0]?.id;

      if (companyIdToUse) {
        setSelectedCompanyIdState(companyIdToUse);
        localStorage.setItem(SELECTED_COMPANY_STORAGE_KEY, companyIdToUse);
      }
    }
  }, [isLoading, companies, selectedCompanyId]);

  // Determine current company based on selectedCompanyId or first company
  const currentCompany = selectedCompanyId
    ? companies?.find(c => c.id === selectedCompanyId) || companies?.[0] || null
    : companies?.[0] || null;

  // Wrapper function to update selected company ID
  const setSelectedCompanyId = (id: string | null) => {
    setSelectedCompanyIdState(id);
    if (id) {
      localStorage.setItem(SELECTED_COMPANY_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(SELECTED_COMPANY_STORAGE_KEY);
    }
  };

  // Helper function to switch companies
  const switchCompany = (id: string) => {
    setSelectedCompanyId(id);
  };

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

  // After 5 seconds, assume loading has timed out and mark as ready
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        setLoadTimeout(true);
        setIsReady(true);
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  return (
    <CompanyContext.Provider value={{
      companies: companies || [],
      currentCompany,
      selectedCompanyId,
      setSelectedCompanyId,
      switchCompany,
      isLoading: isLoading && !loadTimeout,
      error,
      isReady
    }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCurrentCompany() {
  const context = useContext(CompanyContext);
  // Return safe default when used outside of provider (e.g., on login page)
  if (context === undefined) {
    return {
      currentCompany: null,
      isLoading: false,
      error: null,
      isReady: true
    };
  }
  return context;
}

export function useCurrentCompanyId() {
  const { currentCompany } = useCurrentCompany();
  return currentCompany?.id || null;
}
