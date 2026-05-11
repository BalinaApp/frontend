'use client';

import { useEffect, useMemo } from 'react';
import { ClockArrowRotateLeft, TrashBin } from '@gravity-ui/icons';
import { Dropdown } from '@heroui/react';
import {
  useAiCreatorHistoryStore,
  restoreSession,
  type AiCreatorSessionMeta,
} from '@/stores/aiCreatorStore';
import { useCompanyStore } from '@/stores/companyStore';
import { useUIStore } from '@/stores/uiStore';

const DAY_MS = 24 * 60 * 60 * 1000;

interface Group {
  label: string;
  items: AiCreatorSessionMeta[];
}

function groupSessions(items: AiCreatorSessionMeta[]): Group[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();
  const yesterdayMs = todayMs - DAY_MS;
  const sevenDaysAgo = todayMs - 7 * DAY_MS;

  const today: AiCreatorSessionMeta[] = [];
  const yesterday: AiCreatorSessionMeta[] = [];
  const thisWeek: AiCreatorSessionMeta[] = [];
  const older: AiCreatorSessionMeta[] = [];

  items.forEach((c) => {
    const ts = new Date(c.updatedAt).getTime();
    if (ts >= todayMs) today.push(c);
    else if (ts >= yesterdayMs) yesterday.push(c);
    else if (ts >= sevenDaysAgo) thisWeek.push(c);
    else older.push(c);
  });

  const groups: Group[] = [];
  if (today.length) groups.push({ label: 'Bugün', items: today });
  if (yesterday.length) groups.push({ label: 'Dün', items: yesterday });
  if (thisWeek.length) groups.push({ label: 'Bu hafta', items: thisWeek });
  if (older.length) groups.push({ label: 'Daha eski', items: older });
  return groups;
}

function relativeAge(updatedAtIso: string): string {
  const diffMs = Date.now() - new Date(updatedAtIso).getTime();
  const days = Math.floor(diffMs / DAY_MS);
  if (days < 1) {
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    if (hours < 1) return 'şimdi';
    return `${hours}s`;
  }
  if (days === 1) return '1g';
  if (days < 30) return `${days}g`;
  const months = Math.floor(days / 30);
  return `${months}a`;
}

/**
 * Bottom strip'te clock ikonlu buton. Backend'den guided sohbetleri çekip
 * gruplandırarak gösterir. Tıklanan sohbetin tam state'i çekilip aktif
 * store'a geri yüklenir.
 */
export function AiChatHistoryButton() {
  const sessions = useAiCreatorHistoryStore((s) => s.sessions);
  const fetchSessions = useAiCreatorHistoryStore((s) => s.fetchSessions);
  const fetchSession = useAiCreatorHistoryStore((s) => s.fetchSession);
  const removeSession = useAiCreatorHistoryStore((s) => s.removeSession);
  const { currentCompany } = useCompanyStore();
  const setAiDrawerOpen = useUIStore((s) => s.setAiDrawerOpen);

  // Mount'ta listeyi çek; şirket değişince yeniden.
  useEffect(() => {
    if (currentCompany?.id) fetchSessions(currentCompany.id);
  }, [currentCompany?.id, fetchSessions]);

  const groups = useMemo(() => groupSessions(sessions), [sessions]);
  const isEmpty = sessions.length === 0;

  const handlePick = async (id: string) => {
    if (!currentCompany?.id) return;
    const snap = await fetchSession(currentCompany.id, id);
    if (!snap) return;
    restoreSession(snap);
    setAiDrawerOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!currentCompany?.id) return;
    removeSession(currentCompany.id, id);
  };

  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label="Sohbet geçmişi"
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-foreground/70 hover:bg-black/[0.04] hover:text-foreground"
        onPress={() => {
          if (currentCompany?.id) fetchSessions(currentCompany.id);
        }}
      >
        <ClockArrowRotateLeft className="h-4 w-4" />
      </Dropdown.Trigger>
      <Dropdown.Popover
        placement="top end"
        className="w-72 border border-border bg-surface shadow-lg"
      >
        {isEmpty ? (
          <div className="px-3 py-4 text-center text-xs text-muted">
            Henüz geçmiş sohbet yok.
          </div>
        ) : (
          <Dropdown.Menu>
            {groups.flatMap((group) => [
              <div
                key={`label-${group.label}`}
                className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted"
              >
                {group.label}
              </div>,
              ...group.items.map((c) => (
                <Dropdown.Item
                  key={c.id}
                  id={c.id}
                  textValue={c.title}
                  onAction={() => handlePick(c.id)}
                >
                  <span className="group flex flex-1 items-center gap-2">
                    <span className="line-clamp-1 flex-1 text-sm text-foreground">
                      {c.title}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted">
                      {relativeAge(c.updatedAt)}
                    </span>
                    <button
                      type="button"
                      aria-label="Geçmişten sil"
                      onClick={(e) => handleDelete(e, c.id)}
                      className="rounded p-1 text-muted opacity-0 transition-opacity hover:bg-black/[0.04] hover:text-danger group-hover:opacity-100"
                    >
                      <TrashBin className="h-3 w-3" />
                    </button>
                  </span>
                </Dropdown.Item>
              )),
            ])}
          </Dropdown.Menu>
        )}
      </Dropdown.Popover>
    </Dropdown>
  );
}
