'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronsUpDown,
  Plus,
  Building2,
  Check,
  Loader2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { api } from '@/services/api';
import { useCompanyStore, Company } from '@/stores/companyStore';
import { useAuthStore } from '@/stores/authStore';
import { usePricingStore } from '@/stores/pricingStore';

interface TeamMember {
  email: string;
  role: 'ADMIN' | 'MEMBER';
}

export function TeamSwitcher() {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { user } = useAuthStore();
  const {
    companies,
    currentCompany,
    isLoading,
    fetchCompanies,
    switchCompany,
  } = useCompanyStore();
  const { isPricingEnabled, fetchPricingStatus } = usePricingStore();

  // Fetch pricing status on mount
  React.useEffect(() => {
    fetchPricingStatus();
  }, [fetchPricingStatus]);

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [companyName, setCompanyName] = React.useState('');
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [isCreating, setIsCreating] = React.useState(false);

  // Fetch companies on mount
  React.useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleSwitchCompany = async (company: Company) => {
    if (company.id === currentCompany?.id) return;

    try {
      await switchCompany(company.id);
      toast.success(`${company.name} şirketine geçildi`);
      // Navigate to the company's dashboard using slug
      router.push(`/${company.slug}`);
    } catch (error) {
      toast.error('Şirket değiştirilemedi');
    }
  };

  const getInitials = (name: string | undefined, email?: string) => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return '??';
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

  const resetForm = () => {
    setCompanyName('');
    setInviteEmail('');
    setInviteRole('MEMBER');
    setTeamMembers([]);
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      toast.error('Şirket adı gereklidir');
      return;
    }

    setIsCreating(true);
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

      // Refresh companies list
      await fetchCompanies();
      await switchCompany(company.id);

      toast.success(`Şirket oluşturuldu${inviteCount > 0 ? ` ve ${inviteCount} davetiye gönderildi` : ''}`);
      setIsDialogOpen(false);
      resetForm();
      // Navigate to the new company's dashboard
      router.push(`/${company.slug}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Şirket oluşturulamadı');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  {currentCompany ? (
                    <span className="text-xs font-semibold">
                      {getInitials(currentCompany.name)}
                    </span>
                  ) : (
                    <Building2 className="size-4" />
                  )}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {currentCompany?.name || 'Şirket Seçin'}
                  </span>
                  {isPricingEnabled && (
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.plan?.displayName || 'Free'} Plan
                    </span>
                  )}
                </div>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              align="start"
              side={isMobile ? 'bottom' : 'right'}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Şirketler
              </DropdownMenuLabel>
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : companies.length === 0 ? (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  Henüz bir şirketiniz yok
                </div>
              ) : (
                companies.map((company) => (
                  <DropdownMenuItem
                    key={company.id}
                    onClick={() => handleSwitchCompany(company)}
                    className="gap-2 p-2"
                  >
                    <div className="flex size-6 items-center justify-center rounded-sm border bg-background">
                      <span className="text-xs">
                        {getInitials(company.name)}
                      </span>
                    </div>
                    <span className="flex-1">{company.name}</span>
                    {company.id === currentCompany?.id && (
                      <Check className="size-4" />
                    )}
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 p-2"
                onClick={() => setIsDialogOpen(true)}
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                  <Plus className="size-4" />
                </div>
                <span className="font-medium text-muted-foreground">
                  Yeni Şirket Oluştur
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* Create Company Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Yeni Şirket Oluştur</DialogTitle>
            <DialogDescription>
              Şirketinizi oluşturun ve takım arkadaşlarınızı ekleyin.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCompany}>
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
                  disabled={isCreating}
                  autoFocus
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
                    disabled={isCreating}
                    className="flex-1"
                  />
                  <Select
                    value={inviteRole}
                    onValueChange={(value) => setInviteRole(value as 'ADMIN' | 'MEMBER')}
                    disabled={isCreating}
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
                    disabled={isCreating || !inviteEmail}
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
                        {getInitials(user?.name, user?.email)}
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
                          disabled={isCreating}
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
                  disabled={isCreating || !companyName.trim()}
                >
                  {isCreating ? (
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
        </DialogContent>
      </Dialog>
    </>
  );
}
