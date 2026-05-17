'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from '@gravity-ui/icons';
import {
  AlertDialog,
  Avatar,
  Button,
  Input,
  Label,
  Modal,
  TextField,
  toast,
} from '@heroui/react';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { useCompanyStore } from '@/stores/companyStore';
import { usePageTitle } from '@/hooks/use-page-title';
import { customUserName, userDisplayName } from '@/lib/user-display';

export default function ProfileSettingsPage() {
  usePageTitle('Kişisel bilgiler');

  const router = useRouter();
  const { user, updateProfile, logout, isLoading } = useAuthStore();
  const { currentCompany } = useCompanyStore();
  const slug = currentCompany?.slug ?? '';

  const userInitial = (user?.name || user?.email || '?').charAt(0).toUpperCase();
  // Custom name = real name the user typed in, distinct from the auto
  // `balinaOS<num>` placeholder. Drives the row label + edit modal seed.
  const realName = customUserName(user);

  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [draftName, setDraftName] = useState(realName);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const openNameModal = () => {
    setDraftName(realName);
    setIsNameModalOpen(true);
  };

  const handleSaveName = async () => {
    const next = draftName.trim();
    if (!next) {
      toast.danger('İsim boş bırakılamaz');
      return;
    }
    if (next === user?.name) {
      setIsNameModalOpen(false);
      return;
    }
    const success = await updateProfile({ name: next });
    if (success) {
      toast.success('Adınız güncellendi');
      setIsNameModalOpen(false);
    } else {
      toast.danger('Güncelleme başarısız');
    }
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
        <h2 className="text-sm font-medium text-foreground">Kişisel Bilgiler</h2>
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
          <Button
            variant="tertiary"
            onPress={() => setIsDeleteOpen(true)}
            className="h-8 cursor-pointer rounded-full bg-black/[0.06] px-3 text-foreground hover:bg-black/[0.10] data-[hovered=true]:bg-black/[0.10]"
          >
            Hesabı sil
          </Button>
        </div>
      </div>

      <Modal isOpen={isNameModalOpen} onOpenChange={setIsNameModalOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.Header>
                <Modal.Heading>İsim ve soyisim</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="modal-form-card">
                  <TextField
                    variant="secondary"
                    value={draftName}
                    onChange={setDraftName}
                    isDisabled={isLoading}
                    autoFocus
                  >
                    <Label>Adınız</Label>
                    <Input placeholder="Ad ve soyadınız" />
                  </TextField>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button slot="close" variant="tertiary" isDisabled={isLoading}>
                  Vazgeç
                </Button>
                <Button onPress={handleSaveName} isPending={isLoading}>
                  Kaydet
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <AlertDialog isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-[420px]">
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>Hesabı sil</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>
                  Hesabınız, sahibi olduğunuz şirketler ve tüm verileriniz
                  kalıcı olarak silinecek. Bu işlem geri alınamaz.
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button variant="tertiary" slot="close" isDisabled={isDeleting}>
                  Vazgeç
                </Button>
                <Button
                  variant="danger"
                  onPress={handleConfirmDelete}
                  isPending={isDeleting}
                >
                  Hesabımı sil
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </>
  );
}
