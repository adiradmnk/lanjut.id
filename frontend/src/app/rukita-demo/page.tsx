'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  CreditCard, 
  X, 
  Check, 
  User,
  AlertCircle
} from 'lucide-react';

export default function RukitaDemoPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [otherReason, setOtherReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Trigger popup after exactly 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowModal(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const reasonOptions = [
    'Biaya sewa bulanan melebihi anggaran saat ini',
    'Pindah lokasi kerja / kampus / WFH',
    'Fasilitas kamar atau area bersama kurang memadai',
    'Masalah kebisingan / kenyamanan lingkungan kost',
    'Menemukan tempat tinggal lain dengan penawaran lebih baik',
    'Lainnya (tuliskan alasan Anda)'
  ];

  const handleToggleReason = (reason: string) => {
    if (selectedReasons.includes(reason)) {
      setSelectedReasons(selectedReasons.filter(r => r !== reason));
    } else {
      setSelectedReasons([...selectedReasons, reason]);
    }
  };

  const isOtherSelected = selectedReasons.includes('Lainnya (tuliskan alasan Anda)');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setShowModal(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0d0f12] text-neutral-200 font-sans antialiased selection:bg-neutral-800 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-neutral-800/80 bg-[#0d0f12]/90 backdrop-blur sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[6px] bg-neutral-100 text-neutral-900 flex items-center justify-center font-bold text-sm tracking-tight">
            R
          </div>
          <div>
            <span className="font-semibold tracking-tight text-white text-sm">rukita</span>
            <span className="text-xs text-neutral-400 ml-2 font-mono">Tenant Portal</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-neutral-400">
          <div className="flex items-center gap-2 bg-neutral-900 px-3 py-1.5 rounded-[6px] border border-neutral-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-neutral-300">Unit 304 - Rukita Kebayoran</span>
          </div>
          <div className="w-8 h-8 rounded-[6px] bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300">
            <User className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Status Notice Banner */}
        <div className="mb-8 p-4 rounded-[6px] border border-neutral-800 bg-neutral-900/60 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-neutral-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-white">Masa Sewa Berakhir dalam 7 Hari</p>
              <p className="text-xs text-neutral-400 mt-0.5">
                Masa tinggal aktif Anda di Rukita Residence Kebayoran Baru akan berakhir pada 25 September 2026.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="text-xs px-3 py-1.5 rounded-[6px] border border-neutral-700 hover:border-neutral-600 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
          >
            Beri Masukan
          </button>
        </div>

        {/* Lease Summary Card */}
        <div className="rounded-[6px] border border-neutral-800 bg-[#121418] p-6 mb-6">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 text-xs text-neutral-400">Detail Sewa Aktif</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-r border-neutral-800/80 pr-4">
              <span className="text-xs text-neutral-500 block mb-1">Properti & Unit</span>
              <p className="text-sm font-medium text-white flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-neutral-400" />
                Rukita Kebayoran Baru
              </p>
              <p className="text-xs text-neutral-400 mt-1">Master Room, Lantai 3 • Unit #304</p>
            </div>
            <div className="border-r border-neutral-800/80 pr-4">
              <span className="text-xs text-neutral-500 block mb-1">Periode Sewa</span>
              <p className="text-sm font-medium text-white flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-neutral-400" />
                25 Mar 2026 - 25 Sep 2026
              </p>
              <p className="text-xs text-neutral-400 mt-1">Durasi 6 Bulan (Status: Tidak Diperpanjang)</p>
            </div>
            <div>
              <span className="text-xs text-neutral-500 block mb-1">Tagihan Terakhir</span>
              <p className="text-sm font-medium text-white flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-neutral-400" />
                Rp 3.850.000 / bulan
              </p>
              <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Lunas via BNI Virtual Account
              </p>
            </div>
          </div>
        </div>

        {/* Tenant Information & Amenities */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-[6px] border border-neutral-800 bg-[#121418] p-6">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Fasilitas Termasuk</h3>
            <ul className="space-y-2 text-xs text-neutral-300">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
                WiFi Kecepatan Tinggi (Up to 100 Mbps)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
                Pembersihan kamar berkala (2x seminggu)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
                Laundry bulanan (maks. 12 kg/bulan)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
                Dapur bersama & communal lounge area
              </li>
            </ul>
          </div>

          <div className="rounded-[6px] border border-neutral-800 bg-[#121418] p-6">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Check-Out Checklist</h3>
            <p className="text-xs text-neutral-400 leading-relaxed mb-4">
              Jadwal inspeksi kamar dan pengembalian kunci fisik dijadwalkan pada tanggal 25 September 2026 pukul 12:00 WIB bersama Tim Community Manager.
            </p>
            <div className="flex items-center justify-between text-xs pt-3 border-t border-neutral-800/80">
              <span className="text-neutral-500">Status Pengembalian Deposit</span>
              <span className="text-neutral-300 font-mono">Rp 3.850.000 (Pending)</span>
            </div>
          </div>
        </div>
      </main>

      {/* 3-Second Pop-up Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-[2px] transition-opacity">
          <div 
            className="w-full max-w-md bg-[#121418] border border-neutral-700/80 rounded-[6px] shadow-2xl p-6 text-neutral-200 animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-neutral-800">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  mengapa anda tidak memperpanjang masa tinggal di kost
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Pilih alasan yang paling sesuai untuk membantu kami meningkatkan layanan.
                </p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-[4px] hover:bg-neutral-800 transition-colors ml-2"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {submitted ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-600 text-white flex items-center justify-center mx-auto">
                  <Check className="w-4 h-4" />
                </div>
                <p className="text-xs font-medium text-white">Terima kasih atas masukan Anda</p>
                <p className="text-xs text-neutral-400">Data masukan Anda telah tersimpan.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <div className="space-y-2">
                  {reasonOptions.map((reason, idx) => {
                    const checked = selectedReasons.includes(reason);
                    const isLast = idx === reasonOptions.length - 1;

                    return (
                      <div key={idx} className="space-y-2">
                        <label 
                          className={`flex items-start gap-3 p-2.5 rounded-[6px] border text-xs cursor-pointer transition-colors ${
                            checked 
                              ? 'border-neutral-500 bg-neutral-800/80 text-white' 
                              : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 text-neutral-300'
                          }`}
                        >
                          <input 
                            type="checkbox"
                            className="mt-0.5 rounded-[3px] border-neutral-600 bg-neutral-800 text-white focus:ring-0 focus:ring-offset-0 accent-white"
                            checked={checked}
                            onChange={() => handleToggleReason(reason)}
                          />
                          <span className="leading-snug">{reason}</span>
                        </label>

                        {/* Free-form text input for the last option */}
                        {isLast && checked && (
                          <div className="pl-6 pt-1">
                            <textarea
                              value={otherReason}
                              onChange={(e) => setOtherReason(e.target.value)}
                              placeholder="Tuliskan alasan spesifik Anda di sini..."
                              rows={3}
                              className="w-full text-xs rounded-[6px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 resize-none"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white rounded-[6px] hover:bg-neutral-800 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={selectedReasons.length === 0}
                    className="px-4 py-1.5 text-xs font-medium text-neutral-900 bg-white hover:bg-neutral-200 disabled:opacity-40 disabled:hover:bg-white rounded-[6px] transition-colors"
                  >
                    Kirim Jawaban
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
