'use client';

import { useState } from 'react';
import Image from 'next/image';
import { toast, BalinaAvatar, BalinaSwitch } from '@/components/balina';
import { useAuthStore } from '@/stores/authStore';
import { usePageTitle } from '@/hooks/use-page-title';
import { userDisplayName } from '@/lib/user-display';

export default function SecuritySettingsPage() {
  usePageTitle('Giriş ve güvenlik');

  const { user, disconnectGoogle } = useAuthStore();

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
      <div className="flex flex-1 flex-col items-center overflow-y-auto py-6">
        <div className="flex w-full max-w-[616px] flex-col items-center gap-6 px-3">
          {/* Avatar */}
          <BalinaAvatar
            fallback={userInitial}
            alt={userDisplayName(user)}
            className="h-[116px] w-[116px] text-3xl font-semibold"
          />

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
                  <span className="text-body-small-one-liner-medium text-foreground/85">
                    Google
                  </span>
                </div>
                <BalinaSwitch
                  checked={googleConnected}
                  onCheckedChange={handleGoogleToggle}
                  disabled={isToggling}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
