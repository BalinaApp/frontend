'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCompanyStore, Company } from '@/stores/companyStore';
interface CompanyContextType {
  company: Company | null;
  isLoading: boolean;
  refreshCompany: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType>({
  company: null,
  isLoading: true,
  refreshCompany: async () => {},
});

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}

function CompanyLoadingSkeleton() {
  return null;
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const companySlug = params.companySlug as string;

  const { companies, currentCompany, fetchCompanies, isLoading: storeLoading } = useCompanyStore();
  const [isValidating, setIsValidating] = useState(true);
  const [validatedCompany, setValidatedCompany] = useState<Company | null>(null);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const fetchTriggered = useRef(false);

  useEffect(() => {
    if (fetchTriggered.current) return;
    fetchTriggered.current = true;

    fetchCompanies().finally(() => {
      setInitialFetchDone(true);
    });
  }, [fetchCompanies]);

  useEffect(() => {
    if (!initialFetchDone) return;
    if (storeLoading) return;

    const company = companies.find((c) => c.slug === companySlug);

    if (!company) {
      if (companies.length > 0) {
        router.replace(`/${companies[0].slug}`);
      } else {
        router.replace('/setup-company');
      }
      return;
    }

    setValidatedCompany(company);
    setIsValidating(false);

    if (currentCompany?.id !== company.id) {
      useCompanyStore.getState().setCurrentCompany(company);
    }
  }, [companySlug, companies, storeLoading, currentCompany, router, initialFetchDone]);

  const refreshCompany = async () => {
    await fetchCompanies();
  };

  if (!initialFetchDone || storeLoading || isValidating) {
    return <CompanyLoadingSkeleton />;
  }

  if (!validatedCompany) {
    return <CompanyLoadingSkeleton />;
  }

  return (
    <CompanyContext.Provider value={{ company: validatedCompany, isLoading: false, refreshCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}
