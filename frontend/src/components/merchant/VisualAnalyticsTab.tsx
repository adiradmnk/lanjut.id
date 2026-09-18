'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Sparkles, RotateCcw, ArrowRight } from 'lucide-react';
import ThinkingState from '@/components/ui/thinking';

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
  lines?: string[];
}

const SAMPLE_PROMPTS = [
  'analisis pendapatan di sebulan terakhir ini',
  'analisis member yang berisiko churn bulan ini',
  'rekomendasi strategi retensi untuk sesi pagi',
  'tren VA settlement 30 hari terakhir',
];

export default function VisualAnalyticsTab({ analytics, revenueInsights, tenantId, sessionId: externalSessionId, onSessionCreated }: VisualAnalyticsTabProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<'idle' | 'thinking' | 'streaming'>('idle');
  const [thinkingKey, setThinkingKey] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(externalSessionId ?? null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, phase]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Picking a session from the sidebar's AI history panel (or clearing it for a new chat)
  // reloads this component's state to match — full message history for an existing session,
  // a blank slate for null.
  useEffect(() => {
    if (externalSessionId === sessionId) return;
    setSessionId(externalSessionId ?? null);
    setMessages([]);
    setPhase('idle');
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
          lines: m.role === 'assistant' ? m.content.split('\n') : undefined,
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
    setPhase('idle');
    setSessionId(null);
    setSendError(null);
  };

  // Streams the AI's markdown report line-by-line into the chat, matching the original
  // scripted-demo's pacing but fed by a real backend response instead of canned text.
  const streamLines = (lines: string[]) => {
    setPhase('streaming');
    const assistantMsg: Message = { role: 'assistant', content: '', lines: [] };
    setMessages(prev => [...prev, assistantMsg]);

    if (lines.length === 0) {
      setPhase('idle');
      return;
    }

    lines.forEach((line, i) => {
      setTimeout(() => {
        setMessages(prev => {
          const updated = [...prev];
          const last = { ...updated[updated.length - 1] };
          last.lines = [...(last.lines ?? []), line];
          updated[updated.length - 1] = last;
          return updated;
        });
        if (i === lines.length - 1) {
          setTimeout(() => setPhase('idle'), 200);
        }
      }, i * 160);
    });
  };

  const handleSend = async (text?: string) => {
    const query = text ?? input;
    if (!query.trim() || phase !== 'idle') return;

    const userMsg: Message = { role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setPhase('thinking');
    setThinkingKey(k => k + 1);
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
      streamLines(reportMarkdown.split('\n'));
      if (data.session_title) {
        onSessionCreated?.({ id: activeSessionId, tenant_id: tenantId, title: data.session_title, created_at: '', updated_at: new Date().toISOString() });
      }
    } catch (err: any) {
      setSendError(err?.message || 'Gagal menghubungi AI analytics engine.');
      setPhase('idle');
    }
  };

  const renderLine = (line: string, i: number) => {
    if (line === '') return <div key={i} className="h-2" />;
    const isBold = line.startsWith('📊') || line.startsWith('⚠️') || line.startsWith('💡') ||
      line.startsWith('📋') || line.startsWith('📈') || line.startsWith('💳') ||
      line.startsWith('📦') || line.startsWith('🔍') || line.startsWith('🎯');
    const isSub = line.startsWith('•') || /^\d\./.test(line) || line.startsWith('   →');
    const isConclusion = line.startsWith('**');

    const renderBold = (text: string) => {
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, pi) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={pi} className="text-white font-semibold">{part.slice(2, -2)}</strong>
          : part
      );
    };

    return (
      <div
        key={i}
        className={`leading-relaxed ${
          isBold ? 'text-white font-bold text-[13.5px] mt-1' :
          isSub ? 'text-neutral-300 text-[13px] ml-2' :
          isConclusion ? 'text-[#24B1B1] text-[13px] font-medium' :
          'text-neutral-400 text-[13px]'
        }`}
        style={{ animation: 'thinking-fade-up 180ms ease-out both' }}
      >
        {renderBold(line)}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-[#171717] rounded-2xl border border-white/10 overflow-hidden shadow-2xl animate-in fade-in duration-200">
      {/* Top Header ala Claude Code / Terminal Window */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 bg-[#1a1a1a]/80 backdrop-blur shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]/80 border border-[#e0443e]/50" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]/80 border border-[#dea123]/50" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f]/80 border border-[#1aab29]/50" />
          <div className="h-4 w-px bg-white/10 mx-1.5" />
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-[#24B1B1]" />
            <span className="text-xs font-mono font-medium text-neutral-300 tracking-wide">
              lanjut-ai-analyst · v2.4 (Claude Engine)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white text-xs font-mono transition-colors cursor-pointer border border-white/5"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Bersihkan Chat</span>
            </button>
          )}
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            ● Ready
          </span>
        </div>
      </div>

      {/* Main Canvas / Chat Logs */}
      <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-8 flex flex-col font-mono">
        {historyLoading && (
          <div className="flex-1 flex items-center justify-center text-neutral-500 text-xs">
            Memuat riwayat sesi...
          </div>
        )}
        {/* Empty State: Centered Claude-style Prompt suggestions */}
        {!historyLoading && messages.length === 0 && phase === 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 max-w-xl mx-auto my-auto text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#007979]/40 to-[#24B1B1]/20 border border-[#24B1B1]/40 flex items-center justify-center shadow-lg shadow-[#007979]/20">
                <Sparkles className="w-7 h-7 text-[#24B1B1]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">AI Financial & Retention Analyst</h2>
                <p className="text-xs text-neutral-400 mt-1 max-w-md leading-relaxed">
                  Asisten analitik data cerdas. Ajukan pertanyaan seputar pendapatan VA BNI, tren churn, hingga rekomendasi okupansi kelas.
                </p>
              </div>
            </div>

            {/* Quick Sample Prompts */}
            <div className="w-full space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-500 mb-2">
                Contoh Pertanyaan Cepat:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="flex items-center justify-between p-3 text-left rounded-xl bg-white/3 hover:bg-white/6 border border-white/8 hover:border-white/15 text-xs text-neutral-300 hover:text-white transition-all cursor-pointer group"
                  >
                    <span className="truncate mr-2 font-mono">"{prompt}"</span>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-[#24B1B1] shrink-0 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message Stream */}
        {messages.length > 0 && (
          <div className="space-y-6 max-w-3xl mx-auto w-full">
            {messages.map((msg, idx) => (
              <div key={idx} className="space-y-2">
                {msg.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="bg-[#007979]/20 border border-[#007979]/40 rounded-2xl rounded-tr-sm px-4 py-3 text-[13px] text-neutral-100 max-w-lg shadow-sm">
                      <span className="text-neutral-400 text-xs mr-2 font-mono">&gt;</span>
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3.5 items-start">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#007979] to-[#005f5f] flex items-center justify-center shrink-0 shadow-md">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 bg-[#1e1e1e] border border-white/8 rounded-2xl rounded-tl-sm p-5 space-y-1 shadow-lg">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                        <span className="text-[11px] font-mono text-[#24B1B1] font-semibold uppercase tracking-wider">
                          AI Analyst Report
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono">Real-time Stream</span>
                      </div>
                      <div className="space-y-0.5">
                        {(msg.lines ?? []).map((line, li) => renderLine(line, li))}
                        {idx === messages.length - 1 && phase === 'streaming' && (
                          <span className="inline-block w-1.5 h-4 bg-[#24B1B1] ml-1 align-middle animate-pulse" />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Thinking State */}
            {phase === 'thinking' && (
              <div className="flex gap-3.5 items-start" style={{ animation: 'thinking-fade-up 300ms ease-out both' }}>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#007979] to-[#005f5f] flex items-center justify-center shrink-0 shadow-md">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 bg-[#1e1e1e] border border-white/8 rounded-2xl rounded-tl-sm p-4 max-w-md shadow-lg">
                  <ThinkingState key={thinkingKey} variant="Reasoning" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Bottom Input Area ala Claude Code */}
      <div className="shrink-0 p-5 sm:px-12 border-t border-white/8 bg-[#171717]/95 backdrop-blur">
        <div className="max-w-3xl mx-auto">
          {sendError && (
            <p className="text-xs text-red-400 mb-2 font-mono">{sendError}</p>
          )}
          <div className="flex items-center gap-3 bg-[#212121] border border-white/12 focus-within:border-[#24B1B1] rounded-2xl px-4 py-3.5 transition-all shadow-xl">
            <span className="text-neutral-500 font-mono text-sm pl-1">&gt;</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ketik perintah atau pertanyaan analisis (misal: analisis pendapatan di sebulan terakhir ini)..."
              disabled={phase !== 'idle'}
              className="flex-1 bg-transparent text-[13.5px] text-neutral-100 placeholder:text-neutral-600 outline-none font-mono disabled:opacity-50"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || phase !== 'idle'}
              className="px-3.5 py-2 rounded-xl flex items-center gap-1.5 bg-[#007979] hover:bg-[#005f5f] disabled:bg-white/5 disabled:text-neutral-600 text-white text-xs font-mono font-medium transition-all cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              <span>Kirim</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono mt-2.5 px-2">
            <span>Tekan <kbd className="bg-white/10 px-1 py-0.5 rounded text-neutral-400">Enter</kbd> untuk menganalisis</span>
            <span className="text-neutral-600">Model: Gemini 2.0 Flash × BNI Direct Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
