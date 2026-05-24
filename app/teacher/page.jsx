"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NewsTab from "./news-tab";
import ThemeToggle from "@/components/ThemeToggle";
import CoinPicker from "@/components/CoinPicker";
import { applyTheme, getTheme } from "@/lib/theme";

const fmtUSD = n => { const x=parseFloat(n); return isNaN(x)?'$0.00':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(x); };
const fmtPct = n => { const x=parseFloat(n); return isNaN(x)?'0.00%':(x>=0?'+':'')+x.toFixed(2)+'%'; };
const clean  = s => parseFloat(String(s||'').replace(/[$,%]/g,''))||0;

export default function Teacher() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [classes, setClasses]   = useState([]);
  const [activeClass, setActiveClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [marketStatus, setMarketStatus] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [freezeMsg, setFreezeMsg] = useState('');
  const [flashCoin, setFlashCoin] = useState('');
  const [flashPct, setFlashPct]   = useState('20');
  const [newStudentName, setNewStudentName]   = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [classCoins, setClassCoins] = useState([]);
  const [studentsView, setStudentsView] = useState('class');
  const [allStudents, setAllStudents] = useState([]);
  const [allStudentsLoading, setAllStudentsLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCoins, setPickerCoins] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSelected, setPickerSelected] = useState([]);
  const [rewardConfig, setRewardConfig] = useState({ enabled: false, badge_reward_tokens: 50 });
  const [rewardSaving, setRewardSaving] = useState(false);
  const [tradeSettings, setTradeSettings] = useState({ marginEnabled: false, marginMult: 2, shortEnabled: false });
  const [tradeSettingsSaving, setTradeSettingsSaving] = useState(false);
  const [schemaReady, setSchemaReady] = useState(true);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => { applyTheme(getTheme()); }, []);
  useEffect(()=>{ if(status==='unauthenticated') router.replace('/'); },[status,router]);

  const fetchData = async (classId) => {
    try {
      const [clsRes, mktRes, settingsRes, schemaRes] = await Promise.all([
        fetch('/api/classes'), fetch('/api/teacher/market-status'), fetch('/api/settings'),
        fetch('/api/admin/migrate-schema'),
      ]);
      if(settingsRes.ok) {
        const s = await settingsRes.json();
        setTradeSettings({ marginEnabled: s.marginEnabled||false, marginMult: s.marginMult||2, shortEnabled: s.shortEnabled||false });
      }
      if(schemaRes.ok) {
        const sc = await schemaRes.json();
        setSchemaReady(sc.columnExists !== false);
      }
      if(clsRes.ok) {
        const cls = await clsRes.json();
        const clsArr = Array.isArray(cls) ? cls : [];
        setClasses(clsArr);
        const cid = classId || activeClass?.id || clsArr[0]?.id;
        const active = clsArr.find(c=>c.id===cid) || clsArr[0];
        setActiveClass(active);
        if(active) {
          const [lbRes, coinsRes, rewardRes] = await Promise.all([
            fetch(`/api/leaderboard?classId=${active.id}`),
            fetch(`/api/coins?classId=${active.id}`),
            fetch(`/api/teacher/rewards?classId=${active.id}`),
          ]);
          if(lbRes.ok) {
            const lb = await lbRes.json();
            setStudents(Array.isArray(lb) ? lb : []);
          }
          if(coinsRes.ok) {
            const coins = await coinsRes.json();
            setClassCoins(Array.isArray(coins) ? coins : []);
          }
          if(rewardRes.ok) setRewardConfig(await rewardRes.json());
        }
      }
      if(mktRes.ok) setMarketStatus(await mktRes.json());
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ if(status==='authenticated') fetchData(); },[status]);

  if(status==='loading'||status==='unauthenticated') return (
    <div style={{background:'var(--bg,#080c14)',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted,#475569)'}}>Loading...</div>
  );

  const teacherAction = async (endpoint, body={}) => {
    setActionMsg({type:'pending',msg:'Processing...'});
    try {
      const res = await fetch(`/api/teacher/${endpoint}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const data = await res.json();
      if(res.ok){ setActionMsg({type:'success',msg:data.message||'✓ Done'}); fetchData(); }
      else setActionMsg({type:'error',msg:data.error||'Failed'});
    } catch { setActionMsg({type:'error',msg:'Network error'}); }
    setTimeout(()=>setActionMsg(null),4000);
  };

  const addCoin = async (symbol) => {
    if (!symbol || !activeClass) return;
    const res = await fetch('/api/coins?source=coingecko');
    const all  = await res.json();
    const allArr = Array.isArray(all) ? all : [];
    const coin = allArr.find(c => c.symbol === symbol.toUpperCase());
    if (!coin) { setActionMsg({type:'error',msg:`Coin ${symbol} not found`}); return; }
    await fetch('/api/coins',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({classId:activeClass.id,coins:[coin]})});
    setActionMsg({type:'success',msg:`✅ ${symbol} added`});
    fetchData(activeClass.id);
  };

  const fetchAllStudents = async () => {
    setAllStudentsLoading(true);
    try {
      const results = await Promise.all(
        classes.map(c =>
          fetch(`/api/leaderboard?classId=${c.id}`)
            .then(r => r.ok ? r.json() : [])
            .then(data => (Array.isArray(data) ? data : []).filter(s => !s.isBot).map(s => ({ ...s, className: c.name })))
        )
      );
      const merged = results.flat();
      merged.sort((a, b) => b.total - a.total);
      setAllStudents(merged);
    } catch(e) { console.error(e); }
    setAllStudentsLoading(false);
  };

  const saveRewardConfig = async () => {
    setRewardSaving(true);
    const res = await fetch('/api/teacher/rewards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({classId:activeClass.id,enabled:rewardConfig.enabled,badgeRewardTokens:rewardConfig.badge_reward_tokens})});
    if(res.ok) setActionMsg({type:'success',msg:'✅ ClassReward settings saved'});
    else setActionMsg({type:'error',msg:'Failed to save'});
    setRewardSaving(false);
    setTimeout(()=>setActionMsg(null),3000);
  };

  const runMigration = async () => {
    setMigrating(true);
    const res = await fetch('/api/admin/migrate-schema',{method:'POST'});
    const data = await res.json();
    if(res.ok) { setSchemaReady(true); setActionMsg({type:'success',msg:'✅ Database updated for leverage/short trading'}); }
    else setActionMsg({type:'error',msg:data.error||'Migration failed'});
    setMigrating(false);
    setTimeout(()=>setActionMsg(null),5000);
  };

  const saveTradeSettings = async () => {
    setTradeSettingsSaving(true);
    const res = await fetch('/api/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({marginEnabled:tradeSettings.marginEnabled,marginMult:tradeSettings.marginMult,shortEnabled:tradeSettings.shortEnabled})});
    if(res.ok) setActionMsg({type:'success',msg:'✅ Trading settings saved'});
    else setActionMsg({type:'error',msg:'Failed to save'});
    setTradeSettingsSaving(false);
    setTimeout(()=>setActionMsg(null),3000);
  };

  const openPicker = async () => {
    setPickerOpen(true);
    if (pickerCoins.length) return;
    setPickerLoading(true);
    try {
      const res = await fetch('/api/coins?source=coingecko');
      if (res.ok) setPickerCoins(await res.json());
    } catch {}
    setPickerLoading(false);
  };

  const addPickerSelected = async () => {
    if (!pickerSelected.length || !activeClass) return;
    setActionMsg({type:'pending',msg:`Adding ${pickerSelected.length} coin${pickerSelected.length>1?'s':''}...`});
    await fetch('/api/coins',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({classId:activeClass.id,coins:pickerSelected.map(c=>({symbol:c.symbol,geckoId:c.geckoId,name:c.name,sector:c.sector}))})});
    setActionMsg({type:'success',msg:`✅ ${pickerSelected.length} coin${pickerSelected.length>1?'s':''} added`});
    setPickerSelected([]);
    setPickerOpen(false);
    fetchData(activeClass.id);
  };

  const togglePickerCoin = (coin) => setPickerSelected(prev =>
    prev.some(c=>c.symbol===coin.symbol) ? prev.filter(c=>c.symbol!==coin.symbol) : [...prev, coin]
  );

  const removeCoin = async (symbol) => {
    await fetch('/api/coins',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({classId:activeClass?.id,symbol})});
    setActionMsg({type:'success',msg:`✅ ${symbol} removed`});
    fetchData(activeClass?.id);
  };

  const humans    = students.filter(s=>!s.isBot);
  const classAvg  = humans.length ? humans.reduce((s,r)=>s+clean(r.returnPct),0)/humans.length : 0;
  const profitable = humans.filter(s=>clean(s.pl)>0).length;

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
        .nav-link:hover{color:var(--accent)}.nav-link.active{background:rgba(245,158,11,.1);color:var(--gold);border:1px solid rgba(245,158,11,.2)}
        .teacher-badge{padding:4px 10px;background:rgba(245,158,11,.15);color:var(--gold);border-radius:8px;font-size:10px;border:1px solid rgba(245,158,11,.3)}
        .class-selector{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;align-items:center}
        .class-pill{padding:7px 14px;border-radius:20px;border:1px solid var(--border);background:var(--surface);font-size:11px;color:var(--muted);cursor:pointer;transition:all .2s;font-family:'DM Mono',monospace}
        .class-pill.active{background:rgba(0,229,160,.1);color:var(--accent);border-color:rgba(0,229,160,.3)}
        .tabs{display:flex;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:4px;margin-bottom:24px;flex-wrap:wrap}
        .stab{flex:1;padding:9px;text-align:center;border-radius:10px;border:none;background:transparent;font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);cursor:pointer;transition:all .2s;min-width:70px}
        .stab.active{background:var(--surface2);color:var(--gold);border:1px solid var(--border)}
        .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
        .stat-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:18px}
        .stat-label{font-size:9px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px}
        .stat-value{font-family:'Syne',sans-serif;font-weight:700;font-size:24px;color:var(--text)}
        .stat-value.up{color:var(--up)}.stat-value.down{color:var(--down)}.stat-value.gold{color:var(--gold)}
        .controls-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .ctrl-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:22px}
        .ctrl-title{font-family:'Syne',sans-serif;font-weight:700;font-size:15px;margin-bottom:6px;color:var(--text)}
        .ctrl-desc{font-size:11px;color:var(--muted);margin-bottom:14px;line-height:1.6}
        .status-pill{display:inline-flex;align-items:center;gap:6px;font-size:11px;padding:4px 10px;border-radius:8px;margin-bottom:12px}
        .status-pill.on{background:rgba(0,229,160,.1);color:var(--up)}.status-pill.off{background:rgba(71,85,105,.2);color:var(--muted)}.status-pill.warn{background:rgba(245,158,11,.1);color:var(--gold)}
        .btn{padding:9px 16px;border-radius:10px;border:none;font-family:'DM Mono',monospace;font-size:11px;font-weight:500;cursor:pointer;transition:all .2s}
        .btn-green{background:rgba(0,229,160,.15);color:var(--up);border:1px solid rgba(0,229,160,.3)}.btn-green:hover{background:rgba(0,229,160,.25)}
        .btn-red{background:rgba(244,63,94,.15);color:var(--down);border:1px solid rgba(244,63,94,.3)}.btn-red:hover{background:rgba(244,63,94,.25)}
        .btn-gold{background:rgba(245,158,11,.15);color:var(--gold);border:1px solid rgba(245,158,11,.3)}.btn-gold:hover{background:rgba(245,158,11,.25)}
        .btn-muted{background:var(--surface2);color:var(--text);border:1px solid var(--border)}.btn-muted:hover{border-color:var(--accent);color:var(--accent)}
        .btn-accent{background:var(--accent);color:#000}.btn-accent:hover{background:#00ffb0}
        .btn-row{display:flex;gap:8px;flex-wrap:wrap}
        .tools-divider{border-top:1px solid var(--border);padding-top:12px;margin-top:12px}
        .tools-label{font-size:9px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:8px}
        .text-input{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 14px;color:var(--text);font-family:'DM Mono',monospace;font-size:12px;outline:none;transition:border-color .2s;margin-bottom:10px}
        .text-input:focus{border-color:var(--accent)}
        .form-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .form-label{font-size:10px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;display:block;margin-bottom:4px}
        .student-table{width:100%;border-collapse:collapse}
        .student-table th{font-size:9px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;padding:10px 14px;text-align:left;border-bottom:1px solid var(--border)}
        .srow{border-bottom:1px solid rgba(30,41,59,.4);transition:background .15s}
        .srow:hover{background:rgba(0,229,160,.03)}
        .srow td{padding:12px 14px;font-size:12px;color:var(--text)}
        .coin-tag{display:inline-flex;align-items:center;gap:6px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:4px 10px;font-size:11px;margin:3px}
        .action-msg{position:fixed;bottom:24px;right:24px;padding:14px 20px;border-radius:14px;font-size:13px;z-index:999;border:1px solid}
        .action-msg.success{background:rgba(0,229,160,.1);color:var(--up);border-color:rgba(0,229,160,.3)}
        .action-msg.error{background:rgba(244,63,94,.1);color:var(--down);border-color:rgba(244,63,94,.3)}
        .action-msg.pending{background:rgba(59,130,246,.1);color:#60a5fa;border:1px solid rgba(59,130,246,.3)}
        .skeleton{background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @media(max-width:640px){.stats-grid{grid-template-columns:1fr 1fr}.controls-grid{grid-template-columns:1fr}}
      `}</style>

      <div className="page">
        <nav className="nav">
          <div className="logo">CRYPTO<span>CLASS</span></div>
          <div className="nav-links">
            <Link href="/dashboard" className="nav-link">Wallet</Link>
            <Link href="/leaderboard" className="nav-link">Leaderboard</Link>
            <Link href="/market" className="nav-link">Market</Link>
            <Link href="/news" className="nav-link">News</Link>
            <a href="/teacher" className="nav-link active">Teacher</a>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <ThemeToggle/>
            <div className="teacher-badge">👨‍🏫 TEACHER</div>
          </div>
        </nav>

        {classes.length > 0 && (
          <div className="class-selector">
            <span style={{fontSize:11,color:'var(--muted)'}}>CLASS:</span>
            {classes.map(c=>(
              <button key={c.id} className={`class-pill${activeClass?.id===c.id?' active':''}`} onClick={()=>{ setActiveClass(c); fetchData(c.id); }}>
                {c.name} <span style={{opacity:.6}}>· {c.semester}</span>
              </button>
            ))}
          </div>
        )}

        {classes.length === 0 && !loading && (
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:20,padding:48,textAlign:'center',marginBottom:24}}>
            <div style={{fontSize:48,marginBottom:16}}>🎓</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:20,marginBottom:8,color:'var(--text)'}}>No Classes Yet</div>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:24}}>Create your first class to get started</div>
            <button className="btn btn-accent" style={{fontSize:13,padding:'12px 24px'}} onClick={()=>router.push('/teacher/setup')}>+ Create First Class</button>
          </div>
        )}

        {activeClass && (
          <>
            <div className="tabs">
              {['overview','controls','students','coins','news'].map(s=>(
                <button key={s} className={`stab${activeSection===s?' active':''}`} onClick={()=>setActiveSection(s)}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>
              ))}
            </div>

            {loading ? (
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {[1,2,3].map(i=><div key={i} className="skeleton" style={{height:80}}/>)}
              </div>
            ) : (
              <>
                {activeSection==='overview' && (
                  <>
                    <div className="stats-grid">
                      <div className="stat-card"><div className="stat-label">Students</div><div className="stat-value gold">{humans.length}</div></div>
                      <div className="stat-card"><div className="stat-label">Profitable</div><div className={`stat-value ${profitable/Math.max(humans.length,1)>=.5?'up':'down'}`}>{profitable}/{humans.length}</div></div>
                      <div className="stat-card"><div className="stat-label">Avg Return</div><div className={`stat-value ${classAvg>=0?'up':'down'}`}>{classAvg>=0?'+':''}{classAvg.toFixed(2)}%</div></div>
                      <div className="stat-card"><div className="stat-label">Market</div><div className={`stat-value ${marketStatus?.frozen?'down':'up'}`}>{marketStatus?.frozen?'🔒 FROZEN':'✓ OPEN'}</div></div>
                    </div>
                    <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:20,padding:22}}>
                      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,marginBottom:14,color:'var(--text)'}}>Quick Actions</div>
                      <div className="btn-row" style={{marginBottom:12}}>
                        <button className="btn btn-muted" onClick={()=>fetchData(activeClass.id)}>↻ Refresh</button>
                        <button className="btn btn-gold" onClick={()=>setActiveSection('controls')}>⚙ Market Controls</button>
                        <button className="btn btn-muted" onClick={()=>setActiveSection('students')}>👥 Students</button>
                        <button className="btn btn-muted" onClick={()=>setActiveSection('news')}>📰 News</button>
                        <Link href={`/leaderboard?classId=${activeClass.id}`} style={{textDecoration:'none'}}><button className="btn btn-muted">🏆 Leaderboard</button></Link>
                      </div>
                      <div className="tools-divider">
                        <div className="tools-label">Tools</div>
                        <div className="btn-row">
                          <button className="btn btn-accent" onClick={()=>router.push('/teacher/setup')}>+ New Class</button>
                          <button className="btn btn-muted" onClick={()=>router.push('/teacher/migrate')}>📦 Migrate from Sheets</button>
                          <button className="btn btn-muted" onClick={()=>router.push('/market')}>📈 Market & Heatmap</button>
                          <button className="btn btn-muted" onClick={()=>router.push('/news')}>📰 Student News Page</button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeSection==='controls' && (
                  <div className="controls-grid">
                    <div className="ctrl-card">
                      <div className="ctrl-title">🚫 Market Freeze</div>
                      <div className="ctrl-desc">Suspend all trading instantly.</div>
                      <div className={`status-pill ${marketStatus?.frozen?'warn':'off'}`}>{marketStatus?.frozen?'🔴 FROZEN':'⚪ OPEN'}</div>
                      {!marketStatus?.frozen&&<input className="text-input" placeholder="Reason..." value={freezeMsg} onChange={e=>setFreezeMsg(e.target.value)}/>}
                      <div className="btn-row">
                        {marketStatus?.frozen
                          ? <button className="btn btn-green" onClick={()=>teacherAction('unfreeze')}>▶ Unfreeze</button>
                          : <button className="btn btn-red" onClick={()=>teacherAction('freeze',{reason:freezeMsg||'Market temporarily closed'})}>🔒 Freeze</button>}
                      </div>
                    </div>
                    <div className="ctrl-card">
                      <div className="ctrl-title">🐂 Bull Run</div>
                      <div className="ctrl-desc">Amplify all price changes.</div>
                      <div className={`status-pill ${marketStatus?.bullRun?'on':'off'}`}>{marketStatus?.bullRun?`🟢 ACTIVE ${marketStatus.bullMult}×`:'⚪ INACTIVE'}</div>
                      <div className="btn-row">
                        {marketStatus?.bullRun
                          ? <button className="btn btn-red" onClick={()=>teacherAction('bull-run/stop')}>⏹ End</button>
                          : <><button className="btn btn-gold" onClick={()=>teacherAction('bull-run/start',{multiplier:2})}>🐂 2×</button><button className="btn btn-red" onClick={()=>teacherAction('bull-run/start',{multiplier:3})}>🚀 3×</button></>}
                      </div>
                    </div>
                    <div className="ctrl-card">
                      <div className="ctrl-title">⚡ Flash Sale</div>
                      <div className="ctrl-desc">Discount one coin temporarily.</div>
                      <div className={`status-pill ${marketStatus?.flashSale?'warn':'off'}`}>{marketStatus?.flashSale?`🟡 ${marketStatus.flashSale.coin}`:'⚪ NONE'}</div>
                      {!marketStatus?.flashSale&&<div className="form-row"><input className="text-input" placeholder="Coin (BTC)" value={flashCoin} onChange={e=>setFlashCoin(e.target.value)} style={{marginBottom:0}}/><input className="text-input" placeholder="% off (20)" value={flashPct} onChange={e=>setFlashPct(e.target.value)} style={{marginBottom:0}}/></div>}
                      {!marketStatus?.flashSale&&<div style={{height:10}}/>}
                      <div className="btn-row">
                        {marketStatus?.flashSale
                          ? <button className="btn btn-muted" onClick={()=>teacherAction('flash-sale/stop')}>⏹ End</button>
                          : <button className="btn btn-gold" onClick={()=>{if(flashCoin)teacherAction('flash-sale/start',{coin:flashCoin.toUpperCase(),discountPct:parseFloat(flashPct)||20,minutes:30})}}>⚡ Start</button>}
                      </div>
                    </div>
                    <div className="ctrl-card">
                      <div className="ctrl-title">🏁 Simulation</div>
                      <div className="ctrl-desc">Pause or end the simulation.</div>
                      <div className="btn-row" style={{flexDirection:'column'}}>
                        <button className="btn btn-gold" style={{width:'100%',marginBottom:8}} onClick={()=>teacherAction('pause')}>⏸ Pause</button>
                        <button className="btn btn-green" style={{width:'100%',marginBottom:8}} onClick={()=>teacherAction('resume')}>▶ Resume</button>
                        <button className="btn btn-red" style={{width:'100%'}} onClick={()=>{if(confirm('End simulation?'))teacherAction('end')}}>🏁 End Simulation</button>
                      </div>
                    </div>

                    {/* ClassReward — full width */}
                    <div className="ctrl-card" style={{gridColumn:'1/-1'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                        <div className="ctrl-title" style={{marginBottom:0}}>🎁 ClassReward Tokens</div>
                        <div className={`status-pill ${rewardConfig.enabled?'on':'off'}`} style={{margin:0}}>{rewardConfig.enabled?'🟢 ENABLED':'⚪ DISABLED'}</div>
                      </div>
                      <div className="ctrl-desc">
                        Students earn ClassReward tokens (each worth $1.00) for completing achievements. Tokens appear in their wallet and can be redeemed for cash.
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:14}}>
                        <div>
                          <div className="tools-label" style={{marginBottom:6}}>Badge Reward</div>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <input
                              type="number" min={1} max={1000}
                              className="text-input"
                              style={{width:90,marginBottom:0}}
                              value={rewardConfig.badge_reward_tokens}
                              onChange={e=>setRewardConfig(c=>({...c,badge_reward_tokens:Math.max(1,parseInt(e.target.value)||50)}))}
                              disabled={!rewardConfig.enabled}
                            />
                            <span style={{fontSize:11,color:'var(--muted)'}}>tokens per badge = {fmtUSD(rewardConfig.badge_reward_tokens)}</span>
                          </div>
                          <div style={{fontSize:10,color:'var(--muted)',marginTop:4}}>Awarded automatically when a badge is earned</div>
                        </div>
                        <div style={{display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
                          <div className="tools-label" style={{marginBottom:6}}>More Rewards</div>
                          <div style={{fontSize:10,color:'var(--muted)',fontStyle:'italic'}}>Additional triggers (trading streaks, quiz answers…) coming soon</div>
                        </div>
                      </div>
                      <div className="btn-row">
                        <button className={`btn ${rewardConfig.enabled?'btn-red':'btn-green'}`} onClick={()=>setRewardConfig(c=>({...c,enabled:!c.enabled}))}>
                          {rewardConfig.enabled?'Disable ClassReward':'Enable ClassReward'}
                        </button>
                        <button className="btn btn-gold" onClick={saveRewardConfig} disabled={rewardSaving}>
                          {rewardSaving?'Saving...':'💾 Save Settings'}
                        </button>
                      </div>
                    </div>

                    {/* DB migration banner */}
                    {!schemaReady && (
                      <div className="ctrl-card" style={{gridColumn:'1/-1',border:'1px solid rgba(251,146,60,.4)',background:'rgba(251,146,60,.08)'}}>
                        <div className="ctrl-title" style={{color:'#fb923c',marginBottom:6}}>⚠ One-Time Setup Required</div>
                        <div className="ctrl-desc">Leverage and short trading require a database update. This runs a safe <code>ALTER TABLE</code> migration that adds one column.</div>
                        <button className="btn btn-gold" onClick={runMigration} disabled={migrating}>
                          {migrating?'Running migration...':'🔧 Apply Database Migration'}
                        </button>
                      </div>
                    )}

                    {/* Leverage Trading */}
                    <div className="ctrl-card">
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                        <div className="ctrl-title" style={{marginBottom:0}}>📈 Leverage Trading</div>
                        <div className={`status-pill ${tradeSettings.marginEnabled?'on':'off'}`} style={{margin:0}}>{tradeSettings.marginEnabled?'🟢 ENABLED':'⚪ DISABLED'}</div>
                      </div>
                      <div className="ctrl-desc">Allow students to trade with borrowed capital. A 2× leveraged buy on $500 controls a $1,000 position — gains and losses are amplified.</div>
                      <div style={{marginBottom:14}}>
                        <div className="tools-label" style={{marginBottom:6}}>Max Multiplier</div>
                        <div style={{display:'flex',gap:6}}>
                          {[2,3,5,10].map(m=>(
                            <button key={m} onClick={()=>setTradeSettings(s=>({...s,marginMult:m}))}
                              style={{padding:'5px 12px',borderRadius:8,border:`1px solid ${tradeSettings.marginMult===m?'var(--accent)':'var(--border)'}`,background:tradeSettings.marginMult===m?'rgba(0,229,160,.15)':'var(--surface2)',color:tradeSettings.marginMult===m?'var(--accent)':'var(--muted)',cursor:'pointer',fontSize:11,fontFamily:"'DM Mono',monospace"}}>
                              {m}×
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="btn-row">
                        <button className={`btn ${tradeSettings.marginEnabled?'btn-red':'btn-green'}`} onClick={()=>setTradeSettings(s=>({...s,marginEnabled:!s.marginEnabled}))}>
                          {tradeSettings.marginEnabled?'Disable Leverage':'Enable Leverage'}
                        </button>
                        <button className="btn btn-gold" onClick={saveTradeSettings} disabled={tradeSettingsSaving}>
                          {tradeSettingsSaving?'Saving...':'💾 Save'}
                        </button>
                      </div>
                    </div>

                    {/* Short Selling */}
                    <div className="ctrl-card">
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                        <div className="ctrl-title" style={{marginBottom:0}}>📉 Short Selling</div>
                        <div className={`status-pill ${tradeSettings.shortEnabled?'on':'off'}`} style={{margin:0}}>{tradeSettings.shortEnabled?'🟢 ENABLED':'⚪ DISABLED'}</div>
                      </div>
                      <div className="ctrl-desc">Allow students to bet against coins. Shorting BTC means borrowing and selling it now, then buying it back later — profiting if the price falls.</div>
                      <div className="btn-row">
                        <button className={`btn ${tradeSettings.shortEnabled?'btn-red':'btn-green'}`} onClick={()=>setTradeSettings(s=>({...s,shortEnabled:!s.shortEnabled}))}>
                          {tradeSettings.shortEnabled?'Disable Shorting':'Enable Shorting'}
                        </button>
                        <button className="btn btn-gold" onClick={saveTradeSettings} disabled={tradeSettingsSaving}>
                          {tradeSettingsSaving?'Saving...':'💾 Save'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection==='students' && (
                  <>
                    {studentsView==='class' && (
                      <div className="ctrl-card" style={{marginBottom:16}}>
                        <div className="ctrl-title" style={{marginBottom:12}}>➕ Add Student</div>
                        <div className="form-row">
                          <div><label className="form-label">Name</label><input className="text-input" placeholder="Jane Smith" value={newStudentName} onChange={e=>setNewStudentName(e.target.value)} style={{marginBottom:0}}/></div>
                          <div><label className="form-label">Email</label><input className="text-input" placeholder="jsmith@southfayette.org" value={newStudentEmail} onChange={e=>setNewStudentEmail(e.target.value)} style={{marginBottom:0}}/></div>
                        </div>
                        <div style={{height:10}}/>
                        <button className="btn btn-green" onClick={()=>{if(newStudentName&&newStudentEmail&&activeClass){teacherAction('add-student',{name:newStudentName,email:newStudentEmail,classId:activeClass.id});setNewStudentName('');setNewStudentEmail('');}}} >➕ Add Student</button>
                      </div>
                    )}
                    <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:20,padding:22,overflowX:'auto'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:'var(--text)'}}>
                          {studentsView==='class' ? `Students (${humans.length})` : `All Students (${allStudents.length})`}
                        </div>
                        <div style={{display:'flex',gap:8,alignItems:'center'}}>
                          {classes.length > 1 && (
                            <div style={{display:'flex',gap:2,background:'var(--surface2)',padding:3,borderRadius:10,border:'1px solid var(--border)'}}>
                              <button style={{padding:'4px 12px',borderRadius:7,border:'none',background:studentsView==='class'?'var(--accent)':'transparent',color:studentsView==='class'?'#000':'var(--muted)',cursor:'pointer',fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:studentsView==='class'?600:400,transition:'all .2s'}} onClick={()=>setStudentsView('class')}>This Class</button>
                              <button style={{padding:'4px 12px',borderRadius:7,border:'none',background:studentsView==='all'?'var(--accent)':'transparent',color:studentsView==='all'?'#000':'var(--muted)',cursor:'pointer',fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:studentsView==='all'?600:400,transition:'all .2s'}} onClick={()=>{setStudentsView('all');fetchAllStudents();}}>All Classes</button>
                            </div>
                          )}
                          <button className="btn btn-muted" onClick={()=>studentsView==='class'?fetchData(activeClass.id):fetchAllStudents()}>↻ Refresh</button>
                        </div>
                      </div>
                      {studentsView==='class' ? (
                        <table className="student-table">
                          <thead><tr><th>Rank</th><th>Name</th><th>Portfolio</th><th>Return</th><th>P/L</th><th>Cash</th><th>Actions</th></tr></thead>
                          <tbody>
                            {students.map((s,i)=>{
                              const ret=clean(s.returnPct),pl=clean(s.pl),isPos=ret>=0;
                              return (
                                <tr className="srow" key={i}>
                                  <td style={{color:'var(--muted)',fontWeight:700}}>{i+1}</td>
                                  <td><div style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13}}>{s.isBot?'🤖 ':''}{s.name}</div></td>
                                  <td style={{fontFamily:"'Syne',sans-serif",fontWeight:700}}>{fmtUSD(s.total)}</td>
                                  <td style={{color:isPos?'var(--up)':'var(--down)',fontWeight:500}}>{fmtPct(ret)}</td>
                                  <td style={{color:isPos?'var(--up)':'var(--down)'}}>{isPos?'+':''}{fmtUSD(pl)}</td>
                                  <td style={{color:'var(--muted)'}}>{fmtUSD(s.cash)}</td>
                                  <td>
                                    <div className="btn-row">
                                      <button className="btn btn-muted" style={{padding:'4px 10px',fontSize:10}} onClick={()=>{if(confirm(`Reset ${s.name}?`))teacherAction('reset-student',{studentId:s.id,classId:activeClass.id})}}>↺ Reset</button>
                                      <button className="btn btn-red" style={{padding:'4px 10px',fontSize:10}} onClick={()=>{if(confirm(`Remove ${s.name}?`))teacherAction('remove-student',{studentId:s.id,classId:activeClass.id})}}>✕</button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : allStudentsLoading ? (
                        <div style={{color:'var(--muted)',textAlign:'center',padding:32,fontSize:13}}>Loading all students...</div>
                      ) : (
                        <table className="student-table">
                          <thead><tr><th>Rank</th><th>Name</th><th>Class</th><th>Portfolio</th><th>Return</th><th>P/L</th><th>Cash</th></tr></thead>
                          <tbody>
                            {allStudents.map((s,i)=>{
                              const ret=clean(s.returnPct),pl=clean(s.pl),isPos=ret>=0;
                              return (
                                <tr className="srow" key={i}>
                                  <td style={{color:'var(--muted)',fontWeight:700}}>{i+1}</td>
                                  <td><div style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13}}>{s.name}</div></td>
                                  <td style={{color:'var(--muted)',fontSize:11}}>{s.className}</td>
                                  <td style={{fontFamily:"'Syne',sans-serif",fontWeight:700}}>{fmtUSD(s.total)}</td>
                                  <td style={{color:isPos?'var(--up)':'var(--down)',fontWeight:500}}>{fmtPct(ret)}</td>
                                  <td style={{color:isPos?'var(--up)':'var(--down)'}}>{isPos?'+':''}{fmtUSD(pl)}</td>
                                  <td style={{color:'var(--muted)'}}>{fmtUSD(s.cash)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </>
                )}

                {activeSection==='coins' && (
                  <div className="ctrl-card">
                    <div className="ctrl-title" style={{marginBottom:6}}>🪙 Coins for {activeClass?.name}</div>
                    <div className="ctrl-desc">Add or remove coins mid-simulation. Students who hold a removed coin can still sell.</div>
                    <div style={{marginBottom:16,flexWrap:'wrap',display:'flex'}}>
                      {classCoins.filter(c=>c.active).map(c=>(
                        <div className="coin-tag" key={c.symbol}>
                          <span style={{fontWeight:600}}>{c.symbol}</span>
                          <span style={{color:'var(--muted)',fontSize:10}}>{c.sector}</span>
                          <button onClick={()=>{if(confirm(`Remove ${c.symbol}?`))removeCoin(c.symbol)}} style={{background:'none',border:'none',color:'var(--down)',cursor:'pointer',fontSize:12,padding:0}}>✕</button>
                        </div>
                      ))}
                    </div>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <button className={`btn ${pickerOpen?'btn-red':'btn-green'}`} onClick={()=>pickerOpen?(setPickerOpen(false),setPickerSelected([])):openPicker()}>
                        {pickerOpen?'✕ Close':'+ Browse Coins'}
                      </button>
                      {pickerSelected.length>0&&(
                        <button className="btn btn-accent" onClick={addPickerSelected}>
                          ✓ Add {pickerSelected.length} Selected
                        </button>
                      )}
                    </div>
                    {pickerOpen && (
                      <div style={{marginTop:14,padding:16,background:'var(--surface2)',borderRadius:16,border:'1px solid var(--border)'}}>
                        {pickerLoading ? (
                          <div style={{color:'var(--muted)',textAlign:'center',padding:24,fontSize:13}}>Loading coins from CoinGecko...</div>
                        ) : (
                          <CoinPicker
                            coins={pickerCoins}
                            selected={pickerSelected}
                            onToggle={togglePickerCoin}
                            activeSymbols={classCoins.filter(c=>c.active).map(c=>c.symbol)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {activeSection==='news' && <NewsTab />}
              </>
            )}
          </>
        )}
      </div>
      {actionMsg&&<div className={`action-msg ${actionMsg.type}`}>{actionMsg.msg}</div>}
    </>
  );
}