'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronDown, Loader2, Trash2 } from 'lucide-react';
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

type MemberRole = 'ADMIN' | 'MEMBER' | 'STOCKIST';

interface TeamMember {
  email: string;
  role: MemberRole;
}

const ROLE_LABEL: Record<MemberRole, string> = {
  ADMIN: 'Yönetici',
  MEMBER: 'Üye',
  STOCKIST: 'Stokçu',
};

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

function getInitials(email: string) {
  return email.substring(0, 2).toUpperCase();
}

export default function SetupCompanyPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  const [companyName, setCompanyName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('MEMBER');
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
    setTeamMembers(teamMembers.filter((m) => m.email !== email));
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
      const companyResponse = await api.post('/company', {
        name: companyName,
      });
      const company = companyResponse.data;

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

      if (user) {
        setUser({ ...user, currentCompanyId: company.id } as any);
      }

      toast.success(
        `Şirket oluşturuldu${inviteCount > 0 ? ` ve ${inviteCount} davetiye gönderildi` : ''}`
      );
      router.push(`/${company.slug}`);
    } catch (err: any) {
      toast.danger(err.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-black/[0.04] p-4 md:p-10">
      <div className="flex w-full max-w-[448px] flex-col items-center gap-5">
        <Image
          src="/figma/balina-logo.svg"
          alt="Balina"
          width={64}
          height={64}
          priority
        />
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
                    <Avatar className="size-6 shrink-0 rounded-full bg-[#EBEBEC] text-[10px]">
                      <Avatar.Fallback>
                        {getInitials(member.email)}
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
                      <Dropdown.Popover>
                        <Dropdown.Menu
                          onAction={(key) =>
                            handleChangeRole(member.email, key as MemberRole)
                          }
                        >
                          <Dropdown.Item id="MEMBER" textValue="Üye">
                            <Label>Üye</Label>
                          </Dropdown.Item>
                          <Dropdown.Item id="ADMIN" textValue="Yönetici">
                            <Label>Yönetici</Label>
                          </Dropdown.Item>
                          <Dropdown.Item id="STOCKIST" textValue="Stokçu">
                            <Label>Stokçu</Label>
                          </Dropdown.Item>
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
            isDisabled={isLoading || !companyName.trim()}
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
