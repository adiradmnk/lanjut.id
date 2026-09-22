'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

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

export default function VisualAnalyticsTab({ analytics, revenueInsights, tenantId, sessionId: externalSessionId, onSessionCreated }: VisualAnalyticsTabProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(externalSessionId ?? null);
  const [sendError, setSendError] = useState<string | null>(null);
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
      .catch(err => setSendError(err?.message || 'Gagal memuat riwayat sesi.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalSessionId, tenantId]);

  const handleSend = async () => {
    const query = input;
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

  const inputForm = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSend();
      }}
      className="flex items-center gap-2 w-full"
    >
      <input
        autoFocus
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ketik pertanyaan analisis..."
        disabled={isLoading}
        className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-500 outline-none disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!input.trim() || isLoading}
        className="p-2 rounded-full text-white disabled:text-neutral-600 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
      >
        <Send className="w-4 h-4" />
      </button>
    </form>
  );

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)] px-4">
        <div className="w-full max-w-xl">
          {inputForm}
          {sendError && <p className="text-xs text-rose-400 mt-2">{sendError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-4 max-w-2xl mx-auto w-full">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] text-sm whitespace-pre-wrap leading-relaxed ${msg.role === 'user' ? 'text-white font-medium' : 'text-neutral-200'}`}>
                {msg.content}
                {msg.role === 'assistant' && msg.engineSource && (
                  <div className="mt-1.5 text-[10px] text-neutral-500">{msg.engineSource}</div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="text-sm text-neutral-500">Menganalisis data transaksi...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="shrink-0 px-4 pb-4">
        <div className="max-w-2xl mx-auto w-full">
          {inputForm}
          {sendError && <p className="text-xs text-rose-400 mt-2">{sendError}</p>}
        </div>
      </div>
    </div>
  );
}
