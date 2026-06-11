'use client';

import * as React from 'react';
import * as RMenu from '@radix-ui/react-dropdown-menu';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronRight } from '@gravity-ui/icons';
import { cn } from './cn';

/* HeroUI v3 Dropdown drop-in — Radix DropdownMenu. Action menüsü (onAction) ve
 * seçim menüsü (selectionMode/selectedKeys/onSelectionChange) desteklenir.
 * `.dropdown__popover` / `data-slot` sınıfları globals.css ile birebir. */

/** HeroUI uyumu — seçim 'all' veya anahtar Set'i olabilir. */
type Selection = 'all' | Set<string>;

interface MenuCtx {
  selectionMode?: 'single' | 'multiple' | 'none';
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Selection) => void;
  onAction?: (key: string) => void;
  shouldCloseOnSelect?: boolean;
}
const MenuContext = React.createContext<MenuCtx>({});
const ItemSelectedContext = React.createContext(false);
/** Popover'ın AnimatePresence ile exit animasyonu oynatabilmesi için açık-durumu. */
const OpenContext = React.createContext(false);

function Root({
  children,
  isOpen,
  defaultOpen,
  onOpenChange,
}: {
  children?: React.ReactNode;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen ?? false);
  const open = isOpen ?? internalOpen;
  const handleOpenChange = (o: boolean) => {
    if (isOpen === undefined) setInternalOpen(o);
    onOpenChange?.(o);
  };
  return (
    <RMenu.Root open={open} onOpenChange={handleOpenChange}>
      <OpenContext.Provider value={open}>{children}</OpenContext.Provider>
    </RMenu.Root>
  );
}

function Trigger({
  className,
  children,
  asChild = true,
  isDisabled,
  onPress,
  ...rest
}: {
  className?: string;
  children?: React.ReactNode;
  asChild?: boolean;
  isDisabled?: boolean;
  onPress?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  'aria-label'?: string;
}) {
  if (asChild) {
    return (
      <RMenu.Trigger asChild disabled={isDisabled} {...rest}>
        <button
          type="button"
          disabled={isDisabled}
          onClick={onPress}
          className={cn('dropdown__trigger outline-none', className)}
        >
          {children}
        </button>
      </RMenu.Trigger>
    );
  }
  return (
    <RMenu.Trigger
      disabled={isDisabled}
      className={cn('dropdown__trigger outline-none', className)}
      {...rest}
    >
      {children}
    </RMenu.Trigger>
  );
}

function splitPlacement(p?: string): {
  side: 'top' | 'bottom' | 'left' | 'right';
  align: 'start' | 'center' | 'end';
} {
  const [s, a] = (p ?? 'bottom start').split(' ');
  const side = (['top', 'bottom', 'left', 'right'].includes(s) ? s : 'bottom') as
    | 'top'
    | 'bottom'
    | 'left'
    | 'right';
  const align = (['start', 'center', 'end'].includes(a as string) ? a : 'start') as
    | 'start'
    | 'center'
    | 'end';
  return { side, align };
}

function Popover({
  className,
  children,
  placement,
  style,
}: {
  className?: string;
  children?: React.ReactNode;
  placement?: string;
  style?: React.CSSProperties;
}) {
  const open = React.useContext(OpenContext);
  const { side, align } = splitPlacement(placement);
  return (
    <AnimatePresence>
      {open && (
        <RMenu.Portal forceMount>
          <RMenu.Content
            asChild
            side={side}
            align={align}
            sideOffset={6}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{
                transformOrigin:
                  'var(--radix-dropdown-menu-content-transform-origin)',
                ...style,
              }}
              className={cn(
                'dropdown__popover z-50 overflow-y-auto outline-none',
                className,
              )}
            >
              {children}
            </motion.div>
          </RMenu.Content>
        </RMenu.Portal>
      )}
    </AnimatePresence>
  );
}

function Menu({
  selectionMode = 'none',
  selectedKeys,
  onSelectionChange,
  onAction,
  shouldCloseOnSelect,
  className,
  children,
}: {
  selectionMode?: 'single' | 'multiple' | 'none';
  selectedKeys?: Iterable<string> | string[];
  onSelectionChange?: (keys: Selection) => void;
  onAction?: (key: string) => void;
  shouldCloseOnSelect?: boolean;
  className?: string;
  children?: React.ReactNode;
  'aria-label'?: string;
}) {
  const keysSet = React.useMemo(
    () => (selectedKeys ? new Set(selectedKeys) : undefined),
    [selectedKeys],
  );
  return (
    <MenuContext.Provider
      value={{
        selectionMode,
        selectedKeys: keysSet,
        onSelectionChange,
        onAction,
        shouldCloseOnSelect,
      }}
    >
      <div data-slot="dropdown-menu" className={cn('dropdown__menu', className)}>
        {children}
      </div>
    </MenuContext.Provider>
  );
}

function Item({
  id,
  className,
  children,
  isDisabled,
  onAction,
  textValue,
  shouldCloseOnSelect,
  ...rest
}: {
  id?: string;
  className?: string;
  children?: React.ReactNode;
  isDisabled?: boolean;
  onAction?: () => void;
  textValue?: string;
  shouldCloseOnSelect?: boolean;
}) {
  const ctx = React.useContext(MenuContext);
  const selected =
    ctx.selectionMode !== 'none' && id != null
      ? !!ctx.selectedKeys?.has(id)
      : false;

  const close = shouldCloseOnSelect ?? ctx.shouldCloseOnSelect;
  const handleSelect = (e: Event) => {
    if (close === false) e.preventDefault();
    onAction?.();
    if (id != null) {
      if (ctx.selectionMode === 'single') {
        ctx.onSelectionChange?.(new Set([id]));
      } else if (ctx.selectionMode === 'multiple') {
        const next = new Set(ctx.selectedKeys ?? []);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        ctx.onSelectionChange?.(next);
        e.preventDefault(); // multiple seçimde menü açık kalsın
      }
      ctx.onAction?.(id);
    }
  };

  return (
    <ItemSelectedContext.Provider value={selected}>
      <RMenu.Item
        data-slot="menu-item"
        data-selected={selected || undefined}
        disabled={isDisabled}
        textValue={textValue}
        onSelect={handleSelect}
        className={cn(
          'menu-item list-box-item relative flex min-h-9 w-full cursor-pointer select-none items-center gap-3 rounded-2xl px-2.5 py-1.5 text-sm outline-none',
          'data-[highlighted]:bg-default data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          className,
        )}
        {...rest}
      >
        {children}
      </RMenu.Item>
    </ItemSelectedContext.Provider>
  );
}

function ItemIndicator({ className }: { className?: string }) {
  const selected = React.useContext(ItemSelectedContext);
  return (
    <span
      data-slot="menu-item-indicator--checkmark"
      className={cn('ml-auto inline-flex h-4 w-4 items-center justify-center', className)}
    >
      {selected ? <Check className="h-4 w-4" /> : null}
    </span>
  );
}

function SubmenuTrigger({ children }: { children?: React.ReactNode }) {
  // HeroUI SubmenuTrigger: 1. çocuk <Dropdown.Item> (tetikleyici satır),
  // 2. çocuk <Dropdown.Popover> (alt-menü içeriği). Bunları Radix Sub'a
  // map'lerken iç içe Item/Popover render ETME — props/children'ı çıkar.
  const arr = React.Children.toArray(children);
  const trigger = arr[0] as
    | React.ReactElement<{
        children?: React.ReactNode;
        className?: string;
        textValue?: string;
      }>
    | undefined;
  const content = arr[1] as
    | React.ReactElement<{
        children?: React.ReactNode;
        className?: string;
        style?: React.CSSProperties;
      }>
    | undefined;
  return (
    <RMenu.Sub>
      <RMenu.SubTrigger
        data-slot="menu-item"
        textValue={trigger?.props.textValue}
        className={cn(
          'menu-item list-box-item relative flex min-h-9 w-full cursor-pointer select-none items-center gap-3 rounded-2xl px-2.5 py-1.5 text-sm outline-none',
          'data-[highlighted]:bg-default data-[state=open]:bg-default',
          trigger?.props.className,
        )}
      >
        {trigger?.props.children}
      </RMenu.SubTrigger>
      <RMenu.Portal>
        <RMenu.SubContent
          sideOffset={6}
          className={cn(
            'dropdown__popover z-50 overflow-y-auto outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 zoom-in-95',
            content?.props.className,
          )}
          style={content?.props.style}
        >
          {content?.props.children}
        </RMenu.SubContent>
      </RMenu.Portal>
    </RMenu.Sub>
  );
}

function SubmenuIndicator({ className }: { className?: string }) {
  return (
    <span className={cn('ml-auto inline-flex h-4 w-4 items-center justify-center text-muted', className)}>
      <ChevronRight className="h-4 w-4" />
    </span>
  );
}

export const Dropdown = Object.assign(Root, {
  Trigger,
  Popover,
  Menu,
  Item,
  ItemIndicator,
  SubmenuTrigger,
  SubmenuIndicator,
});
