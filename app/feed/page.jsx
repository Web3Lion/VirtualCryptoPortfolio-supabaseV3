'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { applyTheme, getTheme } from '@/lib/theme';

const EMOJIS = ['🚀', '🔥', '💎', '👀', '📉', '🤝'];

const ACTION_STYLE = {
  BUY:   { bg: 'rgba(0,229,160,.15)',   color: 'var(--up)',   border: 'rgba(0,229,160,.3)',   label: 'BUY'   },
  SELL:  { bg: 'rgba(244,63,94,.12)',   color: 'var(--down)', border: 'rgba(244,63,94,.3)',   label: 'SELL'  },
  SHORT: { bg: 'rgba(251,146,60,.12)',  color: '#fb923c',     border: 'rgba(251,146,60,.3)',  label: 'SHORT' },
  COVER: { bg: 'rgba(99,102,241,.12)', color: '#818cf8',     border: 'rgba(99,102,241,.3)', label: 'COVER' },
};

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60)  return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

function fmtVal(v) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

function TradeCard({ item, onReact }) {
  const [expanded, setExpanded] = useState(false);
  const [localReactions, setLocalReactions] = useState(item.reactions || {});
  const [mine, setMine] = useState(item.reactions?.__mine || null);
  const st = ACTION_STYLE[item.action] || ACTION_STYLE.BUY;
  const hasReasoning = item.reasoning && item.reasoning.trim().length > 0;
  const cleanReasoning = hasReasoning ? item.reasoning.replace(/^\[EVENT:[^\]]+\]\s*/,'') : '';

  async function handleReact(emoji) {
    const prev = mine;
    const optimistic = { ...localReactions };
    if (prev) { optimistic[prev] = Math.max(0, (optimistic[prev] || 1) - 1); if (!optimistic[prev]) delete optimistic[prev]; delete optimistic.__mine; }
    if (emoji !== prev) { optimistic[emoji] = (optimistic[emoji] || 0) + 1; optimistic.__mine = emoji; }
    setLocalReactions(optimistic);
    setMine(emoji === prev ? null : emoji);
    await onReact(item.id, emoji);
  }

  return (
    <div style={{
      background: item.isMine ? 'rgba(0,229,160,.04)' : 'var(--surface)',
      border: `1px solid ${item.isMine ? 'rgba(0,229,160,.2)' : 'var(--border)'}`,
      borderRadius: 14, padding: '14px 16px', marginBottom: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: st.bg, border: `1px solid ${st.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 10, color: st.color, flexShrink: 0 }}>
          {st.label}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ color: item.isMine ? 'var(--accent)' : 'var(--text)' }}>{item.isMine ? 'You' : item.name}</span>
            <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12 }}>{item.actionLabel}</span>
            <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, color: st.color }}>{item.coin}</span>
            {item.value > 0 && <span style={{ color: 'var(--muted)', fontSize: 11 }}>· {fmtVal(item.value)}</span>}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{timeAgo(item.ts)}</div>
        </div>
      </div>

      {/* Reasoning */}
      {hasReasoning && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', lineHeight: 1.5, cursor: cleanReasoning.length > 120 ? 'pointer' : 'default' }}
            onClick={() => cleanReasoning.length > 120 && setExpanded(e => !e)}>
            {expanded || cleanReasoning.length <= 120 ? cleanReasoning : `${cleanReasoning.slice(0, 120)}…`}
            {cleanReasoning.length > 120 && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>{expanded ? ' less' : ' more'}</span>}
          </div>
        </div>
      )}

      {/* Reactions */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {EMOJIS.map(e => {
          const count = localReactions[e] || 0;
          const active = mine === e;
          return (
            <button key={e} onClick={() => handleReact(e)} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 20,
              border: `1px solid ${active ? 'rgba(0,229,160,.4)' : 'var(--border)'}`,
              background: active ? 'rgba(0,229,160,.12)' : 'transparent',
              cursor: 'pointer', fontSize: 14, lineHeight: 1, transition: 'all .15s',
            }}>
              <span>{e}</span>
              {count > 0 && <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: active ? 'var(--accent)' : 'var(--muted)', fontWeight: 600 }}>{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BadgeCard({ item }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 14, padding: '12px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(245,158,11,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🏅</div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600 }}>{item.name} earned a badge</div>
        <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 1 }}>{item.badgeName}</div>
      </div>
      <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--muted)' }}>{timeAgo(item.ts)}</div>
    </div>
  );
}

function ChallengeCard({ item }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid rgba(99,102,241,.2)', borderRadius: 14, padding: '12px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(99,102,241,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🎯</div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600 }}>{item.name} completed the daily challenge</div>
        <div style={{ fontSize: 11, color: '#818cf8', marginTop: 1 }}>+{item.tokens} tokens</div>
      </div>
      <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--muted)' }}>{timeAgo(item.ts)}</div>
    </div>
  );
}

export default function FeedPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => { applyTheme(getTheme()); }, []);
  useEffect(() => { if (status === 'unauthenticated') router.replace('/'); }, [status, router]);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/feed');
      if (res.ok) {
        const d = await res.json();
        setItems(d.items || []);
        setLastUpdated(new Date());
      }
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [status, load]);

  async function handleReact(tradeId, emoji) {
    await fetch('/api/feed/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tradeId, emoji }),
    });
  }

  if (status === 'loading' || loading) {
    return (
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
        <Nav active="feed" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4,5].map(i => <div key={i} style={{ height: 96, borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
      <Nav active="feed" />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22 }}>Class Feed</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            {lastUpdated ? `Updated ${timeAgo(lastUpdated.toISOString())}` : ''}
          </div>
        </div>
        <button onClick={load} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, fontFamily: "'DM Mono',monospace" }}>
          ↻ Refresh
        </button>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--muted)', fontSize: 13 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          No activity yet — make a trade to get things started!
        </div>
      ) : (
        items.map((item, i) => {
          if (item.type === 'trade')     return <TradeCard     key={item.id || i} item={item} onReact={handleReact} />;
          if (item.type === 'badge')     return <BadgeCard     key={`b-${i}`}     item={item} />;
          if (item.type === 'challenge') return <ChallengeCard key={`c-${i}`}     item={item} />;
          return null;
        })
      )}
    </main>
  );
}
