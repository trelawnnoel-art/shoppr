'use client';

import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import type { Message } from '@/data/types';
import { useFetch } from '@/lib/useFetch';

/** Minimal customer<->Scout chat thread for one Mission. Polls aren't
 * wired up (no real-time infra yet — see README roadmap) — refetches
 * after the customer sends a message, which is enough for a prototype
 * where the "scout" side isn't a live second client anyway. */
export function MissionChat({ missionId }: { missionId: string }) {
  const [refetchKey, setRefetchKey] = useState(0);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messages = useFetch<Message[]>(`/api/missions/${missionId}/messages?r=${refetchKey}`);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Without this, a new message lands below the fold of the scrollable
  // thread and silently looks like sending did nothing — confirmed by
  // testing: the POST succeeded but the UI never showed it until manually
  // scrolled down.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.data]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || isSending) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/missions/${missionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        setDraft('');
        setRefetchKey((k) => k + 1);
      }
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div ref={scrollRef} className="flex max-h-48 flex-col gap-2 overflow-y-auto">
        {messages.isLoading && <p className="text-xs text-muted">Loading messages…</p>}
        {messages.error && <p className="text-xs text-muted">Couldn&rsquo;t load messages.</p>}
        {messages.data?.length === 0 && (
          <p className="text-xs text-muted">No messages yet — say hi!</p>
        )}
        {messages.data?.map((m) => (
          <div
            key={m.id}
            className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
              m.sender === 'customer'
                ? 'ml-auto bg-ink text-paper'
                : 'bg-surface text-ink-soft border border-line'
            }`}
          >
            {m.body}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          placeholder="Message your Scout…"
          className="flex-1 rounded-pill border border-line bg-paper px-3 py-2 text-xs text-ink placeholder:text-muted focus:border-accent-blue focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!draft.trim() || isSending}
          aria-label="Send message"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-paper disabled:opacity-40"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
