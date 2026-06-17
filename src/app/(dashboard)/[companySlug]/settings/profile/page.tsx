'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight } from '@gravity-ui/icons';
import {
  BalinaAvatar,
  BalinaButton,
  BalinaConfirmDialog,
  toast,
} from '@/components/balina';
import { useSidePanel } from '@/components/providers/SidePanel';
import { ProfileNamePanel } from '@/components/settings/profile-name-panel';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { usePageTitle } from '@/hooks/use-page-title';
import { customUserName, userDisplayName } from '@/lib/user-display';

export default function ProfileSettingsPage() {
  usePageTitle('Kişisel bilgiler');

  const router = useRouter();
  const { user, updateProfile, logout } = useAuthStore();

  const userInitial = (user?.name || user?.email || '?').charAt(0).toUpperCase();
  // Custom name = real name the user typed in, distinct from the auto
  // `balinaOS<num>` placeholder. Drives the row label + edit modal seed.
  const realName = customUserName(user);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { setSidePanel } = useSidePanel();

  const handleSaveName = async (next: string) => {
    if (!next) {
      toast.danger('İsim boş bırakılamaz');
      return;
    }
    if (next === user?.name) {
      setSidePanel(null);
      return;
    }
    const success = await updateProfile({ name: next });
    if (success) {
      toast.success('Adınız güncellendi');
      setSidePanel(null);
    } else {
      toast.danger('Güncelleme başarısız');
    }
  };

  // "İsim ve soyisim" — AI drawer (SidePanelCard) içinde açılır.
  const openNameModal = () => {
    setSidePanel(
      <ProfileNamePanel
        initialName={realName}
        onClose={() => setSidePanel(null)}
        onSave={handleSaveName}
      />,
    );
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete('/auth/account');
      toast.success('Hesabınız silindi');
      // Clear local auth state and bounce to /login. Tokens are no longer
      // valid server-side anyway.
      logout();
      router.replace('/login');
    } catch (err: any) {
      toast.danger(err.response?.data?.message || 'Hesap silinemedi');
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
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

          {/* List */}
          <div className="flex w-full flex-col rounded-xl bg-surface">
            <button
              type="button"
              onClick={openNameModal}
              className="flex cursor-pointer items-center gap-3 rounded-t-xl border-b border-black/[0.02] p-3 text-left"
            >
              <span className="flex-1 text-sm font-medium text-foreground/85">
                İsim ve soyisim
              </span>
              <span className="flex h-8 items-center gap-1 px-1 text-xs font-medium text-default-foreground">
                {realName || 'Belirtilmedi'}
                <ChevronRight className="h-4 w-4 text-muted" />
              </span>
            </button>

            <div className="flex items-center gap-3 rounded-b-xl p-3">
              <span className="flex-1 text-sm font-medium text-foreground/85">
                E-Posta adresi
              </span>
              <span className="flex h-8 items-center px-1 text-xs font-normal text-muted">
                {user?.email}
              </span>
            </div>
          </div>

          {/* Delete account */}
          <BalinaButton
            variant="soft"
            size="large"
            onClick={() => setIsDeleteOpen(true)}
          >
            Hesabı sil
          </BalinaButton>
        </div>
      </div>

      <BalinaConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Hesabı sil"
        description="Hesabınız, sahibi olduğunuz şirketler ve tüm verileriniz kalıcı olarak silinecek. Bu işlem geri alınamaz."
        confirmLabel="Hesabımı sil"
        cancelLabel="Vazgeç"
        onConfirm={handleConfirmDelete}
        danger
        loading={isDeleting}
      />
    </>
  );
}
