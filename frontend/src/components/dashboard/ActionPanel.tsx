'use client';

import React from 'react';

export type ActionPanelItem = {
  id: string;
  title: string;
  subtitle: string;
  tags?: string[];
};

// Dark contrast panel for time-sensitive or attention-needed items (renewals approaching,
// merchants needing RM follow-up) — the visual counterpart to the light stat/leaderboard
// cards, styled after the "Upcoming Meeting" pattern.
export function ActionPanel({
  title,
  items,
  emptyLabel = 'Tidak ada item yang butuh perhatian saat ini.',
}: {
  title: string;
  items: ActionPanelItem[];
  emptyLabel?: string;
}) {
  return (
    <div className="bg-foreground text-background rounded-xl p-5 flex flex-col">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      {items.length === 0 ? (
        <p className="text-xs text-background/60">{emptyLabel}</p>
      ) : (
        <ul className="relative flex flex-col gap-5 before:content-[''] before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-px before:bg-background/15">
          {items.map((item) => (
            <li key={item.id} className="relative pl-6">
              <span className="absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full border-2 border-background bg-primary" />
              <div className="text-[13px] font-medium">{item.title}</div>
              <div className="text-[11px] text-background/60 mt-0.5">{item.subtitle}</div>
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {item.tags.map((tag, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-background/10 text-background/80">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
