'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronDown,
  Pencil,
  Plus,
  ArrowsRotateRight as Loader2,
} from '@gravity-ui/icons';
import {
  Avatar,
  Button,
  Dropdown,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Switch,
  TextField,
  toast,
} from '@heroui/react';
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

  const router = useRouter();
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
  const [inviteRole, setInviteRole] = useState<AssignableRole>('MEMBER');
  const [isInviting, setIsInviting] = useState(false);

  const slug = company?.slug ?? '';
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
      setInviteRole('MEMBER');
      fetchMembers();
    } catch (err: any) {
      toast.danger(err.response?.data?.message || 'Davet gönderilemedi');
    } finally {
      setIsInviting(false);
    }
  };

  // ---- Role change ----
  const handleChangeRole = (member: Member, role: AssignableRole) => {
    if (member.role === role) return;
    // Backend role-update endpoint isn't wired yet; flag and revert UI.
    toast.danger('Rol değişikliği henüz aktif değil.');
    void role;
  };

  // ---- Active toggle ----
  // Owners can't be deactivated. For everyone else, the switch hits
  // PATCH /company/:id/members/:memberId/status. On success we patch the
  // local row's isActive; on failure we revert and toast the server message.
  const handleToggleActive = async (member: Member, isActive: boolean) => {
    if (!company?.id) return;
    if (member.role === 'OWNER') return;
    if (pendingMemberIds.has(member.id)) return;

    setPendingMemberIds((prev) => new Set(prev).add(member.id));
    // Optimistic update.
    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, isActive } : m))
    );
    try {
      await api.patch(
        `/company/${company.id}/members/${member.id}/status`,
        { isActive }
      );
      toast.success(
        isActive
          ? `${member.user?.name || member.email} yeniden etkinleştirildi`
          : `${member.user?.name || member.email} deaktif edildi`
      );
    } catch (err: any) {
      // Revert.
      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id ? { ...m, isActive: !isActive } : m
        )
      );
      toast.danger(err.response?.data?.message || 'İşlem başarısız');
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
        <h2 className="text-sm font-medium text-foreground">Şirket</h2>
      </div>

      <div className="flex flex-1 flex-col items-center overflow-y-auto py-6">
        <div className="flex w-full max-w-[616px] flex-col items-center gap-6 px-3">
          {/* Company avatar */}
          <Avatar className="h-[116px] w-[116px] rounded-full">
            <Avatar.Fallback className="rounded-full bg-zinc-500 text-3xl font-semibold text-white">
              {companyInitial}
            </Avatar.Fallback>
          </Avatar>

          {/* Name + edit */}
          <div className="flex items-center justify-center gap-2">
            <h3 className="text-xl font-semibold text-foreground">
              {company?.name ?? 'Şirket Adı'}
            </h3>
            <Button
              variant="tertiary"
              size="sm"
              isIconOnly
              aria-label="Şirket adını düzenle"
              onPress={openRename}
              className="h-8 w-8 cursor-pointer rounded-2xl bg-black/[0.06] text-foreground hover:bg-black/[0.10] data-[hovered=true]:bg-black/[0.10]"
            >
              <Pencil className="h-4 w-4" />
            </Button>
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
                    <Avatar className="h-6 w-6 shrink-0 rounded-full">
                      <Avatar.Fallback className="rounded-full bg-zinc-500 text-[10px] font-medium text-white">
                        {memberInitial(member)}
                      </Avatar.Fallback>
                    </Avatar>
                    <span className="truncate text-sm font-medium text-foreground/85">
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
                      <Dropdown>
                        <Button
                          variant="tertiary"
                          size="sm"
                          aria-label="Rol seç"
                          className="h-8 cursor-pointer rounded-2xl bg-transparent px-2 text-default-foreground hover:bg-default data-[hovered=true]:bg-default"
                        >
                          <span className="text-xs font-medium">
                            {ROLE_LABELS[member.role]}
                          </span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Dropdown.Popover>
                          <Dropdown.Menu
                            selectionMode="single"
                            selectedKeys={[member.role]}
                            onAction={(key) =>
                              handleChangeRole(member, key as AssignableRole)
                            }
                          >
                            {ASSIGNABLE_ROLES.map((role) => (
                              <Dropdown.Item key={role} id={role} textValue={ROLE_LABELS[role]}>
                                <Label>{ROLE_LABELS[role]}</Label>
                                <Dropdown.ItemIndicator />
                              </Dropdown.Item>
                            ))}
                          </Dropdown.Menu>
                        </Dropdown.Popover>
                      </Dropdown>
                    )}
                    {/* Active switch — toggling off deactivates the account */}
                    <Switch
                      isSelected={
                        member.inviteStatus === 'ACCEPTED' && member.isActive
                      }
                      isDisabled={
                        isOwner ||
                        member.inviteStatus !== 'ACCEPTED' ||
                        pendingMemberIds.has(member.id)
                      }
                      onChange={(value) => handleToggleActive(member, value)}
                      aria-label={`${display} aktif`}
                    >
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch>
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
                <Plus className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm font-medium text-foreground/85">Yeni ekle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Rename modal */}
      <Modal isOpen={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Şirket adı</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <TextField
                  value={draftName}
                  onChange={setDraftName}
                  isDisabled={isUpdatingCompany}
                  autoFocus
                >
                  <Label>Şirket adı</Label>
                  <Input placeholder="Şirket adını girin" />
                </TextField>
              </Modal.Body>
              <Modal.Footer>
                <Button slot="close" variant="tertiary" isDisabled={isUpdatingCompany}>
                  Vazgeç
                </Button>
                <Button onPress={handleRename} isPending={isUpdatingCompany}>
                  Kaydet
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Invite modal */}
      <Modal isOpen={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Yeni üye davet et</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-4">
                <TextField
                  value={inviteEmail}
                  onChange={setInviteEmail}
                  type="email"
                  isDisabled={isInviting}
                  autoFocus
                >
                  <Label>E-posta adresi</Label>
                  <Input placeholder="ornek@email.com" />
                </TextField>
                <Select
                  selectedKey={inviteRole}
                  onSelectionChange={(key) => setInviteRole(key as AssignableRole)}
                  isDisabled={isInviting}
                  aria-label="Rol"
                >
                  <Label>Rol</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {ASSIGNABLE_ROLES.map((role) => (
                        <ListBox.Item key={role} id={role} textValue={ROLE_LABELS[role]}>
                          {ROLE_LABELS[role]}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </Modal.Body>
              <Modal.Footer>
                <Button slot="close" variant="tertiary" isDisabled={isInviting}>
                  Vazgeç
                </Button>
                <Button
                  onPress={handleInvite}
                  isDisabled={!inviteEmail.trim() || isInviting}
                  isPending={isInviting}
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Gönderiliyor...
                    </>
                  ) : (
                    'Davet gönder'
                  )}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
