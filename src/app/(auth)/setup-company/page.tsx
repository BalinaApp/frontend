'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Loader2, X } from 'lucide-react';
import { Button, Input, Label, ListBox, Select, TextField, toast } from '@heroui/react';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

interface TeamMember {
  email: string;
  role: 'ADMIN' | 'MEMBER';
}

export default function SetupCompanyPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  const [companyName, setCompanyName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getInitials = (name: string | undefined, email: string) => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const handleAddMember = () => {
    if (!inviteEmail) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast.danger('Geçerli bir e-posta adresi girin');
      return;
    }

    if (inviteEmail.toLowerCase() === user?.email?.toLowerCase()) {
      toast.danger('Kendinizi ekleyemezsiniz');
      return;
    }

    if (teamMembers.some((m) => m.email.toLowerCase() === inviteEmail.toLowerCase())) {
      toast.danger('Bu e-posta zaten eklendi');
      return;
    }

    setTeamMembers([...teamMembers, { email: inviteEmail, role: inviteRole }]);
    setInviteEmail('');
    toast.success('Takım üyesi eklendi');
  };

  const handleRemoveMember = (email: string) => {
    setTeamMembers(teamMembers.filter((m) => m.email !== email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim()) {
      toast.danger('Şirket adı gereklidir');
      return;
    }

    setIsLoading(true);

    try {
      const companyResponse = await api.post('/company', { name: companyName });
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
      router.push('/dashboard');
    } catch (err: any) {
      toast.danger(err.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Briefcase className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold">Şirket Bilgileri ve Takım</h1>
            <p className="text-sm text-muted">
              Şirketinizi oluşturun ve takım arkadaşlarınızı ekleyin.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <TextField
              name="companyName"
              value={companyName}
              onChange={setCompanyName}
              isRequired
              isDisabled={isLoading}
            >
              <Label>
                Şirket Adı <span className="text-danger">*</span>
              </Label>
              <Input placeholder="Şirket adınızı girin" />
            </TextField>

            <div className="flex flex-col gap-2">
              <Label>Takım Üyesi Ekle</Label>
              <div className="flex gap-2">
                <TextField
                  name="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={setInviteEmail}
                  isDisabled={isLoading}
                  className="flex-1"
                >
                  <Input placeholder="E-posta adresi..." />
                </TextField>
                <Select
                  selectedKey={inviteRole}
                  onSelectionChange={(key) =>
                    setInviteRole(key as 'ADMIN' | 'MEMBER')
                  }
                  isDisabled={isLoading}
                  aria-label="Rol seç"
                  className="w-[120px]"
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item id="MEMBER" textValue="Kullanıcı">
                        Kullanıcı
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                      <ListBox.Item id="ADMIN" textValue="Admin">
                        Admin
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    </ListBox>
                  </Select.Popover>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onPress={handleAddMember}
                  isDisabled={isLoading || !inviteEmail}
                >
                  Ekle
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Erişimi olan üyeler</Label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-medium text-accent">
                      {getInitials(user?.name, user?.email || '')}
                    </div>
                    <div>
                      <p className="font-medium">
                        {user?.name || user?.email}{' '}
                        <span className="text-muted">(Siz)</span>
                      </p>
                      <p className="text-sm text-muted">{user?.email}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-success">Admin</span>
                </div>

                {teamMembers.map((member) => (
                  <div
                    key={member.email}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-default text-sm font-medium">
                        {member.email.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{member.email}</p>
                        <p className="text-sm text-muted">Davet bekliyor</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted">
                        {member.role === 'ADMIN' ? 'Admin' : 'Kullanıcı'}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        isIconOnly
                        aria-label="Üyeyi kaldır"
                        onPress={() => handleRemoveMember(member.email)}
                        isDisabled={isLoading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              fullWidth
              isPending={isLoading}
              isDisabled={isLoading || !companyName.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                'Tamamla ve Başla'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
