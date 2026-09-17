'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { NavGroupData, NavItemData, SwitcherEntity } from './types';

export function EntitySwitcher({
  entities,
  selectedId,
  onSelect,
  pickerLabel,
  fallback,
}: {
  entities: SwitcherEntity[];
  selectedId: string;
  onSelect: (id: string) => void;
  pickerLabel: string;
  fallback: SwitcherEntity;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const current = entities.find((e) => e.id === selectedId) || entities[0] || fallback;

  return (
    <div className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-2.5 py-2 mb-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors select-none group border border-border/40 bg-card/40"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[6px] bg-primary text-primary-foreground flex items-center justify-center font-bold text-[13px] shadow-sm">
            {current.name.charAt(0)}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-[13px] font-semibold leading-none mb-1 text-foreground truncate max-w-[130px]">{current.name}</span>
            <span className="text-[11px] text-muted-foreground leading-none truncate max-w-[130px]">{current.category || fallback.category}</span>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground/60 group-hover:text-foreground/80 transition-colors shrink-0" strokeWidth={1.5} />
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-[52px] left-0 w-full bg-card border border-border/60 rounded-lg shadow-xl z-50 py-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 max-h-[260px] overflow-y-auto">
            <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              {pickerLabel}
            </div>
            {entities.map((e) => (
              <div
                key={e.id}
                onClick={() => { onSelect(e.id); setIsOpen(false); }}
                className={`px-3 py-2 mx-1 text-[12px] rounded-md cursor-pointer transition-colors ${current.id === e.id ? 'bg-primary/10 text-primary font-medium' : 'text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                <div className="font-medium text-foreground">{e.name}</div>
                <div className="text-[10px] text-muted-foreground">{e.category}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function NavItem({
  item,
  activeId,
  onSelect,
  level = 0,
}: {
  item: NavItemData;
  activeId: string;
  onSelect: (id: string) => void;
  level?: number;
}) {
  const isActive = activeId === item.id;
  const hasChildren = !!item.children;
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    if (hasChildren) {
      setIsOpen(!isOpen);
    } else {
      onSelect(item.id);
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div
        className={`group flex items-center justify-between px-2.5 py-[7px] rounded-[6px] cursor-pointer transition-all duration-200 select-none
          ${isActive
            ? 'bg-black/5 dark:bg-white/10 text-foreground font-medium'
            : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground/90'
          }
        `}
        style={{ paddingLeft: `${level * 12 + 10}px` }}
        onClick={handleClick}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <item.icon
            className={`w-[16px] h-[16px] transition-colors shrink-0
              ${isActive ? 'text-foreground' : 'text-muted-foreground/70 group-hover:text-foreground/70'}
            `}
            strokeWidth={1.5}
          />
          <span className="text-[13px] tracking-wide truncate">
            {item.title}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {item.shortcut && (
            <kbd className="hidden group-hover:inline-flex items-center justify-center h-5 px-1.5 text-[10px] font-medium font-mono text-muted-foreground/60 bg-background/50 border border-border/50 rounded-[4px] shadow-xs">
              {item.shortcut}
            </kbd>
          )}
          {item.badge && (
            <span className="flex items-center justify-center h-4 px-1.5 text-[9px] font-semibold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              {item.badge}
            </span>
          )}
          {hasChildren && (
            <ChevronRight
              className={`w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
              strokeWidth={2}
            />
          )}
        </div>
      </div>

      {hasChildren && (
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
            isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden min-h-0 relative flex flex-col gap-0.5 mt-0.5">
            <div
              className="absolute top-0 bottom-0 border-l border-black/5 dark:border-white/5"
              style={{ left: `${level * 12 + 17.5}px` }}
            />
            {item.children!.map((child) => (
              <NavItem
                key={child.id}
                item={child}
                activeId={activeId}
                onSelect={onSelect}
                level={level + 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  isOpen,
  brandMark,
  brandName,
  brandBadge,
  brandBadgeColorClass = 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  brandMarkColorClass = 'bg-orange-600',
  switcher,
  navGroups,
  bottomItems,
  activeId,
  onSelect,
}: {
  isOpen: boolean;
  brandMark: string;
  brandName: string;
  brandBadge: string;
  brandBadgeColorClass?: string;
  brandMarkColorClass?: string;
  switcher?: React.ReactNode;
  navGroups: NavGroupData[];
  bottomItems: NavItemData[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <aside
      className={`h-full transition-all duration-300 ease-in-out shrink-0 overflow-hidden bg-card/70 border-r border-border/50 flex flex-col ${
        isOpen ? 'w-[270px] opacity-100' : 'w-0 opacity-0 border-none'
      }`}
    >
      <div className="p-3 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg ${brandMarkColorClass} flex items-center justify-center text-white font-bold text-xs shadow-sm`}>
            {brandMark}
          </div>
          <span className="font-bold text-sm tracking-tight text-foreground">{brandName}</span>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${brandBadgeColorClass}`}>
          {brandBadge}
        </span>
      </div>

      {switcher && <div className="p-3">{switcher}</div>}

      <div className="flex-1 overflow-y-auto px-3 py-1 flex flex-col gap-4 [&::-webkit-scrollbar]:hidden">
        {navGroups.map((group, idx) => (
          <div key={idx} className="flex flex-col gap-0.5">
            {group.heading && (
              <span className="px-2.5 mb-1 text-[10px] font-bold tracking-wider text-muted-foreground/60 uppercase">
                {group.heading}
              </span>
            )}
            {group.items.map((item) => (
              <NavItem key={item.id} item={item} activeId={activeId} onSelect={onSelect} />
            ))}
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-border/40 flex flex-col gap-0.5">
        {bottomItems.map((item) => (
          <NavItem key={item.id} item={item} activeId={activeId} onSelect={onSelect} />
        ))}
      </div>
    </aside>
  );
}
