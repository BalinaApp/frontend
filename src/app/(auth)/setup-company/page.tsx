'use client';

import { useState } from 'react';
import { ArrowsRotateRight as Loader2, TrashBin as Trash2 } from '@gravity-ui/icons';
import { BalinaOsMark } from '@/components/icons/balinaos-mark';
import {
  BalinaAvatar,
  BalinaButton,
  BalinaSelect,
  BalinaTextField,
  toast,
} from '@/components/balina';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { useCompanyStore } from '@/stores/companyStore';
import { usePageTitle } from '@/hooks/use-page-title';

import { INVITABLE_ROLES, type InvitableRoleId } from '@/lib/roles';

type MemberRole = InvitableRoleId;

interface TeamMember {
  email: string;
  role: MemberRole;
}

const PRIMARY_BUTTON_CLASS = 'w-full';

function getInitial(email: string) {
  return email.charAt(0).toUpperCase();
}

export default function SetupCompanyPage() {
  usePageTitle('Şirket oluştur');

  // We don't router.push from this page on success — letting AuthGuard's
  // "isCompanySetupPath + companies.length > 0" branch fire the single
  // navigation avoids racing with our own push (which used to manifest as
  // "InvalidStateError: Transition was aborted").
  const { user } = useAuthStore();
  const { createCompany } = useCompanyStore();

  const [companyName, setCompanyName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('ADMIN');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddMember = () => {
    const email = inviteEmail.trim();
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.danger('Geçerli bir e-posta adresi girin');
      return;
    }
    if (email.toLowerCase() === user?.email?.toLowerCase()) {
      toast.danger('Kendinizi ekleyemezsiniz');
      return;
    }
    if (teamMembers.some((m) => m.email.toLowerCase() === email.toLowerCase())) {
      toast.danger('Bu e-posta zaten eklendi');
      return;
    }

    setTeamMembers([...teamMembers, { email, role: inviteRole }]);
    setInviteEmail('');
  };

  const handleRemoveMember = (email: string) => {
    toast.danger(`${email} davetini iptal etmek istediğinize emin misiniz?`, {
      actionProps: {
        children: 'Sil',
        variant: 'danger',
        onPress: () => {
          setTeamMembers((prev) => prev.filter((m) => m.email !== email));
          toast.clear();
        },
      },
    });
  };

  const handleChangeRole = (email: string, role: MemberRole) => {
    setTeamMembers(
      teamMembers.map((m) => (m.email === email ? { ...m, role } : m))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim()) {
      toast.danger('Şirket adı gereklidir');
      return;
    }

    setIsLoading(true);
    try {
      // Use the store action so companies + currentCompany + auth.user are
      // updated atomically; AuthGuard observes companies.length > 0 and
      // pushes us out of /setup-company.
      const company = await createCompany(companyName);

      let inviteCount = 0;
      for (const member of teamMembers) {
        try {
          await api.post(`/company/${company.id}/invite`, {
            email: member.email,
            role: member.role,
          });
          inviteCount++;
        } catch (err) {
          console.error(`Failed to invite ${member.email}`, err);
        }
      }

      toast.success(
        `Şirket oluşturuldu${inviteCount > 0 ? ` ve ${inviteCount} davetiye gönderildi` : ''}`
      );
      // No router.push — AuthGuard handles it.
    } catch (err: any) {
      toast.danger(err.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-black/[0.04] p-4 md:p-10">
      <div className="flex w-full max-w-[448px] flex-col items-center gap-5">
        <BalinaOsMark tone="muted" width={64} height={64} aria-label="balinaOS" />
        <div className="flex w-full max-w-[332px] flex-col items-center gap-1 text-center">
          <h1 className="text-xl font-semibold leading-[1.4] text-black">
            Şirket bilgileri
          </h1>
          <p className="text-sm leading-[1.43] text-black/80">
            Şirketinizi oluşturun ve takım arkadaşlarınızı ekleyin.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex w-full flex-col gap-4"
        >
          <BalinaTextField
            name="companyName"
            value={companyName}
            onChange={setCompanyName}
            required
            disabled={isLoading}
            autoFocus
            aria-label="Şirket adı"
            placeholder="Şirket adı"
          />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#18181B]">
              Takım üyeleri
            </span>
            <div className="flex gap-2">
              <BalinaTextField
                name="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={setInviteEmail}
                disabled={isLoading}
                aria-label="E-posta adresi"
                placeholder="E-posta adresi"
                containerClassName="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // Adding an invitee is the natural action when there's
                    // text in the field; only let the form submit fire
                    // (Tamamla) when the field is empty.
                    if (inviteEmail.trim()) {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddMember();
                    }
                  }
                }}
              />
              <BalinaButton
                type="button"
                variant="soft"
                onClick={handleAddMember}
                disabled={isLoading || !inviteEmail.trim()}
              >
                Davet gönder
              </BalinaButton>
            </div>
          </div>

          {teamMembers.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#18181B]">
                Eklenen üyeler
              </span>
              <div className="flex flex-col gap-2">
                {teamMembers.map((member) => (
                  <div
                    key={member.email}
                    className="flex items-center gap-2"
                  >
                    <BalinaAvatar
                      size="large"
                      fallback={getInitial(member.email)}
                      className="shrink-0"
                    />
                    <span className="flex-1 truncate text-sm text-[#18181B]">
                      {member.email}
                    </span>
                    <BalinaSelect
                      value={member.role}
                      onValueChange={(key) =>
                        handleChangeRole(member.email, key as MemberRole)
                      }
                      options={INVITABLE_ROLES.map((r) => ({
                        value: r.id,
                        label: r.label,
                      }))}
                      disabled={isLoading}
                    />
                    <BalinaButton
                      type="button"
                      variant="danger"
                      size="small"
                      aria-label="Üyeyi sil"
                      onClick={() => handleRemoveMember(member.email)}
                      disabled={isLoading}
                      leftIcon={<Trash2 className="h-4 w-4" />}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <BalinaButton
            type="submit"
            variant="primary"
            // Disable while there's a half-typed invite — user has to either
            // add it via "Davet gönder" / Enter or clear the field before the
            // form will accept submission. Prevents accidentally finalising
            // the company without the invitee they were typing.
            disabled={
              isLoading || !companyName.trim() || !!inviteEmail.trim()
            }
            className={PRIMARY_BUTTON_CLASS}
            leftIcon={
              isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined
            }
          >
            {isLoading ? 'Oluşturuluyor...' : 'Tamamla'}
          </BalinaButton>
        </form>
      </div>
    </div>
  );
}
