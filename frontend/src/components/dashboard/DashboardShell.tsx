'use client';

import React from 'react';
import { PanelLeftClose, PanelLeftOpen, Search, RefreshCw } from 'lucide-react';
import { Sidebar } from './Sidebar';
import type { NavGroupData, NavItemData } from './types';

export function DashboardHeader({
  isSidebarOpen,
  onToggleSidebar,
  breadcrumbPrimary,
  breadcrumbSecondary,
  onSearchClick,
  searchPlaceholder = 'Cari...',
  extraActions,
  onRefresh,
  isRefreshing = false,
  avatarLabel,
  avatarGradientClass = 'from-orange-500 to-amber-400',
}: {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  breadcrumbPrimary: string;
  breadcrumbSecondary?: string;
  onSearchClick?: () => void;
  searchPlaceholder?: string;
  extraActions?: React.ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  avatarLabel: string;
  avatarGradientClass?: string;
}) {
  return (
    <header className="h-14 border-b border-border/50 flex items-center justify-between px-5 bg-card/80 backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground transition-colors"
          title="Toggle Menu"
        >
          {isSidebarOpen ? <PanelLeftClose className="w-[18px] h-[18px]" /> : <PanelLeftOpen className="w-[18px] h-[18px]" />}
        </button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
          <span className="font-semibold text-foreground truncate">{breadcrumbPrimary}</span>
          {breadcrumbSecondary && (
            <>
              <span>/</span>
              <span className="capitalize">{breadcrumbSecondary}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onSearchClick && (
          <button
            onClick={onSearchClick}
            className="hidden md:flex items-center gap-2 h-8 px-3 text-xs text-muted-foreground bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors border border-border/40"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{searchPlaceholder}</span>
            <kbd className="text-[10px] font-mono px-1 py-0.5 bg-background border border-border/50 rounded">⌘K</kbd>
          </button>
        )}

        {extraActions}

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-foreground bg-card hover:bg-black/5 dark:hover:bg-white/5 border border-border/60 rounded-md shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sinkronisasi</span>
          </button>
        )}

        <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${avatarGradientClass} flex items-center justify-center text-white font-bold text-xs shadow-xs`}>
          {avatarLabel}
        </div>
      </div>
    </header>
  );
}

export function DashboardShell({
  isSidebarOpen,
  sidebarProps,
  header,
  children,
}: {
  isSidebarOpen: boolean;
  sidebarProps: {
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
  };
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-background font-sans overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} {...sidebarProps} />

      <div className="flex-1 flex flex-col min-w-0 bg-black/[0.015] dark:bg-white/[0.015] overflow-hidden">
        {header}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 [&::-webkit-scrollbar]:hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

export { Sidebar, EntitySwitcher } from './Sidebar';
export * from './types';
