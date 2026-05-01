'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, ChevronLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button, Input, TextField } from '@heroui/react';
import { useCompany } from '@/components/providers/CompanyProvider';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { company } = useCompany();
  const { user, updateProfile, isLoading } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updateData: { name?: string; currentPassword?: string; newPassword?: string } = {};

    if (name !== user?.name) {
      updateData.name = name;
    }

    if (newPassword) {
      if (!currentPassword) {
        toast.error('Mevcut şifrenizi girmelisiniz');
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error('Yeni şifreler eşleşmiyor');
        return;
      }
      if (newPassword.length < 6) {
        toast.error('Yeni şifre en az 6 karakter olmalıdır');
        return;
      }
      updateData.currentPassword = currentPassword;
      updateData.newPassword = newPassword;
    }

    if (Object.keys(updateData).length === 0) {
      toast.info('Değişiklik yapılmadı');
      return;
    }

    const success = await updateProfile(updateData);
    if (success) {
      toast.success('Profil güncellendi');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      toast.error('Profil güncellenemedi');
    }
  };

  const hasChanges = name !== (user?.name || '') || !!newPassword;

  const renderPasswordField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    show: boolean,
    toggleShow: () => void,
    placeholder: string
  ) => (
    <div className="border-b border-border">
      <div className="grid grid-cols-12 items-center px-4 py-4">
        <div className="col-span-3">
          <label className="text-sm font-medium">{label}</label>
        </div>
        <div className="col-span-9">
          <TextField
            value={value}
            onChange={onChange}
            type={show ? 'text' : 'password'}
            className="max-w-md"
          >
            <div className="relative">
              <Input placeholder={placeholder} />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                isIconOnly
                aria-label={show ? 'Şifreyi gizle' : 'Şifreyi göster'}
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onPress={toggleShow}
              >
                {show ? (
                  <EyeOff className="h-4 w-4 text-muted" />
                ) : (
                  <Eye className="h-4 w-4 text-muted" />
                )}
              </Button>
            </div>
          </TextField>
        </div>
      </div>
    </div>
  );

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

        <div className="border-b border-border bg-surface-secondary px-4 py-2">
          <span className="text-xs font-medium text-muted">Şifre Değiştir</span>
        </div>

        {renderPasswordField(
          'Mevcut Şifre',
          currentPassword,
          setCurrentPassword,
          showCurrentPassword,
          () => setShowCurrentPassword((v) => !v),
          'Mevcut şifrenizi girin'
        )}
        {renderPasswordField(
          'Yeni Şifre',
          newPassword,
          setNewPassword,
          showNewPassword,
          () => setShowNewPassword((v) => !v),
          'Yeni şifrenizi girin'
        )}
        {renderPasswordField(
          'Şifre Tekrar',
          confirmPassword,
          setConfirmPassword,
          showConfirmPassword,
          () => setShowConfirmPassword((v) => !v),
          'Yeni şifrenizi tekrar girin'
        )}

        <div className="px-4 py-4">
          <Button type="submit" isDisabled={!hasChanges || isLoading} isPending={isLoading}>
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
