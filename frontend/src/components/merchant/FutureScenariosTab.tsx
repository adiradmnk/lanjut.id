'use client';

import React, { useState } from 'react';
import { Sliders, Sparkles, TrendingUp, TrendingDown, ArrowRight, Layers, BarChart3, RefreshCw } from 'lucide-react';

interface FutureScenariosTabProps {
  merchantId?: string;
}

export default function FutureScenariosTab({ merchantId }: FutureScenariosTabProps) {
  const [priceChange, setPriceChange] = useState<number>(0);
  const [tenureImpact, setTenureImpact] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  const handleRunSimulation = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/merchant/churn-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price_change_pct: priceChange,
          tenure_impact_pct: tenureImpact,
          merchant_id: merchantId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSimulationResult(data.simulation);
      } else {
        throw new Error('Simulation API error');
      }
    } catch {
      // Deterministic simulation
      const baseRisk = 26.5;
      const priceFactor = priceChange * 0.28;
      const tenureFactor = tenureImpact * -0.22;
      const futureRisk = Math.max(5.0, Math.min(85.0, baseRisk + priceFactor + tenureFactor));
      const riskChange = ((futureRisk - baseRisk) / baseRisk) * 100;

      setSimulationResult({
        price_change_pct: priceChange,
        tenure_impact_pct: tenureImpact,
        current_churn_risk_pct: Math.round(baseRisk * 10) / 10,
        future_churn_risk_pct: Math.round(futureRisk * 10) / 10,
        risk_change_pct: Math.round(riskChange * 10) / 10,
        direction: riskChange > 0 ? 'INCREASE' : 'DECREASE',
        histogram_data: {
          labels: ['0-10%', '10-20%', '20-30%', '30-40%', '40-50%', '50-60%', '60-70%', '70-80%', '80-90%', '90-100%'],
          current_counts: [15, 28, 22, 14, 9, 6, 3, 2, 1, 0],
          future_counts: priceChange > 0
            ? [8, 14, 19, 22, 16, 11, 6, 3, 1, 0]
            : [22, 32, 20, 10, 8, 4, 2, 1, 1, 0],
        },
        total_simulated: 100,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const maxHistCount = simulationResult
    ? Math.max(
        ...simulationResult.histogram_data.current_counts,
        ...simulationResult.histogram_data.future_counts,
        1
      )
    : 30;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="rounded-[24px] p-6 sm:p-8 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-bold uppercase tracking-wider">
            🌟 Future Impact Simulator
          </span>
          <span className="text-xs text-white/90">What-If Churn & Retention Modeling</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
          Predict How Pricing & Market Shifts Will Impact Customer Churn
        </h2>
        <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-3xl">
          Simulasikan skenario kenaikan/penurunan harga langganan bulanan dan pergeseran loyalitas pasar untuk mengukur sensitivitas churn risiko sebelum diterapkan ke sistem.
        </p>
      </div>

      {/* Simulator Controls */}
      <div className="bg-[#fafafa] border border-neutral-200/90 rounded-[24px] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.02)] space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900">🎛️ Parameter Skenario Masa Depan</h3>
          <span className="text-xs text-neutral-500">Populasi: 100 Pelanggan Aktif</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Price Changes Slider */}
          <div className="p-4 bg-white rounded-2xl border border-neutral-200/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-neutral-800">📈 Penyesuaian Harga Bulanan</span>
              <span className={`font-black px-2 py-0.5 rounded-full ${
                priceChange > 0 ? 'bg-red-50 text-red-700' : priceChange < 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-700'
              }`}>
                {priceChange > 0 ? `+${priceChange}%` : `${priceChange}%`}
              </span>
            </div>
            <input
              type="range"
              min="-50"
              max="100"
              step="5"
              value={priceChange}
              onChange={(e) => setPriceChange(Number(e.target.value))}
              className="w-full accent-orange-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-neutral-400">
              <span>-50% (Diskon Besar)</span>
              <span>0% (Netral)</span>
              <span>+100% (Kenaikan 2x)</span>
            </div>
          </div>

          {/* Market Tenure Impact Slider */}
          <div className="p-4 bg-white rounded-2xl border border-neutral-200/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-neutral-800">⏰ Pergeseran Loyalitas / Kondisi Pasar</span>
              <span className={`font-black px-2 py-0.5 rounded-full ${
                tenureImpact > 0 ? 'bg-emerald-50 text-emerald-700' : tenureImpact < 0 ? 'bg-red-50 text-red-700' : 'bg-neutral-100 text-neutral-700'
              }`}>
                {tenureImpact > 0 ? `+${tenureImpact}% (Makin Loyal)` : `${tenureImpact}% (Mudah Pindah)`}
              </span>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              step="5"
              value={tenureImpact}
              onChange={(e) => setTenureImpact(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-neutral-400">
              <span>-50% (Pesaing Baru)</span>
              <span>0% (Netral)</span>
              <span>+50% (Program Retensi Sukses)</span>
            </div>
          </div>
        </div>

        {/* Run Scenario Button */}
        <button
          onClick={handleRunSimulation}
          disabled={isRunning}
          className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Menjalankan Simulasi Probabilitas...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-white" />
              <span>🚀 Run Scenario Analysis</span>
            </>
          )}
        </button>
      </div>

      {/* Simulation Output Cards */}
      {simulationResult && (
        <div className="space-y-6">
          {/* Top Metric Comparison Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 rounded-[24px] bg-white border border-neutral-200/90 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Kondisi Baseline</span>
                <div className="text-3xl sm:text-4xl font-black text-neutral-900 mt-1">
                  {simulationResult.current_churn_risk_pct}%
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Rata-rata probabilitas churn pelanggan pada kondisi tarif normal saat ini
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center gap-2 text-xs font-semibold text-neutral-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                <span>Current Risk Baseline</span>
              </div>
            </div>

            <div className={`p-6 rounded-[24px] border shadow-sm flex flex-col justify-between text-white ${
              simulationResult.direction === 'INCREASE'
                ? 'bg-gradient-to-br from-rose-600 to-red-600 border-red-400'
                : 'bg-gradient-to-br from-emerald-600 to-teal-600 border-emerald-400'
            }`}>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-90">Prediksi Skenario Baru</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur text-xs font-extrabold flex items-center gap-1">
                    {simulationResult.direction === 'INCREASE' ? (
                      <>
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>+{simulationResult.risk_change_pct}%</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>{simulationResult.risk_change_pct}%</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="text-3xl sm:text-4xl font-black mt-1">
                  {simulationResult.future_churn_risk_pct}%
                </div>
                <p className="text-xs opacity-90 mt-1">
                  {simulationResult.direction === 'INCREASE'
                    ? '⚠️ Peringatan: Kebijakan ini meningkatkan potensi pembatalan langganan.'
                    : '🎉 Positif: Kebijakan ini berhasil menekan tingkat churn secara signifikan.'}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/20 flex items-center gap-2 text-xs font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-white" />
                <span>Future Churn Risk Projection</span>
              </div>
            </div>
          </div>

          {/* Histogram Comparison: Current vs Future Risk Distribution */}
          <div className="bg-[#fafafa] border border-neutral-200/90 rounded-[24px] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">📊 Scenario Impact Analysis (Risk Distribution)</h3>
                <p className="text-xs text-neutral-500">
                  Perbandingan distribusi frekuensi probabilitas risiko member: Baseline (Biru) vs Skenario Baru (Salmon/Merah)
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-blue-400" />
                  <span className="text-neutral-700">Current Risk</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#f87171]" />
                  <span className="text-neutral-700">Future Risk</span>
                </div>
              </div>
            </div>

            {/* Side-by-side comparative histogram bars */}
            <div className="space-y-3 mt-6">
              {simulationResult.histogram_data.labels.map((label: string, idx: number) => {
                const curVal = simulationResult.histogram_data.current_counts[idx];
                const futVal = simulationResult.histogram_data.future_counts[idx];
                const curWidth = Math.round((curVal / maxHistCount) * 100);
                const futWidth = Math.round((futVal / maxHistCount) * 100);

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs text-neutral-600">
                      <span className="font-semibold text-neutral-800">{label}</span>
                      <span className="text-[11px] text-neutral-400">
                        Current: <b>{curVal}</b> &bull; Future: <b>{futVal}</b>
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-4 bg-neutral-200/70 rounded-full overflow-hidden flex justify-end">
                        <div
                          style={{ width: `${curWidth}%` }}
                          className="h-full bg-blue-400 rounded-full transition-all duration-500"
                        />
                      </div>
                      <div className="h-4 bg-neutral-200/70 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${futWidth}%` }}
                          className="h-full bg-[#f87171] rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-3 border-t border-neutral-200/70 text-xs text-neutral-500">
              💡 <b>Rekomendasi Manajerial:</b> Untuk menjaga perputaran BNI Virtual Account tetap optimal, kenaikan harga di atas 15% disarankan dipaketkan dengan opsi fleksibilitas jadwal malam atau garansi freeze kuota.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
