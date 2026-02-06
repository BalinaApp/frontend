'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  ChevronLeft,
  Trash2,
  Mail,
  Shield,
  Clock,
  CheckCircle2,
  Loader2,
  Crown,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useCompany } from '@/components/providers/CompanyProvider';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Member {
  id: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'STOCKIST';
  inviteStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  joinedAt: string | null;
  invitedAt: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null;
}

const roleLabels: Record<string, string> = {
  OWNER: 'Sahip',
  ADMIN: 'Yönetici',
  MEMBER: 'Üye',
  STOCKIST: 'Stokçu',
};

const roleIcons: Record<string, React.ElementType> = {
  OWNER: Crown,
  ADMIN: Shield,
  MEMBER: Users,
  STOCKIST: Package,
};

export default function TeamSettingsPage() {
  const router = useRouter();
  const { company } = useCompany();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'STOCKIST'>('MEMBER');

  const fetchMembers = async () => {
    if (!company?.id) return;

    try {
      const response = await api.get(`/company/${company.id}/members`);
      setMembers(response.data);
    } catch (error) {
      console.error('Failed to fetch members:', error);
      toast.error('Üyeler yüklenemedi');
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
      setInviteRole('MEMBER');
      fetchMembers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Davet gönderilemedi');
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
      toast.error(error.response?.data?.message || 'Üye silinemedi');
    }
  };

  const acceptedMembers = members.filter((m) => m.inviteStatus === 'ACCEPTED');
  const pendingMembers = members.filter((m) => m.inviteStatus === 'PENDING');

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push(`/${company?.slug}/settings`)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Users className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Takım Üyeleri</h1>
        </div>
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              Üye Davet Et
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Üye Davet Et</DialogTitle>
              <DialogDescription>
                E-posta adresi girerek yeni bir üye davet edin
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">E-posta Adresi</label>
                <Input
                  type="email"
                  placeholder="ornek@email.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Rol</label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'ADMIN' | 'MEMBER' | 'STOCKIST')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Üye</SelectItem>
                    <SelectItem value="ADMIN">Yönetici</SelectItem>
                    <SelectItem value="STOCKIST">Stokçu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleInvite} disabled={!inviteEmail.trim() || isInviting}>
                {isInviting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gönderiliyor...
                  </>
                ) : (
                  'Davet Gönder'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-12 px-4 py-2 border-b bg-muted/50">
        <div className="col-span-4 text-xs font-medium text-muted-foreground">Üye</div>
        <div className="col-span-3 text-xs font-medium text-muted-foreground">Rol</div>
        <div className="col-span-3 text-xs font-medium text-muted-foreground">Durum</div>
        <div className="col-span-2 text-xs font-medium text-muted-foreground text-right">İşlem</div>
      </div>

      {/* Members List */}
      <div>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Henüz üye yok</h3>
            <p className="text-muted-foreground text-center mt-1">
              Takımınıza üye eklemek için davet gönderin
            </p>
          </div>
        ) : (
          <>
            {/* Accepted Members */}
            {acceptedMembers.map((member, index) => {
              const RoleIcon = roleIcons[member.role];
              return (
                <div
                  key={member.id}
                  className={cn(
                    'grid grid-cols-12 items-center px-4 py-3 border-b',
                    index % 2 === 1 && 'bg-muted/30'
                  )}
                >
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {(member.user?.name || member.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {member.user?.name || member.email.split('@')[0]}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <div className="flex items-center gap-2">
                      <RoleIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{roleLabels[member.role]}</span>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Aktif
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    {member.role !== 'OWNER' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Üyeyi Sil</AlertDialogTitle>
                            <AlertDialogDescription>
                              {member.user?.name || member.email} kullanıcısını takımdan çıkarmak istediğinize emin misiniz?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>İptal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveMember(member.id)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Sil
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Pending Invites */}
            {pendingMembers.length > 0 && (
              <>
                <div className="px-4 py-2 bg-muted/50 border-b">
                  <span className="text-xs font-medium text-muted-foreground">
                    Bekleyen Davetler ({pendingMembers.length})
                  </span>
                </div>
                {pendingMembers.map((member, index) => {
                  const RoleIcon = roleIcons[member.role];
                  return (
                    <div
                      key={member.id}
                      className={cn(
                        'grid grid-cols-12 items-center px-4 py-3 border-b',
                        index % 2 === 1 && 'bg-muted/30'
                      )}
                    >
                      <div className="col-span-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {member.email}
                          </p>
                        </div>
                      </div>
                      <div className="col-span-3">
                        <div className="flex items-center gap-2">
                          <RoleIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{roleLabels[member.role]}</span>
                        </div>
                      </div>
                      <div className="col-span-3">
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                          <Clock className="h-3 w-3 mr-1" />
                          Beklemede
                        </span>
                      </div>
                      <div className="col-span-2 text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Daveti İptal Et</AlertDialogTitle>
                              <AlertDialogDescription>
                                {member.email} adresine gönderilen daveti iptal etmek istediğinize emin misiniz?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>İptal</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveMember(member.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Daveti İptal Et
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
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
