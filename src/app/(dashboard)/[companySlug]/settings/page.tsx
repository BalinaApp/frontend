'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Building2, Users, CreditCard, Bell, Key, User } from 'lucide-react';
import { useCompany } from '@/components/providers/CompanyProvider';
import { usePricingStore } from '@/stores/pricingStore';

const settingsSections = [
  {
    title: 'Şirket Bilgileri',
    description: 'Şirket adı, logo ve genel ayarlar',
    icon: Building2,
    href: 'settings/company',
    requiresPricing: false,
  },
  {
    title: 'Takım Üyeleri',
    description: 'Kullanıcıları ve rollerini yönetin',
    icon: Users,
    href: 'settings/team',
    requiresPricing: false,
  },
  {
    title: 'Profil',
    description: 'Kişisel bilgilerinizi düzenleyin',
    icon: User,
    href: 'settings/profile',
    requiresPricing: false,
  },
  {
    title: 'Abonelik',
    description: 'Plan ve ödeme bilgileriniz',
    icon: CreditCard,
    href: 'settings/billing',
    requiresPricing: true,
  },
  {
    title: 'Bildirimler',
    description: 'E-posta ve uygulama bildirimleri',
    icon: Bell,
    href: 'settings/notifications',
    requiresPricing: false,
  },
  {
    title: 'API Erişimi',
    description: 'Harici API anahtarları ve erişim yönetimi',
    icon: Key,
    href: 'settings/api',
    requiresPricing: false,
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { company } = useCompany();
  const { isPricingEnabled, fetchPricingStatus } = usePricingStore();

  useEffect(() => {
    fetchPricingStatus();
  }, [fetchPricingStatus]);

  const handleSectionClick = (href: string) => {
    router.push(`/${company?.slug}/${href}`);
  };

  // Filter sections based on pricing status
  const visibleSections = settingsSections.filter(
    (section) => !section.requiresPricing || isPricingEnabled
  );

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Ayarlar</h1>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2">
        {visibleSections.map((section, index) => (
          <div
            key={section.title}
            className={`flex items-center gap-4 px-4 py-4 cursor-pointer transition-colors hover:bg-muted/30 border-b ${index % 2 === 0 ? 'md:border-r' : ''}`}
            onClick={() => handleSectionClick(section.href)}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <section.icon className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">{section.title}</p>
              <p className="text-xs text-muted-foreground">{section.description}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
