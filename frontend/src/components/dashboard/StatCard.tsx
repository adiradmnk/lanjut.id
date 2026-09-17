'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  iconColorClass = 'text-primary',
  featured = false,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  iconColorClass?: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`p-5 rounded-xl border shadow-xs flex flex-col justify-between ${
        featured
          ? 'bg-gradient-to-br from-primary to-primary/80 border-primary text-primary-foreground'
          : 'bg-card border-border/60'
      }`}
    >
      <div className={`flex items-center justify-between ${featured ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
        <span className="text-xs font-medium">{label}</span>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${featured ? 'bg-white/15' : 'bg-primary/10'}`}>
          <Icon className={`w-4 h-4 ${featured ? 'text-primary-foreground' : iconColorClass}`} />
        </div>
      </div>
      <div className="mt-3">
        <div className={`text-2xl font-bold ${featured ? 'text-primary-foreground' : 'text-foreground'}`}>{value}</div>
        {hint && (
          <div className={`text-[11px] mt-1 ${featured ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}>{hint}</div>
        )}
      </div>
    </div>
  );
}
