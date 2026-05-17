'use client';

import { useState } from 'react';
import { ChevronDown, ArrowsRotateRight as Loader2, TrashBin as Trash2 } from '@gravity-ui/icons';
import { BalinaOsMark } from '@/components/icons/balinaos-mark';
import {
  Avatar,
  Button,
  Dropdown,
  Input,
  Label,
  TextField,
  toast,
} from '@heroui/react';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { useCompanyStore } from '@/stores/companyStore';
import { usePageTitle } from '@/hooks/use-page-title';

import { INVITABLE_ROLES, ROLE_LABELS, type InvitableRoleId } from '@/lib/roles';

type MemberRole = InvitableRoleId;

const ROLE_LABEL = ROLE_LABELS;

interface TeamMember {
  email: string;
  role: MemberRole;
}

const PRIMARY_BUTTON_CLASS =
  'w-full rounded-3xl bg-[#0485F7] text-[#FCFCFC] hover:bg-[#0376dd] data-[hovered=true]:bg-[#0376dd]';
const SECONDARY_BUTTON_CLASS =
  'rounded-3xl bg-[#EBEBEC] text-[#0485F7] hover:bg-[#dcdcde] data-[hovered=true]:bg-[#dcdcde]';
const ROLE_BUTTON_CLASS =
  'rounded-3xl bg-[#EBEBEC] text-[#18181B] hover:bg-[#dcdcde] data-[hovered=true]:bg-[#dcdcde]';
const DANGER_ICON_BUTTON_CLASS =
  'h-9 w-9 rounded-3xl bg-[#FF383C]/15 text-[#FF383C] hover:bg-[#FF383C]/25 data-[hovered=true]:bg-[#FF383C]/25';

const FIELD_INPUT_CLASS =
  'auth-field-input h-9 rounded-xl px-3 text-sm placeholder:text-[#71717A]';

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
        <BalinaOsMark tone="muted" width={64} height={64} aria-label="BalinaOS" />
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
          <TextField
            name="companyName"
            value={companyName}
            onChange={setCompanyName}
            isRequired
            isDisabled={isLoading}
            autoFocus
            aria-label="Şirket adı"
          >
            <Input placeholder="Şirket adı" className={FIELD_INPUT_CLASS} />
          </TextField>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-[#18181B]">
              Takım üyeleri
            </Label>
            <div className="flex gap-2">
              <TextField
                name="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={setInviteEmail}
                isDisabled={isLoading}
                aria-label="E-posta adresi"
                className="flex-1"
              >
                <Input
                  placeholder="E-posta adresi"
                  className={FIELD_INPUT_CLASS}
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
              </TextField>
              <Button
                type="button"
                variant="secondary"
                onPress={handleAddMember}
                isDisabled={isLoading || !inviteEmail.trim()}
                className={SECONDARY_BUTTON_CLASS}
              >
                Davet gönder
              </Button>
            </div>
          </div>

          {teamMembers.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-[#18181B]">
                Eklenen üyeler
              </Label>
              <div className="flex flex-col gap-2">
                {teamMembers.map((member) => (
                  <div
                    key={member.email}
                    className="flex items-center gap-2"
                  >
                    <Avatar className="size-6 shrink-0 rounded-full bg-[#EBEBEC]">
                      <Avatar.Fallback className="text-xs font-medium text-[#18181B]">
                        {getInitial(member.email)}
                      </Avatar.Fallback>
                    </Avatar>
                    <span className="flex-1 truncate text-sm text-[#18181B]">
                      {member.email}
                    </span>
                    <Dropdown>
                      <Button
                        type="button"
                        variant="tertiary"
                        size="sm"
                        className={ROLE_BUTTON_CLASS}
                      >
                        {ROLE_LABEL[member.role]}
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Dropdown.Popover placement="bottom end">
                        <Dropdown.Menu
                          selectionMode="single"
                          selectedKeys={[member.role]}
                          onAction={(key) =>
                            handleChangeRole(member.email, key as MemberRole)
                          }
                        >
                          {INVITABLE_ROLES.map((r) => (
                            <Dropdown.Item
                              key={r.id}
                              id={r.id}
                              textValue={r.label}
                            >
                              <Label>{r.label}</Label>
                              <Dropdown.ItemIndicator />
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown.Popover>
                    </Dropdown>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      isIconOnly
                      aria-label="Üyeyi sil"
                      onPress={() => handleRemoveMember(member.email)}
                      isDisabled={isLoading}
                      className={DANGER_ICON_BUTTON_CLASS}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            type="submit"
            isPending={isLoading}
            // Disable while there's a half-typed invite — user has to either
            // add it via "Davet gönder" / Enter or clear the field before the
            // form will accept submission. Prevents accidentally finalising
            // the company without the invitee they were typing.
            isDisabled={
              isLoading || !companyName.trim() || !!inviteEmail.trim()
            }
            className={PRIMARY_BUTTON_CLASS}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Oluşturuluyor...
              </>
            ) : (
              'Tamamla'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
