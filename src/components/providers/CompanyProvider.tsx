'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCompanyStore, Company } from '@/stores/companyStore';
import { Skeleton } from '@heroui/react';

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
  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <Skeleton className="h-5 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-1 border-b border-border md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={`p-6 ${i < 2 ? 'lg:border-r lg:border-border' : ''} ${
              i === 0 ? 'md:border-r md:border-border' : ''
            }`}
          >
            <Skeleton className="mb-4 h-12 w-12" />
            <Skeleton className="mb-2 h-5 w-24" />
            <Skeleton className="mb-4 h-4 w-32" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
      <div className="border-b border-border px-4 py-3">
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="p-6">
        <div className="py-8 text-center">
          <Skeleton className="mx-auto mb-4 h-12 w-12 rounded-full" />
          <Skeleton className="mx-auto mb-2 h-5 w-48" />
          <Skeleton className="mx-auto h-4 w-64" />
        </div>
      </div>
    </>
  );
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
