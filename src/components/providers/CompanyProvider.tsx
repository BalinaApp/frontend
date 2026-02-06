'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCompanyStore, Company } from '@/stores/companyStore';
import { Skeleton } from '@/components/ui/skeleton';

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
      {/* Page header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <Skeleton className="h-5 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      {/* Content grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-b">
        {[...Array(3)].map((_, i) => (
          <div key={i} className={`p-6 ${i < 2 ? 'lg:border-r' : ''} ${i === 0 ? 'md:border-r' : ''}`}>
            <Skeleton className="h-12 w-12 mb-4" />
            <Skeleton className="h-5 w-24 mb-2" />
            <Skeleton className="h-4 w-32 mb-4" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
      {/* Secondary section */}
      <div className="px-4 py-3 border-b">
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="p-6">
        <div className="text-center py-8">
          <Skeleton className="h-12 w-12 mx-auto mb-4 rounded-full" />
          <Skeleton className="h-5 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-64 mx-auto" />
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

  // Fetch companies on mount - only once
  useEffect(() => {
    if (fetchTriggered.current) return;
    fetchTriggered.current = true;

    fetchCompanies().finally(() => {
      setInitialFetchDone(true);
    });
  }, [fetchCompanies]);

  // Validate company after initial fetch completes
  useEffect(() => {
    // Wait for initial fetch to complete
    if (!initialFetchDone) return;
    // Also wait if store is still loading (e.g., during switchCompany)
    if (storeLoading) return;

    // Find company by slug
    const company = companies.find((c) => c.slug === companySlug);

    if (!company) {
      // Company not found - redirect to first company or setup
      if (companies.length > 0) {
        router.replace(`/${companies[0].slug}`);
      } else {
        router.replace('/setup-company');
      }
      return;
    }

    // Valid company found
    setValidatedCompany(company);
    setIsValidating(false);

    // If this is not the current company, switch to it
    if (currentCompany?.id !== company.id) {
      useCompanyStore.getState().setCurrentCompany(company);
    }
  }, [companySlug, companies, storeLoading, currentCompany, router, initialFetchDone]);

  // Function to refresh company data
  const refreshCompany = async () => {
    await fetchCompanies();
  };

  // Show loading until initial fetch is done and validation completes
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
