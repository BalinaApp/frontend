'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from '@gravity-ui/icons';
import { Avatar, Button, Switch, toast } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { useCompanyStore } from '@/stores/companyStore';
import { usePageTitle } from '@/hooks/use-page-title';
import { userDisplayName } from '@/lib/user-display';

export default function SecuritySettingsPage() {
  usePageTitle('Giriş ve güvenlik');

  const router = useRouter();
  const { user, disconnectGoogle } = useAuthStore();
  const { currentCompany } = useCompanyStore();
  const slug = currentCompany?.slug ?? '';

  const userInitial = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  const googleConnected = !!user?.googleConnected;
  const [isToggling, setIsToggling] = useState(false);

  const handleGoogleToggle = async (value: boolean) => {
    if (isToggling) return;

    if (value) {
      // Reconnect via OAuth — full-page redirect; same flow as login.
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      window.location.href = `${apiUrl}/auth/google`;
      return;
    }

    setIsToggling(true);
    try {
      await disconnectGoogle();
      toast.success('Google bağlantısı kaldırıldı');
    } catch (err: any) {
      toast.danger(err.message || 'Google bağlantısı kaldırılamadı');
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <>
      {/* Section header */}
      <div className="flex h-[61px] items-center gap-2 border-b border-black/[0.02] px-3.5">
        <Button
          variant="tertiary"
          size="sm"
          isIconOnly
          aria-label="Geri"
          onPress={() => router.push(`/${slug}/settings`)}
          className="h-8 w-8 cursor-pointer rounded-2xl bg-black/[0.06] text-foreground hover:bg-black/[0.10] data-[hovered=true]:bg-black/[0.10]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-medium text-foreground">Giriş ve güvenlik</h2>
      </div>

      <div className="flex flex-1 flex-col items-center overflow-y-auto py-6">
        <div className="flex w-full max-w-[616px] flex-col items-center gap-6 px-3">
          {/* Avatar */}
          <Avatar className="h-[116px] w-[116px] rounded-full">
            <Avatar.Fallback className="rounded-full bg-zinc-500 text-3xl font-semibold text-white">
              {userInitial}
            </Avatar.Fallback>
          </Avatar>

          {/* Name + email */}
          <div className="flex w-full flex-col items-center gap-1">
            <h3 className="text-xl font-semibold text-foreground">
              {userDisplayName(user)}
            </h3>
            <p className="text-xs text-muted">{user?.email}</p>
          </div>

          {/* Bağlı hesaplar */}
          <div className="flex w-full flex-col gap-3">
            <div className="px-3">
              <span className="text-xs font-medium text-foreground">
                Bağlı hesaplar
              </span>
            </div>
            <div className="flex flex-col rounded-xl bg-surface">
              <div className="flex items-center gap-3 p-3">
                <div className="flex items-center gap-3 flex-1">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                    <Image
                      src="/figma/logo-google.svg"
                      alt="Google"
                      width={16}
                      height={16}
                      className="h-4 w-4"
                    />
                  </span>
                  <span className="text-sm font-medium text-foreground/85">
                    Google
                  </span>
                </div>
                <Switch
                  isSelected={googleConnected}
                  onChange={handleGoogleToggle}
                  isDisabled={isToggling}
                  aria-label="Google hesabını bağla"
                >
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
