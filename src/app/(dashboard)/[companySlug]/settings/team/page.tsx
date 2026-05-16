'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Persons as Users, ChevronLeft, TrashBin as Trash2, ArrowsRotateRight as Loader2, CrownDiamond as Crown, Box as Package, ArrowUpFromSquare as Upload } from '@gravity-ui/icons';
import { Envelope as Mail, Shield, Clock, CircleCheckFill as CheckCircle2 } from '@gravity-ui/icons';
import { AlertDialog, Button, Input, Label, ListBox, Modal, Select, TextField, toast } from '@heroui/react';
import { useCompany } from '@/components/providers/CompanyProvider';
import { api } from '@/services/api';
import { usePageTitle } from '@/hooks/use-page-title';
import {
  INVITABLE_ROLES,
  ROLE_LABELS,
  type CompanyRoleId,
  type InvitableRoleId,
} from '@/lib/roles';

interface Member {
  id: string;
  email: string;
  role: CompanyRoleId;
  inviteStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  joinedAt: string | null;
  invitedAt: string | null;
  user: { id: string; email: string; name: string | null } | null;
}

const roleLabels = ROLE_LABELS;

// Icons stay UI-local — keeping them out of `lib/roles.ts` so that module
// has no `@gravity-ui/icons` dependency.
const roleIcons: Record<CompanyRoleId, React.ElementType> = {
  OWNER: Crown,
  ADMIN: Shield,
  STOCKIST: Package,
  PRODUCT_UPLOADER: Upload,
};

export default function TeamSettingsPage() {
  usePageTitle('Takım');

  const router = useRouter();
  const { company } = useCompany();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InvitableRoleId>('ADMIN');

  const fetchMembers = async () => {
    if (!company?.id) return;

    try {
      const response = await api.get(`/company/${company.id}/members`);
      setMembers(response.data);
    } catch (error) {
      console.error('Failed to fetch members:', error);
      toast.danger('Üyeler yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [company?.id]);

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
    } catch (error: any) {
      toast.danger(error.response?.data?.message || 'Davet gönderilemedi');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!company?.id) return;

    try {
      await api.delete(`/company/${company.id}/members/${memberId}`);
      toast.success('Üye silindi');
      fetchMembers();
    } catch (error: any) {
      toast.danger(error.response?.data?.message || 'Üye silinemedi');
    }
  };

  const acceptedMembers = members.filter((m) => m.inviteStatus === 'ACCEPTED');
  const pendingMembers = members.filter((m) => m.inviteStatus === 'PENDING');

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            aria-label="Geri"
            onPress={() => router.push(`/${company?.slug}/settings`)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Users className="h-5 w-5 text-muted" />
          <h1 className="text-lg font-semibold">Takım Üyeleri</h1>
        </div>

        <Modal isOpen={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <Button size="sm" onPress={() => setIsInviteOpen(true)}>
            Üye Davet Et
          </Button>
          <Modal.Backdrop>
            <Modal.Container>
              <Modal.Dialog className="sm:max-w-[480px]">
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>Yeni Üye Davet Et</Modal.Heading>
                </Modal.Header>
                <Modal.Body className="flex flex-col gap-4">
                  <p className="text-sm text-muted">
                    E-posta adresi girerek yeni bir üye davet edin
                  </p>
                  <TextField
                    name="inviteEmail"
                    type="email"
                    value={inviteEmail}
                    onChange={setInviteEmail}
                  >
                    <Label>E-posta Adresi</Label>
                    <Input placeholder="ornek@email.com" />
                  </TextField>
                  <Select
                    selectedKey={inviteRole}
                    onSelectionChange={(key) =>
                      setInviteRole(key as InvitableRoleId)
                    }
                    aria-label="Rol seç"
                  >
                    <Label>Rol</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {INVITABLE_ROLES.map((role) => (
                          <ListBox.Item
                            key={role.id}
                            id={role.id}
                            textValue={role.label}
                          >
                            {role.label}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="tertiary" slot="close">
                    İptal
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
                      'Davet Gönder'
                    )}
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      </div>

      <div className="grid grid-cols-12 border-b border-border bg-surface-secondary px-4 py-2">
        <div className="col-span-4 text-xs font-medium text-muted">Üye</div>
        <div className="col-span-3 text-xs font-medium text-muted">Rol</div>
        <div className="col-span-3 text-xs font-medium text-muted">Durum</div>
        <div className="col-span-2 text-right text-xs font-medium text-muted">İşlem</div>
      </div>

      <div>
        {isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {[...Array(3)].map((_, i) => null)}
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Users className="mb-4 h-12 w-12 text-muted" />
            <h3 className="text-lg font-medium">Henüz üye yok</h3>
            <p className="mt-1 text-center text-muted">
              Takımınıza üye eklemek için davet gönderin
            </p>
          </div>
        ) : (
          <>
            {acceptedMembers.map((member, index) => {
              const RoleIcon = roleIcons[member.role];
              return (
                <div
                  key={member.id}
                  className={`grid grid-cols-12 items-center border-b border-border px-4 py-3 ${
                    index % 2 === 1 ? 'bg-surface-secondary/50' : ''
                  }`}
                >
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
                      <span className="text-sm font-medium text-accent">
                        {(member.user?.name || member.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {member.user?.name || member.email.split('@')[0]}
                      </p>
                      <p className="text-xs text-muted">{member.email}</p>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <div className="flex items-center gap-2">
                      <RoleIcon className="h-4 w-4 text-muted" />
                      <span className="text-sm">{roleLabels[member.role]}</span>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <span className="inline-flex items-center rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Aktif
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    {member.role !== 'OWNER' && (
                      <AlertDialog>
                        <Button variant="ghost" size="sm" isIconOnly aria-label="Üyeyi sil">
                          <Trash2 className="h-4 w-4 text-muted" />
                        </Button>
                        <AlertDialog.Backdrop>
                          <AlertDialog.Container>
                            <AlertDialog.Dialog className="sm:max-w-[400px]">
                              <AlertDialog.Header>
                                <AlertDialog.Icon status="danger" />
                                <AlertDialog.Heading>Üyeyi Sil</AlertDialog.Heading>
                              </AlertDialog.Header>
                              <AlertDialog.Body>
                                <p>
                                  {member.user?.name || member.email} kullanıcısını
                                  takımdan çıkarmak istediğinize emin misiniz?
                                </p>
                              </AlertDialog.Body>
                              <AlertDialog.Footer>
                                <Button variant="tertiary" slot="close">
                                  İptal
                                </Button>
                                <Button
                                  variant="danger"
                                  slot="close"
                                  onPress={() => handleRemoveMember(member.id)}
                                >
                                  Sil
                                </Button>
                              </AlertDialog.Footer>
                            </AlertDialog.Dialog>
                          </AlertDialog.Container>
                        </AlertDialog.Backdrop>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              );
            })}

            {pendingMembers.length > 0 && (
              <>
                <div className="border-b border-border bg-surface-secondary px-4 py-2">
                  <span className="text-xs font-medium text-muted">
                    Bekleyen Davetler ({pendingMembers.length})
                  </span>
                </div>
                {pendingMembers.map((member, index) => {
                  const RoleIcon = roleIcons[member.role];
                  return (
                    <div
                      key={member.id}
                      className={`grid grid-cols-12 items-center border-b border-border px-4 py-3 ${
                        index % 2 === 1 ? 'bg-surface-secondary/50' : ''
                      }`}
                    >
                      <div className="col-span-4 flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-default">
                          <Mail className="h-4 w-4 text-muted" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted">
                            {member.email}
                          </p>
                        </div>
                      </div>
                      <div className="col-span-3">
                        <div className="flex items-center gap-2">
                          <RoleIcon className="h-4 w-4 text-muted" />
                          <span className="text-sm text-muted">
                            {roleLabels[member.role]}
                          </span>
                        </div>
                      </div>
                      <div className="col-span-3">
                        <span className="inline-flex items-center rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          Beklemede
                        </span>
                      </div>
                      <div className="col-span-2 text-right">
                        <AlertDialog>
                          <Button variant="ghost" size="sm" isIconOnly aria-label="Daveti iptal et">
                            <Trash2 className="h-4 w-4 text-muted" />
                          </Button>
                          <AlertDialog.Backdrop>
                            <AlertDialog.Container>
                              <AlertDialog.Dialog className="sm:max-w-[400px]">
                                <AlertDialog.Header>
                                  <AlertDialog.Icon status="danger" />
                                  <AlertDialog.Heading>Daveti İptal Et</AlertDialog.Heading>
                                </AlertDialog.Header>
                                <AlertDialog.Body>
                                  <p>
                                    {member.email} adresine gönderilen daveti iptal
                                    etmek istediğinize emin misiniz?
                                  </p>
                                </AlertDialog.Body>
                                <AlertDialog.Footer>
                                  <Button variant="tertiary" slot="close">
                                    İptal
                                  </Button>
                                  <Button
                                    variant="danger"
                                    slot="close"
                                    onPress={() => handleRemoveMember(member.id)}
                                  >
                                    Daveti İptal Et
                                  </Button>
                                </AlertDialog.Footer>
                              </AlertDialog.Dialog>
                            </AlertDialog.Container>
                          </AlertDialog.Backdrop>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
