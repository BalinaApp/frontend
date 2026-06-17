'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';
import { BalinaTooltip } from './balina-tooltip';

/* Balina Tema Popover — kaynak balinaOS ThemeEditor sistemi.
 * Renk uzayı: açı → hue, yarıçap → light(merkez)↔heavy(kenar) blend (geçiş
 * %25–%75). Doygunluk: global chroma çarpanı (damla slider, 0 = gri). Render:
 * noktalı zemin + handle konumunda seçili rengin yumuşak glow'u (gradyan modda
 * çoklu handle + harmanlanan glow'lar). Preset: heavy hue + light ton + 3'lü
 * kombo. Seçim onChange ile dışarı verilir + canlı sayfa zeminine uygulanır. */

const DOTS_PATTERN = 'radial-gradient(rgba(13,13,13,0.09) 0.8px, transparent 0.8px)';
const CHECKERBOARD =
  'repeating-conic-gradient(rgba(13,13,13,0.08) 0% 25%, transparent 0% 50%) 50% / 14px 14px';

// Çark hue açıları (preset satırları için 12 ton).
const HUES = [12, 40, 70, 100, 135, 160, 190, 220, 255, 285, 315, 345];

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

interface Pt {
  x: number;
  y: number;
}

/** Çark içindeki (x,y) % konumundan oklch rengi türet (heavy/light blend + sat). */
function colorAt(x: number, y: number, sat: number): string {
  const dx = x - 50;
  const dy = y - 50;
  const r = Math.min(Math.hypot(dx, dy) / 50, 1);
  const angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
  const t = clamp((r - 0.25) / 0.5, 0, 1); // 0 = light merkez, 1 = heavy kenar
  const l = 0.92 - 0.14 * t;
  const c = (0.05 + 0.12 * t) * (sat / 100);
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${angle.toFixed(1)})`;
}

/** Hue + yarıçap (% ) → çark konumu. */
function ptForHue(h: number, rPct: number): Pt {
  const a = ((h - 90) * Math.PI) / 180;
  return { x: 50 + Math.cos(a) * rPct, y: 50 + Math.sin(a) * rPct };
}

/** Kaydedilmiş editör durumunu (stops/saturation/gradient) oku. */
function readEditorState(): { stops?: Pt[]; saturation?: number; isGradient?: boolean } | null {
  try {
    const raw = localStorage.getItem('balina-theme-editor');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function GradientToggleIcon({ gradient }: { gradient: boolean }) {
  if (gradient) {
    return (
      <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
        {[2, 6, 10, 14].map((cy) =>
          [2, 6, 10, 14].map((cx) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="0.9" fill="rgba(13,13,13,0.5)" />
          )),
        )}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden>
      <rect x="3" y="3" width="10" height="10" rx="2.5" fill="rgba(13,13,13,0.25)" stroke="rgba(13,13,13,0.5)" />
    </svg>
  );
}

const DROP_PATH =
  'M4.74644 0.962728C5.05733 0.345757 5.94463 0.345758 6.25551 0.962729L9.96735 8.32907C11.6275 11.6237 9.2131 15.5 5.50098 15.5C1.78886 15.5 -0.625508 11.6236 1.0346 8.32907L4.74644 0.962728Z';

function SaturationDropIcon({ className, fill = 0 }: { className?: string; fill?: number }) {
  const h = clamp(fill, 0, 1) * 16;
  return (
    <svg viewBox="0 0 11 16" fill="none" className={className} aria-hidden>
      <defs>
        <clipPath id="balina-drop-clip">
          <path d={DROP_PATH} />
        </clipPath>
      </defs>
      <rect x="0" y={16 - h} width="11" height={h} fill="rgba(13,13,13,0.56)" clipPath="url(#balina-drop-clip)" />
      <path d={DROP_PATH} stroke="rgba(13,13,13,0.56)" />
    </svg>
  );
}

function DiceIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <g className="origin-center transition-transform duration-300 ease-out group-hover/dice:-translate-y-[2px] group-hover/dice:-rotate-[18deg]">
        <rect x="3" y="3" width="11" height="11" rx="3" stroke="currentColor" strokeWidth="1.25" />
        <circle cx="6" cy="6" r="0.9" fill="currentColor" />
        <circle cx="11" cy="11" r="0.9" fill="currentColor" />
        <circle cx="11" cy="6" r="0.9" fill="currentColor" />
        <circle cx="6" cy="11" r="0.9" fill="currentColor" />
      </g>
      <g className="origin-center transition-transform duration-300 ease-out group-hover/dice:translate-y-[2px] group-hover/dice:rotate-[18deg]">
        <rect x="11" y="11" width="10" height="10" rx="2.5" fill="var(--balina-background-light-shout)" stroke="currentColor" strokeWidth="1.25" />
        <circle cx="14" cy="14" r="0.85" fill="currentColor" />
        <circle cx="18" cy="18" r="0.85" fill="currentColor" />
        <circle cx="16" cy="16" r="0.85" fill="currentColor" />
      </g>
    </svg>
  );
}

export interface BalinaThemePopoverProps {
  className?: string;
  value?: string;
  onChange?: (theme: string) => void;
}

export function BalinaThemePopover({ className, value, onChange }: BalinaThemePopoverProps) {
  // Başlangıç durumu doğrudan localStorage'dan (lazy init) — tekrar açıldığında
  // seçilen renkten devam eder, default'a (turuncu) dönmez.
  const [isGradient, setIsGradient] = React.useState<boolean>(() => {
    const s = readEditorState();
    if (typeof s?.isGradient === 'boolean') return s.isGradient;
    return value?.startsWith('linear-gradient') ?? false;
  });
  const [saturation, setSaturation] = React.useState<number>(
    () => readEditorState()?.saturation ?? 100,
  );
  const [opacity, setOpacity] = React.useState(100);
  const [stops, setStops] = React.useState<Pt[]>(() => {
    const s = readEditorState();
    return Array.isArray(s?.stops) && s.stops.length ? s.stops : [{ x: 68, y: 40 }];
  });
  const [active, setActive] = React.useState(0);

  const wheelRef = React.useRef<HTMLDivElement>(null);

  const stopColors = stops.map((s) => colorAt(s.x, s.y, saturation));
  const theme = isGradient
    ? `linear-gradient(135deg, ${stopColors.join(', ')})`
    : stopColors[0];

  const applyToPage = (t: string) => {
    try {
      document.documentElement.style.setProperty('--balina-base-heavy-loud', t);
    } catch {
      /* yok say */
    }
  };
  const emit = React.useCallback(
    (t: string) => {
      applyToPage(t);
      onChange?.(t);
    },
    [onChange],
  );

  // theme her değiştiğinde dışarı bildir (canlı önizleme + debounce'lu kayıt).
  // Mount'taki ilk emit atlanır — editör açılınca kayıtlı temayı ezmesin.
  const emitted = React.useRef(false);
  React.useEffect(() => {
    if (!emitted.current) {
      emitted.current = true;
      return;
    }
    emit(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // Editör durumunu kaydet (kalıcılık — lazy init ile geri yüklenir).
  React.useEffect(() => {
    try {
      localStorage.setItem(
        'balina-theme-editor',
        JSON.stringify({ stops, saturation, isGradient }),
      );
    } catch {
      /* yok say */
    }
  }, [stops, saturation, isGradient]);

  const pointFromEvent = (clientX: number, clientY: number): Pt => {
    const rect = wheelRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100, 6, 94),
      y: clamp(((clientY - rect.top) / rect.height) * 100, 6, 94),
    };
  };

  const moveStop = (idx: number, clientX: number, clientY: number) => {
    const p = pointFromEvent(clientX, clientY);
    setStops((prev) => prev.map((s, i) => (i === idx ? p : s)));
  };

  const dragStop = (idx: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActive(idx);
    moveStop(idx, e.clientX, e.clientY);
    const mv = (ev: PointerEvent) => moveStop(idx, ev.clientX, ev.clientY);
    const up = () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  };

  // Boş alana basınca aktif stop'u oraya taşı + sürükle.
  const dragWheel = (e: React.PointerEvent) => dragStop(active)(e);

  // Doygunluk damlası — dikey sürükleme.
  const dragSaturation = (e: React.PointerEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const start = saturation;
    const mv = (ev: PointerEvent) => setSaturation(clamp(start + (startY - ev.clientY) * 0.8, 0, 100));
    const up = () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  };

  const toggleGradient = () => {
    setIsGradient((g) => {
      const next = !g;
      if (next) {
        // Tek stop → 3 stop'a genişlet.
        setStops((prev) => {
          const base = prev[0] ?? { x: 50, y: 50 };
          return [base, { x: 35, y: 62 }, { x: 70, y: 30 }].slice(0, 3);
        });
      } else {
        setStops((prev) => [prev[0] ?? { x: 68, y: 40 }]);
        setActive(0);
      }
      return next;
    });
  };

  const randomize = () => {
    const rnd = () => ({ x: 12 + Math.random() * 76, y: 12 + Math.random() * 76 });
    setStops((prev) => prev.map(rnd));
  };

  const pickSolid = (p: Pt) => {
    setIsGradient(false);
    setSaturation(100);
    setStops([p]);
    setActive(0);
  };

  // Gri mod — doygunluğu 0'a indir; konum L'yi (ton) belirler.
  const pickGray = (rPct: number) => {
    setIsGradient(false);
    setSaturation(0);
    setStops([ptForHue(0, rPct)]);
    setActive(0);
  };

  return (
    <div className={cn('flex w-[324px] flex-col overflow-hidden rounded-[1.5rem]', className)}>
      {/* Renk çarkı alanı — noktalı zemin + glow render */}
      <div className="relative h-[330px] w-full p-2">
        <div
          ref={wheelRef}
          onPointerDown={dragWheel}
          className="relative h-full w-full cursor-crosshair select-none overflow-hidden rounded-2xl border-[0.75px] border-[rgba(13,13,13,0.04)]"
          style={{
            backgroundColor: 'rgba(13,13,13,0.02)',
            backgroundImage: DOTS_PATTERN,
            backgroundSize: '12px 12px',
          }}
        >
          {/* Glow'lar */}
          {stops.map((s, i) => (
            <span
              key={`glow-${i}`}
              className="pointer-events-none absolute aspect-square w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                background: `radial-gradient(circle, ${stopColors[i]} 0%, transparent 62%)`,
                opacity: 0.9,
              }}
            />
          ))}
          {/* Handle'lar */}
          {stops.map((s, i) => (
            <button
              key={`h-${i}`}
              type="button"
              aria-label={`Renk noktası ${i + 1}`}
              onPointerDown={dragStop(i)}
              className={cn(
                'absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border-2 border-white outline-none transition-transform active:scale-95 active:cursor-grabbing focus-visible:outline-none',
                i === active && 'ring-2 ring-white/70',
              )}
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                backgroundColor: stopColors[i],
                boxShadow:
                  '0 0.5px 0.5px rgba(13,13,13,0.04), 0 2px 4px rgba(13,13,13,0.06), 0 6px 14px rgba(13,13,13,0.1)',
              }}
            />
          ))}

          {/* Üst opsiyonlar */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2">
            <div className="flex items-center justify-between p-2.5">
              <BalinaTooltip content="Gradyan modu" side="left">
                <button
                  type="button"
                  aria-label="Gradyan modu"
                  aria-pressed={isGradient}
                  onClick={toggleGradient}
                  className="pointer-events-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white outline-none shadow-elevation-small transition-transform hover:scale-105 focus-visible:outline-none"
                >
                  <GradientToggleIcon gradient={isGradient} />
                </button>
              </BalinaTooltip>
              <BalinaTooltip content="Doygunluk" side="left">
                <button
                  type="button"
                  aria-label="Doygunluk"
                  onPointerDown={dragSaturation}
                  className="pointer-events-auto flex h-10 w-10 cursor-ns-resize touch-none items-center justify-center rounded-full bg-white outline-none shadow-elevation-small focus-visible:outline-none"
                >
                  <SaturationDropIcon className="h-4 w-[0.6875rem]" fill={saturation / 100} />
                </button>
              </BalinaTooltip>
            </div>
            <div className="flex justify-center pb-2.5">
              <BalinaTooltip content="Rastgele tema" side="top">
                <button
                  type="button"
                  aria-label="Rastgele tema"
                  onClick={randomize}
                  className="group/dice pointer-events-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white text-[var(--balina-icon-strong)] outline-none shadow-elevation-medium active:scale-95 focus-visible:outline-none"
                >
                  <DiceIcon className="h-5 w-5" />
                </button>
              </BalinaTooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Preset paleti — tek sıra heavy hue + gri mod */}
      <div className="px-4 py-2.5">
        <PresetRow
          colors={[
            ...HUES.map((h) => `oklch(0.80 0.13 ${h})`),
            'oklch(0.90 0 0)',
            'oklch(0.80 0 0)',
          ]}
          onPick={(_, i) => {
            if (i < HUES.length) pickSolid(ptForHue(HUES[i], 42));
            else pickGray(i === HUES.length ? 8 : 34);
          }}
        />
      </div>

      {/* Opacity slider */}
      <div className="flex items-center gap-2 p-2">
        <div className="group relative h-14 w-full cursor-pointer overflow-hidden rounded-2xl" style={{ background: CHECKERBOARD }}>
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: theme,
              opacity: opacity / 100,
              WebkitMaskImage: 'linear-gradient(270deg,#000 10%,rgba(0,0,0,.4) 90%)',
              maskImage: 'linear-gradient(270deg,#000 10%,rgba(0,0,0,.4) 90%)',
            }}
          />
          <input
            type="range"
            min={0}
            max={100}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            aria-label="Saydamlık"
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          />
          <span
            className="pointer-events-none absolute bottom-1 flex h-6 w-6 items-center justify-center gap-1 rounded-full bg-white transition-[height] duration-150 group-hover:h-[calc(100%-0.5rem)]"
            style={{
              left: `${opacity}%`,
              transform: `translateX(-${opacity}%)`,
              boxShadow:
                '0 0 28px rgba(13,13,13,.08), 0 4px 8px -2px rgba(13,13,13,.04), 0 2px 4px -1px rgba(13,13,13,.04), 0 0 2px rgba(13,13,13,.04), 0 0 0 .75px rgba(13,13,13,.04)',
            }}
          >
            <span className="h-3 w-px rounded-full bg-[rgba(13,13,13,0.16)] opacity-0 transition-opacity group-hover:opacity-100" />
            <span className="h-3 w-px rounded-full bg-[rgba(13,13,13,0.16)] opacity-0 transition-opacity group-hover:opacity-100" />
          </span>
        </div>
      </div>
    </div>
  );
}

/** Yatay kaydırmalı, dinamik fade'li preset satırı. */
function PresetRow({
  colors,
  onPick,
}: {
  colors: string[];
  onPick: (color: string, index: number) => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [fade, setFade] = React.useState({ start: false, end: true });
  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    setFade({
      start: el.scrollLeft > 1,
      end: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
    });
  };
  React.useEffect(() => {
    onScroll();
  }, []);
  const left = fade.start ? 'transparent 0%, #000 8%' : '#000 0%, #000 0%';
  const right = fade.end ? '#000 90%, transparent 100%' : '#000 100%, #000 100%';
  const mask = `linear-gradient(to right, ${left}, ${right})`;
  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ WebkitMaskImage: mask, maskImage: mask }}
    >
      {colors.map((c, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Preset ${i + 1}`}
          onClick={() => onPick(c, i)}
          className="h-5 w-5 shrink-0 cursor-pointer rounded-full border border-[rgba(13,13,13,0.04)] outline-none focus-visible:outline-none"
          style={{ background: c }}
        />
      ))}
    </div>
  );
}
