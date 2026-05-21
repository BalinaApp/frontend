'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowsRotateRight,
  Check,
  Eye,
  EyeSlash,
  PlugConnection,
  TrashBin,
} from '@gravity-ui/icons';
import {
  AlertDialog,
  Button,
  Input,
  Label,
  Modal,
  Switch,
  TextArea,
  TextField,
  toast,
} from '@heroui/react';
import { usePageTitle } from '@/hooks/use-page-title';
import { PageHeader } from '@/components/layout/page-header';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import {
  useInstagramIntegrationStore,
  type InstagramConfig,
} from '@/stores/instagramIntegrationStore';

const RETURN_PATH = '/integrations/instagram/return';

export default function InstagramSetupPage() {
  usePageTitle('Instagram bağlantısı');
  const params = useParams<{ companySlug: string }>();
  const slug = params?.companySlug ?? '';
  const { currentCompany } = useCompanyStore();
  const { stores, fetchStores } = useStoreStore();
  const {
    configs,
    fetchConfig,
    startOAuth,
    disconnect,
    testConnection,
    updateConfig,
  } = useInstagramIntegrationStore();

  const [settingsStoreId, setSettingsStoreId] = useState<string | null>(null);
  const [disconnectStoreId, setDisconnectStoreId] = useState<string | null>(
    null,
  );
  const [busy, setBusy] = useState<string | null>(null);

  // Mağazalar + her biri için IG config çek
  useEffect(() => {
    if (currentCompany?.id) fetchStores(currentCompany.id);
  }, [currentCompany?.id, fetchStores]);

  useEffect(() => {
    if (!currentCompany?.id) return;
    for (const s of stores) {
      // Her store için config'i çek (404'lar sessiz geçer)
      fetchConfig(currentCompany.id, s.id);
    }
  }, [currentCompany?.id, stores, fetchConfig]);

  const handleConnect = async (storeId: string) => {
    if (!currentCompany?.id) return;
    setBusy(storeId);
    const redirectUri = `${window.location.origin}${RETURN_PATH}`;
    const result = await startOAuth(currentCompany.id, storeId, redirectUri);
    setBusy(null);
    if (!result) {
      toast.danger('OAuth başlatılamadı');
      return;
    }
    // State'i sessionStorage'a kaydet — return page'i status polling için kullanır
    sessionStorage.setItem('igAuthCompanyId', currentCompany.id);
    sessionStorage.setItem('igAuthStoreId', storeId);
    sessionStorage.setItem('igAuthState', result.state);
    sessionStorage.setItem('igAuthSlug', slug);
    window.location.href = result.authorizeUrl;
  };

  const handleTest = async (storeId: string) => {
    if (!currentCompany?.id) return;
    setBusy(storeId);
    const result = await testConnection(currentCompany.id, storeId);
    setBusy(null);
    if (result?.ok) {
      toast.success(`Bağlantı çalışıyor: @${result.account?.username}`);
    } else {
      toast.danger('Bağlantı testi başarısız');
    }
  };

  const handleDisconnectConfirm = async () => {
    if (!currentCompany?.id || !disconnectStoreId) return;
    setBusy(disconnectStoreId);
    const ok = await disconnect(currentCompany.id, disconnectStoreId);
    setBusy(null);
    if (ok) {
      toast.success('Instagram bağlantısı kaldırıldı');
      setDisconnectStoreId(null);
    } else {
      toast.danger('Bağlantı kaldırılamadı');
    }
  };

  const settingsConfig = settingsStoreId ? configs[settingsStoreId] : null;

  return (
    <>
      <PageHeader title="Instagram bağlantısı" />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="rounded-xl bg-foreground/[0.04] p-3 text-xs text-foreground/80">
          Her mağaza için ayrı bir Instagram iş hesabı bağlayabilirsin.
          Bağlandıktan sonra chatbot ayarlarını düzenleyip aktive et — gelen
          mesajlar Sohbetler sekmesinde görünür.
        </div>

        {stores.length === 0 ? (
          <div className="rounded-xl border border-dashed border-foreground/[0.10] bg-foreground/[0.02] p-8 text-center text-xs text-muted">
            Henüz mağaza yok. Önce <strong>Entegrasyon</strong> sekmesinden
            bir mağaza bağla.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {stores.map((store) => {
              const cfg = configs[store.id];
              const connected = !!cfg?.connected;
              const isBusy = busy === store.id;
              return (
                <div
                  key={store.id}
                  className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-white/60 p-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.06] text-xs font-semibold text-foreground/70">
                    {store.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">
                      {store.name}
                    </span>
                    <span className="truncate text-[11px] text-muted">
                      {connected
                        ? `@${cfg?.username} · ${cfg?.chatbotActive ? 'Chatbot aktif' : 'Chatbot kapalı'}`
                        : 'Instagram bağlı değil'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {connected ? (
                      <>
                        <Button
                          variant="tertiary"
                          size="sm"
                          onPress={() => setSettingsStoreId(store.id)}
                          className="h-8 rounded-full bg-foreground/[0.04] px-3 text-xs"
                        >
                          Ayarlar
                        </Button>
                        <Button
                          variant="tertiary"
                          size="sm"
                          onPress={() => handleTest(store.id)}
                          isPending={isBusy}
                          isDisabled={isBusy}
                          aria-label="Bağlantıyı test et"
                          isIconOnly
                          className="h-8 w-8 rounded-full bg-foreground/[0.04]"
                        >
                          <ArrowsRotateRight className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          isIconOnly
                          onPress={() => setDisconnectStoreId(store.id)}
                          aria-label="Bağlantıyı kaldır"
                          className="h-8 w-8 rounded-full"
                        >
                          <TrashBin className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onPress={() => handleConnect(store.id)}
                        isPending={isBusy}
                        isDisabled={isBusy}
                        className="h-8 rounded-full px-3 text-xs"
                      >
                        <PlugConnection className="h-3.5 w-3.5" />
                        Bağla
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Disconnect confirm */}
      <AlertDialog
        isOpen={disconnectStoreId !== null}
        onOpenChange={(open) => {
          if (!busy && !open) setDisconnectStoreId(null);
        }}
      >
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-[420px]">
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>
                  Bağlantıyı kaldır
                </AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body className="px-2 pb-0">
                Instagram bağlantısı kaldırıldığında chatbot kapanır ve yeni
                gelen mesajlar işlenmez. Mevcut sohbet geçmişi silinmez.
              </AlertDialog.Body>
              <AlertDialog.Footer className="!mt-3 px-2">
                <Button variant="tertiary" slot="close" isDisabled={!!busy}>
                  Vazgeç
                </Button>
                <Button
                  variant="danger"
                  onPress={handleDisconnectConfirm}
                  isPending={!!busy}
                  isDisabled={!!busy}
                >
                  Kaldır
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>

      {/* Chatbot settings drawer/modal */}
      {settingsStoreId && settingsConfig && (
        <ChatbotSettingsModal
          isOpen={settingsStoreId !== null}
          onClose={() => setSettingsStoreId(null)}
          companyId={currentCompany?.id ?? ''}
          storeId={settingsStoreId}
          config={settingsConfig}
          onSave={async (patch) => {
            if (!currentCompany?.id || !settingsStoreId) return;
            const updated = await updateConfig(
              currentCompany.id,
              settingsStoreId,
              patch,
            );
            if (updated) {
              toast.success('Ayarlar kaydedildi');
              setSettingsStoreId(null);
            } else {
              toast.danger('Kaydedilemedi');
            }
          }}
        />
      )}
    </>
  );
}

// ============================================================================
// Chatbot settings modal
// ============================================================================

function ChatbotSettingsModal({
  isOpen,
  onClose,
  config,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  storeId: string;
  config: InstagramConfig;
  onSave: (
    patch: Partial<{
      chatbotActive: boolean;
      chatbotMode: 'learning' | 'live';
      sysPromptOverride: string | null;
      adminInstagramId: string;
      iban: string;
      accountName: string;
      dhlCode: string;
      defaultModel: string;
    }>,
  ) => Promise<void>;
}) {
  const [chatbotActive, setChatbotActive] = useState(config.chatbotActive);
  const [chatbotMode, setChatbotMode] = useState<'learning' | 'live'>(
    config.chatbotMode ?? 'learning',
  );
  const [sysPrompt, setSysPrompt] = useState(config.sysPromptOverride ?? '');
  const [adminInstagramId, setAdminInstagramId] = useState(
    config.adminInstagramId ?? '',
  );
  const [iban, setIban] = useState(config.iban ?? '');
  const [accountName, setAccountName] = useState(config.accountName ?? '');
  const [dhlCode, setDhlCode] = useState(config.dhlCode ?? '');
  const [defaultModel, setDefaultModel] = useState(
    config.defaultModel ?? 'gpt-4o',
  );
  const [showPrompt, setShowPrompt] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    await onSave({
      chatbotActive,
      chatbotMode,
      sysPromptOverride: sysPrompt.trim() ? sysPrompt : null,
      adminInstagramId: adminInstagramId.trim(),
      iban: iban.trim(),
      accountName: accountName.trim(),
      dhlCode: dhlCode.trim(),
      defaultModel,
    });
    setSaving(false);
  }, [
    chatbotActive,
    chatbotMode,
    sysPrompt,
    adminInstagramId,
    iban,
    accountName,
    dhlCode,
    defaultModel,
    onSave,
  ]);

  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => !o && onClose()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[560px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Chatbot ayarları</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="px-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between rounded-xl bg-foreground/[0.04] p-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      Chatbot aktif
                    </div>
                    <div className="text-xs text-muted">
                      Kapalı iken gelen mesajlar Sohbetler'de görünür ama AI
                      cevap üretmez.
                    </div>
                  </div>
                  <Switch
                    isSelected={chatbotActive}
                    onChange={setChatbotActive}
                  >
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch>
                </div>

                {/* Çalışma modu — Learning (gözlem) vs Live (AI aktif).
                    Live'a alındığında mevcut observing thread'ler toplu
                    "ai" status'una geçer (backend yapar). */}
                <div className="flex items-center justify-between rounded-xl bg-foreground/[0.04] p-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      Çalışma modu
                    </div>
                    <div className="text-xs text-muted">
                      <strong>Learning</strong>: AI sessiz, sadece mesajları
                      kaydeder (admin analiz eder).
                      <br />
                      <strong>Live</strong>: AI gelen mesajlara otomatik cevap
                      verir.
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-0.5 rounded-full bg-foreground/[0.06] p-0.5">
                    {(['learning', 'live'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setChatbotMode(m)}
                        className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-medium transition-colors ${
                          chatbotMode === m
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted hover:text-foreground'
                        }`}
                      >
                        {m === 'learning' ? 'Learning' : 'Live'}
                      </button>
                    ))}
                  </div>
                </div>

                <TextField
                  value={adminInstagramId}
                  onChange={setAdminInstagramId}
                  aria-label="Admin Instagram PSID"
                >
                  <Label>Admin Instagram ID</Label>
                  <Input placeholder="26701310816144690" />
                </TextField>

                <div className="grid grid-cols-2 gap-2">
                  <TextField value={iban} onChange={setIban}>
                    <Label>IBAN</Label>
                    <Input placeholder="TR70 0020 ..." />
                  </TextField>
                  <TextField value={accountName} onChange={setAccountName}>
                    <Label>Hesap sahibi</Label>
                    <Input placeholder="İsim Soyisim" />
                  </TextField>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <TextField value={dhlCode} onChange={setDhlCode}>
                    <Label>DHL kodu</Label>
                    <Input placeholder="915737309" />
                  </TextField>
                  <TextField value={defaultModel} onChange={setDefaultModel}>
                    <Label>Varsayılan model</Label>
                    <Input placeholder="gpt-4o" />
                  </TextField>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Sistem promptu (özelleştirme)</Label>
                  <button
                    type="button"
                    onClick={() => setShowPrompt((v) => !v)}
                    className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-foreground"
                  >
                    {showPrompt ? (
                      <>
                        <EyeSlash className="h-3 w-3" /> Gizle
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3" /> Göster
                      </>
                    )}
                  </button>
                </div>
                {showPrompt && (
                  <TextField value={sysPrompt} onChange={setSysPrompt}>
                    <TextArea
                      rows={8}
                      placeholder="Boş bırakırsan varsayılan prompt kullanılır."
                      className="font-mono text-xs"
                    />
                  </TextField>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" slot="close" isDisabled={saving}>
                Vazgeç
              </Button>
              <Button
                variant="primary"
                onPress={handleSubmit}
                isPending={saving}
                isDisabled={saving}
              >
                <Check className="h-3.5 w-3.5" />
                Kaydet
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
