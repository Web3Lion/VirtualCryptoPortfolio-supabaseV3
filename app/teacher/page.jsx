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
  const [rewardConfig, setRewardConfig] = useState({ enabled: false, badge_reward_tokens: 50, lesson_reward_tokens: 25, crush_points_per_token: 100, crush_max_tokens_per_day: 50 });
  const [rewardSaving, setRewardSaving] = useState(false);
  const [tradeSettings, setTradeSettings] = useState({ marginEnabled: false, marginMult: 2, shortEnabled: false });
  const [tradeSettingsSaving, setTradeSettingsSaving] = useState(false);
  const [schemaReady, setSchemaReady] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [ordersTableReady, setOrdersTableReady] = useState(true);
  const [migratingOrders, setMigratingOrders] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCooldown, setRefreshCooldown] = useState(null);
  const [refreshCountdown, setRefreshCountdown] = useState('');
  const [refreshResult, setRefreshResult] = useState(null);
  const [editingClassName, setEditingClassName] = useState(false);
  const [classNameInput, setClassNameInput] = useState('');
  const [moveStudent, setMoveStudent] = useState(null); // student object to move
  const [moveTargetClass, setMoveTargetClass] = useState('');
  const [backfilling, setBackfilling] = useState(false);
  const [botConfig, setBotConfig] = useState({ enabled:false, strategy:'momentum', risk:'moderate', maxPositions:5, buyThreshold:2, takeProfit:15, stopLoss:10, seedMoney:10000 });
  const [botStats, setBotStats]   = useState(null);
  const [botSaving, setBotSaving] = useState(false);
  const [grantRecipient, setGrantRecipient] = useState('all');
  const [grantAmount, setGrantAmount]       = useState(50);
  const [grantNote, setGrantNote]           = useState('');
  const [granting, setGranting]             = useState(false);
  const [stakingReady, setStakingReady]     = useState(true);
  const [migratingStaking, setMigratingStaking] = useState(false);
  const [stakingConfig, setStakingConfig]   = useState({ enabled: false });
  const [stakingStats, setStakingStats]     = useState(null);
  const [stakingSaving, setStakingSaving]   = useState(false);
  const [stakingSql, setStakingSql]         = useState(null); // shows manual SQL modal

  useEffect(() => { applyTheme(getTheme()); }, []);
  useEffect(()=>{ if(status==='unauthenticated') router.replace('/'); },[status,router]);

  const fetchData = async (classId) => {
    try {
      const [clsRes, mktRes, settingsRes, schemaRes, ordersSchemaRes, stakingSchemaRes] = await Promise.all([
        fetch('/api/classes'), fetch('/api/teacher/market-status'), fetch('/api/settings'),
        fetch('/api/admin/migrate-schema'), fetch('/api/admin/migrate-orders'),
        fetch('/api/admin/migrate-staking'),
      ]);
      if(stakingSchemaRes.ok){ const s=await stakingSchemaRes.json(); setStakingReady(s.tablesExist!==false); }
      if(settingsRes.ok) {
        const s = await settingsRes.json();
        setTradeSettings({ marginEnabled: s.marginEnabled||false, marginMult: s.marginMult||2, shortEnabled: s.shortEnabled||false });
      }
      if(schemaRes.ok) {
        const sc = await schemaRes.json();
        setSchemaReady(sc.columnExists !== false);
      }
      if(ordersSchemaRes.ok) {
        const osc = await ordersSchemaRes.json();
        setOrdersTableReady(osc.tableExists !== false);
      }
      if(clsRes.ok) {
        const cls = await clsRes.json();
        const clsArr = Array.isArray(cls) ? cls : [];
        setClasses(clsArr);
        const cid = classId || activeClass?.id || clsArr[0]?.id;
        const active = clsArr.find(c=>c.id===cid) || clsArr[0];
        setActiveClass(active);
        if(active) {
          const [lbRes, coinsRes, rewardRes, stakingRes] = await Promise.all([
            fetch(`/api/leaderboard?classId=${active.id}`),
            fetch(`/api/coins?classId=${active.id}`),
            fetch(`/api/teacher/rewards?classId=${active.id}`),
            fetch(`/api/teacher/staking?classId=${active.id}`),
          ]);
          if(stakingRes.ok){ const sd=await stakingRes.json(); setStakingConfig({enabled:sd.enabled}); setStakingStats(sd); }
          if(lbRes.ok) {
            const lb = await lbRes.json();
            setStudents(Array.isArray(lb) ? lb : []);
          }
          if(coinsRes.ok) {
            const coins = await coinsRes.json();
            setClassCoins(Array.isArray(coins) ? coins : []);
          }
          if(rewardRes.ok) setRewardConfig(await rewardRes.json());
          fetch(`/api/teacher/bot?classId=${active.id}`).then(r=>r.ok?r.json():null).then(d=>{ if(d){ setBotConfig({...d.config, seedMoney: d.config.seedMoney || d.stats?.seedMoney || 10000}); setBotStats(d.stats); } }).catch(()=>{});
        }
      }
      if(mktRes.ok) setMarketStatus(await mktRes.json());
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ if(status==='authenticated') { fetchData(); fetch('/api/refresh').then(r=>r.ok&&r.json()).then(d=>{ if(d&&!d.canRefresh) setRefreshCooldown(new Date(d.nextRefreshAt)); }); } },[status]);

  useEffect(()=>{
    if(!refreshCooldown){setRefreshCountdown('');return;}
    const tick=()=>{
      const diff=refreshCooldown.getTime()-Date.now();
      if(diff<=0){setRefreshCooldown(null);setRefreshCountdown('');return;}
      const m=Math.floor(diff/60000),s=Math.floor((diff%60000)/1000);
      setRefreshCountdown(`${m}:${s.toString().padStart(2,'0')}`);
    };
    tick();const iv=setInterval(tick,1000);return()=>clearInterval(iv);
  },[refreshCooldown]);

  const handlePriceRefresh = async () => {
    setRefreshing(true);
    setRefreshResult(null);
    try {
      const res = await fetch('/api/refresh', { method: 'POST' });
      const data = await res.json();
      if(res.status===429||data.blocked) {
        setRefreshCooldown(new Date(data.nextRefreshAt));
        setRefreshResult({ blocked: true });
      } else if(data.success) {
        setRefreshCooldown(new Date(data.nextRefreshAt));
        setRefreshResult({ pricesUpdated: data.pricesUpdated||0, snapshots: data.intradaySnapshots||0, errors: data.errors||[], at: new Date() });
        fetchData();
      }
    } catch(e){ console.error(e); setRefreshResult({ error: e.message }); }
    finally { setRefreshing(false); }
  };

  const saveClassName = async () => {
    if (!classNameInput.trim() || !activeClass) return;
    await teacherAction('edit-class', { classId: activeClass.id, name: classNameInput.trim() });
    setEditingClassName(false);
    fetchData(activeClass.id);
  };

  const doMoveStudent = async () => {
    if (!moveStudent || !moveTargetClass) return;
    await teacherAction('move-student', { studentId: moveStudent.id, fromClassId: activeClass.id, toClassId: moveTargetClass });
    setMoveStudent(null); setMoveTargetClass('');
    fetchData(activeClass.id);
  };

  const doBackfill = async () => {
    setBackfilling(true);
    try { await teacherAction('backfill-snapshots', { classId: activeClass.id }); }
    catch(e) { console.error(e); }
    setBackfilling(false);
  };

  const exportCSV = () => {
    window.location.href = `/api/teacher/export?classId=${activeClass?.id}`;
  };

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
    const res = await fetch('/api/teacher/rewards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({classId:activeClass.id,enabled:rewardConfig.enabled,badgeRewardTokens:rewardConfig.badge_reward_tokens,lessonRewardTokens:rewardConfig.lesson_reward_tokens,crushPointsPerToken:rewardConfig.crush_points_per_token,crushMaxTokensPerDay:rewardConfig.crush_max_tokens_per_day})});
    if(res.ok) setActionMsg({type:'success',msg:'✅ ClassReward settings saved'});
    else setActionMsg({type:'error',msg:'Failed to save'});
    setRewardSaving(false);
    setTimeout(()=>setActionMsg(null),3000);
  };

  const takeSnapshot = async () => {
    setActionMsg({type:'pending',msg:'Taking portfolio snapshot...'});
    const res = await fetch('/api/cron/snapshots',{method:'POST',headers:{'x-teacher-email':session?.user?.email||''}});
    const data = await res.json();
    if(res.ok) setActionMsg({type:'success',msg:`✅ Snapshot saved (${data.snapshotsCreated} students)`});
    else setActionMsg({type:'error',msg:data.error||'Snapshot failed'});
    setTimeout(()=>setActionMsg(null),4000);
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

  const saveStakingConfig = async () => {
    setStakingSaving(true);
    const res = await fetch('/api/teacher/staking',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({classId:activeClass.id,enabled:stakingConfig.enabled})});
    const data = await res.json().catch(()=>({}));
    if(res.ok) {
      setActionMsg({type:'success',msg:`✅ Staking ${stakingConfig.enabled?'enabled':'disabled'}`});
      // Re-fetch to confirm DB state matches what we saved
      fetch(`/api/teacher/staking?classId=${activeClass.id}`).then(r=>r.ok?r.json():null).then(d=>{ if(d) { setStakingConfig({enabled:d.enabled}); setStakingStats(d); } });
    } else {
      setActionMsg({type:'error',msg:data.error||'Failed to save staking config'});
      // Revert toggle to match DB state
      fetch(`/api/teacher/staking?classId=${activeClass.id}`).then(r=>r.ok?r.json():null).then(d=>{ if(d) setStakingConfig({enabled:d.enabled}); });
    }
    setStakingSaving(false);
    setTimeout(()=>setActionMsg(null),4000);
  };

  const runStakingMigration = async () => {
    setMigratingStaking(true);
    try {
      const res = await fetch('/api/admin/migrate-staking', {method:'POST'});
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setStakingReady(true);
        setActionMsg({type:'success', msg:'✅ Staking tables created — enable staking below'});
        setTimeout(()=>setActionMsg(null), 4000);
      } else if (d.sql) {
        // run_sql not available — show SQL in a copyable modal
        setStakingSql(d.sql);
      } else {
        setActionMsg({type:'error', msg: d.error || 'Migration failed'});
        setTimeout(()=>setActionMsg(null), 6000);
      }
    } catch (e) {
      setActionMsg({type:'error', msg:'Migration request failed — check your connection'});
      setTimeout(()=>setActionMsg(null), 6000);
    }
    setMigratingStaking(false);
  };

  const runOrdersMigration = async () => {
    setMigratingOrders(true);
    const res = await fetch('/api/admin/migrate-orders',{method:'POST'});
    const data = await res.json();
    if(res.ok) { setOrdersTableReady(true); setActionMsg({type:'success',msg:'✅ Limit orders table created'}); }
    else setActionMsg({type:'error',msg:data.sql ? `Run this SQL in Supabase dashboard:\n${data.sql}` : data.error||'Migration failed'});
    setMigratingOrders(false);
    setTimeout(()=>setActionMsg(null),8000);
  };

  const saveTradeSettings = async () => {
    setTradeSettingsSaving(true);
    const res = await fetch('/api/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({marginEnabled:tradeSettings.marginEnabled,marginMult:tradeSettings.marginMult,shortEnabled:tradeSettings.shortEnabled})});
    if(res.ok) setActionMsg({type:'success',msg:'✅ Trading settings saved'});
    else setActionMsg({type:'error',msg:'Failed to save'});
    setTradeSettingsSaving(false);
    setTimeout(()=>setActionMsg(null),3000);
  };

  const saveBotConfig = async () => {
    setBotSaving(true);
    const res = await fetch('/api/teacher/bot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...botConfig,classId:activeClass?.id})});
    if(res.ok) setActionMsg({type:'success',msg:'✅ Bot settings saved'});
    else setActionMsg({type:'error',msg:'Failed to save bot'});
    setBotSaving(false);
    setTimeout(()=>setActionMsg(null),3000);
    fetch(`/api/teacher/bot?classId=${activeClass?.id}`).then(r=>r.ok?r.json():null).then(d=>{ if(d){ setBotStats(d.stats); } }).catch(()=>{});
  };
  const resetBot = async () => {
    if(!confirm('Reset Satoshi Botomoto? This wipes all bot trades and restores its starting balance.')) return;
    await fetch('/api/teacher/bot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({classId:activeClass?.id,action:'reset'})});
    fetch(`/api/teacher/bot?classId=${activeClass?.id}`).then(r=>r.ok?r.json():null).then(d=>{ if(d){ setBotStats(d.stats); } }).catch(()=>{});
    setActionMsg({type:'success',msg:'🤖 Bot reset!'});
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
        @keyframes spin{to{transform:rotate(360deg)}}
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
            <Link href="/teacher/learn"   className="nav-link" style={{color:'#60a5fa',border:'1px solid rgba(96,165,250,.2)',background:'rgba(96,165,250,.06)'}}>📚 Lessons</Link>
            <Link href="/teacher/schema"  className="nav-link" style={{color:'#a78bfa',border:'1px solid rgba(167,139,250,.2)',background:'rgba(167,139,250,.06)'}}>🗄️ Schema</Link>
            <Link href="/teacher/cockpit" className="nav-link" style={{color:'#f59e0b',border:'1px solid rgba(245,158,11,.2)',background:'rgba(245,158,11,.06)'}}>◈ Cockpit</Link>
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
            {activeClass && (
              editingClassName
                ? <span style={{display:'flex',gap:6,alignItems:'center'}}>
                    <input value={classNameInput} onChange={e=>setClassNameInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveClassName()} style={{padding:'4px 10px',borderRadius:8,border:'1px solid var(--accent)',background:'var(--surface2)',color:'var(--text)',fontSize:12,width:160}} autoFocus/>
                    <button className="btn btn-accent" style={{padding:'4px 10px',fontSize:11}} onClick={saveClassName}>Save</button>
                    <button className="btn btn-muted" style={{padding:'4px 10px',fontSize:11}} onClick={()=>setEditingClassName(false)}>✕</button>
                  </span>
                : <button className="btn btn-muted" style={{padding:'4px 10px',fontSize:11}} onClick={()=>{setClassNameInput(activeClass.name);setEditingClassName(true);}}>✏ Rename</button>
            )}
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
                        <button className="btn btn-muted" onClick={refreshCooldown ? ()=>fetchData(activeClass.id) : handlePriceRefresh} disabled={refreshing} title={refreshCooldown?`Next price refresh in ${refreshCountdown}`:'Refresh prices & save snapshots for all students'} style={{minWidth:148,transition:'all .2s'}}>
                          {refreshing ? <span style={{display:'flex',alignItems:'center',gap:6,justifyContent:'center'}}><span style={{display:'inline-block',width:10,height:10,border:'2px solid currentColor',borderTopColor:'transparent',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>Refreshing…</span> : refreshCooldown?`↻ ${refreshCountdown}`:'↻ Refresh Prices'}
                        </button>
                        <button className="btn btn-gold" onClick={()=>setActiveSection('controls')}>⚙ Market Controls</button>
                        <button className="btn btn-muted" onClick={()=>setActiveSection('students')}>👥 Students</button>
                        <button className="btn btn-muted" onClick={()=>setActiveSection('news')}>📰 News</button>
                        <Link href={`/leaderboard?classId=${activeClass.id}`} style={{textDecoration:'none'}}><button className="btn btn-muted">🏆 Leaderboard</button></Link>
                      </div>
                      {refreshResult && !refreshResult.blocked && !refreshResult.error && (
                        <div style={{background:'rgba(0,229,160,.08)',border:'1px solid rgba(0,229,160,.3)',borderRadius:12,padding:'10px 14px',marginBottom:12,display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,fontSize:12}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <span style={{fontSize:15}}>✅</span>
                            <span style={{fontWeight:600,color:'var(--accent)'}}>Refresh complete</span>
                            <span style={{color:'#94a3b8'}}>
                              {refreshResult.pricesUpdated} coin{refreshResult.pricesUpdated!==1?'s':''} updated
                              {refreshResult.snapshots>0?` · ${refreshResult.snapshots} snapshot${refreshResult.snapshots!==1?'s':''} saved`:''}
                              {refreshResult.at?` · ${refreshResult.at.toLocaleTimeString()}`:''}
                            </span>
                            {refreshResult.errors?.length>0&&<span style={{color:'#f59e0b'}}>⚠ {refreshResult.errors[0]}</span>}
                          </div>
                          <button onClick={()=>setRefreshResult(null)} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:14}}>✕</button>
                        </div>
                      )}
                      <div className="tools-divider">
                        <div className="tools-label">Tools</div>
                        <div className="btn-row">
                          <button className="btn btn-accent" onClick={()=>router.push('/teacher/setup')}>+ New Class</button>
                          <button className="btn btn-gold" onClick={()=>router.push('/teacher/learn')}>📚 Manage Lessons</button>
                          <button className="btn btn-muted" onClick={()=>router.push('/teacher/schema')}>🗄️ DB Schema</button>
                          <button className="btn btn-muted" onClick={()=>router.push('/teacher/migrate')}>📦 Migrate from Sheets</button>
                          <button className="btn btn-muted" onClick={()=>router.push('/market')}>📈 Market & Heatmap</button>
                          <button className="btn btn-muted" onClick={()=>router.push('/news')}>📰 Student News Page</button>
                        </div>
                      </div>
                      <div className="tools-divider">
                        <div className="tools-label">Data</div>
                        <div className="btn-row">
                          <button className="btn btn-green" onClick={exportCSV}>⬇ Export Grades CSV</button>
                          <button className="btn btn-muted" disabled={backfilling} onClick={doBackfill} title="Create today's daily snapshot for students missing one — fills gaps in portfolio history charts">
                            {backfilling ? 'Backfilling…' : '📊 Backfill Snapshots'}
                          </button>
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
                        <button className="btn btn-red" style={{width:'100%',marginBottom:8}} onClick={()=>{if(confirm('End simulation?'))teacherAction('end')}}>🏁 End Simulation</button>
                        <button className="btn btn-muted" style={{width:'100%'}} onClick={takeSnapshot} title="Saves a daily portfolio snapshot for every student right now — useful for populating history charts">📸 Save Portfolio Snapshot</button>
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
                        <div>
                          <div className="tools-label" style={{marginBottom:6}}>Lesson Reward</div>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <input
                              type="number" min={1} max={1000}
                              className="text-input"
                              style={{width:90,marginBottom:0}}
                              value={rewardConfig.lesson_reward_tokens}
                              onChange={e=>setRewardConfig(c=>({...c,lesson_reward_tokens:Math.max(1,parseInt(e.target.value)||25)}))}
                              disabled={!rewardConfig.enabled}
                            />
                            <span style={{fontSize:11,color:'var(--muted)'}}>tokens per lesson = {fmtUSD(rewardConfig.lesson_reward_tokens)}</span>
                          </div>
                          <div style={{fontSize:10,color:'var(--muted)',marginTop:4}}>Default tokens awarded when a student passes a lesson quiz</div>
                        </div>

                        {/* Crypto Crush settings */}
                        <div style={{marginTop:16,paddingTop:16,borderTop:'1px solid var(--border)'}}>
                          <div style={{fontSize:11,color:'var(--accent)',fontWeight:700,marginBottom:12,display:'flex',alignItems:'center',gap:6}}>🎮 Crypto Crush Game</div>
                          <div style={{display:'grid',gap:10}}>
                            <div>
                              <div style={{fontSize:11,color:'var(--muted)',marginBottom:6}}>Points per Class Reward Token</div>
                              <div style={{display:'flex',alignItems:'center',gap:10}}>
                                <input type="number" min={10} className="text-input" style={{width:90,marginBottom:0}}
                                  value={rewardConfig.crush_points_per_token}
                                  onChange={e=>setRewardConfig(c=>({...c,crush_points_per_token:Math.max(10,parseInt(e.target.value)||100)}))}
                                  disabled={!rewardConfig.enabled} />
                                <span style={{fontSize:11,color:'var(--muted)'}}>pts = 1 token</span>
                              </div>
                              <div style={{fontSize:10,color:'var(--muted)',marginTop:4}}>How many Crypto Crush points converts to 1 Class Reward Token</div>
                            </div>
                            <div>
                              <div style={{fontSize:11,color:'var(--muted)',marginBottom:6}}>Max Tokens per Day (per student)</div>
                              <div style={{display:'flex',alignItems:'center',gap:10}}>
                                <input type="number" min={1} className="text-input" style={{width:90,marginBottom:0}}
                                  value={rewardConfig.crush_max_tokens_per_day}
                                  onChange={e=>setRewardConfig(c=>({...c,crush_max_tokens_per_day:Math.max(1,parseInt(e.target.value)||50)}))}
                                  disabled={!rewardConfig.enabled} />
                                <span style={{fontSize:11,color:'var(--muted)'}}>tokens/day</span>
                              </div>
                              <div style={{fontSize:10,color:'var(--muted)',marginTop:4}}>Maximum tokens a student can earn from Crypto Crush per day</div>
                            </div>
                          </div>
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

                    {/* Award Tokens */}
                    <div className="ctrl-card" style={{gridColumn:'1/-1',border:'1px solid rgba(0,229,160,.2)',background:'rgba(0,229,160,.03)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                        <div className="ctrl-title" style={{marginBottom:0}}>🪙 Award Tokens</div>
                        <span style={{fontSize:10,color:'var(--muted)'}}>Manually grant ClassReward Tokens to a student or the whole class</span>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 120px 1fr auto',gap:10,alignItems:'end',marginBottom:10}}>
                        <div>
                          <div className="form-label">Recipient</div>
                          <select className="text-input" style={{marginBottom:0}} value={grantRecipient} onChange={e=>setGrantRecipient(e.target.value)}>
                            <option value="all">🌟 All Students in Class</option>
                            <option disabled>──────────────</option>
                            {humans.map(s=>(
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                            <option value="_email">✉ Other (enter email below)</option>
                          </select>
                        </div>
                        <div>
                          <div className="form-label">Tokens</div>
                          <input type="number" min={1} max={10000} className="text-input" style={{marginBottom:0}}
                            value={grantAmount} onChange={e=>setGrantAmount(Math.max(1,parseInt(e.target.value)||1))} />
                        </div>
                        <div>
                          <div className="form-label">{grantRecipient==='_email'?'Recipient Email':'Note / Reason (optional)'}</div>
                          <input className="text-input" style={{marginBottom:0}}
                            placeholder={grantRecipient==='_email'?'student@school.edu':'e.g. Great participation today'}
                            value={grantNote} onChange={e=>setGrantNote(e.target.value)} />
                        </div>
                        <button className="btn btn-accent" onClick={async()=>{
                          if (!activeClass||granting) return;
                          setGranting(true);
                          const body={classId:activeClass.id,amount:grantAmount};
                          if(grantRecipient==='all') body.all=true;
                          else if(grantRecipient==='_email'){ body.email=grantNote.trim(); }
                          else body.studentId=grantRecipient;
                          if(grantRecipient!=='_email') body.note=grantNote.trim()||'Teacher award';
                          else body.note='Teacher award';
                          const res=await fetch('/api/teacher/grant-tokens',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json()).catch(()=>({error:'Network error'}));
                          setGranting(false);
                          if(res.error){setActionMsg({type:'error',msg:res.error});}
                          else{
                            const who=grantRecipient==='all'?`all ${res.count} student${res.count!==1?'s':''}`:grantRecipient==='_email'?grantNote.trim():humans.find(s=>s.id===grantRecipient)?.name||'student';
                            setActionMsg({type:'success',msg:`✅ ${grantAmount} token${grantAmount!==1?'s':''} awarded to ${who}`});
                            if(grantRecipient!=='_email') setGrantNote('');
                          }
                          setTimeout(()=>setActionMsg(null),3500);
                        }} disabled={granting||(grantRecipient==='_email'&&!grantNote.trim())} style={{whiteSpace:'nowrap'}}>
                          {granting?'Awarding…':'+ Award'}
                        </button>
                      </div>
                      <div style={{fontSize:10,color:'var(--muted)'}}>
                        Each token = $1.00 in the student wallet • To award yourself, add your email in the Students tab first
                      </div>
                    </div>

                    {/* Staking */}
                    <div className="ctrl-card" style={{gridColumn:'1/-1'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                        <div className="ctrl-title" style={{marginBottom:0}}>⛏️ Virtual Staking</div>
                        <div className={`status-pill ${stakingConfig.enabled?'on':'off'}`} style={{margin:0}}>{stakingConfig.enabled?'🟢 ENABLED':'⚪ DISABLED'}</div>
                      </div>
                      <div className="ctrl-desc">
                        Students lock Proof-of-Stake coins (ETH, SOL, ADA, DOT, ATOM, and more) to earn simulated APY. Staked coins leave their tradeable balance — rewards are credited daily as cash. BTC, DOGE, and other Proof-of-Work coins cannot be staked.
                      </div>
                      {stakingStats && stakingStats.activePositions > 0 && (
                        <div style={{background:'rgba(0,229,160,.06)',border:'1px solid rgba(0,229,160,.15)',borderRadius:12,padding:'10px 14px',marginBottom:14,display:'flex',gap:24,flexWrap:'wrap',fontSize:12}}>
                          <span><span style={{color:'var(--muted)'}}>Active positions: </span><strong style={{color:'var(--accent)'}}>{stakingStats.activePositions}</strong></span>
                          <span><span style={{color:'var(--muted)'}}>Total earned: </span><strong style={{color:'var(--accent)'}}>{'$'+parseFloat(stakingStats.totalEarned||0).toFixed(2)}</strong></span>
                          {Object.entries(stakingStats.byCoin||{}).map(([coin,info])=>(
                            <span key={coin}><span style={{color:'var(--muted)'}}>{coin}: </span><strong>{info.count} positions</strong></span>
                          ))}
                        </div>
                      )}
                      <div className="btn-row">
                        <button className={`btn ${stakingConfig.enabled?'btn-red':'btn-green'}`} onClick={()=>setStakingConfig(c=>({...c,enabled:!c.enabled}))}>
                          {stakingConfig.enabled?'Disable Staking':'Enable Staking'}
                        </button>
                        <button className="btn btn-gold" onClick={saveStakingConfig} disabled={stakingSaving}>
                          {stakingSaving?'Saving...':'💾 Save'}
                        </button>
                        <a href="/stake" style={{textDecoration:'none'}}><button className="btn btn-muted">↗ View Staking Page</button></a>
                      </div>
                    </div>

                    {/* Staking migration banner */}
                    {!stakingReady && (
                      <div className="ctrl-card" style={{gridColumn:'1/-1',border:'1px solid rgba(96,165,250,.4)',background:'rgba(96,165,250,.06)'}}>
                        <div className="ctrl-title" style={{color:'#60a5fa',marginBottom:6}}>⛏️ Staking — Setup Required</div>
                        <div className="ctrl-desc">Virtual staking needs two new database tables (<code>staking_positions</code> and <code>staking_config</code>). Click to create them automatically.</div>
                        <button className="btn" style={{background:'rgba(96,165,250,.2)',color:'#60a5fa',border:'1px solid rgba(96,165,250,.4)'}} onClick={runStakingMigration} disabled={migratingStaking}>
                          {migratingStaking?'Creating tables...':'🔧 Apply Staking Migration'}
                        </button>
                      </div>
                    )}

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
                    {!ordersTableReady && (
                      <div className="ctrl-card" style={{gridColumn:'1/-1',border:'1px solid rgba(96,165,250,.4)',background:'rgba(96,165,250,.06)'}}>
                        <div className="ctrl-title" style={{color:'#60a5fa',marginBottom:6}}>🎯 Limit Orders — Setup Required</div>
                        <div className="ctrl-desc">Limit orders need a new <code>pending_orders</code> table. Click to create it automatically.</div>
                        <button className="btn" style={{background:'rgba(96,165,250,.2)',color:'#60a5fa',border:'1px solid rgba(96,165,250,.4)'}} onClick={runOrdersMigration} disabled={migratingOrders}>
                          {migratingOrders?'Creating table...':'🔧 Create Limit Orders Table'}
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
                    {/* ── Satoshi Botomoto ── */}
                    <div className="ctrl-card" style={{gridColumn:'1/-1',border:'1px solid rgba(139,92,246,.4)',background:'rgba(139,92,246,.05)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16,flexWrap:'wrap'}}>
                        <span style={{fontSize:28}}>🤖</span>
                        <div>
                          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:17,color:'#a78bfa'}}>Satoshi Botomoto</div>
                          <div className="ctrl-desc" style={{marginTop:2}}>An AI trading bot that competes in your simulation — students earn the <strong>Beat The Bot</strong> badge by finishing above it.</div>
                        </div>
                        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10}}>
                          <div className={`status-pill ${botConfig.enabled?'on':'off'}`}>{botConfig.enabled?'🟢 ACTIVE':'⚪ OFF'}</div>
                          <button className={`btn ${botConfig.enabled?'btn-red':'btn-green'}`} style={{fontSize:11,padding:'5px 14px'}} onClick={()=>setBotConfig(c=>({...c,enabled:!c.enabled}))}>
                            {botConfig.enabled?'Disable':'Enable Bot'}
                          </button>
                        </div>
                      </div>

                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12,marginBottom:16}}>
                        <div>
                          <div className="form-label">Strategy</div>
                          <select className="text-input" style={{marginBottom:0}} value={botConfig.strategy} onChange={e=>setBotConfig(c=>({...c,strategy:e.target.value}))}>
                            <option value="momentum">📈 Momentum — top 24h gainers</option>
                            <option value="contrarian">📉 Dip Hunter — biggest 24h losers</option>
                            <option value="trend">🌊 Trend Follower — 1h+24h+7d all up</option>
                            <option value="hodl">🧘 Crypto Turtle — HODL BTC/ETH/SOL</option>
                            <option value="sector">🗂️ Sector Rotator — best sector's top coin</option>
                          </select>
                        </div>
                        <div>
                          <div className="form-label">Risk Level</div>
                          <select className="text-input" style={{marginBottom:0}} value={botConfig.risk} onChange={e=>setBotConfig(c=>({...c,risk:e.target.value}))}>
                            <option value="conservative">🛡️ Conservative (5% per trade)</option>
                            <option value="moderate">⚖️ Moderate (15% per trade)</option>
                            <option value="aggressive">🔥 Aggressive (30% per trade)</option>
                          </select>
                        </div>
                        <div>
                          <div className="form-label">Max Positions</div>
                          <select className="text-input" style={{marginBottom:0}} value={botConfig.maxPositions} onChange={e=>setBotConfig(c=>({...c,maxPositions:parseInt(e.target.value)}))}>
                            {[2,3,5,7,10].map(n=><option key={n} value={n}>{n} coins max</option>)}
                          </select>
                        </div>
                        <div>
                          <div className="form-label">Buy Signal (min 24h %)</div>
                          <input className="text-input" style={{marginBottom:0}} type="number" step="0.5" min="0" max="20" value={botConfig.buyThreshold} onChange={e=>setBotConfig(c=>({...c,buyThreshold:parseFloat(e.target.value)||0}))} />
                        </div>
                        <div>
                          <div className="form-label">Take Profit % <span style={{color:'#475569',fontWeight:400}}>— sell when up this much</span></div>
                          <input className="text-input" style={{marginBottom:0}} type="number" step="1" min="1" max="100" value={botConfig.takeProfit} onChange={e=>setBotConfig(c=>({...c,takeProfit:parseFloat(e.target.value)||10}))} />
                        </div>
                        <div>
                          <div className="form-label">Stop Loss % <span style={{color:'#475569',fontWeight:400}}>— sell when down this much</span></div>
                          <input className="text-input" style={{marginBottom:0}} type="number" step="1" min="1" max="50" value={botConfig.stopLoss} onChange={e=>setBotConfig(c=>({...c,stopLoss:parseFloat(e.target.value)||10}))} />
                        </div>
                        <div>
                          <div className="form-label">Starting Balance ($) <span style={{color:'#475569',fontWeight:400}}>— bot's seed money</span></div>
                          <input className="text-input" style={{marginBottom:0}} type="number" step="500" min="1000" max="1000000" value={botConfig.seedMoney||10000} onChange={e=>setBotConfig(c=>({...c,seedMoney:parseFloat(e.target.value)||10000}))} />
                        </div>
                      </div>

                      {botStats && (
                        <div style={{background:'rgba(139,92,246,.1)',border:'1px solid rgba(139,92,246,.25)',borderRadius:12,padding:'12px 16px',marginBottom:14,display:'flex',gap:24,flexWrap:'wrap'}}>
                          <div><div style={{fontSize:9,color:'#7c3aed',letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:3}}>Portfolio</div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:botStats.returnPct>=0?'#00e5a0':'#f43f5e'}}>${Math.round(botStats.totalValue).toLocaleString()} <span style={{fontSize:11}}>{botStats.returnPct>=0?'+':''}{botStats.returnPct?.toFixed(1)}%</span></div></div>
                          <div><div style={{fontSize:9,color:'#7c3aed',letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:3}}>Cash</div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16}}>${Math.round(botStats.cash).toLocaleString()}</div></div>
                          <div><div style={{fontSize:9,color:'#7c3aed',letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:3}}>Trades</div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16}}>{botStats.tradeCount}</div></div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:9,color:'#7c3aed',letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:3}}>Holdings</div>
                            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                              {botStats.holdings?.length ? botStats.holdings.map(h=>(
                                <span key={h.coin} style={{fontSize:11,padding:'2px 8px',borderRadius:6,background:'rgba(139,92,246,.15)',color:h.pnlPct>=0?'#a78bfa':'#f87171'}}>
                                  {h.coin} {h.pnlPct>=0?'+':''}{h.pnlPct?.toFixed(1)}%
                                </span>
                              )) : <span style={{fontSize:11,color:'#475569'}}>No holdings</span>}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="btn-row">
                        <button className="btn btn-gold" onClick={saveBotConfig} disabled={botSaving}>{botSaving?'Saving...':'💾 Save Bot Settings'}</button>
                        {botStats && <button className="btn btn-muted" style={{fontSize:11}} onClick={resetBot}>🔄 Reset Bot</button>}
                      </div>
                    </div>

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
                                      {classes.length > 1 && <button className="btn btn-muted" style={{padding:'4px 10px',fontSize:10}} onClick={()=>{setMoveStudent(s);setMoveTargetClass('');}}>⇄ Move</button>}
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

      {/* SQL modal — shown when run_sql RPC isn't available */}
      {stakingSql && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}} onClick={()=>setStakingSql(null)}>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:20,padding:28,maxWidth:640,width:'100%',maxHeight:'80vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,marginBottom:8,color:'var(--text)'}}>⛏️ Manual Staking Migration</div>
            <div style={{fontSize:12,color:'#94a3b8',marginBottom:16,lineHeight:1.6}}>
              The <code>run_sql</code> function isn't available in your Supabase project. Copy the SQL below, paste it into your <strong>Supabase dashboard → SQL Editor</strong>, and run it. Then refresh this page.
            </div>
            <pre style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:12,padding:16,fontSize:11,color:'var(--accent)',overflowX:'auto',whiteSpace:'pre-wrap',wordBreak:'break-all',marginBottom:16}}>
              {stakingSql}
            </pre>
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-accent" style={{flex:1}} onClick={()=>{navigator.clipboard?.writeText(stakingSql);setActionMsg({type:'success',msg:'SQL copied to clipboard!'});setTimeout(()=>setActionMsg(null),2500);}}>
                📋 Copy SQL
              </button>
              <button className="btn btn-muted" onClick={()=>{setStakingSql(null);setStakingReady(true);}}>
                ✓ I ran it
              </button>
              <button className="btn btn-muted" onClick={()=>setStakingSql(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Move Student Modal */}
      {moveStudent && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={()=>setMoveStudent(null)}>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:20,padding:28,minWidth:320,maxWidth:400}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,marginBottom:16,color:'var(--text)'}}>Move {moveStudent.name}</div>
            <div style={{fontSize:12,color:'#94a3b8',marginBottom:12}}>Select the class to move this student to. Their portfolio, holdings, and trade history will follow.</div>
            <select value={moveTargetClass} onChange={e=>setMoveTargetClass(e.target.value)} style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid var(--border)',background:'var(--surface2)',color:'var(--text)',fontSize:13,marginBottom:16}}>
              <option value="">— Select target class —</option>
              {classes.filter(c=>c.id!==activeClass?.id).map(c=>(
                <option key={c.id} value={c.id}>{c.name} · {c.semester}</option>
              ))}
            </select>
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-accent" style={{flex:1}} disabled={!moveTargetClass} onClick={doMoveStudent}>Move Student</button>
              <button className="btn btn-muted" onClick={()=>setMoveStudent(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}