'use client';

import React from 'react';

export type LeaderboardEntry = {
  id: string;
  name: string;
  metricLabel: string;
};

const RANK_COLORS = [
  'bg-primary text-primary-foreground',
  'bg-accent text-accent-foreground',
  'bg-muted text-foreground',
  'bg-muted text-foreground',
];

export function Leaderboard({
  title,
  entries,
  emptyLabel = 'Belum ada data untuk ditampilkan.',
}: {
  title: string;
  entries: LeaderboardEntry[];
  emptyLabel?: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border/60 shadow-xs p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {entries.map((entry, idx) => (
            <li key={entry.id} className="flex items-center gap-3">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  RANK_COLORS[Math.min(idx, RANK_COLORS.length - 1)]
                }`}
              >
                {idx + 1}
              </span>
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[12px] font-semibold text-foreground shrink-0">
                {entry.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-foreground truncate">{entry.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">{entry.metricLabel}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
