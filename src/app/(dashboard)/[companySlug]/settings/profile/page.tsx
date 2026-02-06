'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, ChevronLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  const hasChanges = name !== (user?.name || '') || newPassword;

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
          <User className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Profil</h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Email Section (read-only) */}
        <div className="border-b">
          <div className="grid grid-cols-12 items-center px-4 py-4">
            <div className="col-span-3">
              <label className="text-sm font-medium">E-posta</label>
            </div>
            <div className="col-span-9">
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Name Section */}
        <div className="border-b">
          <div className="grid grid-cols-12 items-center px-4 py-4">
            <div className="col-span-3">
              <label className="text-sm font-medium">Ad Soyad</label>
            </div>
            <div className="col-span-9">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Adınızı girin"
                className="max-w-md"
              />
            </div>
          </div>
        </div>

        {/* Password Change Section Header */}
        <div className="px-4 py-2 bg-muted/50 border-b">
          <span className="text-xs font-medium text-muted-foreground">
            Şifre Değiştir
          </span>
        </div>

        {/* Current Password */}
        <div className="border-b">
          <div className="grid grid-cols-12 items-center px-4 py-4">
            <div className="col-span-3">
              <label className="text-sm font-medium">Mevcut Şifre</label>
            </div>
            <div className="col-span-9">
              <div className="relative max-w-md">
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Mevcut şifrenizi girin"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* New Password */}
        <div className="border-b">
          <div className="grid grid-cols-12 items-center px-4 py-4">
            <div className="col-span-3">
              <label className="text-sm font-medium">Yeni Şifre</label>
            </div>
            <div className="col-span-9">
              <div className="relative max-w-md">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Yeni şifrenizi girin"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="border-b">
          <div className="grid grid-cols-12 items-center px-4 py-4">
            <div className="col-span-3">
              <label className="text-sm font-medium">Şifre Tekrar</label>
            </div>
            <div className="col-span-9">
              <div className="relative max-w-md">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Yeni şifrenizi tekrar girin"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="px-4 py-4">
          <Button type="submit" disabled={!hasChanges || isLoading}>
            {isLoading ? (
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
