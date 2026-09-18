'use client';

import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, FileText, Trash2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function UploadKatalogPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      setFile(selected);
      setIsSuccess(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setIsSuccess(true);
    }
  };

  const resetFile = () => {
    setFile(null);
    setIsSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-center items-center p-6 antialiased font-sans">
      <div className="w-full max-w-xl">
        {/* Header / Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Katalog Produk Bisnis
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Unggah dokumen panduan produk, pricelist, atau katalog bisnis merchant Anda
          </p>
        </div>

        {/* Upload Box */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !file && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${
            isDragging
              ? 'border-blue-500 bg-blue-50/60 scale-[1.01]'
              : isSuccess
              ? 'border-emerald-400 bg-emerald-50/50'
              : 'border-slate-300 bg-slate-50 hover:bg-slate-100/70 hover:border-slate-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.xlsx,.csv,.png,.jpg"
            className="hidden"
            onChange={handleFileChange}
          />

          {!file ? (
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center mb-4">
                <Upload className="w-7 h-7 text-slate-600" />
              </div>
              <p className="text-base font-semibold text-slate-800">
                Tarik & lepas file di sini
              </p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                atau klik untuk memilih file dari komputer (PDF, DOCX, XLSX, max 10MB)
              </p>
              <span className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors shadow-sm">
                Pilih File
              </span>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 w-full max-w-sm flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-3 truncate">
                  <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="text-left truncate">
                    <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetFile();
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Hapus file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 inline-flex items-center space-x-1.5 text-xs font-medium text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-full">
                <span>✓ Berhasil diunggah ke sistem</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions / Links */}
        <div className="mt-8 flex justify-center items-center gap-4 text-xs text-slate-500">
          <Link
            href="/demo-video"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-all shadow-xs"
          >
            Buka Demo Video Hub
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
