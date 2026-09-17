'use client';

import React from 'react';

export type BreakdownSegment = {
  id: string;
  label: string;
  value: number;
  pct: number;
  colorClass?: string;
};

export function BreakdownCard({
  title,
  segments,
}: {
  title: string;
  segments: BreakdownSegment[];
}) {
  return (
    <div className="bg-card rounded-xl border border-border/60 shadow-xs p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      <div className="flex flex-col gap-4">
        {segments.map((seg) => (
          <div key={seg.id} className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[12px] text-muted-foreground">{seg.label}</div>
              <div className="text-lg font-semibold text-foreground mt-0.5">{seg.value.toLocaleString('id-ID')}</div>
            </div>
            <span className={`text-xs font-semibold px-2 py-1 rounded-md ${seg.colorClass ?? 'bg-primary/10 text-primary'}`}>
              {seg.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
