'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingCart,
  CreditCard,
  RotateCcw,
  Settings,
  BarChart3,
  Crown,
  Link2,
  ChevronsUpDown,
  Plus,
  Building2,
  Check,
  Loader2,
  X,
  BadgeCheck,
  Bell,
  CreditCard as CreditCardIcon,
  LogOut,
  Sparkles,
  Menu,
} from 'lucide-react';
import {
  Avatar,
  Button,
  Dropdown,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  TextField,
} from '@heroui/react';
import { toast } from 'sonner';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { useCompanyStore, type Company } from '@/stores/companyStore';
import { usePricingStore } from '@/stores/pricingStore';

interface TeamMember {
  email: string;
  role: 'ADMIN' | 'MEMBER';
}

function getInitials(name: string | undefined, email?: string) {
  if (name) {
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }
  if (email) return email.substring(0, 2).toUpperCase();
  return '??';
}

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { companies, currentCompany, fetchCompanies, switchCompany } = useCompanyStore();
  const { isPricingEnabled, fetchPricingStatus } = usePricingStore();

  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = React.useState(false);

  React.useEffect(() => {
    fetchPricingStatus();
    fetchCompanies();
  }, [fetchPricingStatus, fetchCompanies]);

  // Close mobile sidebar on route change
  React.useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const companySlug = currentCompany?.slug || '';
  const userRole = currentCompany?.role;

  const allNavItems = [
    { title: 'Dashboard', url: `/${companySlug}`, icon: LayoutDashboard, roles: ['OWNER', 'ADMIN', 'MEMBER'] },
    { title: 'Mağazalar', url: `/${companySlug}/stores`, icon: Store, roles: ['OWNER', 'ADMIN', 'MEMBER'] },
    { title: 'Stoklar', url: `/${companySlug}/inventory`, icon: Package, roles: ['OWNER', 'ADMIN', 'MEMBER', 'STOCKIST'] },
    { title: 'Ürün Eşleştirme', url: `/${companySlug}/product-mappings`, icon: Link2, roles: ['OWNER', 'ADMIN', 'MEMBER'] },
    { title: 'Siparişler', url: `/${companySlug}/orders`, icon: ShoppingCart, roles: ['OWNER', 'ADMIN', 'MEMBER'] },
    { title: 'Ödemeler', url: `/${companySlug}/payments`, icon: CreditCard, roles: ['OWNER', 'ADMIN', 'MEMBER'] },
    { title: 'Raporlar', url: `/${companySlug}/reports`, icon: BarChart3, roles: ['OWNER', 'ADMIN', 'MEMBER'] },
    { title: 'İadeler', url: `/${companySlug}/refunds`, icon: RotateCcw, roles: ['OWNER', 'ADMIN', 'MEMBER'] },
    ...(isPricingEnabled
      ? [{ title: 'Planlar', url: `/${companySlug}/pricing`, icon: Crown, roles: ['OWNER', 'ADMIN', 'MEMBER'] }]
      : []),
    { title: 'Ayarlar', url: `/${companySlug}/settings`, icon: Settings, roles: ['OWNER', 'ADMIN', 'MEMBER'] },
  ];

  const navItems = allNavItems.filter((item) => !userRole || item.roles.includes(userRole));

  const handleSwitchCompany = async (company: Company) => {
    if (company.id === currentCompany?.id) return;
    try {
      await switchCompany(company.id);
      toast.success(`${company.name} şirketine geçildi`);
      router.push(`/${company.slug}`);
    } catch {
      toast.error('Şirket değiştirilemedi');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const sidebarContent = (
    <>
      {/* Team Switcher */}
      <div className="p-2">
        <Dropdown>
          <Button
            variant="ghost"
            fullWidth
            aria-label="Şirket seç"
            className="h-auto justify-start gap-2 p-2 text-left"
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              {currentCompany ? (
                <span className="text-xs font-semibold">
                  {getInitials(currentCompany.name)}
                </span>
              ) : (
                <Building2 className="size-4" />
              )}
            </div>
            <div className="flex flex-1 flex-col leading-tight">
              <span className="truncate text-sm font-semibold">
                {currentCompany?.name || 'Şirket Seçin'}
              </span>
              {isPricingEnabled && (
                <span className="truncate text-xs font-normal text-muted">
                  {user?.plan?.displayName || 'Free'} Plan
                </span>
              )}
            </div>
            <ChevronsUpDown className="ml-auto size-4 shrink-0" />
          </Button>
          <Dropdown.Popover className="min-w-56">
            <Dropdown.Menu
              onAction={(key) => {
                if (key === '__create__') {
                  setIsCreateCompanyOpen(true);
                  return;
                }
                const company = companies.find((c) => c.id === String(key));
                if (company) handleSwitchCompany(company);
              }}
            >
              {companies.length === 0 ? (
                <Dropdown.Item id="__empty__" textValue="Boş" isDisabled>
                  <Label>Henüz bir şirketiniz yok</Label>
                </Dropdown.Item>
              ) : (
                <>
                  {companies.map((company) => (
                    <Dropdown.Item
                      key={company.id}
                      id={company.id}
                      textValue={company.name}
                    >
                      <div className="flex size-6 items-center justify-center rounded-sm border border-border bg-background">
                        <span className="text-xs">{getInitials(company.name)}</span>
                      </div>
                      <Label>{company.name}</Label>
                      {company.id === currentCompany?.id && (
                        <Check className="ml-auto size-4" />
                      )}
                    </Dropdown.Item>
                  ))}
                </>
              )}
              <Dropdown.Item id="__create__" textValue="Yeni Şirket Oluştur">
                <div className="flex size-6 items-center justify-center rounded-md border border-border bg-background">
                  <Plus className="size-4" />
                </div>
                <Label>Yeni Şirket Oluştur</Label>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="flex flex-col gap-1">
          {navItems.map((item, index) => {
            const isDashboard = index === 0;
            const isActive = isDashboard
              ? pathname === item.url
              : pathname === item.url || pathname.startsWith(item.url + '/');
            return (
              <li key={item.title}>
                <Link
                  href={item.url}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-accent/10 font-medium text-accent'
                      : 'text-foreground hover:bg-default/50'
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Menu */}
      <div className="border-t border-border p-2">
        <Dropdown>
          <Button
            variant="ghost"
            fullWidth
            aria-label="Kullanıcı menüsü"
            className="h-auto justify-start gap-2 p-2 text-left"
          >
            <Avatar className="size-8 rounded-lg">
              <Avatar.Fallback className="rounded-lg text-xs">
                {getInitials(user?.name, user?.email)}
              </Avatar.Fallback>
            </Avatar>
            <div className="flex flex-1 flex-col leading-tight">
              <span className="truncate text-sm font-semibold">
                {user?.name || 'Kullanıcı'}
              </span>
              <span className="truncate text-xs font-normal text-muted">
                {user?.email}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 shrink-0" />
          </Button>
          <Dropdown.Popover className="min-w-56">
            <Dropdown.Menu
              onAction={(key) => {
                if (key === 'logout') return handleLogout();
                if (key === 'upgrade')
                  return router.push(`/${companySlug}/settings/billing`);
                if (key === 'account') return router.push(`/${companySlug}/settings`);
                if (key === 'billing')
                  return router.push(`/${companySlug}/settings/billing`);
                if (key === 'notifications')
                  return router.push(`/${companySlug}/notifications`);
              }}
            >
              {isPricingEnabled && (
                <Dropdown.Item id="upgrade" textValue="Pro'ya Yükselt">
                  <Sparkles className="size-4" />
                  <Label>Pro&apos;ya Yükselt</Label>
                </Dropdown.Item>
              )}
              <Dropdown.Item id="account" textValue="Hesap">
                <BadgeCheck className="size-4" />
                <Label>Hesap</Label>
              </Dropdown.Item>
              {isPricingEnabled && (
                <Dropdown.Item id="billing" textValue="Faturalandırma">
                  <CreditCardIcon className="size-4" />
                  <Label>Faturalandırma</Label>
                </Dropdown.Item>
              )}
              <Dropdown.Item id="notifications" textValue="Bildirimler">
                <Bell className="size-4" />
                <Label>Bildirimler</Label>
              </Dropdown.Item>
              <Dropdown.Item id="logout" textValue="Çıkış Yap" variant="danger">
                <LogOut className="size-4" />
                <Label>Çıkış Yap</Label>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu trigger */}
      <Button
        variant="ghost"
        size="sm"
        isIconOnly
        aria-label="Menüyü aç"
        className="fixed left-3 top-3 z-30 md:hidden"
        onPress={() => setIsMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Kapat"
            className="absolute inset-0 bg-backdrop"
            onClick={() => setIsMobileOpen(false)}
          />
          <aside className="relative flex h-screen w-64 flex-col border-r border-border bg-surface">
            <div className="flex justify-end p-2">
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                aria-label="Kapat"
                onPress={() => setIsMobileOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      <CreateCompanyModal
        isOpen={isCreateCompanyOpen}
        onOpenChange={setIsCreateCompanyOpen}
      />
    </>
  );
}

function CreateCompanyModal({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { fetchCompanies, switchCompany } = useCompanyStore();

  const [companyName, setCompanyName] = React.useState('');
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [isCreating, setIsCreating] = React.useState(false);

  const reset = () => {
    setCompanyName('');
    setInviteEmail('');
    setInviteRole('MEMBER');
    setTeamMembers([]);
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
    if (
      teamMembers.some((m) => m.email.toLowerCase() === inviteEmail.toLowerCase())
    ) {
      toast.error('Bu e-posta zaten eklendi');
      return;
    }
    setTeamMembers([...teamMembers, { email: inviteEmail, role: inviteRole }]);
    setInviteEmail('');
    toast.success('Takım üyesi eklendi');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      toast.error('Şirket adı gereklidir');
      return;
    }
    setIsCreating(true);
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

      await fetchCompanies();
      await switchCompany(company.id);

      toast.success(
        `Şirket oluşturuldu${inviteCount > 0 ? ` ve ${inviteCount} davetiye gönderildi` : ''}`
      );
      onOpenChange(false);
      reset();
      router.push(`/${company.slug}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Şirket oluşturulamadı');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) reset();
      }}
    >
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-lg">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Yeni Şirket Oluştur</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <p className="text-sm text-muted">
                  Şirketinizi oluşturun ve takım arkadaşlarınızı ekleyin.
                </p>

                <TextField
                  value={companyName}
                  onChange={setCompanyName}
                  isRequired
                  isDisabled={isCreating}
                  autoFocus
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
                      value={inviteEmail}
                      onChange={setInviteEmail}
                      type="email"
                      isDisabled={isCreating}
                      className="flex-1"
                    >
                      <Input placeholder="E-posta adresi..." />
                    </TextField>
                    <Select
                      selectedKey={inviteRole}
                      onSelectionChange={(key) =>
                        setInviteRole(key as 'ADMIN' | 'MEMBER')
                      }
                      aria-label="Rol"
                      isDisabled={isCreating}
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
                      isDisabled={isCreating || !inviteEmail}
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
                          {getInitials(user?.name, user?.email)}
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
                            aria-label="Kaldır"
                            onPress={() =>
                              setTeamMembers(
                                teamMembers.filter((m) => m.email !== member.email)
                              )
                            }
                            isDisabled={isCreating}
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
                  isDisabled={isCreating || !companyName.trim()}
                  isPending={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    'Tamamla ve Başla'
                  )}
                </Button>
              </form>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
