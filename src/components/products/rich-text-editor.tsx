'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold,
  Heading1,
  Heading2,
  Italic,
  ListOl,
  ListUl,
  Underline,
  Xmark,
} from '@gravity-ui/icons';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/** Minimal contentEditable tabanlı zengin metin editörü.
 *  - Toolbar: B / I / U / H1 / H2 / • list / 1. list / temizle
 *  - HTML in/out: `value` HTML olarak verilir, `onChange` HTML döner
 *  - Mevcut email-canvas ile aynı pattern (zero-dep, no library)
 *  - document.execCommand "deprecated" ama tüm modern browser'larda
 *    çalışıyor; alternatif (Selection API + manuel) komplekslik getirir. */
export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Açıklama yaz...',
  className = '',
  disabled = false,
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // İlk mount'ta + dış kaynaktan value değişirse innerHTML'i senkronla.
  // İçeriden type ederken value === innerHTML olur → re-render etmiyoruz
  // (caret loss önlemek için).
  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  const exec = useCallback((command: string, arg?: string) => {
    if (disabled) return;
    document.execCommand(command, false, arg);
    ref.current?.focus();
    if (ref.current) onChange(ref.current.innerHTML);
  }, [disabled, onChange]);

  const handleInput = useCallback(() => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    // Boş contentEditable browser'da `<br>` ya da `<p><br></p>` bırakır —
    // input görmüyormuş gibi temizleyelim ki placeholder görünsün.
    const isEmpty =
      html === '<br>' ||
      html === '<p><br></p>' ||
      html === '<div><br></div>' ||
      html === '';
    onChange(isEmpty ? '' : html);
  }, [onChange]);

  const isEmpty = !value || value === '<br>' || value === '<p><br></p>';

  return (
    <div
      className={`flex flex-col gap-1 rounded-lg border transition-colors ${
        isFocused
          ? 'border-default-400 bg-foreground/[0.04]'
          : 'border-transparent bg-foreground/[0.04]'
      } ${className}`}
    >
      <div className="flex items-center gap-0.5 border-b border-default-200/60 px-1 py-1">
        <ToolbarBtn label="Kalın (Cmd+B)" onClick={() => exec('bold')} disabled={disabled}>
          <Bold className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn label="İtalik (Cmd+I)" onClick={() => exec('italic')} disabled={disabled}>
          <Italic className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn label="Altı çizili (Cmd+U)" onClick={() => exec('underline')} disabled={disabled}>
          <Underline className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <Divider />
        <ToolbarBtn label="Başlık 1" onClick={() => exec('formatBlock', '<h1>')} disabled={disabled}>
          <Heading1 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn label="Başlık 2" onClick={() => exec('formatBlock', '<h2>')} disabled={disabled}>
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <Divider />
        <ToolbarBtn label="Madde" onClick={() => exec('insertUnorderedList')} disabled={disabled}>
          <ListUl className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn label="Numaralı" onClick={() => exec('insertOrderedList')} disabled={disabled}>
          <ListOl className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <Divider />
        <ToolbarBtn
          label="Biçimi temizle"
          onClick={() => {
            exec('removeFormat');
            exec('formatBlock', '<p>');
          }}
          disabled={disabled}
        >
          <Xmark className="h-3.5 w-3.5" />
        </ToolbarBtn>
      </div>

      <div className="relative px-3 py-2">
        {isEmpty && (
          <div className="pointer-events-none absolute left-3 top-2 text-zinc-500">
            {placeholder}
          </div>
        )}
        <div
          ref={ref}
          contentEditable={!disabled}
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          suppressContentEditableWarning
          className="prose-product min-h-[88px] w-full text-sm leading-relaxed text-foreground outline-none [&_h1]:my-1 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:my-1 [&_h2]:text-base [&_h2]:font-semibold [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5"
        />
      </div>
    </div>
  );
}

function ToolbarBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        // mousedown'a binding — onClick blur tetiklemeden execCommand
        // çalışsın diye. blur olunca selection kaybolur.
        e.preventDefault();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-0.5 h-4 w-px bg-default-200/60" aria-hidden="true" />;
}
