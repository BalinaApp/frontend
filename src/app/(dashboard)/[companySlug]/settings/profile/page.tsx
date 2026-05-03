'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, ChevronLeft, Loader2 } from 'lucide-react';
import { Button, Input, TextField, toast } from '@heroui/react';
import { useCompany } from '@/components/providers/CompanyProvider';
import { useAuthStore } from '@/stores/authStore';

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { company } = useCompany();
  const { user, updateProfile, isLoading } = useAuthStore();

  const [name, setName] = useState(user?.name || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name === (user?.name || '')) {
      toast.info('Değişiklik yapılmadı');
      return;
    }
    const success = await updateProfile({ name });
    if (success) toast.success('Profil güncellendi');
    else toast.danger('Profil güncellenemedi');
  };

  const hasChanges = name !== (user?.name || '');

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
          <User className="h-5 w-5 text-muted" />
          <h1 className="text-lg font-semibold">Profil</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="border-b border-border">
          <div className="grid grid-cols-12 items-center px-4 py-4">
            <div className="col-span-3">
              <label className="text-sm font-medium">E-posta</label>
            </div>
            <div className="col-span-9">
              <p className="text-sm text-muted">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="border-b border-border">
          <div className="grid grid-cols-12 items-center px-4 py-4">
            <div className="col-span-3">
              <label className="text-sm font-medium">Ad Soyad</label>
            </div>
            <div className="col-span-9">
              <TextField value={name} onChange={setName} className="max-w-md">
                <Input placeholder="Adınızı girin" />
              </TextField>
            </div>
          </div>
        </div>

        <div className="px-4 py-4">
          <Button
            type="submit"
            isDisabled={!hasChanges || isLoading}
            isPending={isLoading}
          >
            {isLoading ? (
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
