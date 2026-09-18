'use client';

import React, { useState } from 'react';
import { 
  Search, 
  LayoutDashboard, 
  FolderKanban, 
  Users, 
  Settings, 
  LogOut,
  Hash,
  ChevronDown,
  ChevronRight,
  Inbox,
  Calendar,
  Activity,
  CreditCard,
  Globe,
  Terminal,
  Blocks,
  X,
  Plus
} from 'lucide-react';

export type NavItemData = {
  id: string;
  title: string;
  icon: React.ElementType;
  badge?: number | string;
  shortcut?: string;
  children?: NavItemData[];
  hasAddAction?: boolean;
};

export type NavGroupData = {
  heading?: string;
  items: NavItemData[];
};

export function WorkspaceSwitcher({ 
  selected, 
  onSelect,
  planLabel = 'Pro Plan',
  workspaces = ['Acme Corp', 'Personal Workspace', 'Client Sandbox']
}: { 
  selected?: string; 
  onSelect?: (ws: string) => void;
  planLabel?: string;
  workspaces?: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalSelected, setInternalSelected] = useState(workspaces[0] || 'Acme Corp');
  
  const current = selected || internalSelected;
  const handleSelect = onSelect || setInternalSelected;

  return (
    <div className="relative">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-2 py-2 mb-4 rounded-lg hover:bg-white/5 cursor-pointer transition-colors select-none group border border-transparent hover:border-white/10"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[6px] bg-white text-black flex items-center justify-center font-bold text-[13px] shadow-sm">
            {current.charAt(0)}
          </div>
          <div className="flex flex-col overflow-hidden text-left">
            <span className="text-[13px] font-medium leading-none mb-1 text-white truncate max-w-[130px]">{current}</span>
            <span className="text-[11px] text-neutral-400 leading-none">{planLabel}</span>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-neutral-400 group-hover:text-neutral-200 transition-colors shrink-0" strokeWidth={1.5} />
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-[52px] left-0 w-full bg-[#212121] border border-white/10 rounded-lg shadow-2xl z-50 py-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
            {workspaces.map(ws => (
              <div 
                key={ws}
                onClick={() => { handleSelect(ws); setIsOpen(false); }}
                className={`px-3 py-2 mx-1 text-[13px] rounded-md cursor-pointer transition-colors ${current === ws ? 'bg-[#2e2e2e] text-[#fafafa] font-medium' : 'text-[#a1a1a1] hover:bg-[#2e2e2e]/50 hover:text-white'}`}
              >
                {ws}
              </div>
            ))}
            <div className="h-px bg-white/10 my-1 mx-2" />
            <div className="px-3 py-2 mx-1 text-[13px] text-[#a1a1a1] hover:bg-[#2e2e2e]/50 hover:text-white rounded-md cursor-pointer flex items-center gap-2 transition-colors">
              <span className="text-[16px] leading-none mb-0.5">+</span> Create Workspace
            </div>
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
  onAction,
  level = 0
}: { 
  item: NavItemData; 
  activeId: string; 
  onSelect: (id: string) => void;
  onAction?: (id: string) => void;
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
        className={`group flex items-center justify-between px-2.5 py-[7px] rounded-lg cursor-pointer transition-all duration-150 select-none
          ${isActive 
            ? 'bg-[#2e2e2e] text-[#fafafa] font-medium' 
            : 'text-[#a1a1a1] hover:bg-[#2e2e2e]/40 hover:text-white'
          }
        `}
        style={{ paddingLeft: `${level * 12 + 10}px` }}
        onClick={handleClick}
      >
        <div className="flex items-center gap-2.5">
          <item.icon 
            className={`w-[16px] h-[16px] transition-colors
              ${isActive ? 'text-[#fafafa]' : 'text-[#a1a1a1] group-hover:text-white'}
            `} 
            strokeWidth={1.5} 
          />
          <span className="text-[13px] tracking-wide truncate">
            {item.title}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {item.hasAddAction && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onAction) {
                  onAction(item.id);
                } else {
                  if (item.id === 'analytics') onSelect('ai-chat');
                  else if (item.id === 'business-logic') onSelect('ai-logic-chat');
                  else onSelect(item.id);
                }
              }}
              title="Mulai Sesi AI Baru"
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/15 text-neutral-400 hover:text-white rounded flex items-center justify-center"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          )}
          {item.shortcut && (
             <kbd className="hidden group-hover:inline-flex items-center justify-center h-5 px-1.5 text-[10px] font-medium font-mono text-[#a1a1a1] bg-[#212121] border border-white/10 rounded-[4px]">
               {item.shortcut}
             </kbd>
          )}
          {item.badge && (
            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-medium rounded-full bg-[#2e2e2e] text-[#fafafa]">
              {item.badge}
            </span>
          )}
          {hasChildren && (
            <ChevronRight 
              className={`w-3.5 h-3.5 text-[#a1a1a1] transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} 
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
              className="absolute top-0 bottom-0 border-l border-white/10"
              style={{ left: `${level * 12 + 17.5}px` }}
            />
            {item.children!.map(child => (
              <NavItem 
                key={child.id} 
                item={child} 
                activeId={activeId} 
                onSelect={onSelect} 
                onAction={onAction}
                level={level + 1} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export type SidebarPanelMode = 'menu' | 'ai';

// Gemini-style top toggle: switches the panel below the workspace switcher between the
// normal nav tree ("Menu") and whatever `aiPanel` the caller renders ("AI") — e.g. a list of
// past AI chat sessions. Only shown when the caller passes `onModeChange`.
function ModeToggle({
  mode,
  onModeChange,
}: {
  mode: SidebarPanelMode;
  onModeChange: (mode: SidebarPanelMode) => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1 mb-3 rounded-lg bg-[#212121] border border-white/10">
      {(['menu', 'ai'] as SidebarPanelMode[]).map(m => (
        <button
          key={m}
          type="button"
          onClick={() => onModeChange(m)}
          className={`flex-1 text-center text-[12px] font-medium py-1.5 rounded-md transition-colors cursor-pointer ${
            mode === m
              ? 'bg-[#2e2e2e] text-white'
              : 'text-[#a1a1a1] hover:text-white'
          }`}
        >
          {m === 'menu' ? 'Menu' : 'AI'}
        </button>
      ))}
    </div>
  );
}

export function SidebarNav({
  className = '',
  activeId,
  onSelect,
  onAction,
  activeWorkspace,
  onWorkspaceSelect,
  navGroups,
  bottomItems,
  planLabel = 'Pro Plan',
  workspaces,
  mode,
  onModeChange,
  aiPanel
}: {
  className?: string;
  activeId?: string;
  onSelect?: (id: string) => void;
  onAction?: (id: string) => void;
  activeWorkspace?: string;
  onWorkspaceSelect?: (ws: string) => void;
  navGroups: NavGroupData[];
  bottomItems: NavItemData[];
  planLabel?: string;
  workspaces?: string[];
  // Optional Menu/AI split panel (Gemini-style). Omit all three to keep the plain nav tree.
  mode?: SidebarPanelMode;
  onModeChange?: (mode: SidebarPanelMode) => void;
  aiPanel?: React.ReactNode;
}) {
  const [internalId, setInternalId] = useState('home');
  const currentId = activeId !== undefined ? activeId : internalId;
  const handleSelect = onSelect || setInternalId;
  const showAiPanel = mode === 'ai' && !!onModeChange;

  return (
    <div className={`flex flex-col w-[260px] h-full bg-[#171717] border-none p-3 font-sans text-[#a1a1a1] ${className}`}>
      <WorkspaceSwitcher
        selected={activeWorkspace}
        onSelect={onWorkspaceSelect}
        planLabel={planLabel}
        workspaces={workspaces}
      />

      {onModeChange && <ModeToggle mode={mode || 'menu'} onModeChange={onModeChange} />}

      {showAiPanel ? (
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col mt-2">
          {aiPanel}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col gap-4 mt-2">
          {navGroups.map((group, idx) => (
            <div key={idx} className="flex flex-col gap-0.5">
              {group.heading && (
                <span className="px-2.5 mb-1 text-[11px] font-semibold tracking-wider text-[#787878] uppercase">
                  {group.heading}
                </span>
              )}
              {group.items.map(item => (
                <NavItem
                  key={item.id}
                  item={item}
                  activeId={currentId}
                  onSelect={handleSelect}
                  onAction={onAction}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-white/10 flex flex-col gap-0.5">
        {bottomItems.map(item => (
          <NavItem
            key={item.id}
            item={item}
            activeId={currentId}
            onSelect={handleSelect}
            onAction={onAction}
          />
        ))}
      </div>
    </div>
  );
}
