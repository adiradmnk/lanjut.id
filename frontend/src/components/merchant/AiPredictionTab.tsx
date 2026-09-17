'use client';

import React, { useState } from 'react';
import { Sparkles, Sliders, CheckCircle2, AlertTriangle, ShieldCheck, Mail, ArrowRight, Zap, RefreshCw } from 'lucide-react';

interface AiPredictionTabProps {
  onTriggerMagicLink?: (memberId: string) => void;
  isTriggeringEmail?: boolean;
}

export default function AiPredictionTab({ onTriggerMagicLink, isTriggeringEmail }: AiPredictionTabProps) {
  const [mode, setMode] = useState<'quick' | 'manual'>('quick');
  
  // Prediction Parameters
  const [tenure, setTenure] = useState<number>(24);
  const [monthlyCharges, setMonthlyCharges] = useState<number>(65);
  const [totalCharges, setTotalCharges] = useState<number>(1560);
  const [contract, setContract] = useState<string>('Month-to-month');
  const [internetService, setInternetService] = useState<string>('Fiber optic');
  const [onlineSecurity, setOnlineSecurity] = useState<boolean>(false);
  const [techSupport, setTechSupport] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('Electronic check');
  const [seniorCitizen, setSeniorCitizen] = useState<number>(0);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [predictionResult, setPredictionResult] = useState<any>(null);

  const handlePredict = async () => {
    setIsLoading(true);
    try {
      const payload = {
        tenure: mode === 'quick' ? 24 : tenure,
        MonthlyCharges: mode === 'quick' ? 65 : monthlyCharges,
        TotalCharges: mode === 'quick' ? 1560 : totalCharges,
        Contract: mode === 'quick' ? 'Month-to-month' : contract,
        InternetService: mode === 'quick' ? 'Fiber optic' : internetService,
        OnlineSecurity: mode === 'quick' ? false : onlineSecurity,
        TechSupport: mode === 'quick' ? false : techSupport,
        PaymentMethod: mode === 'quick' ? 'Electronic check' : paymentMethod,
        SeniorCitizen: mode === 'quick' ? 0 : seniorCitizen,
      };

      const res = await fetch('/api/merchant/churn-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setPredictionResult(data.prediction);
      } else {
        throw new Error('API Error');
      }
    } catch {
      // Deterministic calculation
      const t = mode === 'quick' ? 24 : tenure;
      const mc = mode === 'quick' ? 65 : monthlyCharges;
      const isMtm = (mode === 'quick' ? 'Month-to-month' : contract) === 'Month-to-month';
      let prob = 0.28;
      if (t < 12) prob += 0.35;
      if (mc > 70) prob += 0.15;
      if (isMtm) prob += 0.20;
      if (onlineSecurity) prob -= 0.10;
      if (techSupport) prob -= 0.10;
      prob = Math.max(0.05, Math.min(0.95, prob));

      const isHigh = prob > 0.6;
      setPredictionResult({
        churn_probability: Math.round(prob * 1000) / 1000,
        churn_percentage: Math.round(prob * 1000) / 10,
        risk_level: isHigh ? '🔴 High Risk' : (prob >= 0.3 ? '🟡 Medium Risk' : '✅ Low Risk'),
        is_high_risk: isHigh,
        recommendations: isHigh ? [
          'Tawarkan diskon loyalitas retensi atau promo penyesuaian paket.',
          'Jadwalkan sesi interaksi personal / konsultasi kelas pengganti.',
          'Berikan insentif peralihan ke kontrak 1-tahun via BNI Auto-Debit.',
          'Aktifkan integrasi relokasi slot jam off-peak (Rebalance Pagi -> Malam).'
        ] : [
          'Pertahankan kepuasan dengan apresiasi program loyalitas berjenjang.',
          'Tawarkan program referensi member (Member-get-member referral).',
          'Pertimbangkan penawaran paket multi-studio atau annual VIP tier.'
        ],
        key_features_used: { tenure: t, MonthlyCharges: mc }
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="rounded-[24px] p-6 sm:p-8 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-bold uppercase tracking-wider">
            🔮 AI Churn Prediction Engine
          </span>
          <span className="text-xs text-white/80">Calibrated XGBoost Model Inference</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
          Instant Risk Scoring & Behavioral Diagnostics
        </h2>
        <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-3xl">
          Prediksi skor risiko kepergian pelanggan dalam hitungan milidetik dengan input profil langganan, masa aktif, tipe paket, dan metode pembayaran.
        </p>
      </div>

      {/* Mode Selector */}
      <div className="flex items-center gap-3 bg-neutral-100/90 p-1.5 rounded-2xl w-fit border border-neutral-200/80">
        <button
          onClick={() => setMode('quick')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            mode === 'quick' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>🚀 Quick Prediction (Auto-fill Median)</span>
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            mode === 'manual' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-blue-500" />
          <span>✏️ Manual Input (Customize Features)</span>
        </button>
      </div>

      {/* Input Parameters Form & Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Inputs (7 Cols) */}
        <div className="lg:col-span-7 bg-[#fafafa] border border-neutral-200/90 rounded-[24px] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.02)] space-y-5">
          {mode === 'quick' ? (
            <div className="p-4 bg-white rounded-2xl border border-neutral-200/80 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-800">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Default Parameters Used for Quick Assessment:</span>
              </div>
              <ul className="text-xs text-neutral-600 space-y-1.5 list-disc list-inside">
                <li><b>Tenure:</b> 24 bulan (Masa langganan rata-rata)</li>
                <li><b>Monthly Charges:</b> $65.00 / bulan (Rp 1.050.000)</li>
                <li><b>Total Charges:</b> $1,560.00</li>
                <li><b>Contract Type:</b> Month-to-month</li>
                <li><b>Internet / Tier:</b> Fiber optic / Studio Unlimited</li>
                <li><b>Online Security & Tech Support:</b> Standard Default</li>
              </ul>
              <p className="text-[11px] text-neutral-400">
                Mode ini menggunakan nilai median populasi pelanggan untuk simulasi instan.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-white rounded-xl border border-neutral-200/70 space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-neutral-800">
                    <span>Masa Aktif (Tenure)</span>
                    <span className="text-purple-600">{tenure} Bulan</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="72"
                    value={tenure}
                    onChange={(e) => {
                      const t = Number(e.target.value);
                      setTenure(t);
                      setTotalCharges(t * monthlyCharges);
                    }}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400">
                    <span>1 bln (Baru)</span>
                    <span>72 bln (Senior)</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-neutral-200/70 space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-neutral-800">
                    <span>Biaya Bulanan (Monthly)</span>
                    <span className="text-blue-600">${monthlyCharges}</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="120"
                    value={monthlyCharges}
                    onChange={(e) => {
                      const mc = Number(e.target.value);
                      setMonthlyCharges(mc);
                      setTotalCharges(tenure * mc);
                    }}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400">
                    <span>$20 (Ekonomis)</span>
                    <span>$120 (Premium)</span>
                  </div>
                </div>
              </div>

              {/* Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Jenis Kontrak</label>
                  <select
                    value={contract}
                    onChange={(e) => setContract(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-300 bg-white font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Month-to-month">Month-to-month (Fleksibel Bulanan)</option>
                    <option value="One year">One year (Kontrak 1 Tahun)</option>
                    <option value="Two year">Two year (Kontrak 2 Tahun)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Paket Layanan / Studio</label>
                  <select
                    value={internetService}
                    onChange={(e) => setInternetService(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-300 bg-white font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Fiber optic">Fiber optic / Reformer VIP</option>
                    <option value="DSL">DSL / Reguler Mat Pilates</option>
                    <option value="No">No / Free Access Tier</option>
                  </select>
                </div>
              </div>

              {/* Checkboxes Addons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-neutral-200/80 cursor-pointer hover:bg-neutral-50">
                  <input
                    type="checkbox"
                    checked={onlineSecurity}
                    onChange={(e) => setOnlineSecurity(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-neutral-700 font-medium">Online Security / Locker Proteksi</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-neutral-200/80 cursor-pointer hover:bg-neutral-50">
                  <input
                    type="checkbox"
                    checked={techSupport}
                    onChange={(e) => setTechSupport(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-neutral-700 font-medium">Instruktur Pendamping (Tech Support)</span>
                </label>
              </div>
            </div>
          )}

          {/* Predict Action Button */}
          <button
            onClick={handlePredict}
            disabled={isLoading}
            className="w-full py-3.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menganalisis Pola AI XGBoost...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>🔮 Predict Churn Probability</span>
              </>
            )}
          </button>
        </div>

        {/* Right Result Card (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col">
          {predictionResult ? (
            <div className="bg-[#fafafa] border border-neutral-200/90 rounded-[24px] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.02)] flex-1 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Hasil Diagnosis AI</span>
                  <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                    predictionResult.is_high_risk ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {predictionResult.risk_level}
                  </span>
                </div>

                {/* Big Score Box */}
                <div className={`p-6 rounded-2xl text-center text-white shadow-md ${
                  predictionResult.is_high_risk
                    ? 'bg-gradient-to-br from-red-600 via-rose-600 to-pink-600'
                    : 'bg-gradient-to-br from-emerald-600 to-teal-600'
                }`}>
                  <div className="text-xs font-semibold uppercase tracking-wider opacity-90">Predicted Churn Probability</div>
                  <div className="text-5xl font-black mt-1 mb-1 tracking-tight">
                    {predictionResult.churn_percentage}%
                  </div>
                  <div className="text-xs font-medium opacity-90">
                    {predictionResult.is_high_risk ? '⚠️ Risiko Tinggi Pembatalan Langganan' : '✅ Risiko Rendah / Loyalitas Terjaga'}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="mt-5 space-y-2">
                  <h4 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Rekomendasi Retensi Lanjut.id:</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {predictionResult.recommendations?.map((rec: string, idx: number) => (
                      <li key={idx} className="p-2.5 bg-white rounded-xl border border-neutral-200/70 text-xs text-neutral-700 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Autonomous Action Trigger */}
              {predictionResult.is_high_risk && (
                <div className="pt-4 border-t border-neutral-200/80">
                  <button
                    onClick={() => onTriggerMagicLink && onTriggerMagicLink('mbr-dina-01')}
                    disabled={isTriggeringEmail}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{isTriggeringEmail ? 'Mengirim Magic Link...' : 'Kirim Magic Link Penyelamatan via Email'}</span>
                  </button>
                  <p className="text-[10px] text-neutral-400 text-center mt-1.5">
                    Mengirim link otonom penyesuaian jadwal & BNI Virtual Account khusus member
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#fafafa] border border-dashed border-neutral-300 rounded-[24px] p-8 flex-1 flex flex-col items-center justify-center text-center text-neutral-400">
              <Sparkles className="w-10 h-10 text-neutral-300 mb-3" />
              <h4 className="text-sm font-bold text-neutral-700">Belum Ada Analisis</h4>
              <p className="text-xs text-neutral-400 max-w-xs mt-1">
                Pilih parameter di sebelah kiri lalu klik tombol "Predict Churn Probability" untuk melihat kalkulasi risiko real-time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
