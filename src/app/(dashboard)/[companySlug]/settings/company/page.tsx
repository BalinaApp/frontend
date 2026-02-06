'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronLeft, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompany } from '@/components/providers/CompanyProvider';
import { useCompanyStore } from '@/stores/companyStore';
import { toast } from 'sonner';

export default function CompanySettingsPage() {
  const router = useRouter();
  const { company, refreshCompany } = useCompany();
  const { updateCompany, isLoading: isUpdating } = useCompanyStore();
  const [name, setName] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (company) {
      setName(company.name);
      setLogo(company.logo || null);
      setIsLoading(false);
    }
  }, [company]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Lütfen geçerli bir görsel dosyası seçin');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Dosya boyutu 2MB\'dan küçük olmalıdır');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!company?.id) return;

    const updateData: { name?: string; logo?: string } = {};

    if (name.trim() && name !== company.name) {
      updateData.name = name.trim();
    }

    if (logo !== (company.logo || null)) {
      updateData.logo = logo || '';
    }

    if (Object.keys(updateData).length === 0) {
      toast.info('Değişiklik yapılmadı');
      return;
    }

    const result = await updateCompany(company.id, updateData);

    if (result) {
      toast.success('Şirket bilgileri güncellendi');
      await refreshCompany();
      // If slug changed, redirect to new URL
      if (result.slug !== company.slug) {
        router.push(`/${result.slug}/settings/company`);
      }
    } else {
      toast.error('Şirket bilgileri güncellenemedi');
    }
  };

  const hasChanges = company && (
    name !== company.name ||
    logo !== (company.logo || null)
  );

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push(`/${company?.slug}/settings`)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Şirket Bilgileri</h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Logo Section */}
        <div className="border-b">
          <div className="grid grid-cols-12 items-center px-4 py-4">
            <div className="col-span-3">
              <label className="text-sm font-medium">Şirket Logosu</label>
            </div>
            <div className="col-span-9">
              {isLoading ? (
                <Skeleton className="h-20 w-20 rounded-lg" />
              ) : (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden border">
                      {logo ? (
                        <img
                          src={logo}
                          alt="Şirket logosu"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    {logo && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Logo Yükle
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG veya GIF, max 2MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Name Section */}
        <div className="border-b">
          <div className="grid grid-cols-12 items-center px-4 py-4">
            <div className="col-span-3">
              <label className="text-sm font-medium">Şirket Adı</label>
            </div>
            <div className="col-span-9">
              {isLoading ? (
                <Skeleton className="h-10 w-full max-w-md" />
              ) : (
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Şirket adını girin"
                  className="max-w-md"
                />
              )}
            </div>
          </div>
        </div>

        {/* URL Section */}
        <div className="border-b">
          <div className="grid grid-cols-12 items-center px-4 py-4">
            <div className="col-span-3">
              <label className="text-sm font-medium">Şirket URL</label>
            </div>
            <div className="col-span-9">
              {isLoading ? (
                <Skeleton className="h-5 w-48" />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/{company?.slug}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Created At Section */}
        <div className="border-b">
          <div className="grid grid-cols-12 items-center px-4 py-4">
            <div className="col-span-3">
              <label className="text-sm font-medium">Oluşturulma Tarihi</label>
            </div>
            <div className="col-span-9">
              {isLoading ? (
                <Skeleton className="h-5 w-32" />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {company?.createdAt
                    ? new Date(company.createdAt).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '-'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="px-4 py-4">
          <Button type="submit" disabled={!hasChanges || isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              'Kaydet'
            )}
          </Button>
        </div>
      </form>
    </>
  );
}
