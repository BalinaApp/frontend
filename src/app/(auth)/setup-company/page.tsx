'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
      toast.error('Geçerli bir e-posta adresi girin');
      return;
    }

    if (inviteEmail.toLowerCase() === user?.email?.toLowerCase()) {
      toast.error('Kendinizi ekleyemezsiniz');
      return;
    }

    if (teamMembers.some(m => m.email.toLowerCase() === inviteEmail.toLowerCase())) {
      toast.error('Bu e-posta zaten eklendi');
      return;
    }

    setTeamMembers([...teamMembers, { email: inviteEmail, role: inviteRole }]);
    setInviteEmail('');
    toast.success('Takım üyesi eklendi');
  };

  const handleRemoveMember = (email: string) => {
    setTeamMembers(teamMembers.filter(m => m.email !== email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim()) {
      toast.error('Şirket adı gereklidir');
      return;
    }

    setIsLoading(true);

    try {
      // Create company
      const companyResponse = await api.post('/company', { name: companyName });
      const company = companyResponse.data;

      // Send invites
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

      // Update user with current company
      if (user) {
        setUser({ ...user, currentCompanyId: company.id } as any);
      }

      toast.success(`Şirket oluşturuldu${inviteCount > 0 ? ` ve ${inviteCount} davetiye gönderildi` : ''}`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className={cn('flex flex-col gap-6')}>
          <FieldGroup>
            {/* Header */}
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                <Briefcase className="h-7 w-7 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold">Şirket Bilgileri ve Takım</h1>
              <FieldDescription>
                Şirketinizi oluşturun ve takım arkadaşlarınızı ekleyin.
              </FieldDescription>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="companyName">
                    Şirket Adı <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="companyName"
                    type="text"
                    placeholder="Şirket adınızı girin"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={isLoading}
                  />
                </Field>

                <Field>
                  <FieldLabel>Takım Üyesi Ekle</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="E-posta adresi..."
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Select
                      value={inviteRole}
                      onValueChange={(value) => setInviteRole(value as 'ADMIN' | 'MEMBER')}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MEMBER">Kullanıcı</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddMember}
                      disabled={isLoading || !inviteEmail}
                    >
                      Ekle
                    </Button>
                  </div>
                </Field>

                <Field>
                  <FieldLabel>Erişimi olan üyeler</FieldLabel>
                  <div className="space-y-2">
                    {/* Current user (owner) */}
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                          {getInitials(user?.name, user?.email || '')}
                        </div>
                        <div>
                          <p className="font-medium">
                            {user?.name || user?.email} <span className="text-muted-foreground">(Siz)</span>
                          </p>
                          <p className="text-sm text-muted-foreground">{user?.email}</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-green-600">Admin</span>
                    </div>

                    {/* Invited members */}
                    {teamMembers.map((member) => (
                      <div
                        key={member.email}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                            {member.email.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{member.email}</p>
                            <p className="text-sm text-muted-foreground">Davet bekliyor</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {member.role === 'ADMIN' ? 'Admin' : 'Kullanıcı'}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMember(member.email)}
                            disabled={isLoading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Field>

                <Field>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || !companyName.trim()}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Oluşturuluyor...
                      </>
                    ) : (
                      'Tamamla ve Başla'
                    )}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </FieldGroup>
        </div>
      </div>
    </div>
  );
}
