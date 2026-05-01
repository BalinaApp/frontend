'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronLeft, Loader2, X } from 'lucide-react';
import { Button, Input, Skeleton, TextField } from '@heroui/react';
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

    if (!file.type.startsWith('image/')) {
      toast.error('Lütfen geçerli bir görsel dosyası seçin');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Dosya boyutu 2MB'dan küçük olmalıdır");
      return;
    }

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
      if (result.slug !== company.slug) {
        router.push(`/${result.slug}/settings/company`);
      }
    } else {
      toast.error('Şirket bilgileri güncellenemedi');
    }
  };

  const hasChanges =
    !!company && (name !== company.name || logo !== (company.logo || null));

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            aria-label="Geri"
            onPress={() => router.push(`/${company?.slug}/settings`)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Building2 className="h-5 w-5 text-muted" />
          <h1 className="text-lg font-semibold">Şirket Bilgileri</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="border-b border-border">
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
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-border bg-default">
                      {logo ? (
                        <img
                          src={logo}
                          alt="Şirket logosu"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Building2 className="h-8 w-8 text-muted" />
                      )}
                    </div>
                    {logo && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        isIconOnly
                        aria-label="Logoyu kaldır"
                        className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                        onPress={handleRemoveLogo}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
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
                      onPress={() => fileInputRef.current?.click()}
                    >
                      Logo Yükle
                    </Button>
                    <p className="mt-1 text-xs text-muted">
                      PNG, JPG veya GIF, max 2MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-b border-border">
          <div className="grid grid-cols-12 items-center px-4 py-4">
            <div className="col-span-3">
              <label className="text-sm font-medium">Şirket Adı</label>
            </div>
            <div className="col-span-9">
              {isLoading ? (
                <Skeleton className="h-10 w-full max-w-md" />
              ) : (
                <TextField value={name} onChange={setName} className="max-w-md">
                  <Input placeholder="Şirket adını girin" />
                </TextField>
              )}
            </div>
          </div>
        </div>

        <div className="border-b border-border">
          <div className="grid grid-cols-12 items-center px-4 py-4">
            <div className="col-span-3">
              <label className="text-sm font-medium">Şirket URL</label>
            </div>
            <div className="col-span-9">
              {isLoading ? (
                <Skeleton className="h-5 w-48" />
              ) : (
                <p className="text-sm text-muted">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/
                  {company?.slug}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="border-b border-border">
          <div className="grid grid-cols-12 items-center px-4 py-4">
            <div className="col-span-3">
              <label className="text-sm font-medium">Oluşturulma Tarihi</label>
            </div>
            <div className="col-span-9">
              {isLoading ? (
                <Skeleton className="h-5 w-32" />
              ) : (
                <p className="text-sm text-muted">
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

        <div className="px-4 py-4">
          <Button type="submit" isDisabled={!hasChanges || isUpdating} isPending={isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
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
