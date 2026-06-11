'use client';

/* UI Bileşen Galerisi — `/components`
 * Tasarım sistemini (tipografi, renk token'ları ve `@/components/ui` drop-in'leri)
 * tek sayfada gösterir. Yalnızca geliştirme/QA amaçlıdır; auth gerektirmez
 * (AuthGuard publicPaths'e eklenmiştir). */

import * as React from 'react';
import {
  Alert,
  AlertDialog,
  Avatar,
  Button,
  Calendar,
  Card,
  Checkbox,
  Chip,
  Description,
  Dropdown,
  FieldError,
  Input,
  InputGroup,
  InputOTP,
  Label,
  ListBox,
  Modal,
  REGEXP_ONLY_DIGITS,
  SearchField,
  Select,
  Switch,
  Tabs,
  TextArea,
  TextField,
  Tooltip,
  toast,
} from '@/components/ui';
import { DateRangeInput, type DateRange } from '@/components/date-range-input';
import {
  CircleCheck,
  CircleInfo,
  TriangleExclamation,
  Bell,
  Heart,
  TrashBin,
  Gear,
  Plus,
} from '@gravity-ui/icons';

/* ---------- Sayfa iskeleti ---------- */

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-separator pt-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

/* ---------- Renk token swatch'ı ---------- */

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`h-14 w-full rounded-lg border border-border ${className}`} />
      <span className="text-xs text-muted">{name}</span>
    </div>
  );
}

export default function ComponentsGalleryPage() {
  // Form / interaktif state
  const [text, setText] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [area, setArea] = React.useState('');
  const [select, setSelect] = React.useState<string | null>('shopify');
  const [sw1, setSw1] = React.useState(true);
  const [sw2, setSw2] = React.useState(false);
  const [chk1, setChk1] = React.useState(true);
  const [chk2, setChk2] = React.useState(false);
  const [otp, setOtp] = React.useState('');
  const [tab, setTab] = React.useState('overview');
  const [modalOpen, setModalOpen] = React.useState(false);
  const [alertOpen, setAlertOpen] = React.useState(false);
  const [day, setDay] = React.useState<Date | undefined>(undefined);
  const [range, setRange] = React.useState<{ from?: Date; to?: Date } | undefined>(undefined);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);

  return (
    <main className="h-screen overflow-y-auto bg-background text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12">
        {/* Başlık */}
        <header className="flex flex-col gap-2">
          <Chip variant="soft" size="sm" className="w-fit">
            Tasarım Sistemi
          </Chip>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Bileşen Galerisi
          </h1>
          <p className="text-sm text-muted">
            balinaOS UI kütüphanesi — <code className="rounded bg-default px-1 py-0.5 text-[12px]">@/components/ui</code> (Radix tabanlı HeroUI v3 drop-in&apos;leri).
          </p>
        </header>

        {/* ---------------- TİPOGRAFİ ---------------- */}
        <Section
          title="Tipografi"
          description="Inter (--font-inter). Başlık ölçeği + gövde + yardımcı metin tonları."
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">text-3xl / bold</span>
              <p className="text-3xl font-bold tracking-tight">Çok mağazalı analitik</p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">text-2xl / semibold</span>
              <p className="text-2xl font-semibold tracking-tight">Sipariş ve stok yönetimi</p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">text-lg / semibold</span>
              <p className="text-lg font-semibold">Bölüm başlığı</p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">text-base / normal</span>
              <p className="text-base">
                Gövde metni — varsayılan paragraf boyutu. Hızlı kahverengi tilki tembel
                köpeğin üstünden atladı.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">text-sm / text-muted</span>
              <p className="text-sm text-muted">
                İkincil / yardımcı metin — açıklama ve ipuçları için.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">text-xs / muted</span>
              <p className="text-xs text-muted">En küçük yardımcı metin · etiket · zaman damgası</p>
            </div>
            <div className="flex flex-wrap items-baseline gap-4">
              <span className="font-normal">font-normal</span>
              <span className="font-medium">font-medium</span>
              <span className="font-semibold">font-semibold</span>
              <span className="font-bold">font-bold</span>
              <span className="text-muted line-through">line-through</span>
              <code className="rounded bg-default px-1.5 py-0.5 text-sm">inline code</code>
            </div>
          </div>
        </Section>

        {/* ---------------- RENK TOKEN'LARI ---------------- */}
        <Section
          title="Renk Token'ları"
          description="Tema değişkenleri (light/dark [data-theme] ile otomatik değişir)."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
            <Swatch name="background" className="bg-background" />
            <Swatch name="surface" className="bg-surface" />
            <Swatch name="default" className="bg-default" />
            <Swatch name="accent" className="bg-accent" />
            <Swatch name="accent-soft" className="bg-accent-soft" />
            <Swatch name="muted" className="bg-muted" />
            <Swatch name="success" className="bg-success" />
            <Swatch name="warning" className="bg-warning" />
            <Swatch name="danger" className="bg-danger" />
            <Swatch name="border" className="bg-border" />
            <Swatch name="separator" className="bg-separator" />
            <Swatch name="foreground" className="bg-foreground" />
          </div>
        </Section>

        {/* ---------------- BUTONLAR ---------------- */}
        <Section
          title="Butonlar"
          description="variant · size · isIconOnly · isPending · isDisabled · fullWidth"
        >
          <div className="flex flex-col gap-5">
            <Row>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="tertiary">Tertiary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="danger-soft">Danger soft</Button>
            </Row>
            <Row>
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </Row>
            <Row>
              <Button>
                <Plus />
                İkonlu
              </Button>
              <Button variant="secondary">
                <Bell />
                Bildirimler
              </Button>
              <Button isIconOnly aria-label="Ayarlar" variant="tertiary">
                <Gear />
              </Button>
              <Button isIconOnly aria-label="Sil" variant="danger-soft">
                <TrashBin />
              </Button>
            </Row>
            <Row>
              <Button isPending>Yükleniyor</Button>
              <Button isDisabled>Devre dışı</Button>
              <Button variant="outline" isDisabled>
                Devre dışı
              </Button>
            </Row>
            <div className="max-w-sm">
              <Button fullWidth className="w-full">
                Tam genişlik
              </Button>
            </div>
          </div>
        </Section>

        {/* ---------------- CHIP / ROZET ---------------- */}
        <Section title="Chip (Rozet)" description="variant · size">
          <Row>
            <Chip variant="primary">Primary</Chip>
            <Chip variant="secondary">Secondary</Chip>
            <Chip variant="tertiary">Tertiary</Chip>
            <Chip variant="soft">Soft</Chip>
            <Chip variant="soft" size="sm">
              sm
            </Chip>
            <Chip variant="secondary">
              <CircleCheck className="h-3 w-3" />
              Aktif
            </Chip>
          </Row>
        </Section>

        {/* ---------------- ALERT ---------------- */}
        <Section title="Alert" description="status: accent · success · warning · danger">
          <div className="flex flex-col gap-3">
            <Alert status="accent">
              <Alert.Indicator>
                <CircleInfo className="h-4 w-4" />
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Title>Bilgilendirme</Alert.Title>
                <Alert.Description>
                  Yeni mağaza entegrasyonu eklendi.
                </Alert.Description>
              </Alert.Content>
            </Alert>
            <Alert status="success">
              <Alert.Indicator>
                <CircleCheck className="h-4 w-4" />
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Title>Başarılı</Alert.Title>
                <Alert.Description>Senkronizasyon tamamlandı.</Alert.Description>
              </Alert.Content>
            </Alert>
            <Alert status="warning">
              <Alert.Indicator>
                <TriangleExclamation className="h-4 w-4" />
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Title>Uyarı</Alert.Title>
                <Alert.Description>Stok seviyesi kritik eşiğin altında.</Alert.Description>
              </Alert.Content>
            </Alert>
            <Alert status="danger">
              <Alert.Indicator>
                <TriangleExclamation className="h-4 w-4" />
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Title>Hata</Alert.Title>
                <Alert.Description>Bağlantı kurulamadı, tekrar deneyin.</Alert.Description>
              </Alert.Content>
            </Alert>
          </div>
        </Section>

        {/* ---------------- FORM ALANLARI ---------------- */}
        <Section
          title="Form Alanları"
          description="TextField + Label + Input + Description/FieldError · TextArea · SearchField · Select"
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <TextField value={text} onChange={setText} isRequired>
              <Label>Mağaza adı</Label>
              <Input placeholder="Örn. Balina Store" />
              <Description>Panelde görünecek isim.</Description>
            </TextField>

            <TextField value="" onChange={() => {}} isInvalid>
              <Label>E-posta</Label>
              <Input placeholder="ornek@firma.com" />
              <FieldError>Geçerli bir e-posta girin.</FieldError>
            </TextField>

            <TextField value="" onChange={() => {}} isDisabled>
              <Label>Devre dışı alan</Label>
              <Input placeholder="Düzenlenemez" />
            </TextField>

            <div className="flex flex-col gap-1.5">
              <Label>Arama</Label>
              <SearchField value={search} onChange={setSearch}>
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder="Ürün ara…" />
                </SearchField.Group>
              </SearchField>
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Not</Label>
              <TextField value={area} onChange={setArea}>
                <TextArea placeholder="Sipariş notu…" rows={3} />
              </TextField>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Platform</Label>
              <Select selectedKey={select} onSelectionChange={setSelect}>
                <Select.Trigger>
                  <Select.Value placeholder="Platform seçin" />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {[
                      ['shopify', 'Shopify'],
                      ['woocommerce', 'WooCommerce'],
                      ['trendyol', 'Trendyol'],
                      ['hepsiburada', 'Hepsiburada'],
                    ].map(([id, label]) => (
                      <ListBox.Item key={id} id={id} textValue={label}>
                        <span className="flex-1">{label}</span>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
          </div>
        </Section>

        {/* ---------------- INPUT GROUP ---------------- */}
        <Section
          title="InputGroup"
          description="Prefix / Suffix ekli alanlar (alan adı, para birimi, oran)."
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Mağaza alan adı</Label>
              <InputGroup>
                <InputGroup.Prefix>https://</InputGroup.Prefix>
                <InputGroup.Input placeholder="magaza" />
                <InputGroup.Suffix>.myshopify.com</InputGroup.Suffix>
              </InputGroup>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Fiyat</Label>
              <InputGroup>
                <InputGroup.Prefix>₺</InputGroup.Prefix>
                <InputGroup.Input placeholder="0,00" inputMode="decimal" />
                <InputGroup.Suffix>KDV dahil</InputGroup.Suffix>
              </InputGroup>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Kâr marjı</Label>
              <InputGroup>
                <InputGroup.Input placeholder="20" inputMode="numeric" />
                <InputGroup.Suffix>%</InputGroup.Suffix>
              </InputGroup>
            </div>
          </div>
        </Section>

        {/* ---------------- TARİH: CALENDAR & DATE RANGE ---------------- */}
        <Section
          title="Tarih Seçiciler"
          description="Calendar (react-day-picker, Türkçe) · DateRangeInput (popover + JS Date)."
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">DateRangeInput</span>
              <div className="max-w-xs">
                <DateRangeInput
                  value={dateRange}
                  onChange={(r) => setDateRange(r ?? undefined)}
                  visibleMonths={2}
                />
              </div>
              <span className="text-xs text-muted">
                Seçili: {dateRange ? 'aralık seçildi' : 'yok'}
              </span>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Calendar · tekli</span>
                <div className="w-fit rounded-xl border border-border bg-surface">
                  <Calendar mode="single" selected={day} onSelect={setDay} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Calendar · aralık</span>
                <div className="w-fit rounded-xl border border-border bg-surface">
                  <Calendar
                    mode="range"
                    selected={range as never}
                    onSelect={(r) => setRange(r ?? undefined)}
                  />
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ---------------- SWITCH & CHECKBOX ---------------- */}
        <Section title="Switch & Checkbox" description="isSelected / onChange / isDisabled">
          <div className="flex flex-col gap-4">
            <Row>
              <Switch isSelected={sw1} onChange={setSw1}>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch>
              <span className="text-sm">Otomatik senkron {sw1 ? 'açık' : 'kapalı'}</span>
            </Row>
            <Row>
              <Switch isSelected={sw2} onChange={setSw2}>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch>
              <span className="text-sm">E-posta raporları</span>
              <Switch isDisabled>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch>
              <span className="text-sm text-muted">Devre dışı</span>
            </Row>
            <Row>
              <Checkbox isSelected={chk1} onChange={setChk1}>
                KDV dahil göster
              </Checkbox>
              <Checkbox isSelected={chk2} onChange={setChk2}>
                İade edilenleri gizle
              </Checkbox>
              <Checkbox isDisabled>Devre dışı</Checkbox>
            </Row>
          </div>
        </Section>

        {/* ---------------- INPUT OTP ---------------- */}
        <Section title="Input OTP" description="6 haneli doğrulama kodu">
          <InputOTP maxLength={6} value={otp} onChange={setOtp} pattern={REGEXP_ONLY_DIGITS}>
            <InputOTP.Group>
              <InputOTP.Slot index={0} />
              <InputOTP.Slot index={1} />
              <InputOTP.Slot index={2} />
            </InputOTP.Group>
            <InputOTP.Separator />
            <InputOTP.Group>
              <InputOTP.Slot index={3} />
              <InputOTP.Slot index={4} />
              <InputOTP.Slot index={5} />
            </InputOTP.Group>
          </InputOTP>
        </Section>

        {/* ---------------- CARD ---------------- */}
        <Section title="Card" description="Header / Title / Description / Content / Footer">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <Card.Header>
                <Card.Title>Toplam Ciro</Card.Title>
                <Card.Description>Son 30 gün</Card.Description>
              </Card.Header>
              <Card.Content>
                <p className="text-2xl font-bold tracking-tight">₺248.350</p>
                <p className="text-sm text-success">+%12,4 geçen aya göre</p>
              </Card.Content>
              <Card.Footer>
                <Button size="sm" variant="secondary">
                  Detay
                </Button>
              </Card.Footer>
            </Card>
            <Card>
              <Card.Header>
                <Card.Title>Aktif Mağazalar</Card.Title>
                <Card.Description>Bağlı platformlar</Card.Description>
              </Card.Header>
              <Card.Content className="flex items-center gap-3">
                <Avatar>
                  <Avatar.Fallback>BS</Avatar.Fallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Balina Store</span>
                  <span className="text-xs text-muted">4 platform · senkron aktif</span>
                </div>
                <Chip variant="soft" size="sm" className="ml-auto">
                  Çevrimiçi
                </Chip>
              </Card.Content>
            </Card>
          </div>
        </Section>

        {/* ---------------- AVATAR & TOOLTIP ---------------- */}
        <Section title="Avatar & Tooltip">
          <Row>
            <Avatar>
              <Avatar.Fallback>MÖ</Avatar.Fallback>
            </Avatar>
            <Avatar className="h-11 w-11">
              <Avatar.Fallback>AB</Avatar.Fallback>
            </Avatar>
            <Avatar className="h-8 w-8 bg-accent text-accent-foreground">
              <Avatar.Fallback>CK</Avatar.Fallback>
            </Avatar>
            <Tooltip delay={0}>
              <Button variant="secondary">
                <Heart />
                Üzerine gel
              </Button>
              <Tooltip.Content>Favorilere ekle</Tooltip.Content>
            </Tooltip>
          </Row>
        </Section>

        {/* ---------------- TABS ---------------- */}
        <Section title="Tabs">
          <Tabs selectedKey={tab} onSelectionChange={setTab}>
            <Tabs.ListContainer>
              <Tabs.List>
                <Tabs.Tab id="overview">Genel</Tabs.Tab>
                <Tabs.Tab id="orders">Siparişler</Tabs.Tab>
                <Tabs.Tab id="settings">Ayarlar</Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
            <Tabs.Panel id="overview" className="pt-4 text-sm text-muted">
              Genel bakış sekmesi içeriği.
            </Tabs.Panel>
            <Tabs.Panel id="orders" className="pt-4 text-sm text-muted">
              Sipariş listesi sekmesi içeriği.
            </Tabs.Panel>
            <Tabs.Panel id="settings" className="pt-4 text-sm text-muted">
              Ayarlar sekmesi içeriği.
            </Tabs.Panel>
          </Tabs>
        </Section>

        {/* ---------------- DROPDOWN ---------------- */}
        <Section title="Dropdown" description="onAction tabanlı aksiyon menüsü">
          <Dropdown>
            <Dropdown.Trigger aria-label="Aksiyonlar">
              <Button variant="outline">
                <Gear />
                Aksiyonlar
              </Button>
            </Dropdown.Trigger>
            <Dropdown.Popover
              className="w-[180px] overflow-hidden bg-surface/95 p-0 backdrop-blur-[4px]"
              style={{
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-elevated)',
              }}
            >
              <Dropdown.Menu
                aria-label="Aksiyonlar"
                onAction={(key) => toast.message(`Seçildi: ${key}`)}
                className="flex flex-col gap-0 py-1 outline-none"
              >
                <Dropdown.Item
                  id="edit"
                  textValue="Düzenle"
                  className="flex h-8 cursor-pointer items-center gap-2 px-3 text-[13px] font-medium text-foreground outline-none transition-colors data-[hovered=true]:bg-default/60 data-[focused=true]:bg-default/60"
                >
                  <Gear className="h-3.5 w-3.5 shrink-0 text-muted" />
                  <span className="flex-1">Düzenle</span>
                </Dropdown.Item>
                <Dropdown.Item
                  id="notify"
                  textValue="Bildirim gönder"
                  className="flex h-8 cursor-pointer items-center gap-2 px-3 text-[13px] font-medium text-foreground outline-none transition-colors data-[hovered=true]:bg-default/60 data-[focused=true]:bg-default/60"
                >
                  <Bell className="h-3.5 w-3.5 shrink-0 text-muted" />
                  <span className="flex-1">Bildirim gönder</span>
                </Dropdown.Item>
                <Dropdown.Item
                  id="delete"
                  textValue="Sil"
                  className="flex h-8 cursor-pointer items-center gap-2 px-3 text-[13px] font-medium text-danger outline-none transition-colors data-[hovered=true]:bg-danger/10 data-[focused=true]:bg-danger/10"
                >
                  <TrashBin className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1">Sil</span>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </Section>

        {/* ---------------- MODAL & ALERT DIALOG & TOAST ---------------- */}
        <Section title="Modal · AlertDialog · Toast">
          <Row>
            <Button onPress={() => setModalOpen(true)}>Modal aç</Button>
            <Button variant="danger-soft" onPress={() => setAlertOpen(true)}>
              Onay diyaloğu
            </Button>
            <Button variant="secondary" onPress={() => toast.success('Kaydedildi!')}>
              Başarı toast
            </Button>
            <Button variant="secondary" onPress={() => toast.danger('Bir hata oluştu')}>
              Hata toast
            </Button>
          </Row>

          <Modal isOpen={modalOpen} onOpenChange={setModalOpen}>
            <Modal.Backdrop>
              <Modal.Container>
                <Modal.Dialog className="sm:max-w-[440px]">
                  <Modal.CloseTrigger />
                  <Modal.Header>
                    <Modal.Heading>Mağaza ekle</Modal.Heading>
                  </Modal.Header>
                  <Modal.Body>
                    <div className="flex flex-col gap-4 px-5 py-2">
                      <TextField value="" onChange={() => {}}>
                        <Label>Mağaza adı</Label>
                        <Input placeholder="Örn. Balina Store" />
                      </TextField>
                      <p className="text-sm text-muted">
                        Bağlantı kurulduktan sonra ürünler otomatik senkronize edilir.
                      </p>
                    </div>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="ghost" slot="close">
                      İptal
                    </Button>
                    <Button
                      onPress={() => {
                        setModalOpen(false);
                        toast.success('Mağaza eklendi');
                      }}
                    >
                      Ekle
                    </Button>
                  </Modal.Footer>
                </Modal.Dialog>
              </Modal.Container>
            </Modal.Backdrop>
          </Modal>

          <AlertDialog isOpen={alertOpen} onOpenChange={setAlertOpen}>
            <AlertDialog.Backdrop>
              <AlertDialog.Container>
                <AlertDialog.Dialog>
                  <AlertDialog.Header>
                    <AlertDialog.Icon status="danger">
                      <TriangleExclamation className="h-4 w-4 text-danger" />
                    </AlertDialog.Icon>
                    <AlertDialog.Heading>Mağazayı sil</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p className="px-5 text-sm text-muted">
                      Bu işlem geri alınamaz. Mağaza ve bağlı veriler kalıcı olarak silinecek.
                    </p>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button variant="ghost" slot="close">
                      Vazgeç
                    </Button>
                    <Button
                      variant="danger"
                      onPress={() => {
                        setAlertOpen(false);
                        toast.danger('Mağaza silindi');
                      }}
                    >
                      Sil
                    </Button>
                  </AlertDialog.Footer>
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          </AlertDialog>
        </Section>

        <footer className="border-t border-separator pt-6 text-xs text-muted">
          balinaOS · UI bileşen galerisi — yalnızca geliştirme amaçlı.
        </footer>
      </div>
    </main>
  );
}
