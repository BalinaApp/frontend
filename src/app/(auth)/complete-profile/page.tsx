'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button, Input, Skeleton, TextField, toast } from '@heroui/react';
import { AuthShell } from '@/components/auth-shell';
import { useAuthStore } from '@/stores/authStore';

const PRIMARY_BUTTON_CLASS =
  'w-[332px] rounded-3xl bg-[#0485F7] text-[#FCFCFC] hover:bg-[#0376dd] data-[hovered=true]:bg-[#0376dd]';
const FIELD_INPUT_CLASS =
  'h-9 w-[332px] rounded-xl bg-white px-3 text-sm placeholder:text-[#71717A] shadow-[0_2px_4px_0_rgba(0,0,0,0.04),0_1px_2px_0_rgba(0,0,0,0.06),0_0_1px_0_rgba(0,0,0,0.06)]';

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, updateProfile, isLoading: storeLoading } =
    useAuthStore();

  const [name, setName] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (user?.name) {
      // Already has a name — skip profile completion
      router.replace(user.currentCompanyId ? '/dashboard' : '/setup-company');
    }
  }, [hydrated, isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.danger('Ad ve soyad gereklidir');
      return;
    }
    const ok = await updateProfile({ name: name.trim() });
    if (ok) {
      toast.success('Profil tamamlandı');
      router.push(user?.currentCompanyId ? '/dashboard' : '/setup-company');
    } else {
      toast.danger('Profil güncellenemedi');
    }
  };

  if (!hydrated || !isAuthenticated || user?.name) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#F3F4F6] p-4 md:p-10">
        <div className="flex w-full max-w-[332px] flex-col items-center gap-5">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    );
  }

  return (
    <AuthShell
      title="Bilgilerinizi girin"
      subtitle="Lütfen kişisel bilgilerinizi doldurun."
    >
      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col items-center gap-2"
      >
        <TextField
          name="name"
          value={name}
          onChange={setName}
          isRequired
          isDisabled={storeLoading}
          autoFocus
          aria-label="Ad ve soyad"
        >
          <Input placeholder="Ad ve Soyad" className={FIELD_INPUT_CLASS} />
        </TextField>

        <Button
          type="submit"
          isPending={storeLoading}
          isDisabled={storeLoading || !name.trim()}
          className={PRIMARY_BUTTON_CLASS}
        >
          {storeLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Kaydediliyor...
            </>
          ) : (
            'Tamamla'
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
