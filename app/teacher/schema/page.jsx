"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { applyTheme, getTheme } from "@/lib/theme";

const TABLE_GROUPS = [
  { label: 'Core',         tables: ['students','classes','class_students','portfolios','holdings','trades','snapshots'] },
  { label: 'Market',       tables: ['price_cache','class_coins','config','watchlist'] },
  { label: 'Social',       tables: ['invitations','badges','news_articles','pushed_articles'] },
  { label: 'Rewards',      tables: ['class_reward_config','class_reward_ledger'] },
  { label: 'Limit Orders', tables: ['pending_orders'] },
  { label: 'Staking',      tables: ['staking_positions','staking_config'] },
  { label: 'DCA',          tables: ['dca_orders'] },
  { label: 'Options',      tables: ['options_positions'] },
  { label: 'Tournaments',  tables: ['tournaments','tournament_snapshots'] },
  { label: 'Learning',     tables: ['learn_modules','learn_lessons','learn_blocks','learn_questions','learn_options','learn_attempts'] },
];

export default function SchemaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => { applyTheme(getTheme()); }, []);
  useEffect(() => { if (status === 'unauthenticated') router.replace('/'); }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/admin/schema')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [status]);

  const copy = () => {
    if (!data?.sql) return;
    navigator.clipboard?.writeText(data.sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const tableStatus = data?.status || {};
  const missing = Object.entries(tableStatus).filter(([, ok]) => !ok).map(([t]) => t);
  const allReady = missing.length === 0;

  if (status === 'loading' || status === 'unauthenticated') return (
    <div style={{ background: '#080c14', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>Loading…</div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#080c14;color:#e2e8f0;font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:900px;margin:0 auto;padding:28px 16px}
        .card{background:#0f172a;border:1px solid #1e293b;border-radius:16px;padding:22px;margin-bottom:16px}
        .btn{padding:10px 20px;border-radius:10px;border:none;font-family:'DM Mono',monospace;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s}
        .btn-green{background:rgba(0,229,160,.15);color:#00e5a0;border:1px solid rgba(0,229,160,.3)}
        .btn-accent{background:#00e5a0;color:#000}
        .pill{display:inline-flex;align-items:center;gap:5px;font-size:10px;padding:3px 9px;border-radius:20px;font-weight:600;letter-spacing:.5px}
        .pill.ok{background:rgba(0,229,160,.12);color:#00e5a0}
        .pill.missing{background:rgba(244,63,94,.12);color:#f43f5e}
        pre{background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:18px;font-size:11px;color:#00e5a0;overflow-x:auto;white-space:pre-wrap;word-break:break-all;max-height:480px;overflow-y:auto}
        .group-label{font-size:9px;color:#475569;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px}
        .table-grid{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px}
      `}</style>
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => router.push('/teacher')} style={{ background: 'none', border: '1px solid #1e293b', borderRadius: 8, padding: '6px 12px', color: '#475569', cursor: 'pointer', fontSize: 12 }}>← Back</button>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, letterSpacing: -1 }}>
            🗄️ <span style={{ color: '#00e5a0' }}>Database Schema</span>
          </div>
        </div>

        {/* Status summary */}
        <div className="card" style={{ borderColor: allReady ? 'rgba(0,229,160,.3)' : 'rgba(244,63,94,.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                {loading ? 'Checking tables…' : allReady ? '✅ All tables present' : `⚠ ${missing.length} table${missing.length !== 1 ? 's' : ''} missing`}
              </div>
              <div style={{ fontSize: 11, color: '#475569' }}>
                {allReady ? 'Your database is fully set up.' : 'Copy the SQL below and run it in your Supabase SQL Editor.'}
              </div>
            </div>
            {!loading && (
              <button className="btn" style={{ background: copied ? 'rgba(0,229,160,.2)' : '#00e5a0', color: '#000', fontWeight: 700 }} onClick={copy}>
                {copied ? '✓ Copied!' : '📋 Copy Full Schema SQL'}
              </button>
            )}
          </div>

          {/* Per-group table status */}
          {TABLE_GROUPS.map(g => (
            <div key={g.label} style={{ marginBottom: 12 }}>
              <div className="group-label">{g.label}</div>
              <div className="table-grid">
                {g.tables.map(t => (
                  <span key={t} className={`pill ${tableStatus[t] ? 'ok' : 'missing'}`}>
                    {tableStatus[t] ? '✓' : '✕'} {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Instructions */}
        {!allReady && !loading && (
          <div className="card" style={{ borderColor: 'rgba(245,158,11,.3)', background: 'rgba(245,158,11,.04)' }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, color: '#f59e0b', marginBottom: 10 }}>How to set up</div>
            <ol style={{ fontSize: 12, color: '#94a3b8', lineHeight: 2, paddingLeft: 18 }}>
              <li>Click <strong style={{ color: '#e2e8f0' }}>Copy Full Schema SQL</strong> above</li>
              <li>Go to your <strong style={{ color: '#e2e8f0' }}>Supabase dashboard → SQL Editor</strong></li>
              <li>Paste and click <strong style={{ color: '#e2e8f0' }}>Run</strong></li>
              <li>Come back here and refresh — all pills should turn green</li>
            </ol>
          </div>
        )}

        {/* SQL preview */}
        {data?.sql && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13 }}>schema.sql</div>
              <button className="btn btn-green" onClick={copy} style={{ padding: '6px 14px', fontSize: 11 }}>
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
            <pre>{data.sql}</pre>
          </div>
        )}
      </div>
    </>
  );
}
