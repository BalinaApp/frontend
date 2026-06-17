'use client';

import { useEffect, useState } from 'react';
import { Pencil, ArrowsRotateRight as Loader2 } from '@gravity-ui/icons';
import {
  BalinaAvatar,
  BalinaButton,
  BalinaSwitch,
  BalinaPlusIcon,
  BalinaModal,
  BalinaTextField,
  BalinaSelect,
  toast,
} from '@/components/balina';
import { useCompany } from '@/components/providers/CompanyProvider';
import { useCompanyStore } from '@/stores/companyStore';
import { api } from '@/services/api';
import { usePageTitle } from '@/hooks/use-page-title';
import {
  INVITABLE_ROLES,
  ROLE_LABELS as ROLE_LABEL_MAP,
  type CompanyRoleId,
  type InvitableRoleId,
} from '@/lib/roles';

interface Member {
  id: string;
  email: string;
  role: CompanyRoleId;
  inviteStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  isActive: boolean;
  joinedAt: string | null;
  invitedAt: string | null;
  user: { id: string; email: string; name: string | null } | null;
}

type AssignableRole = InvitableRoleId;

const ROLE_LABELS = ROLE_LABEL_MAP;

const ASSIGNABLE_ROLES: AssignableRole[] = INVITABLE_ROLES.map(
  (r) => r.id as AssignableRole,
);

function memberInitial(member: Member): string {
  const source = member.user?.name || member.email;
  return source.charAt(0).toUpperCase();
}

export default function CompanySettingsPage() {
  usePageTitle('Şirket');

  const { company, refreshCompany } = useCompany();
  const { updateCompany, isLoading: isUpdatingCompany } = useCompanyStore();

  const [members, setMembers] = useState<Member[]>([]);
  // Tracks members whose status toggle is mid-flight (so we don't fire
  // multiple PATCHes at once and can disable the switch optimistically).
  const [pendingMemberIds, setPendingMemberIds] = useState<Set<string>>(
    new Set()
  );

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [draftName, setDraftName] = useState('');

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AssignableRole>('ADMIN');
  const [isInviting, setIsInviting] = useState(false);

  const companyInitial = (company?.name ?? '?').charAt(0).toUpperCase();

  const fetchMembers = async () => {
    if (!company?.id) return;
    try {
      const res = await api.get(`/company/${company.id}/members`);
      setMembers(res.data);
    } catch {
      toast.danger('Üyeler yüklenemedi');
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [company?.id]);

  // ---- Rename ----
  const openRename = () => {
    setDraftName(company?.name ?? '');
    setIsRenameOpen(true);
  };

  const handleRename = async () => {
    if (!company?.id) return;
    const next = draftName.trim();
    if (!next) {
      toast.danger('Şirket adı boş olamaz');
      return;
    }
    if (next === company.name) {
      setIsRenameOpen(false);
      return;
    }
    const ok = await updateCompany(company.id, { name: next });
    if (ok) {
      toast.success('Şirket adı güncellendi');
      setIsRenameOpen(false);
      refreshCompany();
    } else {
      toast.danger('Güncelleme başarısız');
    }
  };

  // ---- Invite ----
  const handleInvite = async () => {
    if (!company?.id || !inviteEmail.trim()) return;
    setIsInviting(true);
    try {
      await api.post(`/company/${company.id}/invite`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      toast.success('Davet gönderildi');
      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteRole('ADMIN');
      fetchMembers();
    } catch (err: any) {
      toast.danger(err.response?.data?.message || 'Davet gönderilemedi');
    } finally {
      setIsInviting(false);
    }
  };

  // ---- Role change ----
  // Backend: PATCH /company/:id/members/:memberId/role { role }. OWNER role
  // değiştirilemez; OWNER'a yükseltilemez (sahiplik transferi ayrı akış).
  const handleChangeRole = async (member: Member, role: AssignableRole) => {
    if (!company?.id) return;
    if (member.role === role) return;
    if (pendingMemberIds.has(member.id)) return;

    setPendingMemberIds((prev) => new Set(prev).add(member.id));
    const previousRole = member.role;
    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, role } : m))
    );
    try {
      await api.patch(`/company/${company.id}/members/${member.id}/role`, {
        role,
      });
      toast.success(
        `${member.user?.name || member.email} rolü güncellendi`
      );
    } catch (err: any) {
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, role: previousRole } : m))
      );
      toast.danger(err.response?.data?.message || 'Rol değiştirilemedi');
    } finally {
      setPendingMemberIds((prev) => {
        const next = new Set(prev);
        next.delete(member.id);
        return next;
      });
    }
  };

  // ---- Switch off = takımdan çıkar ----
  // Switch off DELETE /company/:id/members/:memberId çağırır (üyeyi siler).
  // Switch on no-op'tur — üye zaten takımda.
  const handleToggleActive = async (member: Member, isActive: boolean) => {
    if (!company?.id) return;
    if (member.role === 'OWNER') return;
    if (pendingMemberIds.has(member.id)) return;
    // Switch on → no-op; üye zaten listede (deaktif konsepti kaldırıldı).
    if (isActive) return;

    const display = member.user?.name || member.email;
    if (
      !window.confirm(`${display} kullanıcısı takımdan çıkarılacak. Emin misiniz?`)
    ) {
      // Onay yoksa state değişmiyor — Switch controlled olduğu için
      // member.inviteStatus üzerinden true kalmaya devam edecek.
      return;
    }

    setPendingMemberIds((prev) => new Set(prev).add(member.id));
    // Optimistic remove.
    const snapshot = members;
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
    try {
      await api.delete(`/company/${company.id}/members/${member.id}`);
      toast.success(`${display} takımdan çıkarıldı`);
    } catch (err: any) {
      // Revert.
      setMembers(snapshot);
      toast.danger(err.response?.data?.message || 'Üye çıkarılamadı');
    } finally {
      setPendingMemberIds((prev) => {
        const next = new Set(prev);
        next.delete(member.id);
        return next;
      });
    }
  };

  return (
    <>
      <div className="flex flex-1 flex-col items-center overflow-y-auto py-6">
        <div className="flex w-full max-w-[616px] flex-col items-center gap-6 px-3">
          {/* Company avatar */}
          <BalinaAvatar
            fallback={companyInitial}
            alt={company?.name ?? 'Şirket'}
            className="h-[116px] w-[116px] text-3xl font-semibold"
          />

          {/* Name + edit */}
          <div className="flex items-center justify-center gap-2">
            <h3 className="text-xl font-semibold text-foreground">
              {company?.name ?? 'Şirket Adı'}
            </h3>
            <BalinaButton
              variant="soft"
              size="large"
              aria-label="Şirket adını düzenle"
              onClick={openRename}
              leftIcon={<Pencil className="h-4 w-4" />}
            />
          </div>

          {/* Members */}
          <div className="flex w-full flex-col rounded-xl bg-surface">
            {members.map((member, index) => {
              const isLast = index === members.length - 1;
              const display = member.user?.name || member.email;
              const isOwner = member.role === 'OWNER';
              return (
                <div
                  key={member.id}
                  className={`flex items-center gap-3 p-3 ${
                    !isLast ? 'border-b border-black/[0.02]' : ''
                  }`}
                >
                  <div className="flex flex-1 items-center gap-3">
                    <BalinaAvatar
                      size="medium"
                      fallback={memberInitial(member)}
                      className="h-6 w-6 shrink-0"
                    />
                    <span className="truncate text-body-small-one-liner-medium text-foreground/85">
                      {display}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Role chip */}
                    {isOwner ? (
                      <span className="flex h-8 items-center rounded-2xl px-2 text-xs font-medium text-default-foreground">
                        {ROLE_LABELS.OWNER}
                      </span>
                    ) : (
                      <BalinaSelect
                        value={member.role}
                        onValueChange={(key) =>
                          handleChangeRole(member, key as AssignableRole)
                        }
                        options={ASSIGNABLE_ROLES.map((role) => ({
                          value: role,
                          label: ROLE_LABELS[role],
                        }))}
                      />
                    )}
                    {/* Switch off → takımdan çıkar (DELETE). On no-op. */}
                    <BalinaSwitch
                      checked={member.inviteStatus === 'ACCEPTED'}
                      disabled={
                        isOwner ||
                        member.inviteStatus !== 'ACCEPTED' ||
                        pendingMemberIds.has(member.id)
                      }
                      onCheckedChange={(value) => handleToggleActive(member, value)}
                    />
                  </div>
                </div>
              );
            })}

            {/* "Yeni ekle" row */}
            <button
              type="button"
              onClick={() => setIsInviteOpen(true)}
              className={`flex cursor-pointer items-center gap-3 p-3 text-left transition-colors ${
                members.length > 0 ? 'rounded-b-xl' : 'rounded-xl'
              } hover:bg-default/40`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center text-default-foreground">
                <BalinaPlusIcon className="h-4 w-4" />
              </span>
              <span className="text-body-small-one-liner-medium text-foreground/85">Yeni ekle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Rename modal */}
      <BalinaModal
        open={isRenameOpen}
        onOpenChange={setIsRenameOpen}
        title="Şirket adı"
        footer={
          <>
            <BalinaButton
              variant="soft"
              size="large"
              onClick={() => setIsRenameOpen(false)}
              disabled={isUpdatingCompany}
            >
              Vazgeç
            </BalinaButton>
            <BalinaButton
              variant="primary"
              size="large"
              onClick={handleRename}
              disabled={isUpdatingCompany}
            >
              Kaydet
            </BalinaButton>
          </>
        }
      >
        <BalinaTextField
          label="Şirket adı"
          value={draftName}
          onChange={setDraftName}
          disabled={isUpdatingCompany}
          autoFocus
          placeholder="Şirket adını girin"
        />
      </BalinaModal>

      {/* Invite modal */}
      <BalinaModal
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        title="Yeni üye davet et"
        footer={
          <>
            <BalinaButton
              variant="soft"
              size="large"
              onClick={() => setIsInviteOpen(false)}
              disabled={isInviting}
            >
              Vazgeç
            </BalinaButton>
            <BalinaButton
              variant="primary"
              size="large"
              onClick={handleInvite}
              disabled={!inviteEmail.trim() || isInviting}
              leftIcon={
                isInviting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : undefined
              }
            >
              {isInviting ? 'Gönderiliyor...' : 'Davet gönder'}
            </BalinaButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <BalinaTextField
            label="E-posta adresi"
            value={inviteEmail}
            onChange={setInviteEmail}
            type="email"
            disabled={isInviting}
            autoFocus
            placeholder="ornek@email.com"
          />
          <div className="flex flex-col gap-1">
            <label className="text-body-small-one-liner-medium px-1 text-[var(--balina-text-strong)]">
              Rol
            </label>
            <BalinaSelect
              value={inviteRole}
              onValueChange={(key) => setInviteRole(key as AssignableRole)}
              disabled={isInviting}
              options={ASSIGNABLE_ROLES.map((role) => ({
                value: role,
                label: ROLE_LABELS[role],
              }))}
            />
          </div>
        </div>
      </BalinaModal>
    </>
  );
}
