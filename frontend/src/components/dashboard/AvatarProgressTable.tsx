'use client';

import React from 'react';

export type AvatarProgressRow = {
  id: string;
  name: string;
  subtitle: string;
  progressPct: number;
  progressLabel?: string;
};

function progressColorClass(pct: number): string {
  if (pct >= 70) return 'bg-emerald-500';
  if (pct >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

export function AvatarProgressTable({
  title,
  columnLabel,
  rows,
  emptyLabel = 'Belum ada data.',
}: {
  title: string;
  columnLabel: string;
  rows: AvatarProgressRow[];
  emptyLabel?: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-border/50">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground p-4">{emptyLabel}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="text-muted-foreground border-b border-border/50">
                <th className="py-2.5 px-4 font-medium">Nama</th>
                <th className="py-2.5 px-4 font-medium">Keterangan</th>
                <th className="py-2.5 px-4 font-medium w-[180px]">{columnLabel}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/30 last:border-none hover:bg-black/[0.015]">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-foreground shrink-0">
                        {row.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground truncate">{row.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground truncate">{row.subtitle}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${progressColorClass(row.progressPct)}`}
                          style={{ width: `${Math.min(100, Math.max(0, row.progressPct))}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground w-9 text-right shrink-0">
                        {row.progressLabel ?? `${Math.round(row.progressPct)}%`}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
