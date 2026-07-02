"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import CoinLogo from "@/components/CoinLogo";
import { applyTheme, getTheme } from "@/lib/theme";

const fmtUSD = n => { const x=parseFloat(n); return isNaN(x)?'$0.00':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(x); };
const fmtPct = n => { const x=parseFloat(n); return isNaN(x)?'0.00%':(x>=0?'+':'')+x.toFixed(2)+'%'; };
const clean  = s => parseFloat(String(s||'').replace(/[$,%]/g,''))||0;

// ── Color palette for students ────────────────────────────────
const STUDENT_COLORS = ['#00e5a0','#3b82f6','#f59e0b','#f43f5e','#8b5cf6','#06b6d4','#10b981','#f97316'];
const SECTOR_COLORS  = {
  'Layer 1':'#3b82f6','Layer 2':'#8b5cf6','DeFi':'#06b6d4','AI / Data':'#00e5a0',
  'Gaming/NFT':'#f59e0b','Memecoin':'#f43f5e','Stablecoin':'var(--muted)','Exchange':'#f97316',
  'Cash':'#334155','Other':'#475569',
};
const COIN_COLORS = {
  BTC:'#f7931a',ETH:'#627eea',SOL:'#9945ff',XRP:'#00aae4',ADA:'#0033ad',
  DOGE:'#c2a633',AVAX:'#e84142',LINK:'#2a5ada',DOT:'#e6007a',MATIC:'#8247e5',
  BNB:'#f3ba2f',SHIB:'#ff0000',DEFAULT:'#475569',
};
const getCoinColor = c => COIN_COLORS[c?.toUpperCase()] || COIN_COLORS.DEFAULT;

// ── Line Chart (Portfolio Values Over Time) ───────────────────
function LineChart({ data, studentNames }) {
  const canvasRef = useRef(null);
  const BTC_COLOR = '#f59e0b';
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data?.length || !studentNames?.length) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.offsetWidth || 800;
    const H = 280;
    canvas.width = W; canvas.height = H;
    ctx.clearRect(0, 0, W, H);

    const PAD = { t: 20, b: 40, l: 70, r: 20 };
    const iW = W - PAD.l - PAD.r;
    const iH = H - PAD.t - PAD.b;
    const hasBenchmark = data.some(d => d['BTC Benchmark']);
    const allNames = hasBenchmark ? [...studentNames, 'BTC Benchmark'] : studentNames;

    const allVals = [];
    data.forEach(d => allNames.forEach(n => { if (d[n]) allVals.push(d[n]); }));
    if (!allVals.length) return;
    const minV = Math.min(...allVals) * 0.995;
    const maxV = Math.max(...allVals) * 1.005;
    const range = maxV - minV || 1;

    const xS = i => PAD.l + (i / (data.length - 1)) * iW;
    const yS = v => PAD.t + iH - ((v - minV) / range) * iH;

    ctx.strokeStyle = 'rgba(30,41,59,.6)';
    ctx.lineWidth = 1;
    [0, 0.25, 0.5, 0.75, 1].forEach(t => {
      const y = PAD.t + t * iH;
      ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(W - PAD.r, y); ctx.stroke();
      const val = maxV - t * range;
      ctx.fillStyle = '#475569'; ctx.font = '10px monospace'; ctx.textAlign = 'right';
      ctx.fillText('$' + Math.round(val).toLocaleString(), PAD.l - 6, y + 4);
    });

    const step = Math.max(1, Math.floor(data.length / 8));
    data.forEach((d, i) => {
      if (i % step !== 0) return;
      ctx.fillStyle = '#475569'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
      ctx.fillText(d.date, xS(i), H - 8);
    });

    // Student lines
    studentNames.forEach((name, si) => {
      const color = STUDENT_COLORS[si % STUDENT_COLORS.length];
      const points = data.map((d, i) => d[name] ? { x: xS(i), y: yS(d[name]) } : null).filter(Boolean);
      if (points.length < 2) return;
      const grad = ctx.createLinearGradient(0, PAD.t, 0, H - PAD.b);
      grad.addColorStop(0, color + '30'); grad.addColorStop(1, color + '00');
      ctx.beginPath();
      points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length-1].x, H - PAD.b);
      ctx.lineTo(points[0].x, H - PAD.b);
      ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
      ctx.beginPath();
      points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.setLineDash([]); ctx.stroke();
    });

    // BTC benchmark dashed line
    if (hasBenchmark) {
      const points = data.map((d, i) => d['BTC Benchmark'] ? { x: xS(i), y: yS(d['BTC Benchmark']) } : null).filter(Boolean);
      if (points.length >= 2) {
        ctx.beginPath();
        points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = BTC_COLOR; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = BTC_COLOR; ctx.font = '9px monospace'; ctx.textAlign = 'left';
        ctx.fillText('₿ BTC', points[points.length-1].x + 4, points[points.length-1].y + 3);
      }
    }

    const y10k = yS(10000);
    if (y10k > PAD.t && y10k < H - PAD.b) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD.l, y10k); ctx.lineTo(W - PAD.r, y10k); ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [data, studentNames]);

  if (!data?.length) return (
    <div style={{height:280,display:'flex',alignItems:'center',justifyContent:'center',color:'#475569',fontSize:12,flexDirection:'column',gap:8}}>
      <span>No history data yet</span>
      <span style={{fontSize:10}}>Students need to make at least 2 trades, or the teacher can click "Save Portfolio Snapshot" in Controls</span>
    </div>
  );

  return <canvas ref={canvasRef} style={{width:'100%',height:280,display:'block'}}/>;
}

// ── Donut / Pie Chart ─────────────────────────────────────────
function DonutChart({ slices, size = 200, innerText = '', innerSub = '' }) {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (!total) return <div style={{height:size,display:'flex',alignItems:'center',justifyContent:'center',color:'#475569',fontSize:12}}>No data</div>;

  const cx = size / 2, cy = size / 2;
  const R = size * 0.38, inn = size * 0.24;
  let cum = -Math.PI / 2;
  const paths = slices.map((sl, i) => {
    const sw = (sl.value / total) * 2 * Math.PI;
    if (sw < 0.01) { cum += sw; return null; }
    const x1 = cx + R * Math.cos(cum), y1 = cy + R * Math.sin(cum);
    const x2 = cx + R * Math.cos(cum + sw), y2 = cy + R * Math.sin(cum + sw);
    const xi1 = cx + inn * Math.cos(cum + sw), yi1 = cy + inn * Math.sin(cum + sw);
    const xi2 = cx + inn * Math.cos(cum), yi2 = cy + inn * Math.sin(cum);
    const lg = sw > Math.PI ? 1 : 0;
    const d = `M${x1},${y1} A${R},${R} 0 ${lg},1 ${x2},${y2} L${xi1},${yi1} A${inn},${inn} 0 ${lg},0 ${xi2},${yi2} Z`;
    cum += sw;
    return <path key={i} d={d} fill={sl.color} opacity={0.9} style={{transition:'opacity .2s'}}
      onMouseEnter={e=>e.target.setAttribute('opacity','1')}
      onMouseLeave={e=>e.target.setAttribute('opacity','0.9')}/>;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{overflow:'visible'}}>
      {paths}
      <circle cx={cx} cy={cy} r={inn - 2} fill="#0f172a"/>
      {innerText && <text x={cx} y={cy - 4} textAnchor="middle" fill="#e2e8f0" fontSize={size*0.072} fontFamily="'Syne',sans-serif" fontWeight="700">{innerText}</text>}
      {innerSub  && <text x={cx} y={cy + 14} textAnchor="middle" fill="#475569" fontSize={size*0.052}>{innerSub}</text>}
    </svg>
  );
}

// ── Legend ────────────────────────────────────────────────────
function Legend({ items, totalValue }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:6,flex:1,minWidth:0}}>
      {items.map((item, i) => {
        const pct = totalValue ? ((item.value / totalValue) * 100).toFixed(1) : 0;
        return (
          <div key={i} style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:10,height:10,borderRadius:3,background:item.color,flexShrink:0}}/>
            <div style={{flex:1,fontSize:11,color:'#e2e8f0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.label}</div>
            <div style={{fontSize:10,color:'#475569',flexShrink:0}}>{pct}%</div>
            <div style={{fontSize:10,color:'#475569',flexShrink:0,minWidth:60,textAlign:'right'}}>{fmtUSD(item.value)}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function Leaderboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [students, setStudents]     = useState([]);
  const [charts, setCharts]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab]   = useState('standings');
  const [chartRange, setChartRange]  = useState('1W');
  const [selectedStudent, setSelectedStudent] = useState(null); // { id, classId }
  const [studentProfile, setStudentProfile]   = useState(null);
  const [profileLoading, setProfileLoading]   = useState(false);
  const [filter, setFilter]                   = useState('');

  useEffect(() => { applyTheme(getTheme()); }, []);
  useEffect(()=>{ if(status==='unauthenticated') router.replace('/'); },[status,router]);

  const fetchAll = useCallback(async (range) => {
    try {
      const r = range || chartRange;
      const [lbRes, chartRes] = await Promise.all([
        fetch('/api/leaderboard'),
        fetch(`/api/leaderboard/charts?range=${r}`),
      ]);
      if (lbRes.ok)    { const lb=await lbRes.json(); setStudents(Array.isArray(lb)?lb:[]); setLoading(false); }
      if (chartRes.ok) { setCharts(await chartRes.json()); setChartsLoading(false); } else { setChartsLoading(false); }
      setLastUpdated(new Date());
    } catch(e) { console.error(e); setLoading(false); setChartsLoading(false); }
  }, []);

  useEffect(()=>{
    if(status==='authenticated'){
      // Silently refresh prices + take intraday snapshot on page load.
      // Server enforces a 30-min cooldown so this is safe to fire every visit.
      fetch('/api/snapshots/intraday', { method: 'POST' }).catch(() => {});
      fetchAll();
      const iv = setInterval(fetchAll, 60000);
      return () => clearInterval(iv);
    }
  },[status, fetchAll]);

  const openStudentProfile = useCallback(async (student) => {
    setSelectedStudent(student);
    setStudentProfile(null);
    setProfileLoading(true);
    try {
      const res = await fetch(`/api/leaderboard/student?studentId=${student.id}&classId=${charts?.classId || ''}`);
      if (res.ok) setStudentProfile(await res.json());
    } catch(e) { console.error(e); }
    finally { setProfileLoading(false); }
  }, [charts?.classId]);

  useEffect(()=>{
    if(status==='authenticated') fetchAll(chartRange);
  },[chartRange]);

  if(status==='loading'||status==='unauthenticated') return (
    <div style={{background:'var(--bg,#080c14)',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)'}}>Loading...</div>
  );

  const medals = ['🥇','🥈','🥉'];
  const humans = (Array.isArray(students)?students:[]).filter(s => !s.isBot);
  const filtered = filter ? humans.filter(s => s.name.toLowerCase().includes(filter.toLowerCase())) : humans;

  // Class-wide stats
  const classStats = (() => {
    if (!humans.length) return null;
    const avgReturn = humans.reduce((s, h) => s + h.returnPct, 0) / humans.length;
    const totalTrades = humans.reduce((s, h) => s + h.tradeCount, 0);
    const profitable = humans.filter(h => h.returnPct > 0).length;
    const topStudent = humans[0];
    const longestLoginStreak = Math.max(...humans.map(h => h.loginStreak || 0));
    return { avgReturn, totalTrades, profitable, topStudent, longestLoginStreak };
  })();

  // Prepare chart data
  const coinSlices   = (Array.isArray(charts?.coinAllocation)  ? charts.coinAllocation   : []).map(c => ({ label: c.coin,   value: c.value, color: getCoinColor(c.coin) }));
  const sectorSlices = (Array.isArray(charts?.sectorAllocation)? charts.sectorAllocation : []).map(s => ({ label: s.sector, value: s.value, color: SECTOR_COLORS[s.sector] || '#475569' }));
  const totalCoin    = coinSlices.reduce((s, c) => s + c.value, 0);
  const totalSector  = sectorSlices.reduce((s, c) => s + c.value, 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:1200px;margin:0 auto;padding:24px 16px}
        .page-title{font-family:'Syne',sans-serif;font-weight:800;font-size:32px;letter-spacing:-1px;margin-bottom:4px}
        .page-title span{color:var(--gold)}
        .tabs{display:flex;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:4px;margin-bottom:24px}
        .tab{flex:1;padding:10px;text-align:center;border-radius:10px;border:none;background:transparent;font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);cursor:pointer;transition:all .2s}
        .tab.active{background:var(--surface2);color:var(--accent);border:1px solid var(--border)}
        .card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:22px;margin-bottom:20px}
        .card-title{font-family:'Syne',sans-serif;font-weight:700;font-size:15px;margin-bottom:4px}
        .card-sub{font-size:11px;color:var(--muted);margin-bottom:18px}
        .charts-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
        .chart-inner{display:flex;align-items:center;gap:20px;flex-wrap:wrap}
        .podium{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px;align-items:end}
        .podium-card{background:var(--surface);border:1px solid var(--border);border-radius:20px 20px 0 0;padding:20px 16px 16px;text-align:center;position:relative;overflow:hidden}
        .podium-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px}
        .podium-card.first{border-color:rgba(245,158,11,.6);background:linear-gradient(170deg,rgba(245,158,11,.1) 0%,var(--surface) 50%)}
        .podium-card.first::before{background:linear-gradient(90deg,transparent,#f59e0b,transparent)}
        .podium-card.second{border-color:rgba(148,163,184,.4);background:linear-gradient(170deg,rgba(148,163,184,.06) 0%,var(--surface) 50%)}
        .podium-card.second::before{background:linear-gradient(90deg,transparent,#94a3b8,transparent)}
        .podium-card.third{border-color:rgba(180,100,40,.4);background:linear-gradient(170deg,rgba(180,100,40,.07) 0%,var(--surface) 50%)}
        .podium-card.third::before{background:linear-gradient(90deg,transparent,#b46428,transparent)}
        .podium-step{border-radius:0 0 12px 12px;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;font-size:22px;letter-spacing:-1px}
        .podium-step.first{height:72px;background:linear-gradient(180deg,rgba(245,158,11,.25),rgba(245,158,11,.1));border:1px solid rgba(245,158,11,.4);border-top:none;color:#f59e0b;box-shadow:0 8px 32px rgba(245,158,11,.2)}
        .podium-step.second{height:52px;background:linear-gradient(180deg,rgba(148,163,184,.15),rgba(148,163,184,.06));border:1px solid rgba(148,163,184,.3);border-top:none;color:#94a3b8;box-shadow:0 6px 20px rgba(148,163,184,.1)}
        .podium-step.third{height:36px;background:linear-gradient(180deg,rgba(180,100,40,.15),rgba(180,100,40,.06));border:1px solid rgba(180,100,40,.3);border-top:none;color:#b46428;box-shadow:0 4px 14px rgba(180,100,40,.1)}
        @keyframes crownFloat{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-4px) rotate(3deg)}}
        @keyframes goldPulse{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.4),0 8px 32px rgba(245,158,11,.2)}50%{box-shadow:0 0 0 6px rgba(245,158,11,.0),0 8px 32px rgba(245,158,11,.35)}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .lb-table{width:100%;border-collapse:collapse}
        .lb-table th{font-size:9px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;padding:10px 14px;text-align:left;border-bottom:1px solid var(--border)}
        .lb-row{border-bottom:1px solid rgba(30,41,59,.4);transition:background .15s}
        .lb-row:hover{background:rgba(0,229,160,.03)}
        .lb-row td{padding:13px 14px;font-size:12px}
        .legend-dot{width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:6px;flex-shrink:0}
        .bar-wrap{background:var(--surface2);border-radius:4px;height:6px;overflow:hidden;width:80px;margin-top:4px}
        .bar-fill{height:100%;border-radius:4px;transition:width .6s}
        .skeleton{background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:12px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @media(max-width:640px){.podium{grid-template-columns:1fr}.charts-grid{grid-template-columns:1fr}}
      `}</style>

      <div className="page">
        <Nav active="leaderboard" right={lastUpdated && <span style={{fontSize:10,color:'var(--muted)'}}>Updated {lastUpdated.toLocaleTimeString()}</span>} />

        <div className="page-title">🏆 <span>Leaderboard</span></div>
        <div style={{fontSize:11,color:'var(--muted)',marginBottom:20}}>Live standings — updates every 60 seconds</div>

        <div className="tabs">
          {[['standings','🏆 Standings'],['charts','📊 Charts']].map(([v,label])=>(
            <button key={v} className={`tab${activeTab===v?' active':''}`} onClick={()=>setActiveTab(v)}>{label}</button>
          ))}
        </div>

        {/* ── STANDINGS TAB ──────────────────────────────────── */}
        {activeTab === 'standings' && (
          loading ? (
            <><div className="skeleton" style={{height:180,marginBottom:20}}/><div className="skeleton" style={{height:400}}/></>
          ) : (
            <>
              {/* Class stats banner */}
              {classStats && (
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,marginBottom:20}}>
                  {[
                    ['Avg Return', classStats.avgReturn >= 0 ? `+${classStats.avgReturn.toFixed(1)}%` : `${classStats.avgReturn.toFixed(1)}%`, classStats.avgReturn >= 0 ? 'var(--up)' : 'var(--down)'],
                    ['Total Trades', classStats.totalTrades.toLocaleString(), 'var(--text)'],
                    ['In Profit', `${classStats.profitable} / ${humans.length}`, 'var(--accent)'],
                    ['Top Streak', classStats.longestLoginStreak > 0 ? `🔥 ${classStats.longestLoginStreak} days` : '—', '#fb923c'],
                  ].map(([label, val, color]) => (
                    <div key={label} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'12px 16px',textAlign:'center'}}>
                      <div style={{fontSize:10,color:'var(--muted)',letterSpacing:1,textTransform:'uppercase',marginBottom:6}}>{label}</div>
                      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color}}>{val}</div>
                    </div>
                  ))}
                </div>
              )}

              {humans.length >= 3 && (() => {
                const PODIUM_META = [
                  { rank: 2, accent: '#94a3b8', label: '2ND', cls: 'second' },
                  { rank: 1, accent: '#f59e0b', label: '1ST', cls: 'first'  },
                  { rank: 3, accent: '#b46428', label: '3RD', cls: 'third'  },
                ];
                return (
                  <div className="podium">
                    {PODIUM_META.map(({ rank, accent, label, cls }) => {
                      const s = humans[rank - 1]; if (!s) return <div key={rank} />;
                      const ret = clean(s.returnPct), isPos = ret >= 0;
                      const initials = s.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
                      const isFirst = rank === 1;
                      return (
                        <div key={rank} style={{ display: 'flex', flexDirection: 'column' }}>
                          <div className={`podium-card ${cls}`} style={isFirst ? { animation: 'goldPulse 2.5s ease-in-out infinite' } : {}}>
                            {/* Crown for 1st */}
                            {isFirst && (
                              <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 6, display: 'inline-block', animation: 'crownFloat 3s ease-in-out infinite' }}>👑</div>
                            )}
                            {/* Avatar ring */}
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, marginTop: isFirst ? 0 : 8 }}>
                              <div style={{
                                width: isFirst ? 68 : 56, height: isFirst ? 68 : 56, borderRadius: '50%',
                                background: `${accent}22`, border: `2.5px solid ${accent}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: "'Syne',sans-serif", fontWeight: 800,
                                fontSize: isFirst ? 24 : 20, color: accent,
                                boxShadow: `0 0 16px ${accent}44`,
                                flexShrink: 0,
                              }}>
                                {s.isBot ? '🤖' : initials}
                              </div>
                            </div>
                            {/* Name + title */}
                            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: isFirst ? 14 : 12, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.flair && <span style={{ marginRight: 4 }}>{s.flair}</span>}{s.name}
                            </div>
                            {s.activeTitle && (
                              <div style={{ fontSize: 9, color: '#a78bfa', background: 'rgba(167,139,250,.15)', border: '1px solid rgba(167,139,250,.3)', borderRadius: 10, padding: '2px 7px', display: 'inline-block', marginBottom: 4 }}>{s.activeTitle}</div>
                            )}
                            {/* Value */}
                            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: isFirst ? 20 : 16, color: isPos ? 'var(--up)' : 'var(--down)', marginBottom: 2 }}>
                              {fmtUSD(s.total)}
                            </div>
                            {/* Return */}
                            <div style={{ fontSize: 11, fontWeight: 700, color: isPos ? 'var(--up)' : 'var(--down)', marginBottom: 6 }}>
                              {fmtPct(ret)}
                            </div>
                            {/* Extras */}
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                              {s.streak >= 2 && (
                                <span style={{ fontSize: 9, fontWeight: 700, color: '#fb923c', background: 'rgba(251,146,60,.12)', border: '1px solid rgba(251,146,60,.25)', borderRadius: 6, padding: '2px 6px' }}>🔥{s.streak}</span>
                              )}
                              {s.loginStreak >= 3 && (
                                <span style={{ fontSize: 9, fontWeight: 700, color: '#60a5fa', background: 'rgba(96,165,250,.12)', border: '1px solid rgba(96,165,250,.25)', borderRadius: 6, padding: '2px 6px' }}>📅{s.loginStreak}</span>
                              )}
                              {s.coinCount > 0 && (
                                <span style={{ fontSize: 9, color: 'var(--muted)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px' }}>{s.coinCount} coins</span>
                              )}
                            </div>
                          </div>
                          {/* Pedestal step */}
                          <div className={`podium-step ${cls}`}>{label}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              {/* Search filter */}
              <div style={{marginBottom:12,display:'flex',alignItems:'center',gap:10}}>
                <input
                  value={filter} onChange={e=>setFilter(e.target.value)}
                  placeholder="🔍 Filter students…"
                  style={{padding:'8px 14px',borderRadius:10,border:'1px solid var(--border)',background:'var(--surface)',color:'var(--text)',fontFamily:"'DM Mono',monospace",fontSize:12,width:220,outline:'none'}}
                />
                {filter && <button onClick={()=>setFilter('')} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:13}}>✕</button>}
                <span style={{fontSize:11,color:'var(--muted)',marginLeft:'auto'}}>{filtered.length} student{filtered.length!==1?'s':''}</span>
              </div>

              <div className="card" style={{overflowX:'auto',padding:0}}>
                <table className="lb-table">
                  <thead>
                    <tr>
                      <th style={{padding:'14px 16px'}}>Rank</th>
                      <th>Student</th>
                      <th>Portfolio</th>
                      <th>Return</th>
                      <th>P/L</th>
                      <th title="Number of coins held">Coins</th>
                      <th title="Trading streak — consecutive days with a trade">Trade 🔥</th>
                      <th title="Login streak — consecutive days logged in">Login 📅</th>
                      <th title="Annualized Sharpe Ratio">Sharpe ⓘ</th>
                      <th title="Sortino Ratio — only penalizes downside volatility">Sortino ⓘ</th>
                      <th title="Max Drawdown — largest peak-to-trough decline">Max DD ⓘ</th>
                      <th title="Win Rate — % of closed positions that were profitable">Win% ⓘ</th>
                      <th>P/L Bar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s,i)=>{
                      const ret=clean(s.returnPct), pl=clean(s.pl), isPos=ret>=0;
                      const globalRank = humans.indexOf(s);
                      const color = STUDENT_COLORS[globalRank % STUDENT_COLORS.length];
                      return (
                        <tr className="lb-row" key={s.id} onClick={()=>openStudentProfile(s)} style={{cursor:'pointer'}} title={`View ${s.name}'s portfolio`}>
                          <td style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:'var(--muted)',width:40,paddingLeft:16}}>
                            {globalRank<3?medals[globalRank]:globalRank+1}
                            {s.rankChange != null && (
                              <div style={{fontSize:9,fontWeight:700,marginTop:2,color:s.rankChange>0?'#00e5a0':s.rankChange<0?'#f43f5e':'var(--border)'}}>
                                {s.rankChange>0?`↑${s.rankChange}`:s.rankChange<0?`↓${Math.abs(s.rankChange)}`:'—'}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap'}}>
                              <div style={{width:8,height:8,borderRadius:'50%',background:color,flexShrink:0}}/>
                              <div>
                                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,display:'flex',alignItems:'center',gap:5}}>
                                  {s.isBot?'🤖 ':''}{s.flair && <span>{s.flair}</span>}{s.name}
                                </div>
                                {s.activeTitle && (
                                  <span style={{fontSize:9,color:'#a78bfa',background:'rgba(167,139,250,.12)',border:'1px solid rgba(167,139,250,.25)',borderRadius:8,padding:'1px 6px'}}>{s.activeTitle}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={{fontFamily:"'Syne',sans-serif",fontWeight:700}}>
                            {fmtUSD(s.total)}
                            {s.stakingVal > 0 && <div style={{fontSize:9,color:'#60a5fa',fontWeight:600,marginTop:1}}>⛏ {fmtUSD(s.stakingVal)}</div>}
                          </td>
                          <td style={{color:isPos?'var(--up)':'var(--down)',fontWeight:500}}>{fmtPct(ret)}</td>
                          <td style={{color:isPos?'var(--up)':'var(--down)'}}>{isPos?'+':''}{fmtUSD(pl)}</td>
                          <td style={{color:'var(--muted)',textAlign:'center'}}>{s.coinCount||0}</td>
                          <td style={{textAlign:'center'}}>
                            {s.streak >= 2 ? <span style={{fontSize:11,fontWeight:700,color:'#fb923c'}}>🔥{s.streak}</span> : <span style={{color:'var(--border)',fontSize:11}}>—</span>}
                          </td>
                          <td style={{textAlign:'center'}}>
                            {(s.loginStreak||0) >= 2 ? <span style={{fontSize:11,fontWeight:700,color: s.loginStreakAtRisk ? '#fbbf24' : '#60a5fa'}}>📅{s.loginStreak}{s.loginStreakAtRisk?' ⚠':''}</span> : <span style={{color:'var(--border)',fontSize:11}}>—</span>}
                          </td>
                          <td style={{fontWeight:600,textAlign:'center',color:s.sharpeRatio==null?'var(--muted)':s.sharpeRatio>=1?'var(--up)':s.sharpeRatio>=0?'var(--text)':'var(--down)'}}>
                            {s.sharpeRatio!=null?s.sharpeRatio.toFixed(2):'—'}
                          </td>
                          <td style={{fontWeight:600,textAlign:'center',color:s.sortinoRatio==null?'var(--muted)':s.sortinoRatio>=1?'var(--up)':s.sortinoRatio>=0?'var(--text)':'var(--down)'}}>
                            {s.sortinoRatio!=null?s.sortinoRatio.toFixed(2):'—'}
                          </td>
                          <td style={{fontWeight:600,textAlign:'center',color:s.maxDrawdown==null?'var(--muted)':s.maxDrawdown>20?'var(--down)':s.maxDrawdown>10?'var(--text)':'var(--up)'}}>
                            {s.maxDrawdown!=null?`-${s.maxDrawdown.toFixed(1)}%`:'—'}
                          </td>
                          <td style={{fontWeight:600,textAlign:'center',color:s.winRate==null?'var(--muted)':s.winRate>=50?'var(--up)':'var(--down)'}}>
                            {s.winRate!=null?`${s.winRate.toFixed(1)}%`:'—'}
                          </td>
                          <td>
                            <div className="bar-wrap">
                              <div className="bar-fill" style={{width:`${Math.min(100,Math.abs(ret)*2)}%`,background:isPos?'var(--up)':'var(--down)'}}/>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )
        )}

        {/* ── CHARTS TAB ─────────────────────────────────────── */}
        {activeTab === 'charts' && (
          chartsLoading ? (
            <><div className="skeleton" style={{height:320,marginBottom:20}}/><div className="skeleton" style={{height:280}}/></>
          ) : (
            <>
              {/* Portfolio Value Over Time */}
              <div className="card">
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8,marginBottom:4}}>
                  <div className="card-title" style={{marginBottom:0}}>📈 Portfolio Value Over Time</div>
                  <div style={{display:'flex',gap:4}}>
                    {['1D','3D','1W','1M','3M','ALL'].map(r=>(
                      <button key={r} onClick={()=>setChartRange(r)} style={{
                        padding:'4px 10px',borderRadius:8,border:'1px solid var(--border)',
                        background:chartRange===r?'var(--accent)':'transparent',
                        color:chartRange===r?'#fff':'var(--muted)',
                        fontFamily:"'DM Mono',monospace",fontSize:11,cursor:'pointer',transition:'all .2s'
                      }}>{r}</button>
                    ))}
                  </div>
                </div>
                <div className="card-sub">{['1D','3D','1W'].includes(chartRange)?'Intraday snapshots':'Daily snapshots'} — all students</div>

                {/* Legend */}
                <div style={{display:'flex',gap:16,flexWrap:'wrap',marginBottom:8,alignItems:'center'}}>
                  {(charts?.studentNames || []).map((name, i) => (
                    <div key={name} style={{display:'flex',alignItems:'center',gap:6}}>
                      <div style={{width:24,height:3,borderRadius:2,background:STUDENT_COLORS[i%STUDENT_COLORS.length]}}/>
                      <span style={{fontSize:11,color:'var(--text)'}}>{name}</span>
                    </div>
                  ))}
                  {(charts?.portfolioHistory||[]).some(d=>d['BTC Benchmark']) && (
                    <div style={{display:'flex',alignItems:'center',gap:6,cursor:'help'}} title="BTC Benchmark: shows how the starting balance invested 100% in Bitcoin at the beginning of this period would have grown. If your line is above this, you're outperforming Bitcoin.">
                      <svg width="24" height="10" viewBox="0 0 24 10"><line x1="0" y1="5" x2="24" y2="5" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6,4"/></svg>
                      <span style={{fontSize:11,color:'#f59e0b'}}>₿ BTC Benchmark</span>
                      <span style={{fontSize:10,color:'#f59e0b',opacity:0.7}}>ⓘ</span>
                    </div>
                  )}
                </div>
                {(charts?.portfolioHistory||[]).some(d=>d['BTC Benchmark']) && (() => {
                  const rangeLabel = { '1D':'yesterday','3D':'3 days ago','1W':'1 week ago','1M':'1 month ago','3M':'3 months ago','ALL':'the start of the simulation' };
                  const firstDate = charts.portfolioHistory.find(d=>d['BTC Benchmark'])?.date || '';
                  const sinceStr = firstDate ? `since <strong style="color:#f59e0b">${firstDate}</strong>` : `since ${rangeLabel[chartRange]||'the start of the period'}`;
                  return (
                    <div style={{fontSize:10,color:'#64748b',marginBottom:14,lineHeight:1.6,background:'rgba(245,158,11,.06)',border:'1px solid rgba(245,158,11,.15)',borderRadius:8,padding:'7px 12px',display:'flex',alignItems:'flex-start',gap:8}}>
                      <span style={{color:'#f59e0b',flexShrink:0}}>₿</span>
                      <span>The <strong style={{color:'#f59e0b'}}>BTC Benchmark</strong> shows how the class starting balance would have grown if invested entirely in Bitcoin <span dangerouslySetInnerHTML={{__html: sinceStr}}/>. If your line is <em>above</em> this, you are outperforming Bitcoin for this period.</span>
                    </div>
                  );
                })()}

                <LineChart data={charts?.portfolioHistory || []} studentNames={charts?.studentNames || []}/>
              </div>

              {/* Two pie charts side by side */}
              <div className="charts-grid">

                {/* Coin Allocation */}
                <div className="card">
                  <div className="card-title">🪙 Coin Allocation</div>
                  <div className="card-sub">Combined holdings across all students</div>
                  {coinSlices.length === 0 ? (
                    <div style={{textAlign:'center',padding:40,color:'var(--muted)',fontSize:12}}>No holdings data</div>
                  ) : (
                    <div className="chart-inner">
                      <DonutChart
                        slices={coinSlices}
                        size={180}
                        innerText={coinSlices.length + ''}
                        innerSub="coins"
                      />
                      <Legend items={coinSlices} totalValue={totalCoin}/>
                    </div>
                  )}
                </div>

                {/* Sector Allocation */}
                <div className="card">
                  <div className="card-title">🌐 Sector Allocation</div>
                  <div className="card-sub">Distribution by sector including cash</div>
                  {sectorSlices.length === 0 ? (
                    <div style={{textAlign:'center',padding:40,color:'var(--muted)',fontSize:12}}>No holdings data</div>
                  ) : (
                    <div className="chart-inner">
                      <DonutChart
                        slices={sectorSlices}
                        size={180}
                        innerText={fmtUSD(totalSector).replace('$','$').split('.')[0]}
                        innerSub="total"
                      />
                      <Legend items={sectorSlices} totalValue={totalSector}/>
                    </div>
                  )}
                </div>

              </div>
            </>
          )
        )}
      </div>

      {/* Student Profile Modal */}
      {selectedStudent && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}} onClick={()=>setSelectedStudent(null)}>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:24,padding:28,width:'100%',maxWidth:620,maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            {profileLoading ? (
              <div style={{textAlign:'center',padding:40,color:'var(--muted)'}}>Loading portfolio…</div>
            ) : studentProfile ? (
              <>
                {/* Header */}
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16,gap:12}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:4}}>
                      {studentProfile.rewards?.activeFlair && <span style={{fontSize:20}}>{studentProfile.rewards.activeFlair}</span>}
                      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,color:'var(--text)'}}>{studentProfile.student.isBot?'🤖 ':''}{studentProfile.student.name}</div>
                      {studentProfile.rewards?.activeTitle && (
                        <span style={{fontSize:10,color:'#a78bfa',background:'rgba(167,139,250,.12)',border:'1px solid rgba(167,139,250,.25)',borderRadius:10,padding:'2px 8px'}}>{studentProfile.rewards.activeTitle}</span>
                      )}
                    </div>
                    <div style={{display:'flex',gap:12,flexWrap:'wrap',fontSize:11,color:'var(--muted)'}}>
                      {(studentProfile.streak?.loginStreak||0) > 0 && (
                        <span style={{color:'#60a5fa'}}>📅 {studentProfile.streak.loginStreak}-day login streak</span>
                      )}
                      {(studentProfile.rewards?.tokenBalance||0) > 0 && (
                        <span style={{color:'#fbbf24'}}>🪙 {studentProfile.rewards.tokenBalance} tokens</span>
                      )}
                      {studentProfile.progress?.lessonsPassed > 0 && (
                        <span style={{color:'var(--accent)'}}>🎓 {studentProfile.progress.lessonsPassed} lessons passed</span>
                      )}
                      {(studentProfile.rewards?.freezesAvailable||0) > 0 && (
                        <span>🧊 {studentProfile.rewards.freezesAvailable} freeze{studentProfile.rewards.freezesAvailable!==1?'s':''}</span>
                      )}
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                    <a href={`/profile/${studentProfile.student.id}`} style={{fontSize:11,color:'var(--accent)',textDecoration:'none',padding:'4px 10px',borderRadius:8,border:'1px solid var(--border)'}}>Full Profile →</a>
                    <button onClick={()=>setSelectedStudent(null)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:20,lineHeight:1}}>✕</button>
                  </div>
                </div>

                {/* Badge strip */}
                {studentProfile.badges?.length > 0 && (
                  <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14,padding:'10px 14px',background:'var(--surface2)',borderRadius:12}}>
                    {studentProfile.badges.map(b => (
                      <span key={b} style={{fontSize:10,padding:'3px 8px',borderRadius:8,background:'rgba(99,102,241,.12)',border:'1px solid rgba(99,102,241,.25)',color:'#a78bfa'}}>{b.replace(/_/g,' ')}</span>
                    ))}
                  </div>
                )}

                {/* Summary Stats */}
                {(() => {
                  const s = studentProfile.summary;
                  const ret = parseFloat(s.returnPct), isPos = ret >= 0;
                  return (
                    <>
                      <div style={{textAlign:'center',marginBottom:20}}>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:36,color:isPos?'var(--up)':'var(--down)'}}>
                          {fmtUSD(s.totalVal)}
                        </div>
                        <div style={{fontSize:14,color:isPos?'var(--up)':'var(--down)',marginTop:4}}>
                          {isPos?'▲':'▼'} {fmtUSD(Math.abs(parseFloat(s.pl)))} ({fmtPct(ret)})
                        </div>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
                        {[['Cash',fmtUSD(s.cash),'var(--text)'],['Holdings',fmtUSD(s.holdingsVal),'var(--text)'],s.stakingVal>0?['Staked',fmtUSD(s.stakingVal),'#60a5fa']:['Fees',fmtUSD(s.fees),'var(--muted)'],['Start',fmtUSD(s.seedMoney),'var(--muted)']].map(([label,val,color])=>(
                          <div key={label} style={{background:'var(--surface2)',borderRadius:12,padding:'10px 12px',textAlign:'center'}}>
                            <div style={{fontSize:10,color:'var(--muted)',marginBottom:4}}>{label}</div>
                            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color}}>{val}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}

                {/* Risk Metrics */}
                {(() => {
                  const m = studentProfile.metrics;
                  const metricItems = [
                    ['Sharpe', m.sharpe, v => v>=1?'var(--up)':v>=0?'var(--text)':'var(--down)', v => v?.toFixed(2)],
                    ['Sortino', m.sortino, v => v>=1?'var(--up)':v>=0?'var(--text)':'var(--down)', v => v?.toFixed(2)],
                    ['Max DD', m.maxDrawdown, v => v>20?'var(--down)':v>10?'var(--text)':'var(--up)', v => v!=null?`-${v.toFixed(1)}%`:null],
                    ['Win Rate', m.winRate, v => v>=50?'var(--up)':'var(--down)', v => v!=null?`${v.toFixed(1)}%`:null],
                  ].filter(([,v]) => v != null);
                  if (!metricItems.length) return null;
                  return (
                    <div style={{display:'grid',gridTemplateColumns:`repeat(${metricItems.length},1fr)`,gap:10,marginBottom:20}}>
                      {metricItems.map(([label, val, colorFn, fmt]) => (
                        <div key={label} style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:12,padding:'10px 12px',textAlign:'center'}}>
                          <div style={{fontSize:10,color:'var(--muted)',marginBottom:4}}>{label}</div>
                          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:colorFn(val)}}>{fmt(val)}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Holdings */}
                {studentProfile.holdings.length > 0 && (
                  <div style={{marginBottom:20}}>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:'var(--text)',marginBottom:10}}>Holdings</div>
                    <div style={{display:'flex',flexDirection:'column',gap:6}}>
                      {studentProfile.holdings.map(h => {
                        const isPos = h.plPct >= 0;
                        return (
                          <div key={h.coin} style={{display:'grid',gridTemplateColumns:'auto 1fr auto auto',alignItems:'center',gap:12,background:'var(--surface2)',borderRadius:12,padding:'10px 14px'}}>
                            <CoinLogo symbol={h.coin} size={24} />
                            <div>
                              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:'var(--text)'}}>{h.isShort?'⬇ ':'+'}{h.coin}</div>
                              <div style={{fontSize:10,color:'var(--muted)'}}>{Math.abs(h.qty).toFixed(4)} @ {fmtUSD(h.avgBuy)}</div>
                            </div>
                            <div style={{textAlign:'right'}}>
                              <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{fmtUSD(h.curVal)}</div>
                              <div style={{fontSize:10,color:'var(--muted)'}}>{fmtUSD(h.curPrice)}</div>
                            </div>
                            <div style={{textAlign:'right',minWidth:60}}>
                              <div style={{fontSize:13,fontWeight:600,color:isPos?'var(--up)':'var(--down)'}}>{isPos?'+':''}{h.plPct.toFixed(1)}%</div>
                              <div style={{fontSize:10,color:isPos?'var(--up)':'var(--down)'}}>{isPos?'+':''}{fmtUSD(h.plTotal)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recent Trades */}
                {studentProfile.recentTrades.length > 0 && (
                  <div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:'var(--text)',marginBottom:10}}>Recent Trades</div>
                    <div style={{display:'flex',flexDirection:'column',gap:4}}>
                      {studentProfile.recentTrades.map((t,i) => (
                        <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',background:'var(--surface2)',borderRadius:10,fontSize:12}}>
                          <span style={{color:t.action==='BUY'?'var(--up)':t.action==='SELL'||t.action==='SELL_ALL'?'var(--down)':'#8b5cf6',fontWeight:700,minWidth:52}}>{t.action}</span>
                          <span style={{color:'var(--text)',fontWeight:600}}>{t.coin}</span>
                          <span style={{color:'var(--muted)'}}>{Math.abs(t.quantity).toFixed(4)}</span>
                          <span style={{color:'var(--text)'}}>{fmtUSD(t.price)}</span>
                          <span style={{color:'var(--muted)',fontSize:10}}>{new Date(t.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{textAlign:'center',padding:40,color:'var(--muted)'}}>Could not load portfolio</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
