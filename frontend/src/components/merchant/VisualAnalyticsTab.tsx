'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, RotateCcw } from 'lucide-react';

interface AnalyticsSessionSummary {
  id: string;
  tenant_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface VisualAnalyticsTabProps {
  analytics: any;
  revenueInsights?: any;
  tenantId: string;
  // Externally controlled session (from the sidebar's AI history panel). When set, this
  // component loads that session's message history instead of starting a fresh chat.
  // When it's created a brand-new session on the first message, it reports that session
  // back via onSessionCreated so the sidebar list can pick it up.
  sessionId?: string | null;
  onSessionCreated?: (session: AnalyticsSessionSummary) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  engineSource?: string;
}

const SAMPLE_PROMPTS = [
  'Analisis pendapatan di sebulan terakhir ini',
  'Analisis member yang berisiko churn bulan ini',
  'Rekomendasi strategi retensi untuk sesi pagi',
  'Tren VA settlement 30 hari terakhir',
];

export default function VisualAnalyticsTab({ analytics, revenueInsights, tenantId, sessionId: externalSessionId, onSessionCreated }: VisualAnalyticsTabProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(externalSessionId ?? null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Picking a session from the sidebar's AI history panel (or clearing it for a new chat)
  // reloads this component's state to match — full message history for an existing session,
  // a blank slate for null.
  useEffect(() => {
    if (externalSessionId === sessionId) return;
    setSessionId(externalSessionId ?? null);
    setMessages([]);
    setSendError(null);

    if (!externalSessionId) return;
    setHistoryLoading(true);
    fetch(`/api/merchant/${tenantId}/analytics-sessions/${externalSessionId}/messages`)
      .then(res => {
        if (!res.ok) throw new Error('Gagal memuat riwayat sesi.');
        return res.json();
      })
      .then(data => {
        const loaded: Message[] = (data.messages || []).map((m: any) => ({
          role: m.role,
          content: m.content,
        }));
        setMessages(loaded);
      })
      .catch(err => setSendError(err?.message || 'Gagal memuat riwayat sesi.'))
      .finally(() => setHistoryLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalSessionId, tenantId]);

  const handleReset = () => {
    setMessages([]);
    setInput('');
    setSessionId(null);
    setSendError(null);
  };

  const handleSend = async (text?: string) => {
    const query = text ?? input;
    if (!query.trim() || isLoading) return;

    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setInput('');
    setIsLoading(true);
    setSendError(null);

    try {
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        const sessionRes = await fetch(`/api/merchant/${tenantId}/analytics-sessions`, { method: 'POST' });
        if (!sessionRes.ok) throw new Error('Gagal membuat sesi analisis.');
        const sessionData = await sessionRes.json();
        activeSessionId = sessionData.session?.id;
        if (!activeSessionId) throw new Error('Sesi analisis tidak valid.');
        setSessionId(activeSessionId);
        if (sessionData.session) onSessionCreated?.(sessionData.session);
      }

      const res = await fetch(`/api/merchant/${tenantId}/analytics-sessions/${activeSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) throw new Error('AI analytics engine gagal merespons.');
      const data = await res.json();
      const reportMarkdown: string = data.assistant_message?.content || 'Tidak ada respons dari AI.';
      setMessages(prev => [...prev, { role: 'assistant', content: reportMarkdown, engineSource: data.engine_source }]);
      if (data.session_title) {
        onSessionCreated?.({ id: activeSessionId, tenant_id: tenantId, title: data.session_title, created_at: '', updated_at: new Date().toISOString() });
      }
    } catch (err: any) {
      setSendError(err?.message || 'Gagal menghubungi AI analytics engine.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-[#212121] rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
        <div>
          <h2 className="text-sm font-bold text-white">AI Financial & Retention Analyst</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Tanyakan pendapatan VA BNI, tren churn, atau rekomendasi retensi — dijawab berdasarkan data transaksi asli merchant ini.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white text-xs transition-colors cursor-pointer border border-white/10 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Sesi Baru</span>
          </button>
        )}
      </div>

      {/* Message log */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        {historyLoading && (
          <div className="flex-1 flex items-center justify-center text-neutral-500 text-xs">
            Memuat riwayat sesi...
          </div>
        )}

        {!historyLoading && messages.length === 0 && (
          <div className="max-w-lg mx-auto mt-6">
            <p className="text-xs text-neutral-500 mb-2">Contoh pertanyaan:</p>
            <div className="flex flex-col gap-2">
              {SAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="text-left px-3 py-2 rounded-lg bg-[#171717] hover:bg-[#2a2a2a] border border-white/10 text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="space-y-4 max-w-2xl mx-auto w-full">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-xs whitespace-pre-wrap leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-white text-black font-medium'
                      : 'bg-[#171717] border border-white/10 text-neutral-200'
                  }`}
                >
                  {msg.content}
                  {msg.role === 'assistant' && msg.engineSource && (
                    <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-neutral-500">
                      Engine: {msg.engineSource}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#171717] border border-white/10 rounded-xl px-4 py-3 text-xs text-neutral-500">
                  Menganalisis data transaksi...
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input form */}
      <div className="shrink-0 p-4 border-t border-white/10">
        {sendError && (
          <p className="text-xs text-rose-400 mb-2 max-w-2xl mx-auto">{sendError}</p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="max-w-2xl mx-auto flex items-center gap-2"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ketik pertanyaan analisis..."
            disabled={isLoading}
            className="flex-1 bg-[#171717] border border-white/10 focus:border-white/30 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder:text-neutral-500 outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-lg bg-white text-black hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
