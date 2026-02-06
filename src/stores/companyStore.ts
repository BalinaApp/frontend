import { create } from 'zustand';
import { api } from '@/services/api';
import { useAuthStore } from './authStore';

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'STOCKIST';
  createdAt: string;
}

interface CompanyState {
  companies: Company[];
  currentCompany: Company | null;
  isLoading: boolean;
  error: string | null;
  fetchCompanies: () => Promise<void>;
  switchCompany: (companyId: string) => Promise<void>;
  createCompany: (name: string) => Promise<Company>;
  updateCompany: (companyId: string, data: { name?: string; logo?: string }) => Promise<Company | null>;
  setCurrentCompany: (company: Company | null) => void;
}

export const useCompanyStore = create<CompanyState>((set) => ({
  companies: [],
  currentCompany: null,
  isLoading: false,
  error: null,

  fetchCompanies: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/company');
      const companies = response.data;

      // Find current company based on user's currentCompanyId
      const user = useAuthStore.getState().user;
      const currentCompany = companies.find(
        (c: Company) => c.id === user?.currentCompanyId
      ) || null;

      set({
        companies,
        currentCompany,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Şirketler yüklenemedi',
        isLoading: false,
      });
    }
  },

  switchCompany: async (companyId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post(`/company/${companyId}/switch`);
      const company = response.data;

      // Update current company in store
      set((state) => ({
        currentCompany: state.companies.find((c) => c.id === companyId) || null,
        isLoading: false,
      }));

      // Update user's currentCompanyId in auth store
      const { user, setUser } = useAuthStore.getState();
      if (user) {
        setUser({ ...user, currentCompanyId: companyId });
      }

      return company;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Şirket değiştirilemedi',
        isLoading: false,
      });
      throw error;
    }
  },

  createCompany: async (name: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/company', { name });
      const newCompany = response.data;

      // Add to companies list and set as current
      set((state) => ({
        companies: [...state.companies, { ...newCompany, role: 'OWNER' }],
        currentCompany: { ...newCompany, role: 'OWNER' },
        isLoading: false,
      }));

      // Update user's currentCompanyId in auth store
      const { user, setUser } = useAuthStore.getState();
      if (user) {
        setUser({ ...user, currentCompanyId: newCompany.id });
      }

      return newCompany;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Şirket oluşturulamadı',
        isLoading: false,
      });
      throw error;
    }
  },

  updateCompany: async (companyId: string, data: { name?: string; logo?: string }) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/company/${companyId}`, data);
      const updatedCompany = response.data;

      // Update in companies list and current company
      set((state) => ({
        companies: state.companies.map((c) =>
          c.id === companyId
            ? { ...c, name: updatedCompany.name, slug: updatedCompany.slug, logo: updatedCompany.logo }
            : c
        ),
        currentCompany:
          state.currentCompany?.id === companyId
            ? { ...state.currentCompany, name: updatedCompany.name, slug: updatedCompany.slug, logo: updatedCompany.logo }
            : state.currentCompany,
        isLoading: false,
      }));

      return updatedCompany;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Şirket güncellenemedi',
        isLoading: false,
      });
      return null;
    }
  },

  setCurrentCompany: (company) => set({ currentCompany: company }),
}));
