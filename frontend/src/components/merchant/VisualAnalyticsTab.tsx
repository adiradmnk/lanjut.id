'use client';

import React from 'react';
import { BarChart3, PieChart, TrendingUp, Layers, HelpCircle, Activity, Sparkles } from 'lucide-react';

interface VisualAnalyticsTabProps {
  analytics: any;
  revenueInsights?: any;
}

export default function VisualAnalyticsTab({ analytics, revenueInsights }: VisualAnalyticsTabProps) {
  const activeCount = analytics?.active_customers || 735;
  const churnedCount = analytics?.churned_customers || 265;
  const totalCount = activeCount + churnedCount;
  const activePct = Math.round((activeCount / totalCount) * 100);
  const churnedPct = 100 - activePct;

  const featureImportance = analytics?.feature_importance || [
    { feature: 'Contract_Month-to-month', importance: 0.285, label: 'Kontrak Month-to-month' },
    { feature: 'tenure', importance: 0.214, label: 'Masa Berlangganan (Tenure)' },
    { feature: 'MonthlyCharges', importance: 0.168, label: 'Biaya Bulanan' },
    { feature: 'TotalCharges', importance: 0.112, label: 'Total Akumulasi Pembayaran' },
    { feature: 'InternetService_Fiber_optic', importance: 0.086, label: 'Layanan Fiber Optic' },
    { feature: 'PaymentMethod_Electronic_check', importance: 0.052, label: 'Metode Bayar Manual/Check' },
    { feature: 'OnlineSecurity_No', importance: 0.038, label: 'Tanpa Add-on Keamanan' },
    { feature: 'TechSupport_No', importance: 0.024, label: 'Tanpa Dukungan Instruktur' },
  ];

  const chargesDistribution = analytics?.monthly_charges_distribution || [
    { range: '$20 - $40', active: 220, churned: 35 },
    { range: '$40 - $60', active: 180, churned: 45 },
    { range: '$60 - $80', active: 165, churned: 75 },
    { range: '$80 - $100', active: 110, churned: 80 },
    { range: '$100+', active: 60, churned: 30 },
  ];

  const tenureDistribution = analytics?.tenure_distribution || [
    { range: '1 - 12 bln', active: 180, churned: 140 },
    { range: '13 - 24 bln', active: 160, churned: 60 },
    { range: '25 - 48 bln', active: 210, churned: 45 },
    { range: '49 - 72 bln', active: 185, churned: 20 },
  ];

  const maxChargesCount = Math.max(...chargesDistribution.map((d: any) => d.active + d.churned), 1);
  const maxTenureCount = Math.max(...tenureDistribution.map((d: any) => d.active + d.churned), 1);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner ala anshkumar2311 style */}
      <div className="rounded-[24px] p-6 sm:p-8 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-bold uppercase tracking-wider">
            📊 Advanced Visual Analytics
          </span>
          <span className="text-xs text-white/80">XGBoost Feature & Distribution Insights</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
          Deep Insights into Customer Retention & Behavioral Patterns
        </h2>
        <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-3xl">
          Visualisasi komprehensif menguraikan faktor pemicu pelanggan bertahan vs churn: korelasi biaya bulanan, masa aktif langganan, dan ranking bobot AI.
        </p>
      </div>

      {/* Row 1: Pie / Donut & Monthly Charges vs Churn */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Retention Donut Overview */}
        <div className="lg:col-span-5 bg-[#fafafa] border border-neutral-200/90 rounded-[24px] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">🎯 Customer Retention Overview</h3>
                <p className="text-xs text-neutral-500">Distribusi status pelanggan aktif vs churn</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-200/70 text-neutral-700">
                Total: {totalCount}
              </span>
            </div>

            {/* Circular Donut Diagram */}
            <div className="flex flex-col items-center justify-center py-6">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#EF553B"
                    strokeWidth="16"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#00CC96"
                    strokeWidth="16"
                    strokeDasharray={`${activePct * 2.51} ${100 * 2.51}`}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-neutral-900">{activePct}%</span>
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Active</span>
                </div>
              </div>

              {/* Legends */}
              <div className="flex items-center justify-center gap-6 mt-4 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#00CC96]" />
                  <span className="text-neutral-700">Active ({activeCount})</span>
                  <span className="text-neutral-400 font-normal">({activePct}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#EF553B]" />
                  <span className="text-neutral-700">Churned ({churnedCount})</span>
                  <span className="text-neutral-400 font-normal">({churnedPct}%)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/70 text-xs text-emerald-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Tingkat retensi stabil pada pelanggan yang menggunakan pembayaran otomatis BNI.</span>
          </div>
        </div>

        {/* Right: Monthly Charges vs Churn Risk Histogram */}
        <div className="lg:col-span-7 bg-[#fafafa] border border-neutral-200/90 rounded-[24px] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">💰 Monthly Charges vs Churn Risk</h3>
                <p className="text-xs text-neutral-500">Korelasi kenaikan biaya bulanan dengan peningkatan rasio churn</p>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-[#00CC96]" />
                  <span className="text-neutral-600 font-medium">Active</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-[#EF553B]" />
                  <span className="text-neutral-600 font-medium">Churned</span>
                </div>
              </div>
            </div>

            {/* Stacked Bar Chart */}
            <div className="mt-6 space-y-4">
              {chargesDistribution.map((item: any, idx: number) => {
                const total = item.active + item.churned;
                const actPct = Math.round((item.active / total) * 100);
                const chnPct = 100 - actPct;
                const widthPct = Math.min(100, Math.round((total / maxChargesCount) * 100));

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-neutral-800">{item.range}</span>
                      <span className="text-neutral-500">
                        {item.churned} churn / {total} total ({chnPct}% churn)
                      </span>
                    </div>
                    <div className="w-full h-4 bg-neutral-200/80 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${(item.active / maxChargesCount) * 100}%` }}
                        className="h-full bg-[#00CC96] transition-all duration-500"
                        title={`Active: ${item.active}`}
                      />
                      <div
                        style={{ width: `${(item.churned / maxChargesCount) * 100}%` }}
                        className="h-full bg-[#EF553B] transition-all duration-500"
                        title={`Churned: ${item.churned}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-200/70 text-xs text-neutral-500 mt-4">
            💡 <b>Insight:</b> Member dengan biaya &gt; $80/bulan mengalami lonjakan churn hingga 42% jika tidak disertai add-on instruktur personal.
          </div>
        </div>
      </div>

      {/* Row 2: Customer Tenure Analysis & Top Feature Importance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Customer Tenure vs Churn Analysis */}
        <div className="lg:col-span-6 bg-[#fafafa] border border-neutral-200/90 rounded-[24px] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">⏰ Customer Tenure Analysis</h3>
              <p className="text-xs text-neutral-500">Tingkat retensi meningkat seiring durasi keanggotaan</p>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
              Tenure Curve
            </span>
          </div>

          <div className="space-y-4 mt-4">
            {tenureDistribution.map((item: any, idx: number) => {
              const total = item.active + item.churned;
              const actPct = Math.round((item.active / total) * 100);
              const chnPct = 100 - actPct;

              return (
                <div key={idx} className="p-3 bg-white rounded-xl border border-neutral-200/70 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-neutral-900">{item.range}</span>
                    <span className={`font-bold px-2 py-0.5 rounded-full ${chnPct > 35 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      Churn Risk: {chnPct}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${actPct}%` }}
                      className="h-full bg-[#00CC96]"
                    />
                    <div
                      style={{ width: `${chnPct}%` }}
                      className="h-full bg-[#EF553B]"
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-neutral-400">
                    <span>{item.active} Member Aktif</span>
                    <span>{item.churned} Member Berhenti</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: AI Model's Top Predictive Features (Feature Importance) */}
        <div className="lg:col-span-6 bg-[#fafafa] border border-neutral-200/90 rounded-[24px] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">🔍 AI Model's Top Predictive Features</h3>
              <p className="text-xs text-neutral-500">Bobot pengaruh variabel menurut algoritma XGBoost</p>
            </div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
              XGBoost Calibrated
            </span>
          </div>

          <div className="space-y-3 mt-4">
            {featureImportance.map((feat: any, idx: number) => {
              const widthPct = Math.round((feat.importance / 0.3) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-neutral-800">{feat.label}</span>
                    <span className="font-bold text-indigo-600">{(feat.importance * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-200/80 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${widthPct}%` }}
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-200/70 text-xs text-neutral-500">
            📊 Variabel <b>Kontrak Bulanan</b> dan <b>Tenure Awal</b> memegang &gt; 50% bobot prediksi keputusan pembatalan member.
          </div>
        </div>
      </div>

      {/* Row 3: Correlation Matrix Table */}
      {/* Row 3: Revenue Analytics & Optimizations (From API) */}
      {revenueInsights && (
        <div className="bg-[#fafafa] border border-neutral-200/90 rounded-[24px] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.02)] mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">📈 Revenue Recovery Strategy & Trends</h3>
              <p className="text-xs text-neutral-500">{revenueInsights.market_trend_opportunity}</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {revenueInsights.engine_source}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {revenueInsights.actionable_revenue_optimizations?.map((opt: any, idx: number) => (
              <div key={idx} className="p-4 bg-white rounded-xl border border-neutral-200/70 space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-neutral-900 text-sm">{opt.strategy_title}</h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${opt.impact_level === 'HIGH' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-50 text-blue-700'}`}>
                    Boost: {opt.potential_revenue_boost_pct}%
                  </span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {opt.action_description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
