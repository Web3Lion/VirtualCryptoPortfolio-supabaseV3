"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { applyTheme, getTheme } from "@/lib/theme";

const fmtUSD = n => { const x=parseFloat(n); return isNaN(x)?'$0.00':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(x); };
const fmtPct = n => { const x=parseFloat(n); return isNaN(x)?'0.00%':(x>=0?'+':'')+x.toFixed(2)+'%'; };
const clean  = s => parseFloat(String(s||'').replace(/[$,%]/g,''))||0;

// ── Color palette for students ────────────────────────────────
const STUDENT_COLORS = ['#00e5a0','#3b82f6','#f59e0b','#f43f5e','#8b5cf6','#06b6d4','#10b981','#f97316'];
const SECTOR_COLORS  = {
  'Layer 1':'#3b82f6','Layer 2':'#8b5cf6','DeFi':'#06b6d4','AI / Data':'#00e5a0',
  'Gaming/NFT':'#f59e0b','Memecoin':'#f43f5e','Stablecoin':'#94a3b8','Exchange':'#f97316',
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
        :root{--bg:#080c14;--surface:#0f172a;--surface2:#1a2235;--border:#1e293b;--accent:#00e5a0;--up:#00e5a0;--down:#f43f5e;--text:#e2e8f0;--muted:#475569;--gold:#f59e0b}
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:1200px;margin:0 auto;padding:24px 16px}
        .nav{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;margin-bottom:28px;background:var(--surface);border:1px solid var(--border);border-radius:16px;flex-wrap:wrap;gap:10px}
        .logo{font-family:'Syne',sans-serif;font-weight:800;font-size:16px}.logo span{color:var(--accent)}
        .nav-links{display:flex;gap:8px;flex-wrap:wrap}
        .nav-link{padding:6px 14px;border-radius:8px;font-size:11px;text-decoration:none;color:var(--muted);letter-spacing:1px;transition:all .2s;text-transform:uppercase}
        .nav-link:hover{color:var(--accent)}.nav-link.active{background:rgba(128,200,128,.12);color:var(--accent);border:1px solid rgba(128,200,128,.2)}
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
        .podium{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px;align-items:end}
        .podium-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:20px;text-align:center}
        .podium-card.first{border-color:rgba(245,158,11,.7);box-shadow:0 8px 32px rgba(245,158,11,.25);transform:scale(1.06);padding:28px 20px;background:linear-gradient(160deg,var(--surface),rgba(245,158,11,.08))}
        .podium-card.second{border-color:rgba(148,163,184,.5);box-shadow:0 4px 16px rgba(148,163,184,.12);background:linear-gradient(160deg,var(--surface),rgba(148,163,184,.05))}
        .podium-card.third{border-color:rgba(180,100,40,.5);box-shadow:0 4px 16px rgba(180,100,40,.12);background:linear-gradient(160deg,var(--surface),rgba(180,100,40,.05))}
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
        <nav className="nav">
          <div className="logo">CRYPTO<span>CLASS</span></div>
          <div className="nav-links">
            <Link href="/dashboard" className="nav-link">Wallet</Link>
            <a href="/leaderboard" className="nav-link active">Leaderboard</a>
            <Link href="/market" className="nav-link">Market</Link>
            <Link href="/news" className="nav-link">News</Link>
            <Link href="/badges" className="nav-link">Badges</Link>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <ThemeToggle/>
            {lastUpdated && <span style={{fontSize:10,color:'var(--muted)'}}>Updated {lastUpdated.toLocaleTimeString()}</span>}
          </div>
        </nav>

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
              {humans.length >= 3 && (
                <div className="podium">
                  {[1,0,2].map(i => {
                    const s = humans[i]; if(!s) return <div key={i}/>;
                    const ret = clean(s.returnPct), isPos = ret >= 0;
                    return (
                      <div key={i} className={`podium-card ${i===0?'first':i===1?'second':'third'}`}>
                        <div style={{fontSize:32,marginBottom:8}}>{medals[i]}</div>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,marginBottom:4}}>{s.name}</div>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,color:isPos?'var(--up)':'var(--down)',marginBottom:4}}>{fmtUSD(s.total)}</div>
                        <div style={{fontSize:12,fontWeight:500,color:isPos?'var(--up)':'var(--down)'}}>{fmtPct(ret)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="card" style={{overflowX:'auto',padding:0}}>
                <table className="lb-table">
                  <thead>
                    <tr><th style={{padding:'14px 16px'}}>Rank</th><th>Student</th><th>Portfolio</th><th>Return</th><th>P/L</th><th>Coins</th><th title="Annualized Sharpe Ratio">Sharpe ⓘ</th><th title="Sortino Ratio — only penalizes downside volatility">Sortino ⓘ</th><th title="Max Drawdown — largest peak-to-trough decline">Max DD ⓘ</th><th title="Win Rate — % of closed positions that were profitable">Win% ⓘ</th><th>Progress</th></tr>
                  </thead>
                  <tbody>
                    {students.map((s,i)=>{
                      const ret=clean(s.returnPct), pl=clean(s.pl), isPos=ret>=0;
                      const color = STUDENT_COLORS[humans.indexOf(s) % STUDENT_COLORS.length];
                      return (
                        <tr className="lb-row" key={i} onClick={()=>openStudentProfile(s)} style={{cursor:'pointer'}} title={`View ${s.name}'s portfolio`}>
                          <td style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:'var(--muted)',width:40,paddingLeft:16}}>
                            {i<3?medals[i]:i+1}
                          </td>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <div style={{width:8,height:8,borderRadius:'50%',background:color,flexShrink:0}}/>
                              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13}}>{s.isBot?'🤖 ':''}{s.name}</div>
                            </div>
                          </td>
                          <td style={{fontFamily:"'Syne',sans-serif",fontWeight:700}}>{fmtUSD(s.total)}</td>
                          <td style={{color:isPos?'var(--up)':'var(--down)',fontWeight:500}}>{fmtPct(ret)}</td>
                          <td style={{color:isPos?'var(--up)':'var(--down)'}}>{isPos?'+':''}{fmtUSD(pl)}</td>
                          <td style={{color:'var(--muted)'}}>{fmtUSD(s.cash)}</td>
                          <td style={{color:'var(--muted)',textAlign:'center'}}>{s.coinCount||0}</td>
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
                <div style={{display:'flex',gap:16,flexWrap:'wrap',marginBottom:16}}>
                  {(charts?.studentNames || []).map((name, i) => (
                    <div key={name} style={{display:'flex',alignItems:'center',gap:6}}>
                      <div style={{width:24,height:3,borderRadius:2,background:STUDENT_COLORS[i%STUDENT_COLORS.length]}}/>
                      <span style={{fontSize:11,color:'var(--text)'}}>{name}</span>
                    </div>
                  ))}
                  {(charts?.portfolioHistory||[]).some(d=>d['BTC Benchmark']) && (
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <div style={{width:24,height:2,background:'#f59e0b',borderTop:'2px dashed #f59e0b'}}/>
                      <span style={{fontSize:11,color:'#f59e0b'}}>₿ BTC Benchmark</span>
                    </div>
                  )}
                </div>

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
              <div style={{textAlign:'center',padding:40,color:'#94a3b8'}}>Loading portfolio…</div>
            ) : studentProfile ? (
              <>
                {/* Header */}
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
                  <div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,color:'var(--text)'}}>{studentProfile.student.isBot?'🤖 ':''}{studentProfile.student.name}</div>
                    <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>Portfolio Overview</div>
                  </div>
                  <button onClick={()=>setSelectedStudent(null)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:20,lineHeight:1}}>✕</button>
                </div>

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
                        {[['Cash',fmtUSD(s.cash),'var(--text)'],['Holdings',fmtUSD(s.holdingsVal),'var(--text)'],['Fees',fmtUSD(s.fees),'var(--muted)'],['Start',fmtUSD(s.seedMoney),'var(--muted)']].map(([label,val,color])=>(
                          <div key={label} style={{background:'var(--surface2)',borderRadius:12,padding:'10px 12px',textAlign:'center'}}>
                            <div style={{fontSize:10,color:'#94a3b8',marginBottom:4}}>{label}</div>
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
                          <div style={{fontSize:10,color:'#94a3b8',marginBottom:4}}>{label}</div>
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
                            <div style={{width:8,height:8,borderRadius:'50%',background:getCoinColor(h.coin),flexShrink:0}}/>
                            <div>
                              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:'var(--text)'}}>{h.isShort?'⬇ ':'+'}{h.coin}</div>
                              <div style={{fontSize:10,color:'#94a3b8'}}>{Math.abs(h.qty).toFixed(4)} @ {fmtUSD(h.avgBuy)}</div>
                            </div>
                            <div style={{textAlign:'right'}}>
                              <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{fmtUSD(h.curVal)}</div>
                              <div style={{fontSize:10,color:'#94a3b8'}}>{fmtUSD(h.curPrice)}</div>
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
                          <span style={{color:'#94a3b8'}}>{Math.abs(t.quantity).toFixed(4)}</span>
                          <span style={{color:'var(--text)'}}>{fmtUSD(t.price)}</span>
                          <span style={{color:'#94a3b8',fontSize:10}}>{new Date(t.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{textAlign:'center',padding:40,color:'#94a3b8'}}>Could not load portfolio</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
