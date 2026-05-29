'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const fmtUSD = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = n => (n || 0).toLocaleString('en-US');

// ─── SVG Speedometer Gauge ───────────────────────────────────────────────────
function Gauge({ value = 0, max = 100, label = '', unit = '', size = 230, inverse = false, zones }) {
  const cx = size / 2, cy = size / 2;
  const r  = (size / 2) * 0.70;
  const trackW = size * 0.06;
  const valW   = size * 0.048;

  const clampedPct = Math.min(1, Math.max(0, (value || 0) / Math.max(max, 0.001)));
  const colorPct   = inverse ? 1 - clampedPct : clampedPct;
  const color = colorPct < 0.35 ? '#22c55e' : colorPct < 0.68 ? '#f59e0b' : '#ef4444';

  const toRad = d => d * Math.PI / 180;
  const pt = (deg, rad = r) => ({
    x: cx + rad * Math.cos(toRad(deg)),
    y: cy + rad * Math.sin(toRad(deg)),
  });

  const START = 135, TOTAL = 270;

  const arc = (startDeg, sweepDeg, rad = r) => {
    if (sweepDeg < 0.5) return '';
    const s = pt(startDeg, rad), e = pt(startDeg + sweepDeg, rad);
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${rad} ${rad} 0 ${sweepDeg > 180 ? 1 : 0} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  };

  const valSweep  = TOTAL * clampedPct;
  const needleDeg = START + valSweep;
  const tip  = pt(needleDeg, r * 0.76);
  const base1 = pt(needleDeg + 90, size * 0.026);
  const base2 = pt(needleDeg - 90, size * 0.026);
  const TICKS = 10;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      {/* Bezel ring */}
      <circle cx={cx} cy={cy} r={r + trackW / 2 + 5} fill="none" stroke="#1a1f2e" strokeWidth={3} />
      <circle cx={cx} cy={cy} r={r + trackW / 2 + 7} fill="none" stroke="#0d1117" strokeWidth={1} />

      {/* Zone coloring (subtle) */}
      <path d={arc(START, TOTAL * 0.35)} fill="none" stroke="#0d2010" strokeWidth={trackW - 1} />
      <path d={arc(START + TOTAL * 0.35, TOTAL * 0.33)} fill="none" stroke="#201800" strokeWidth={trackW - 1} />
      <path d={arc(START + TOTAL * 0.68, TOTAL * 0.32)} fill="none" stroke="#200808" strokeWidth={trackW - 1} />

      {/* Track */}
      <path d={arc(START, TOTAL)} fill="none" stroke="#111827" strokeWidth={trackW} />

      {/* Value arc */}
      {clampedPct > 0.01 && (
        <path d={arc(START, valSweep)} fill="none" stroke={color} strokeWidth={valW}
          style={{ filter: `drop-shadow(0 0 8px ${color}88)` }} />
      )}

      {/* Tick marks */}
      {Array.from({ length: TICKS + 1 }, (_, i) => {
        const deg   = START + TOTAL * (i / TICKS);
        const major = i % 2 === 0;
        const len   = major ? 9 : 5;
        const outer = pt(deg, r - trackW / 2 + 2);
        const inner = pt(deg, r - trackW / 2 - len);
        return (
          <line key={i}
            x1={outer.x.toFixed(1)} y1={outer.y.toFixed(1)}
            x2={inner.x.toFixed(1)} y2={inner.y.toFixed(1)}
            stroke={major ? '#374151' : '#1f2937'} strokeWidth={major ? 1.5 : 1}
          />
        );
      })}

      {/* Min / max labels */}
      {[0, max].map((v, i) => {
        const p = pt(i === 0 ? START : START + TOTAL, r + trackW + 4);
        return <text key={i} x={p.x.toFixed(1)} y={(p.y + 4).toFixed(1)}
          textAnchor="middle" fill="#374151" fontSize={size * 0.048}
          fontFamily="'DM Mono',monospace">{v}</text>;
      })}

      {/* Needle */}
      <polygon
        points={`${tip.x.toFixed(1)},${tip.y.toFixed(1)} ${base1.x.toFixed(1)},${base1.y.toFixed(1)} ${base2.x.toFixed(1)},${base2.y.toFixed(1)}`}
        fill={color} style={{ filter: `drop-shadow(0 0 5px ${color}cc)` }}
      />

      {/* Center cap */}
      <circle cx={cx} cy={cy} r={size * 0.065} fill="#080c14" stroke="#1f2937" strokeWidth={2.5} />
      <circle cx={cx} cy={cy} r={size * 0.022} fill={color}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }} />

      {/* Digital value */}
      <text x={cx} y={cy + size * 0.21} textAnchor="middle" fill={color}
        fontSize={size * 0.13} fontWeight="700" fontFamily="'DM Mono',monospace"
        style={{ letterSpacing: '-0.04em' }}>
        {Math.round(value || 0)}
      </text>
      {unit && (
        <text x={cx} y={cy + size * 0.315} textAnchor="middle" fill="#4b5563"
          fontSize={size * 0.058} fontFamily="'DM Mono',monospace">
          {unit}
        </text>
      )}

      {/* Label */}
      <text x={cx} y={size - 6} textAnchor="middle" fill="#374151"
        fontSize={size * 0.053} fontFamily="'DM Mono',monospace"
        style={{ letterSpacing: '0.18em' }}>
        {label.toUpperCase()}
      </text>
    </svg>
  );
}

// ─── Warning / Feature Light ─────────────────────────────────────────────────
function Light({ label, on, color = '#22c55e', sublabel = '', blink = false }) {
  const offColor = '#1a1f2e';
  const c = on ? color : offColor;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 80 }}>
      <div style={{
        width: 14, height: 14, borderRadius: '50%',
        background: c,
        boxShadow: on ? `0 0 10px ${color}, 0 0 20px ${color}55` : 'none',
        border: `1px solid ${on ? color : '#252b3b'}`,
        animation: blink && on ? 'blink 1.2s ease-in-out infinite' : 'none',
      }} />
      <span style={{ fontSize: 9, color: on ? '#e2e8f0' : '#374151', letterSpacing: '0.12em', textAlign: 'center', lineHeight: 1.3, fontFamily: "'DM Mono',monospace", textTransform: 'uppercase' }}>
        {label}
      </span>
      {sublabel && (
        <span style={{ fontSize: 8, color: on ? color : '#1f2937', letterSpacing: '0.08em', textAlign: 'center', marginTop: -4, fontFamily: "'DM Mono',monospace" }}>
          {sublabel}
        </span>
      )}
    </div>
  );
}

// ─── LCD-style stat cell ─────────────────────────────────────────────────────
function LcdCell({ label, value, sub, accent = '#00e5a0', large = false }) {
  return (
    <div style={{
      background: '#070a10',
      border: '1px solid #1a1f2e',
      borderRadius: 10,
      padding: '12px 16px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 9, color: '#374151', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: "'DM Mono',monospace", marginBottom: 6 }}>{label}</div>
      <div style={{
        fontSize: large ? 26 : 20,
        fontWeight: 700,
        color: accent,
        fontFamily: "'DM Mono',monospace",
        letterSpacing: '-0.03em',
        lineHeight: 1,
        textShadow: `0 0 12px ${accent}66`,
      }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: '#4b5563', marginTop: 4, fontFamily: "'DM Mono',monospace" }}>{sub}</div>}
    </div>
  );
}

// ─── Horizontal bar meter ────────────────────────────────────────────────────
function BarMeter({ label, value, max, color = '#00e5a0', formatVal }) {
  const pct = Math.min(1, Math.max(0, value / Math.max(max, 1)));
  const c = pct < 0.5 ? color : pct < 0.8 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 9, color: '#4b5563', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: "'DM Mono',monospace" }}>{label}</span>
        <span style={{ fontSize: 10, color: c, fontFamily: "'DM Mono',monospace", fontWeight: 600 }}>{formatVal ? formatVal(value) : value} <span style={{ color: '#374151', fontSize: 8 }}>/ {formatVal ? formatVal(max) : max}</span></span>
      </div>
      <div style={{ height: 5, background: '#111827', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct * 100}%`, background: c, borderRadius: 3, boxShadow: `0 0 6px ${c}88`, transition: 'width 1s ease' }} />
      </div>
    </div>
  );
}

// ─── Odometer digit ─────────────────────────────────────────────────────────
function Odometer({ value, label, digits = 7 }) {
  const padded = String(Math.max(0, Math.floor(value))).padStart(digits, '0');
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', gap: 2, background: '#040608', border: '1px solid #1a1f2e', borderRadius: 8, padding: '6px 10px', marginBottom: 4 }}>
        {padded.split('').map((d, i) => (
          <div key={i} style={{
            width: 22, height: 32, background: '#080c14',
            border: '1px solid #1a1f2e', borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: i < padded.length - 4 ? '#374151' : '#f59e0b',
            fontSize: 18, fontWeight: 700, fontFamily: "'DM Mono',monospace",
            textShadow: i >= padded.length - 4 ? '0 0 8px #f59e0b88' : 'none',
          }}>{d}</div>
        ))}
      </div>
      <div style={{ fontSize: 8, color: '#374151', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: "'DM Mono',monospace" }}>{label}</div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function TeacherCockpit() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [tick, setTick] = useState(0);
  const [selectedClass, setSelectedClass] = useState(null);
  const [badgeData, setBadgeData] = useState(null);

  useEffect(() => { if (status === 'unauthenticated') router.replace('/'); }, [status, router]);

  const fetchData = useCallback(async (classId) => {
    try {
      const url = classId ? `/api/teacher/cockpit?classId=${classId}` : '/api/teacher/cockpit';
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        setData(d);
        setApiError(null);
        if (!selectedClass) setSelectedClass(d.classId);
        setLastRefresh(new Date());
      } else {
        const body = await res.json().catch(() => ({}));
        setApiError(body.error || `HTTP ${res.status}`);
      }
    } catch(e) { setApiError(e.message); }
    finally { setLoading(false); }
  }, [selectedClass]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData(selectedClass);
      const iv = setInterval(() => fetchData(selectedClass), 30000);
      return () => clearInterval(iv);
    }
  }, [status, selectedClass]);

  useEffect(() => {
    if (!selectedClass) return;
    fetch(`/api/teacher/badges?classId=${selectedClass}`)
      .then(r => r.json()).then(d => setBadgeData(d)).catch(() => {});
  }, [selectedClass]);

  // Blinking clock tick
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  if (status === 'loading' || status === 'unauthenticated' || loading) {
    return (
      <div style={{ background: '#05070d', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: '0.2em' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 12, animation: 'spin 2s linear infinite', display: 'inline-block' }}>◎</div>
          <div>INITIALIZING SYSTEMS...</div>
        </div>
      </div>
    );
  }

  if (!data) return (
    <div style={{ background: '#05070d', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: '0.15em', textAlign: 'center' }}>
      <div style={{ maxWidth: 500, padding: 24 }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>⚠</div>
        <div style={{ marginBottom: 12 }}>COCKPIT DATA UNAVAILABLE</div>
        {apiError && (
          <div style={{ fontSize: 11, color: '#f59e0b', background: '#1a1200', border: '1px solid #f59e0b44', borderRadius: 8, padding: '10px 16px', marginBottom: 16, letterSpacing: 0, textAlign: 'left', wordBreak: 'break-word' }}>
            {apiError}
          </div>
        )}
        <div style={{ fontSize: 10, color: '#374151', marginBottom: 20 }}>Make sure TEACHER_EMAIL in your Vercel env vars exactly matches your Google login email</div>
        <button onClick={() => { setLoading(true); fetchData(selectedClass); }} style={{ padding: '8px 20px', background: 'transparent', border: '1px solid #374151', color: '#94a3b8', borderRadius: 8, cursor: 'pointer', fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: '0.1em' }}>
          ↻ RETRY
        </button>
      </div>
    </div>
  );

  const { features, trades, students, portfolio, api, orders, classes } = data;
  const isHealthy  = api.cacheAgeMinutes < 35;
  const apiUsagePct = api.callsThisMonth / api.callsLimit;
  const cacheStatus = api.cacheAgeMinutes < 5 ? 'LIVE' : api.cacheAgeMinutes < 35 ? 'OK' : 'STALE';
  const simState = features.paused ? 'PAUSED' : features.frozen ? 'FROZEN' : 'RUNNING';
  const simColor = features.paused ? '#f59e0b' : features.frozen ? '#ef4444' : '#22c55e';
  const nowStr = lastRefresh ? lastRefresh.toLocaleTimeString('en-US', { hour12: false }) : '--:--:--';
  const colonVisible = tick % 2 === 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@400;500;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#05070d;color:#e2e8f0;font-family:'DM Mono',monospace}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulseGlow{0%,100%{opacity:1}50%{opacity:.6}}
        @keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
        .cockpit{max-width:1280px;margin:0 auto;padding:20px 16px}
        .gauge-wrap{background:radial-gradient(ellipse at center, #0e1220 0%, #080c14 70%);border:1px solid #1a1f2e;border-radius:20px;padding:16px;display:flex;flex-direction:column;align-items:center;position:relative}
        .gauge-wrap::before{content:'';position:absolute;inset:0;border-radius:20px;background:radial-gradient(ellipse at 50% 0%, rgba(255,255,255,.03) 0%, transparent 60%);pointer-events:none}
        .center-console{background:linear-gradient(180deg,#0a0d16 0%,#070a12 100%);border:1px solid #1a1f2e;border-radius:20px;padding:20px;display:flex;flex-direction:column;gap:12px}
        .warning-strip{background:#070a10;border:1px solid #1a1f2e;border-radius:16px;padding:18px 24px;display:flex;flex-wrap:wrap;gap:20px;justify-content:center;align-items:flex-start}
        .odo-bar{background:#040608;border:1px solid #1a1f2e;border-radius:14px;padding:16px 24px;display:flex;flex-wrap:wrap;gap:24px;justify-content:space-around;align-items:center}
        .section-label{font-size:9px;color:#374151;letter-spacing:.25em;text-transform:uppercase;text-align:center;margin-bottom:10px}
        .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
        .divider{height:1px;background:linear-gradient(90deg,transparent,#1a1f2e,transparent);margin:4px 0}
        select.class-select{background:#0a0d16;border:1px solid #1a1f2e;color:#94a3b8;padding:5px 10px;border-radius:8px;font-family:'DM Mono',monospace;font-size:11px;outline:none;cursor:pointer}
        select.class-select:focus{border-color:#374151}
      `}</style>

      {/* Scanline overlay (subtle) */}
      <div style={{ position: 'fixed', inset: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.03) 2px, rgba(0,0,0,.03) 4px)', pointerEvents: 'none', zIndex: 0 }} />

      <div className="cockpit" style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Header bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#070a10', border: '1px solid #1a1f2e', borderRadius: 16, padding: '12px 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: '0.08em', color: '#f59e0b', textShadow: '0 0 20px #f59e0b66' }}>
              ◈ CRYPTOCLASS COCKPIT
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: simColor, boxShadow: `0 0 8px ${simColor}`, animation: 'pulseGlow 2s infinite' }} />
              <span style={{ fontSize: 10, color: simColor, letterSpacing: '0.15em' }}>{simState}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {classes.length > 1 && (
              <select className="class-select" value={selectedClass || ''} onChange={e => { setSelectedClass(e.target.value); fetchData(e.target.value); }}>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <div style={{ fontSize: 11, color: '#374151', fontFamily: "'DM Mono',monospace", letterSpacing: '0.08em' }}>
              {nowStr.replace(/:/g, (m, i) => i === 2 && !colonVisible ? ' ' : m)}
            </div>
            <div style={{ fontSize: 10, color: '#374151', background: '#0d1117', border: '1px solid #1a1f2e', borderRadius: 6, padding: '3px 10px', letterSpacing: '0.1em' }}>
              CACHE&nbsp;<span style={{ color: cacheStatus === 'LIVE' ? '#22c55e' : cacheStatus === 'OK' ? '#f59e0b' : '#ef4444' }}>{cacheStatus}</span>
            </div>
            <Link href="/teacher" style={{ fontSize: 10, color: '#4b5563', textDecoration: 'none', letterSpacing: '0.1em', border: '1px solid #1a1f2e', borderRadius: 6, padding: '4px 10px' }}>
              ← CONTROLS
            </Link>
          </div>
        </div>

        {/* ── Instrument cluster ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 240px', gap: 14, marginBottom: 14, alignItems: 'start' }}>

          {/* Left gauge — Trading Activity */}
          <div className="gauge-wrap">
            <div className="section-label">ACTIVITY METER</div>
            <Gauge
              value={trades.today}
              max={Math.max(50, Math.ceil(trades.today / 10) * 10)}
              label="Trades / Day"
              unit="trades"
              size={220}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 6, width: '100%' }}>
              <LcdCell label="Today" value={trades.today} accent="#f59e0b" />
              <LcdCell label="This Month" value={fmtNum(trades.month)} accent="#f59e0b" />
            </div>
          </div>

          {/* Center console */}
          <div className="center-console">
            <div className="section-label">CLASS PORTFOLIO</div>
            <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
              <div style={{ fontSize: 9, color: '#374151', letterSpacing: '0.2em', marginBottom: 6, fontFamily: "'DM Mono',monospace" }}>TOTAL PORTFOLIO VALUE</div>
              <div style={{ fontSize: 42, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: '#f59e0b', letterSpacing: '-0.04em', lineHeight: 1, textShadow: '0 0 30px #f59e0b44' }}>
                {fmtUSD(portfolio.totalValue)}
              </div>
              <div style={{ fontSize: 11, color: '#374151', marginTop: 6, fontFamily: "'DM Mono',monospace" }}>
                {fmtUSD(portfolio.totalCash)} cash · {fmtUSD(portfolio.totalHoldings)} holdings
              </div>
            </div>

            <div className="divider" />

            <div className="grid-3">
              <LcdCell label="Students" value={students.total} accent="#60a5fa" />
              <LcdCell label="Active Today" value={students.activeToday} accent="#22c55e" sub={`${Math.round(students.activeToday / Math.max(students.total, 1) * 100)}% of class`} />
              <LcdCell label="Coins Listed" value={portfolio.coinCount} accent="#a78bfa" />
            </div>

            <div className="divider" />

            <div className="grid-2">
              <LcdCell label="API Calls / Mo" value={fmtNum(api.callsThisMonth)} accent={apiUsagePct > 0.8 ? '#ef4444' : '#f59e0b'} sub={`of ${fmtNum(api.callsLimit)} limit`} />
              <LcdCell label="Pending Orders" value={orders.pending} accent={orders.pending > 0 ? '#00e5a0' : '#374151'} />
            </div>

            <div className="divider" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <BarMeter label="API Usage" value={api.callsThisMonth} max={api.callsLimit} color="#f59e0b" formatVal={fmtNum} />
              <BarMeter label="Student Activity" value={students.activeToday} max={students.total} color="#22c55e" />
              <BarMeter label="Price Cache Freshness" value={Math.max(0, 60 - api.cacheAgeMinutes)} max={60} color="#60a5fa" formatVal={v => `${v}min`} />
            </div>

            <div className="divider" />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 9, color: '#374151', letterSpacing: '0.15em', fontFamily: "'DM Mono',monospace" }}>
                CRON RUNS THIS MONTH
              </div>
              <div style={{ fontSize: 12, color: '#4b5563', fontFamily: "'DM Mono',monospace", fontWeight: 600 }}>
                {fmtNum(api.cronRunsMonth)} <span style={{ fontSize: 9, color: '#374151' }}>× price refresh</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 9, color: '#374151', letterSpacing: '0.15em', fontFamily: "'DM Mono',monospace" }}>
                LAST CACHE UPDATE
              </div>
              <div style={{ fontSize: 12, color: api.cacheAgeMinutes < 5 ? '#22c55e' : api.cacheAgeMinutes < 35 ? '#f59e0b' : '#ef4444', fontFamily: "'DM Mono',monospace", fontWeight: 600 }}>
                {api.cacheAgeMinutes < 2 ? 'JUST NOW' : `${api.cacheAgeMinutes} MIN AGO`}
                {api.stalestSymbol && <span style={{ fontSize: 9, color: '#374151', marginLeft: 6 }}>({api.stalestSymbol})</span>}
              </div>
            </div>
          </div>

          {/* Right gauge — System Health */}
          <div className="gauge-wrap">
            <div className="section-label">HEALTH MONITOR</div>
            <Gauge
              value={api.cacheAgeMinutes}
              max={60}
              label="Cache Age"
              unit="minutes"
              size={220}
              inverse={true}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 6, width: '100%' }}>
              <LcdCell label="Snapshots Today" value={trades.snapshotsToday} accent="#60a5fa" />
              <LcdCell label="Prices Cached" value={api.cachedSymbols} accent="#60a5fa" />
            </div>
          </div>
        </div>

        {/* ── Warning lights ── */}
        <div style={{ marginBottom: 14 }}>
          <div className="section-label">SYSTEM STATUS</div>
          <div className="warning-strip">

            {/* Market state */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: 8, color: '#374151', letterSpacing: '0.15em', marginBottom: 4, fontFamily: "'DM Mono',monospace" }}>MARKET</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <Light label="Open" on={!features.frozen && !features.paused} color="#22c55e" />
                <Light label="Frozen" on={features.frozen} color="#ef4444" sublabel={features.freezeReason ? features.freezeReason.slice(0, 12) : ''} blink={true} />
                <Light label="Paused" on={features.paused} color="#f59e0b" blink={true} />
              </div>
            </div>

            <div style={{ width: 1, background: '#1a1f2e', alignSelf: 'stretch' }} />

            {/* Market events */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: 8, color: '#374151', letterSpacing: '0.15em', marginBottom: 4, fontFamily: "'DM Mono',monospace" }}>EVENTS</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <Light label="Bull Run" on={features.bullRunActive} color="#f59e0b" sublabel={features.bullRunActive ? `${features.bullRunMult}×` : ''} blink={features.bullRunActive} />
                <Light label="Flash Sale" on={features.flashSaleActive} color="#fb923c" sublabel={features.flashSaleActive ? features.flashSaleCoin : ''} blink={features.flashSaleActive} />
              </div>
            </div>

            <div style={{ width: 1, background: '#1a1f2e', alignSelf: 'stretch' }} />

            {/* Trading features */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: 8, color: '#374151', letterSpacing: '0.15em', marginBottom: 4, fontFamily: "'DM Mono',monospace" }}>FEATURES</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <Light label="Leverage" on={features.marginEnabled} color="#60a5fa" sublabel={features.marginEnabled ? `up to ${features.marginMult}×` : 'off'} />
                <Light label="Shorting" on={features.shortEnabled} color="#a78bfa" sublabel={features.shortEnabled ? 'enabled' : 'off'} />
                <Light label="Limit Orders" on={orders.pending > 0} color="#00e5a0" sublabel={orders.pending > 0 ? `${orders.pending} pending` : 'none'} />
              </div>
            </div>

            <div style={{ width: 1, background: '#1a1f2e', alignSelf: 'stretch' }} />

            {/* Restrictions */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: 8, color: '#374151', letterSpacing: '0.15em', marginBottom: 4, fontFamily: "'DM Mono',monospace" }}>RESTRICTIONS</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <Light label="Trade Hours" on={features.tradingHoursOn} color="#f59e0b" sublabel={features.tradingHoursOn ? `${features.tradingHoursStart}–${features.tradingHoursEnd}` : 'off'} />
                <Light label="Daily Limit" on={features.dailyLimitOn} color="#f59e0b" sublabel={features.dailyLimitOn ? `${features.dailyLimitN}/day` : 'off'} />
              </div>
            </div>

            <div style={{ width: 1, background: '#1a1f2e', alignSelf: 'stretch' }} />

            {/* Health indicator */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: 8, color: '#374151', letterSpacing: '0.15em', marginBottom: 4, fontFamily: "'DM Mono',monospace" }}>HEALTH</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <Light label="Price Feed" on={isHealthy} color="#22c55e" sublabel={isHealthy ? 'nominal' : 'stale!'} />
                <Light label="Cron Active" on={api.cronRunsMonth > 0} color="#22c55e" sublabel={`${api.cronRunsMonth} runs`} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Odometer bar ── */}
        <div className="odo-bar">
          <Odometer value={trades.total} label="ODO — ALL TIME TRADES" digits={7} />
          <div style={{ width: 1, background: '#1a1f2e', alignSelf: 'stretch', minHeight: 50 }} />
          <Odometer value={trades.today} label="TRIP — TODAY" digits={4} />
          <div style={{ width: 1, background: '#1a1f2e', alignSelf: 'stretch', minHeight: 50 }} />
          <Odometer value={trades.month} label="MONTH" digits={5} />
          <div style={{ width: 1, background: '#1a1f2e', alignSelf: 'stretch', minHeight: 50 }} />

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#374151', letterSpacing: '0.2em', fontFamily: "'DM Mono',monospace", marginBottom: 6 }}>SIMULATION GEAR</div>
            <div style={{
              width: 54, height: 54, borderRadius: '50%',
              background: `radial-gradient(circle, ${simColor}22, #070a10)`,
              border: `2px solid ${simColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 800, fontFamily: "'Syne',sans-serif",
              color: simColor,
              boxShadow: `0 0 16px ${simColor}44`,
              margin: '0 auto',
            }}>
              {features.paused ? 'P' : features.frozen ? 'F' : 'D'}
            </div>
            <div style={{ fontSize: 8, color: simColor, letterSpacing: '0.15em', marginTop: 6, fontFamily: "'DM Mono',monospace" }}>
              {simState}
            </div>
          </div>

          <div style={{ width: 1, background: '#1a1f2e', alignSelf: 'stretch', minHeight: 50 }} />

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#374151', letterSpacing: '0.15em', fontFamily: "'DM Mono',monospace", marginBottom: 8 }}>AUTO-REFRESH</div>
            <div style={{ fontSize: 11, color: '#4b5563', fontFamily: "'DM Mono',monospace" }}>30s interval</div>
            <div style={{ fontSize: 10, color: '#374151', fontFamily: "'DM Mono',monospace", marginTop: 2 }}>
              Last: {lastRefresh ? lastRefresh.toLocaleTimeString('en-US', { hour12: false }) : '--'}
            </div>
            <button onClick={() => fetchData(selectedClass)} style={{
              marginTop: 8, padding: '4px 12px', borderRadius: 6,
              background: 'transparent', border: '1px solid #1a1f2e',
              color: '#4b5563', fontSize: 9, cursor: 'pointer',
              fontFamily: "'DM Mono',monospace", letterSpacing: '0.1em',
            }}>↻ REFRESH</button>
          </div>
        </div>

        {/* ── Student Badge Board ── */}
        {badgeData?.students?.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div className="section-label">STUDENT BADGE BOARD</div>
            <div style={{ background: '#0a0f1a', border: '1px solid #1a1f2e', borderRadius: 16, padding: 16, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'DM Mono',monospace" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', fontSize: 9, color: '#374151', letterSpacing: '0.2em', padding: '6px 12px', borderBottom: '1px solid #1a1f2e' }}>STUDENT</th>
                    <th style={{ textAlign: 'center', fontSize: 9, color: '#374151', letterSpacing: '0.2em', padding: '6px 12px', borderBottom: '1px solid #1a1f2e' }}>TOTAL</th>
                    <th style={{ textAlign: 'left', fontSize: 9, color: '#374151', letterSpacing: '0.2em', padding: '6px 12px', borderBottom: '1px solid #1a1f2e' }}>BADGES EARNED</th>
                  </tr>
                </thead>
                <tbody>
                  {[...badgeData.students].sort((a, b) => b.badges.length - a.badges.length).map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #111827' }}>
                      <td style={{ padding: '8px 12px', fontSize: 11, color: '#e2e8f0', whiteSpace: 'nowrap' }}>{s.name}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: s.badges.length > 0 ? '#00e5a0' : '#374151' }}>{s.badges.length}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {s.badges.length === 0
                            ? <span style={{ fontSize: 10, color: '#374151' }}>No badges yet</span>
                            : s.badges.map(b => (
                              <span key={b.badge_id} title={b.badge_id} style={{ fontSize: 14, lineHeight: 1 }}>
                                {{'first_trade':'🥇','active_trader':'⚡','power_trader':'🔥','whale':'🐳','doubled_up':'💰','triple_threat':'🎰','first_profit':'🌱','ten_pct':'🚀','diamond_hands':'💎','to_the_moon':'🌕','portfolio_x2':'🔱','crash_survivor':'🌊','diversified':'🌈','sharpshooter':'🎯','sniper':'🏹','hodler':'🧘','stop_loss_pro':'✂️','bought_dip':'📉','sector_pro':'🗂️','sector_specialist':'🏆','analyst':'📝','researcher':'📖','due_diligence':'🔍','first_watch':'👀','serious_watch':'🎯','veteran_watch':'🔭','bull_rider':'🐂','flash_deal':'⚡','news_trader':'📰','bot_copycat':'🤖','patient_investor':'💤','eager_investor':'📅','fomo_investor':'😰','champion':'🏆','beat_the_bot':'🤖','most_improved':'📊','comeback_kid':'🔄','fee_conscious':'💸','signal_found':'📡','data_chef':'🍳','market_pulse':'💓','price_oracle':'🔮','omniscient':'🌐','first_lesson':'📚','lesson_five':'📖','lesson_fifteen':'🎓','perfect_score':'💯','quiz_ace':'🌟','speed_learner':'💨','study_streak':'🧠','module_master':'🗺️','module_trio':'🎖️','crypto_professor':'🎩','order_placed':'📋','order_sniper':'🎯','limit_master':'📊','order_hit':'✅','triple_trigger':'🔱','short_seller':'📉','patient_limit':'⏳','stacked_orders':'🃏','cut_bait':'✂️','crush_rookie':'🎮','crush_500':'💫','crush_1000':'🌊','crush_3000':'👑','crush_veteran':'🕹️','crush_daily_max':'⭐','crush_grinder':'🎰'}[b.badge_id] || '🏅'}
                              </span>
                            ))
                          }
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 9, color: '#1f2937', letterSpacing: '0.2em', fontFamily: "'DM Mono',monospace" }}>
          CRYPTOCLASS COMMAND CENTER · v2 · {lastRefresh?.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
        </div>
      </div>
    </>
  );
}
