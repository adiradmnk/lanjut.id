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

// Parses one Server-Sent Events frame ("event: x\ndata: {...}\n\n") into its parts.
function parseSSEFrame(frame: string): { event: string; data: any } | null {
  let event = 'message';
  let dataLine = '';
  for (const line of frame.split('\n')) {
    if (line.startsWith('event: ')) event = line.slice('event: '.length);
    else if (line.startsWith('data: ')) dataLine = line.slice('data: '.length);
  }
  if (!dataLine) return null;
  try {
    return { event, data: JSON.parse(dataLine) };
  } catch {
    return null;
  }
}

export default function VisualAnalyticsTab({ analytics, revenueInsights, tenantId, sessionId: externalSessionId, onSessionCreated }: VisualAnalyticsTabProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // The real backend step currently in flight (set from actual "status" events the server
  // sends as it does each step — never a scripted/fake sequence).
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(externalSessionId ?? null);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, statusLabel]);

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
    setStatusLabel('Mengirim pertanyaan...');

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
      if (!res.ok || !res.body) throw new Error('AI analytics engine gagal merespons.');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantStarted = false;
      let engineSource: string | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sepIdx;
        while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, sepIdx);
          buffer = buffer.slice(sepIdx + 2);
          const parsed = parseSSEFrame(frame);
          if (!parsed) continue;

          if (parsed.event === 'status') {
            setStatusLabel(parsed.data.label || null);
          } else if (parsed.event === 'chunk') {
            setStatusLabel(null);
            if (!assistantStarted) {
              assistantStarted = true;
              setMessages(prev => [...prev, { role: 'assistant', content: parsed.data.text || '' }]);
            } else {
              setMessages(prev => {
                const updated = [...prev];
                const last = { ...updated[updated.length - 1] };
                last.content += parsed.data.text || '';
                updated[updated.length - 1] = last;
                return updated;
              });
            }
          } else if (parsed.event === 'done') {
            engineSource = parsed.data.engine_source;
            if (parsed.data.session_title) {
              onSessionCreated?.({ id: activeSessionId!, tenant_id: tenantId, title: parsed.data.session_title, created_at: '', updated_at: new Date().toISOString() });
            }
          } else if (parsed.event === 'error') {
            throw new Error(parsed.data.message || 'AI analytics engine gagal merespons.');
          }
        }
      }

      if (engineSource) {
        setMessages(prev => {
          const updated = [...prev];
          const last = { ...updated[updated.length - 1] };
          last.engineSource = engineSource;
          updated[updated.length - 1] = last;
          return updated;
        });
      }
    } catch (err: any) {
      setSendError(err?.message || 'Gagal menghubungi AI analytics engine.');
    } finally {
      setIsLoading(false);
      setStatusLabel(null);
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
          {isLoading && statusLabel && (
            <div className="flex justify-start">
              <div className="text-sm text-neutral-500 animate-pulse">{statusLabel}</div>
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
