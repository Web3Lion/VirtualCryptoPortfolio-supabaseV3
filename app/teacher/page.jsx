"use client";
import { useState, useEffect, Fragment } from "react";
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
  const [controlsTab, setControlsTab] = useState('market');
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
  const [rewardConfig, setRewardConfig] = useState({ enabled: false, badge_reward_tokens: 50, lesson_reward_tokens: 25, crush_enabled: true, crush_points_per_token: 100, crush_max_tokens_per_day: 50, higher_lower_enabled: true, higher_lower_tokens_per_correct: 10, miner_enabled: true, miner_points_per_token: 50, miner_max_tokens_per_day: 40, spin_enabled: true, bull_bear_enabled: true, bull_bear_tokens_per_correct: 5, bull_bear_max_tokens_per_day: 50 });
  const [rewardSaving, setRewardSaving] = useState(false);
  const [tradeSettings, setTradeSettings] = useState({ marginEnabled: false, marginMult: 2, shortEnabled: false });
  const [tradeSettingsSaving, setTradeSettingsSaving] = useState(false);
  const [schemaReady, setSchemaReady] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [ordersTableReady, setOrdersTableReady] = useState(true);
  const [migratingOrders, setMigratingOrders] = useState(false);
  const [higherLowerTableReady, setHigherLowerTableReady] = useState(true);
  const [migratingHigherLower, setMigratingHigherLower] = useState(false);
  const [gameRewardsMigrated, setGameRewardsMigrated] = useState(true);
  const [migratingGameRewards, setMigratingGameRewards] = useState(false);
  const [aiConfigMigrated, setAiConfigMigrated] = useState(true);
  const [migratingAiConfig, setMigratingAiConfig] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCooldown, setRefreshCooldown] = useState(null);
  const [refreshCountdown, setRefreshCountdown] = useState('');
  const [refreshResult, setRefreshResult] = useState(null);
  const [editingClassName, setEditingClassName] = useState(false);
  const [classNameInput, setClassNameInput] = useState('');
  const [moveStudent, setMoveStudent] = useState(null);
  const [moveTargetClass, setMoveTargetClass] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [expandedStudentData, setExpandedStudentData] = useState({});
  const [expandedStudentLoading, setExpandedStudentLoading] = useState(null);
  const [lessonProgress, setLessonProgress] = useState(null);
  const [lessonProgressLoading, setLessonProgressLoading] = useState(false);
  const [studentsSubView, setStudentsSubView] = useState('roster');
  const [pastSeasons, setPastSeasons] = useState([]);
  const [seasonEnding, setSeasonEnding] = useState(false);
  const [seasonResult, setSeasonResult] = useState(null);
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
  const [stakingSql, setStakingSql]         = useState(null);
  const [analyticsData, setAnalyticsData]   = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [schedBullAt, setSchedBullAt]       = useState('');
  const [schedBullMult, setSchedBullMult]   = useState(2);
  const [schedFlashAt, setSchedFlashAt]     = useState('');
  const [schedFlashCoin, setSchedFlashCoin] = useState('');
  const [schedFlashPct, setSchedFlashPct]   = useState('20');
  const [schedFlashMins, setSchedFlashMins] = useState('30');
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementColor, setAnnouncementColor] = useState('blue');
  const [assignments, setAssignments] = useState([]);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDesc, setAssignmentDesc] = useState('');
  const [assignmentDue, setAssignmentDue] = useState('');
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [pinnedMsg, setPinnedMsg] = useState('');
  const [currentPinned, setCurrentPinned] = useState(null);
  const [pinnedSaving, setPinnedSaving] = useState(false);
  const [weeklyChallenges, setWeeklyChallenges] = useState([]);
  const [wcTitle, setWcTitle] = useState('');
  const [wcDesc, setWcDesc] = useState('');
  const [wcType, setWcType] = useState('min_trades');
  const [wcTarget, setWcTarget] = useState('3');
  const [wcTokens, setWcTokens] = useState('100');
  const [wcStartsAt, setWcStartsAt] = useState('');
  const [wcEndsAt, setWcEndsAt] = useState('');
  const [wcLoading, setWcLoading] = useState(false);
  const [scenarioDate, setScenarioDate] = useState('');
  const [scenarioLabel, setScenarioLabel] = useState('');
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [gradesData, setGradesData] = useState(null);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [gradesSortCol, setGradesSortCol] = useState('rank');
  const [gradesSortDir, setGradesSortDir] = useState('asc');
  const [editingNote, setEditingNote] = useState(null); // { email, value }
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentStart, setTournamentStart] = useState('');
  const [tournamentEnd, setTournamentEnd] = useState('');
  const [tournamentPrize, setTournamentPrize] = useState('100');
  const [tournaments, setTournaments] = useState([]);
  const [tournamentLoading, setTournamentLoading] = useState(false);
  const [migrationSql, setMigrationSql]         = useState(null);

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
          fetch('/api/admin/migrate-higher-lower').then(r=>r.ok?r.json():null).then(d=>{ if(d && !d.tableExists) setHigherLowerTableReady(false); }).catch(()=>{});
          fetch('/api/admin/migrate-game-rewards').then(r=>r.ok?r.json():null).then(d=>{ if(d && !d.migrated) setGameRewardsMigrated(false); }).catch(()=>{});
          fetch('/api/admin/migrate-ai-config').then(r=>r.ok?r.json():null).then(d=>{ if(d && !d.migrated) setAiConfigMigrated(false); }).catch(()=>{});
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

  const loadSeasons = async (classId) => {
    try {
      const res = await fetch('/api/teacher/seasons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ classId }) });
      if (res.ok) setPastSeasons(await res.json());
    } catch {}
  };

  const toggleStudentExpand = async (student) => {
    if (expandedStudentId === student.id) { setExpandedStudentId(null); return; }
    if (expandedStudentData[student.id]) { setExpandedStudentId(student.id); return; }
    setExpandedStudentLoading(student.id);
    setExpandedStudentId(student.id);
    try {
      const res = await fetch(`/api/leaderboard/student?studentId=${student.id}&classId=${activeClass?.id}`);
      if (res.ok) { const data = await res.json(); setExpandedStudentData(d => ({ ...d, [student.id]: data })); }
    } catch {}
    setExpandedStudentLoading(null);
  };

  const loadLessonProgress = async (classId) => {
    setLessonProgressLoading(true);
    try {
      const res = await fetch('/api/teacher/lesson-progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ classId }) });
      if (res.ok) setLessonProgress(await res.json());
    } catch {}
    setLessonProgressLoading(false);
  };

  const endSeason = async () => {
    if (!activeClass) return;
    if (!confirm(`End the current season for "${activeClass.name}"?\n\nFinal standings will be saved, then all portfolios reset to $${activeClass.seed_money?.toLocaleString() || '10,000'}.`)) return;
    setSeasonEnding(true);
    setSeasonResult(null);
    try {
      const res = await fetch('/api/teacher/end-season', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ classId: activeClass.id }) });
      const d = await res.json();
      if (res.ok) { setSeasonResult({ type: 'success', msg: `✅ Season ${d.season} archived — ${d.standings?.length} students reset` }); fetchData(activeClass.id); loadSeasons(activeClass.id); }
      else setSeasonResult({ type: 'error', msg: d.error || 'Failed' });
    } catch { setSeasonResult({ type: 'error', msg: 'Network error' }); }
    setSeasonEnding(false);
  };

  const saveRewardConfig = async () => {
    setRewardSaving(true);
    const res = await fetch('/api/teacher/rewards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ classId:activeClass.id, ...rewardConfig })});
    const d = await res.json().catch(()=>({}));
    if(res.ok) setActionMsg({type:'success',msg:'✅ Settings saved'});
    else setActionMsg({type:'error',msg:`Failed to save: ${d.error || res.status}. Run the SQL migration in Supabase if columns are missing.`});
    setRewardSaving(false);
    setTimeout(()=>setActionMsg(null),6000);
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

  const runHigherLowerMigration = async () => {
    setMigratingHigherLower(true);
    const res = await fetch('/api/admin/migrate-higher-lower',{method:'POST'});
    const data = await res.json();
    if(res.ok) { setHigherLowerTableReady(true); setActionMsg({type:'success',msg:'✅ Higher / Lower game table created'}); }
    else setActionMsg({type:'error',msg:data.sql ? `Run this SQL in Supabase dashboard:\n${data.sql}` : data.error||'Migration failed'});
    setMigratingHigherLower(false);
    setTimeout(()=>setActionMsg(null),8000);
  };

  const runGameRewardsMigration = async () => {
    setMigratingGameRewards(true);
    const res = await fetch('/api/admin/migrate-game-rewards',{method:'POST'});
    const data = await res.json();
    if(res.ok) { setGameRewardsMigrated(true); setActionMsg({type:'success',msg:'✅ Per-game reward settings enabled'}); setTimeout(()=>setActionMsg(null),4000); }
    else if(data.sql) setMigrationSql(data.sql);
    else { setActionMsg({type:'error',msg:data.error||'Migration failed'}); setTimeout(()=>setActionMsg(null),6000); }
    setMigratingGameRewards(false);
  };

  const runAiConfigMigration = async () => {
    setMigratingAiConfig(true);
    const res = await fetch('/api/admin/migrate-ai-config',{method:'POST'});
    const data = await res.json();
    if(res.ok) { setAiConfigMigrated(true); setActionMsg({type:'success',msg:'✅ AI Coach settings enabled'}); setTimeout(()=>setActionMsg(null),4000); }
    else if(data.sql) setMigrationSql(data.sql);
    else { setActionMsg({type:'error',msg:data.error||'Migration failed'}); setTimeout(()=>setActionMsg(null),6000); }
    setMigratingAiConfig(false);
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

  const fetchAnalytics = async (classId) => {
    if (!classId) return;
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/teacher/analytics?classId=${classId}`);
      if (res.ok) setAnalyticsData(await res.json());
    } catch(e) { console.error(e); }
    setAnalyticsLoading(false);
  };

  const humans    = students.filter(s=>!s.isBot);
  const classAvg  = humans.length ? humans.reduce((s,r)=>s+clean(r.returnPct),0)/humans.length : 0;
  const profitable = humans.filter(s=>clean(s.pl)>0).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
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
        @media(max-width:640px){
          .stats-grid{grid-template-columns:1fr 1fr}
          .controls-grid{grid-template-columns:1fr}
          .form-row{grid-template-columns:1fr}
          .page{padding:16px 12px}
        }
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
              <button key={c.id} className={`class-pill${activeClass?.id===c.id?' active':''}`} onClick={()=>{ setActiveClass(c); fetchData(c.id); setExpandedStudentId(null); setExpandedStudentData({}); setLessonProgress(null); }}>
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
              {['overview','controls','students','analytics','grades','coins','news'].map(s=>(
                <button key={s} className={`stab${activeSection===s?' active':''}`} onClick={()=>{
                  setActiveSection(s);
                  if(s==='analytics') fetchAnalytics(activeClass?.id);
                  if(s==='students') { loadSeasons(activeClass?.id); setStudentsSubView('roster'); }
                  if(s==='grades'){ setGradesData(null); setGradesLoading(true); fetch(`/api/teacher/export?classId=${activeClass?.id}&format=json`).then(r=>r.ok?r.json():null).then(d=>{if(d)setGradesData(d);setGradesLoading(false);}).catch(()=>setGradesLoading(false)); }
                }}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>
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
                          <button className="btn btn-muted" style={{color:'#00e5a0',border:'1px solid rgba(0,229,160,.3)'}} onClick={async()=>{
                            setActionMsg({type:'pending',msg:'Syncing lesson videos from source files…'});
                            const res = await fetch(`/api/admin/sync-learn-videos?classId=${activeClass?.id}`,{method:'POST'});
                            const d = await res.json().catch(()=>({}));
                            if(res.ok) setActionMsg({type:'success',msg:`✅ Videos synced — ${d.updated} updated, ${d.alreadyCurrent} already current`});
                            else setActionMsg({type:'error',msg:d.error||'Sync failed'});
                            setTimeout(()=>setActionMsg(null),6000);
                          }}>🎬 Sync Lesson Videos</button>
                          <button className="btn btn-muted" onClick={()=>router.push('/teacher/lesson-editor')}>📝 Edit a Lesson</button>
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
                  <>
                  {/* ── DB migration warning ── */}
                  {(!aiConfigMigrated || !gameRewardsMigrated) && (
                    <div style={{display:'flex',alignItems:'center',gap:10,background:'rgba(245,158,11,.08)',border:'1px solid rgba(245,158,11,.3)',borderRadius:10,padding:'10px 14px',marginBottom:10,flexWrap:'wrap'}}>
                      <span style={{fontSize:13}}>⚠️</span>
                      <span style={{fontSize:12,color:'#fbbf24',flex:1}}>Your database needs a one-time schema update before settings will save.</span>
                      <button className="btn" style={{background:'rgba(245,158,11,.2)',color:'#fbbf24',border:'1px solid rgba(245,158,11,.4)',fontSize:11,padding:'5px 14px',whiteSpace:'nowrap'}}
                        onClick={()=>setMigrationSql(`ALTER TABLE class_reward_config
  ADD COLUMN IF NOT EXISTS crush_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS crush_points_per_token integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS crush_max_tokens_per_day integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS higher_lower_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS higher_lower_tokens_per_correct integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS miner_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS miner_points_per_token integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS miner_max_tokens_per_day integer DEFAULT 40,
  ADD COLUMN IF NOT EXISTS spin_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS bull_bear_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS bull_bear_tokens_per_correct integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS bull_bear_max_tokens_per_day integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS ai_coach_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_coach_daily_quota integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS ai_allow_student_key boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_student_key_limit integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pinned_message text,
  ADD COLUMN IF NOT EXISTS pinned_updated_at timestamptz;

CREATE TABLE IF NOT EXISTS student_ai_settings (
  student_id uuid PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  gemini_api_key text,
  updated_at timestamptz DEFAULT now()
);`)}>
                        🔧 Get Migration SQL
                      </button>
                    </div>
                  )}

                  {/* ── Controls sub-nav ── */}
                  <div style={{display:'flex',gap:3,marginBottom:8,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:4}}>
                    {[
                      ['market',     '🏪','Market',     'Freeze · Bull Run · Flash Sale · Simulation'],
                      ['events',     '🎭','Events',     'Scenarios · Announcements · Tournaments'],
                      ['trading',    '📊','Trading',    'Leverage · Short Selling · Staking · Margin Call'],
                      ['rewards',    '🎁','Rewards',    'ClassReward config · Grant tokens'],
                      ['challenges', '🏆','Challenges', 'Weekly challenges for students'],
                      ['ai',         '🤖','AI Coach',   'AI Trade Coach · Portfolio Review · Gemini settings'],
                      ['bot',        '🦾','Bot',        'Satoshi Botomoto AI competitor'],
                    ].map(([k,emoji,label,desc])=>(
                      <button key={k} title={desc} onClick={()=>{
                        setControlsTab(k);
                        if(k==='events'&&activeClass?.id) {
                          fetch(`/api/assignments?classId=${activeClass.id}`).then(r=>r.ok?r.json():[]).then(d=>Array.isArray(d)&&setAssignments(d)).catch(()=>{});
                          fetch(`/api/teacher/pinned-post?classId=${activeClass.id}`).then(r=>r.ok?r.json():null).then(d=>{ if(d) { setCurrentPinned(d.pinned); setPinnedMsg(d.pinned?.message||''); } }).catch(()=>{});
                        }
                        if(k==='challenges'&&activeClass?.id) fetch(`/api/teacher/weekly-challenge?classId=${activeClass.id}`).then(r=>r.ok?r.json():{challenges:[]}).then(d=>setWeeklyChallenges(d.challenges||[])).catch(()=>{});
                      }} style={{flex:1,padding:'8px 6px',borderRadius:8,border:'none',fontFamily:"'DM Mono',monospace",fontSize:11,cursor:'pointer',transition:'all .15s',background:controlsTab===k?'var(--surface2)':'transparent',color:controlsTab===k?'var(--gold)':'var(--muted)',fontWeight:controlsTab===k?700:400,whiteSpace:'nowrap'}}>
                        {emoji} {label}
                      </button>
                    ))}
                  </div>
                  <div style={{fontSize:10,color:'var(--muted)',marginBottom:16,paddingLeft:4}}>
                    {{'market':'Control the live simulation — freeze trading, trigger market events, manage simulation state.','events':'Special classroom events — historical scenarios, class announcements, and tournaments.','trading':'Advanced trading features — leverage, short selling, staking, and risk controls.','rewards':'ClassReward token system — configure earnings and manually award tokens.','challenges':'Weekly challenges — set a themed goal for your class and award tokens on completion.','ai':'AI Trade Coach & Portfolio Review — powered by Google Gemini 1.5 Flash. Enable here, then add GEMINI_API_KEY to Vercel env vars.','bot':'Satoshi Botomoto — an AI trading bot that competes alongside your students.'}[controlsTab]}
                  </div>
                  <div className="controls-grid">

                    {/* ══ MARKET ══ */}
                    {controlsTab==='market' && <>
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
                      <div className="btn-row" style={{marginBottom:10}}>
                        {marketStatus?.bullRun
                          ? <button className="btn btn-red" onClick={()=>teacherAction('bull-run/stop')}>⏹ End</button>
                          : <><button className="btn btn-gold" onClick={()=>teacherAction('bull-run/start',{multiplier:2})}>🐂 2×</button><button className="btn btn-red" onClick={()=>teacherAction('bull-run/start',{multiplier:3})}>🚀 3×</button></>}
                      </div>
                      {!marketStatus?.bullRun && (
                        <div style={{borderTop:'1px solid var(--border)',paddingTop:10}}>
                          <div className="tools-label">⏰ Schedule</div>
                          {marketStatus?.bullRunScheduledAt ? (
                            <div style={{fontSize:11,color:'var(--gold)',marginBottom:8}}>
                              Scheduled: {new Date(marketStatus.bullRunScheduledAt).toLocaleString()} ({marketStatus.bullRunScheduledMult}×)
                            </div>
                          ) : null}
                          <div className="form-row" style={{marginBottom:6}}>
                            <input type="datetime-local" className="text-input" style={{marginBottom:0}} value={schedBullAt} onChange={e=>setSchedBullAt(e.target.value)}/>
                            <select className="text-input" style={{marginBottom:0}} value={schedBullMult} onChange={e=>setSchedBullMult(parseInt(e.target.value))}>
                              <option value={2}>2×</option><option value={3}>3×</option>
                            </select>
                          </div>
                          <div className="btn-row">
                            {marketStatus?.bullRunScheduledAt
                              ? <button className="btn btn-red" style={{fontSize:11}} onClick={()=>teacherAction('bull-run/cancel-schedule')}>✕ Cancel Schedule</button>
                              : <button className="btn btn-muted" style={{fontSize:11}} onClick={()=>{if(schedBullAt)teacherAction('bull-run/schedule',{scheduledAt:schedBullAt,multiplier:schedBullMult})}}>Schedule</button>
                            }
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="ctrl-card" style={{border:marketStatus?.flashCrash?'1px solid rgba(244,63,94,.4)':undefined,background:marketStatus?.flashCrash?'rgba(244,63,94,.04)':undefined}}>
                      <div className="ctrl-title">📉 Flash Crash</div>
                      <div className="ctrl-desc">All prices drop to a fraction — simulates a market crash.</div>
                      <div className={`status-pill ${marketStatus?.flashCrash?'warn':'off'}`} style={marketStatus?.flashCrash?{background:'rgba(244,63,94,.15)',color:'var(--down)',borderColor:'rgba(244,63,94,.3)'}:{}}>{marketStatus?.flashCrash?`🔴 CRASH — prices at ${Math.round((marketStatus.flashCrashMult||0.5)*100)}%`:'⚪ INACTIVE'}</div>
                      <div className="btn-row">
                        {marketStatus?.flashCrash
                          ? <button className="btn btn-green" onClick={()=>teacherAction('flash-crash/stop')}>⏹ End Crash</button>
                          : <>
                              <button className="btn btn-red" onClick={()=>teacherAction('flash-crash/start',{multiplier:0.5})}>📉 −50%</button>
                              <button className="btn btn-red" onClick={()=>teacherAction('flash-crash/start',{multiplier:0.75})}>📉 −25%</button>
                              <button className="btn btn-red" onClick={()=>teacherAction('flash-crash/start',{multiplier:0.9})}>📉 −10%</button>
                            </>
                        }
                      </div>
                    </div>
                    <div className="ctrl-card">
                      <div className="ctrl-title">⚡ Flash Sale</div>
                      <div className="ctrl-desc">Discount one coin temporarily.</div>
                      <div className={`status-pill ${marketStatus?.flashSale?'warn':'off'}`}>{marketStatus?.flashSale?`🟡 ${marketStatus.flashSale.coin}`:'⚪ NONE'}</div>
                      {!marketStatus?.flashSale&&<div className="form-row"><input className="text-input" placeholder="Coin (BTC)" value={flashCoin} onChange={e=>setFlashCoin(e.target.value)} style={{marginBottom:0}}/><input className="text-input" placeholder="% off (20)" value={flashPct} onChange={e=>setFlashPct(e.target.value)} style={{marginBottom:0}}/></div>}
                      {!marketStatus?.flashSale&&<div style={{height:10}}/>}
                      <div className="btn-row" style={{marginBottom:10}}>
                        {marketStatus?.flashSale
                          ? <button className="btn btn-muted" onClick={()=>teacherAction('flash-sale/stop')}>⏹ End</button>
                          : <button className="btn btn-gold" onClick={()=>{if(flashCoin)teacherAction('flash-sale/start',{coin:flashCoin.toUpperCase(),discountPct:parseFloat(flashPct)||20,minutes:30})}}>⚡ Start</button>}
                      </div>
                      {!marketStatus?.flashSale && (
                        <div style={{borderTop:'1px solid var(--border)',paddingTop:10}}>
                          <div className="tools-label">⏰ Schedule</div>
                          {marketStatus?.flashSaleScheduledAt ? (
                            <div style={{fontSize:11,color:'var(--gold)',marginBottom:8}}>
                              Scheduled: {new Date(marketStatus.flashSaleScheduledAt).toLocaleString()} — {marketStatus.flashSaleScheduledCoin} {marketStatus.flashSaleScheduledPct}% off
                            </div>
                          ) : null}
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:6}}>
                            <input type="datetime-local" className="text-input" style={{marginBottom:0}} value={schedFlashAt} onChange={e=>setSchedFlashAt(e.target.value)}/>
                            <input className="text-input" placeholder="Coin (ETH)" style={{marginBottom:0}} value={schedFlashCoin} onChange={e=>setSchedFlashCoin(e.target.value)}/>
                            <input className="text-input" placeholder="% off (20)" style={{marginBottom:0}} value={schedFlashPct} onChange={e=>setSchedFlashPct(e.target.value)}/>
                            <input className="text-input" placeholder="Duration mins (30)" style={{marginBottom:0}} value={schedFlashMins} onChange={e=>setSchedFlashMins(e.target.value)}/>
                          </div>
                          <div className="btn-row">
                            {marketStatus?.flashSaleScheduledAt
                              ? <button className="btn btn-red" style={{fontSize:11}} onClick={()=>teacherAction('flash-sale/cancel-schedule')}>✕ Cancel Schedule</button>
                              : <button className="btn btn-muted" style={{fontSize:11}} onClick={()=>{if(schedFlashAt&&schedFlashCoin)teacherAction('flash-sale/schedule',{scheduledAt:schedFlashAt,coin:schedFlashCoin,discountPct:parseFloat(schedFlashPct)||20,minutes:parseInt(schedFlashMins)||30})}}>Schedule</button>
                            }
                          </div>
                        </div>
                      )}
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
                    </>}

                    {/* ══ EVENTS ══ */}
                    {controlsTab==='events' && <>
                    {/* Pinned Post */}
                    <div className="ctrl-card" style={{gridColumn:'1/-1',border:'1px solid rgba(245,158,11,.25)',background:'rgba(245,158,11,.04)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                        <div className="ctrl-title" style={{marginBottom:0}}>📌 Pinned Post</div>
                        <span style={{fontSize:10,color:'var(--muted)'}}>Shown at the top of the class feed for all students</span>
                        {currentPinned && <span style={{fontSize:10,background:'rgba(245,158,11,.15)',color:'#f59e0b',borderRadius:20,padding:'2px 8px',fontWeight:700,marginLeft:'auto'}}>LIVE</span>}
                      </div>
                      <textarea
                        rows={3}
                        placeholder="e.g. 🔔 Quiz on Friday — make sure your portfolio is diversified across at least 3 sectors by then!"
                        value={pinnedMsg}
                        onChange={e=>setPinnedMsg(e.target.value)}
                        maxLength={400}
                        style={{width:'100%',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px',color:'var(--text)',fontSize:12,fontFamily:"'DM Mono',monospace",resize:'vertical',marginBottom:8,boxSizing:'border-box'}}
                      />
                      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                        <button className="btn btn-accent" style={{fontSize:11}} disabled={pinnedSaving||!pinnedMsg.trim()} onClick={async()=>{
                          setPinnedSaving(true);
                          const res=await fetch('/api/teacher/pinned-post',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({classId:activeClass?.id,message:pinnedMsg.trim()})});
                          const d=await res.json();
                          if(res.ok){setCurrentPinned({message:pinnedMsg.trim(),updatedAt:new Date().toISOString()});setActionMsg({type:'success',msg:'📌 Post pinned!'});}
                          else setActionMsg({type:'error',msg:d.error||'Failed'});
                          setTimeout(()=>setActionMsg(null),3000);
                          setPinnedSaving(false);
                        }}>{pinnedSaving?'Saving…':'📌 Pin Post'}</button>
                        {currentPinned && (
                          <button className="btn btn-muted" style={{fontSize:11}} onClick={async()=>{
                            setPinnedSaving(true);
                            await fetch('/api/teacher/pinned-post',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({classId:activeClass?.id,message:''})});
                            setCurrentPinned(null);setPinnedMsg('');
                            setActionMsg({type:'success',msg:'📌 Post cleared'});
                            setTimeout(()=>setActionMsg(null),3000);
                            setPinnedSaving(false);
                          }}>✕ Clear Pin</button>
                        )}
                        <span style={{fontSize:10,color:'var(--muted)',marginLeft:'auto'}}>{pinnedMsg.length}/400</span>
                      </div>
                      {currentPinned && (
                        <div style={{marginTop:10,padding:'10px 14px',background:'rgba(245,158,11,.08)',border:'1px solid rgba(245,158,11,.2)',borderRadius:10}}>
                          <div style={{fontSize:10,color:'#f59e0b',fontWeight:700,marginBottom:4}}>Currently pinned:</div>
                          <div style={{fontSize:12,color:'var(--text)',lineHeight:1.5,whiteSpace:'pre-wrap'}}>{currentPinned.message}</div>
                        </div>
                      )}
                    </div>
                    {/* Assignments — full width */}
                    <div className="ctrl-card" style={{gridColumn:'1/-1',border:'1px solid rgba(96,165,250,.25)',background:'rgba(96,165,250,.04)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                        <div className="ctrl-title" style={{marginBottom:0}}>📋 Assignments</div>
                        <span style={{fontSize:10,color:'var(--muted)'}}>Set tasks with due dates — visible on every student's dashboard</span>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr auto',gap:8,marginBottom:8}}>
                        <div>
                          <div className="form-label">Title</div>
                          <input className="text-input" style={{marginBottom:0}} placeholder="e.g. Build a diversified portfolio across 3 sectors" value={assignmentTitle} onChange={e=>setAssignmentTitle(e.target.value)} maxLength={120} />
                        </div>
                        <div>
                          <div className="form-label">Due Date (optional)</div>
                          <input type="datetime-local" className="text-input" style={{marginBottom:0}} value={assignmentDue} onChange={e=>setAssignmentDue(e.target.value)} />
                        </div>
                        <button className="btn btn-accent" style={{alignSelf:'flex-end',fontSize:11}} disabled={!assignmentTitle.trim()||assignmentLoading} onClick={async()=>{
                          setAssignmentLoading(true);
                          const res=await fetch('/api/assignments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create',classId:activeClass?.id,title:assignmentTitle.trim(),description:assignmentDesc.trim()||null,dueAt:assignmentDue||null})});
                          const d=await res.json();
                          if(res.ok){setActionMsg({type:'success',msg:'✅ Assignment posted'});setAssignmentTitle('');setAssignmentDesc('');setAssignmentDue('');fetch(`/api/assignments?classId=${activeClass?.id}`).then(r=>r.ok?r.json():[]).then(d=>Array.isArray(d)&&setAssignments(d));}
                          else setActionMsg({type:'error',msg:d.error||'Failed'});
                          setTimeout(()=>setActionMsg(null),3000);
                          setAssignmentLoading(false);
                        }}>+ Post</button>
                      </div>
                      <input className="text-input" placeholder="Description (optional)" value={assignmentDesc} onChange={e=>setAssignmentDesc(e.target.value)} maxLength={300} />
                      {assignments.length > 0 && (
                        <div style={{marginTop:12,display:'flex',flexDirection:'column',gap:8}}>
                          {assignments.map(a=>(
                            <div key={a.id} style={{background:'rgba(96,165,250,.08)',border:'1px solid rgba(96,165,250,.2)',borderRadius:10,padding:'10px 14px'}}>
                              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                                <div style={{flex:1}}>
                                  <div style={{fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:2}}>{a.title}</div>
                                  {a.description && <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>{a.description}</div>}
                                  {a.due_at && <div style={{fontSize:11,color:'#f59e0b'}}>Due: {new Date(a.due_at).toLocaleString()}</div>}
                                </div>
                                <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                                  {a.totalStudents > 0 && (
                                    <span style={{fontSize:12,color:(a.completions||[]).length===a.totalStudents?'var(--up)':'var(--muted)',fontWeight:600}}>
                                      ✓ {(a.completions||[]).length}/{a.totalStudents}
                                    </span>
                                  )}
                                  <button onClick={async()=>{await fetch('/api/assignments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'archive',id:a.id})});setAssignments(prev=>prev.filter(x=>x.id!==a.id));}} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:16,lineHeight:1}} title="Archive">✕</button>
                                </div>
                              </div>
                              {(a.completions||[]).length > 0 && (
                                <div style={{marginTop:6,display:'flex',gap:6,flexWrap:'wrap'}}>
                                  {a.completions.map(c=>(
                                    <span key={c.studentId} style={{fontSize:10,padding:'2px 8px',borderRadius:6,background:'rgba(0,229,160,.12)',color:'var(--up)',border:'1px solid rgba(0,229,160,.2)',display:'flex',alignItems:'center',gap:4}}>
                                      ✓ {c.name}
                                      <button onClick={async()=>{await fetch('/api/assignments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'unmark-complete',assignmentId:a.id,studentId:c.studentId})});fetch(`/api/assignments?classId=${activeClass?.id}`).then(r=>r.ok?r.json():[]).then(d=>Array.isArray(d)&&setAssignments(d));}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:11,lineHeight:1,padding:0}}>✕</button>
                                    </span>
                                  ))}
                                </div>
                              )}
                              {a.totalStudents > 0 && (a.completions||[]).length < a.totalStudents && (
                                <div style={{marginTop:6,display:'flex',gap:6,flexWrap:'wrap'}}>
                                  {students.filter(s=>!s.isBot&&!(a.completions||[]).find(c=>c.studentId===s.id)).map(s=>(
                                    <button key={s.id} onClick={async()=>{await fetch('/api/assignments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'mark-complete',assignmentId:a.id,studentId:s.id,classId:activeClass?.id})});fetch(`/api/assignments?classId=${activeClass?.id}`).then(r=>r.ok?r.json():[]).then(d=>Array.isArray(d)&&setAssignments(d));}} style={{fontSize:10,padding:'2px 8px',borderRadius:6,background:'rgba(71,85,105,.2)',color:'var(--muted)',border:'1px solid rgba(71,85,105,.3)',cursor:'pointer',fontFamily:"'DM Mono',monospace"}}>
                                      ✓ {s.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Historical Scenario — full width */}
                    <div className="ctrl-card" style={{gridColumn:'1/-1',border: marketStatus?.scenarioActive ? '1px solid rgba(167,139,250,.4)' : undefined, background: marketStatus?.scenarioActive ? 'rgba(167,139,250,.05)' : undefined}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                        <div className="ctrl-title" style={{marginBottom:0}}>📅 Historical Scenario</div>
                        {marketStatus?.scenarioActive && <span style={{fontSize:10,padding:'2px 8px',borderRadius:6,background:'rgba(167,139,250,.2)',color:'#a78bfa',border:'1px solid rgba(167,139,250,.3)',fontWeight:700}}>ACTIVE — {marketStatus.scenarioLabel}</span>}
                      </div>
                      <div className="ctrl-desc">Load prices from a specific past date. Students trade on real historical data. Advance the date manually to move the simulation forward.</div>
                      {!marketStatus?.scenarioActive ? (
                        <>
                          <div style={{marginBottom:8}}>
                            <div className="tools-label" style={{marginBottom:6}}>Preset scenarios</div>
                            <div className="btn-row" style={{flexWrap:'wrap'}}>
                              {[
                                ['2020-03-12','🌊 COVID Crash (Mar 2020)'],
                                ['2021-11-08','🚀 ATH Peak (Nov 2021)'],
                                ['2022-06-13','📉 Luna Crash (Jun 2022)'],
                                ['2022-11-08','🔥 FTX Collapse (Nov 2022)'],
                                ['2024-03-05','₿ BTC Halving Run (Mar 2024)'],
                              ].map(([d,l])=>(
                                <button key={d} className="btn btn-muted" style={{fontSize:10}} onClick={()=>{setScenarioDate(d);setScenarioLabel(l.replace(/^[^ ]+ /,''));}}>
                                  {l}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:8,marginBottom:8}}>
                            <div>
                              <div className="form-label">Date</div>
                              <input type="date" className="text-input" style={{marginBottom:0}} value={scenarioDate} onChange={e=>setScenarioDate(e.target.value)} max={new Date().toISOString().slice(0,10)} />
                            </div>
                            <div>
                              <div className="form-label">Label (optional)</div>
                              <input className="text-input" style={{marginBottom:0}} placeholder="e.g. Market Crash 2022" value={scenarioLabel} onChange={e=>setScenarioLabel(e.target.value)} />
                            </div>
                            <button className="btn btn-gold" style={{alignSelf:'flex-end'}} disabled={!scenarioDate||scenarioLoading} onClick={async()=>{
                              setScenarioLoading(true);
                              const res = await fetch('/api/teacher/scenario',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'load',date:scenarioDate,label:scenarioLabel||scenarioDate})});
                              const d = await res.json();
                              setActionMsg({type:res.ok&&d.success?'success':'error',msg:d.message||(d.failed?.length?`⚠ ${d.failed.join(', ')} failed`:'Done')});
                              setTimeout(()=>setActionMsg(null),5000);
                              fetchData(activeClass?.id);
                              setScenarioLoading(false);
                            }}>
                              {scenarioLoading?'Loading…':'📅 Load Prices'}
                            </button>
                          </div>
                          <div style={{fontSize:10,color:'var(--muted)'}}>Prices load into price_cache — market freeze recommended while loading. Students trade at historical prices until you end the scenario or load the next date.</div>
                        </>
                      ) : (
                        <div className="btn-row">
                          <input type="date" className="text-input" style={{marginBottom:0,width:160}} value={scenarioDate} onChange={e=>setScenarioDate(e.target.value)} max={new Date().toISOString().slice(0,10)} />
                          <button className="btn btn-gold" disabled={!scenarioDate||scenarioLoading} onClick={async()=>{
                            setScenarioLoading(true);
                            const res = await fetch('/api/teacher/scenario',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'load',date:scenarioDate,label:scenarioLabel||scenarioDate})});
                            const d = await res.json();
                            setActionMsg({type:res.ok&&d.success?'success':'error',msg:d.message||'Done'});
                            setTimeout(()=>setActionMsg(null),5000);
                            fetchData(activeClass?.id);
                            setScenarioLoading(false);
                          }}>
                            {scenarioLoading?'Loading…':'⏩ Advance to Date'}
                          </button>
                          <button className="btn btn-red" onClick={async()=>{
                            await fetch('/api/teacher/scenario',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'end'})});
                            setActionMsg({type:'success',msg:'✅ Scenario ended'});
                            setTimeout(()=>setActionMsg(null),3000);
                            fetchData(activeClass?.id);
                          }}>⏹ End Scenario</button>
                        </div>
                      )}
                    </div>

                    {/* Announcement — full width */}
                    <div className="ctrl-card" style={{gridColumn:'1/-1'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                        <div className="ctrl-title" style={{marginBottom:0}}>📢 Class Announcement</div>
                        {marketStatus?.announcement && <span style={{fontSize:10,padding:'2px 8px',borderRadius:6,background:'rgba(0,229,160,.15)',color:'var(--accent)',border:'1px solid rgba(0,229,160,.3)'}}>LIVE</span>}
                      </div>
                      <div className="ctrl-desc">Pins a message to the top of every student's dashboard.</div>
                      {marketStatus?.announcement && (
                        <div style={{background:'rgba(96,165,250,.1)',border:'1px solid rgba(96,165,250,.3)',borderRadius:8,padding:'8px 12px',marginBottom:10,fontSize:12,color:'#93c5fd'}}>
                          📢 {marketStatus.announcement}
                        </div>
                      )}
                      <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,marginBottom:8}}>
                        <input className="text-input" style={{marginBottom:0}} placeholder="e.g. Quiz on Friday — portfolio freeze at 3pm" value={announcementText} onChange={e=>setAnnouncementText(e.target.value)} maxLength={200} />
                        <select className="text-input" style={{marginBottom:0,width:100}} value={announcementColor} onChange={e=>setAnnouncementColor(e.target.value)}>
                          <option value="blue">🔵 Blue</option>
                          <option value="green">🟢 Green</option>
                          <option value="yellow">🟡 Yellow</option>
                          <option value="red">🔴 Red</option>
                        </select>
                      </div>
                      <div className="btn-row">
                        <button className="btn btn-accent" onClick={()=>{if(announcementText.trim())teacherAction('announcement/post',{text:announcementText.trim(),color:announcementColor})}}>📢 Post</button>
                        {marketStatus?.announcement && <button className="btn btn-muted" onClick={()=>teacherAction('announcement/clear')}>✕ Clear</button>}
                      </div>
                    </div>

                    </>}
                    {controlsTab==='rewards' && <>
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

                      </div>

                      {/* ── Per-game settings ── */}
                      <div style={{marginTop:20,paddingTop:20,borderTop:'1px solid var(--border)'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}}>
                          <div style={{fontSize:11,color:'var(--muted)',letterSpacing:2,textTransform:'uppercase'}}>Game Settings</div>
                          {!gameRewardsMigrated && (
                            <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(245,158,11,.08)',border:'1px solid rgba(245,158,11,.3)',borderRadius:8,padding:'6px 10px'}}>
                              <span style={{fontSize:11,color:'#fbbf24'}}>⚠ DB upgrade needed for per-game controls</span>
                              <button className="btn" style={{background:'rgba(245,158,11,.2)',color:'#fbbf24',border:'1px solid rgba(245,158,11,.4)',fontSize:11,padding:'3px 10px'}} onClick={runGameRewardsMigration} disabled={migratingGameRewards}>
                                {migratingGameRewards?'Migrating…':'🔧 Run Migration'}
                              </button>
                            </div>
                          )}
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>

                          {/* 🍬 Crypto Crush */}
                          {[
                            { key:'crush', icon:'🍬', label:'Crypto Crush', enabledKey:'crush_enabled', fields:[
                              { lbl:'Pts per Token', stateKey:'crush_points_per_token', min:10, suffix:'pts = 1 token', tip:'Game score points required to earn 1 token' },
                              { lbl:'Max Tokens/Day', stateKey:'crush_max_tokens_per_day', min:1, suffix:'tokens/day', tip:'Daily cap per student' },
                            ]},
                            { key:'miner', icon:'⛏', label:'Miner Runner', enabledKey:'miner_enabled', fields:[
                              { lbl:'Pts per Token', stateKey:'miner_points_per_token', min:1, suffix:'pts = 1 token', tip:'Score points required to earn 1 token' },
                              { lbl:'Max Tokens/Day', stateKey:'miner_max_tokens_per_day', min:1, suffix:'tokens/day', tip:'Daily cap per student' },
                            ]},
                            { key:'higher', icon:'📈', label:'Higher / Lower', enabledKey:'higher_lower_enabled', fields:[
                              { lbl:'Tokens per Correct', stateKey:'higher_lower_tokens_per_correct', min:1, max:500, suffix:`= ${fmtUSD(rewardConfig.higher_lower_tokens_per_correct)}`, tip:'Awarded per correct next-day prediction' },
                            ]},
                            { key:'bull', icon:'🐂', label:'Bull or Bear', enabledKey:'bull_bear_enabled', fields:[
                              { lbl:'Tokens per Correct', stateKey:'bull_bear_tokens_per_correct', min:1, max:100, suffix:`= ${fmtUSD(rewardConfig.bull_bear_tokens_per_correct)}`, tip:'Awarded per correct guess (10 per round max)' },
                              { lbl:'Max Tokens/Day', stateKey:'bull_bear_max_tokens_per_day', min:1, suffix:'tokens/day', tip:'Daily cap per student' },
                            ]},
                            { key:'spin', icon:'🎡', label:'Daily Spin', enabledKey:'spin_enabled', fields:[] },
                          ].map(game => {
                            const gameOn = rewardConfig.enabled && rewardConfig[game.enabledKey] !== false;
                            return (
                              <div key={game.key} style={{background:'var(--surface2)',borderRadius:12,padding:'12px 14px',border:`1px solid ${gameOn ? 'rgba(0,229,160,.2)' : 'var(--border)'}`}}>
                                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:game.fields.length ? 10 : 0}}>
                                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                                    <span style={{fontSize:16}}>{game.icon}</span>
                                    <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12}}>{game.label}</span>
                                  </div>
                                  <button
                                    onClick={()=>setRewardConfig(c=>({...c,[game.enabledKey]: !(c[game.enabledKey]!==false)}))}
                                    disabled={!rewardConfig.enabled}
                                    style={{fontSize:10,padding:'3px 10px',borderRadius:20,border:'none',cursor:rewardConfig.enabled?'pointer':'not-allowed',
                                      background: gameOn ? 'rgba(0,229,160,.15)' : 'rgba(100,116,139,.15)',
                                      color: gameOn ? '#00e5a0' : 'var(--muted)',fontWeight:700}}>
                                    {gameOn ? '🟢 ON' : '⚪ OFF'}
                                  </button>
                                </div>
                                {game.fields.map(f => (
                                  <div key={f.stateKey} style={{marginTop:8}}>
                                    <div style={{fontSize:10,color:'var(--muted)',marginBottom:4}}>{f.lbl}</div>
                                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                                      <input type="number" min={f.min||1} max={f.max||9999} className="text-input" style={{width:80,marginBottom:0,fontSize:12,padding:'4px 8px'}}
                                        value={rewardConfig[f.stateKey]}
                                        onChange={e=>setRewardConfig(c=>({...c,[f.stateKey]:Math.max(f.min||1,parseInt(e.target.value)||1)}))}
                                        disabled={!gameOn} />
                                      <span style={{fontSize:10,color:'var(--muted)'}}>{f.suffix}</span>
                                    </div>
                                    {f.tip && <div style={{fontSize:9,color:'var(--muted)',marginTop:2,opacity:.7}}>{f.tip}</div>}
                                  </div>
                                ))}
                                {game.key==='higher' && !higherLowerTableReady && (
                                  <div style={{marginTop:10,background:'rgba(96,165,250,.06)',border:'1px solid rgba(96,165,250,.3)',borderRadius:8,padding:'8px 10px'}}>
                                    <div style={{fontSize:10,color:'#60a5fa',fontWeight:700,marginBottom:4}}>Setup Required</div>
                                    <button className="btn" style={{background:'rgba(96,165,250,.2)',color:'#60a5fa',border:'1px solid rgba(96,165,250,.4)',fontSize:11,padding:'4px 10px'}} onClick={runHigherLowerMigration} disabled={migratingHigherLower}>
                                      {migratingHigherLower?'Creating…':'🔧 Create Table'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="btn-row" style={{marginTop:16}}>
                        <button className={`btn ${rewardConfig.enabled?'btn-red':'btn-green'}`} onClick={()=>setRewardConfig(c=>({...c,enabled:!c.enabled}))}>
                          {rewardConfig.enabled?'Disable ClassReward':'Enable ClassReward'}
                        </button>
                        <button className="btn btn-gold" onClick={saveRewardConfig} disabled={rewardSaving}>
                          {rewardSaving?'Saving...':'💾 Save Settings'}
                        </button>
                      </div>
                    </div>

                    </>}
                    {controlsTab==='events' && <>
                    {/* Tournament Mode — full width */}
                    <div className="ctrl-card" style={{gridColumn:'1/-1',border:'1px solid rgba(245,158,11,.25)',background:'rgba(245,158,11,.04)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                        <div className="ctrl-title" style={{marginBottom:0}}>🏆 Tournament Mode</div>
                        <span style={{fontSize:10,color:'var(--muted)'}}>A formal time-boxed competition — ranked by % return over the period</span>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:8,marginBottom:8}}>
                        <div><div className="form-label">Tournament Name</div><input className="text-input" style={{marginBottom:0}} placeholder="e.g. Spring Crypto Cup" value={tournamentName} onChange={e=>setTournamentName(e.target.value)}/></div>
                        <div><div className="form-label">Start</div><input type="datetime-local" className="text-input" style={{marginBottom:0}} value={tournamentStart} onChange={e=>setTournamentStart(e.target.value)}/></div>
                        <div><div className="form-label">End</div><input type="datetime-local" className="text-input" style={{marginBottom:0}} value={tournamentEnd} onChange={e=>setTournamentEnd(e.target.value)}/></div>
                        <div><div className="form-label">Prize (tokens)</div><input type="number" className="text-input" style={{marginBottom:0}} min={0} value={tournamentPrize} onChange={e=>setTournamentPrize(e.target.value)}/></div>
                      </div>
                      <div className="btn-row" style={{marginBottom:16}}>
                        <button className="btn btn-gold" disabled={!tournamentName||!tournamentStart||!tournamentEnd||tournamentLoading} onClick={async()=>{
                          setTournamentLoading(true);
                          const res=await fetch('/api/tournament',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create',classId:activeClass?.id,name:tournamentName,startsAt:tournamentStart,endsAt:tournamentEnd,prizeTokens:parseInt(tournamentPrize)||0})});
                          const d=await res.json();
                          if(res.ok){setActionMsg({type:'success',msg:`🏆 ${d.tournament.name} created!`});setTournamentName('');setTournamentStart('');setTournamentEnd('');fetch(`/api/tournament?classId=${activeClass?.id}`).then(r=>r.ok?r.json():[]).then(d=>Array.isArray(d)&&setTournaments(d));}
                          else setActionMsg({type:'error',msg:d.error||'Failed'});
                          setTimeout(()=>setActionMsg(null),4000);
                          setTournamentLoading(false);
                        }}>{tournamentLoading?'Creating…':'+ Create Tournament'}</button>
                        <button className="btn btn-muted" onClick={()=>fetch(`/api/tournament?classId=${activeClass?.id}`).then(r=>r.ok?r.json():[]).then(d=>Array.isArray(d)&&setTournaments(d))}>↻ Refresh</button>
                      </div>
                      {tournaments.length > 0 && (
                        <div style={{display:'flex',flexDirection:'column',gap:8}}>
                          {tournaments.map(t=>(
                            <div key={t.id} style={{background:'rgba(245,158,11,.07)',border:'1px solid rgba(245,158,11,.2)',borderRadius:10,padding:'10px 14px'}}>
                              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                                <div>
                                  <span style={{fontWeight:700,fontSize:13,color:'var(--gold)'}}>{t.name}</span>
                                  <span style={{fontSize:10,color:'var(--muted)',marginLeft:8}}>{new Date(t.starts_at).toLocaleDateString()} → {new Date(t.ends_at).toLocaleDateString()}</span>
                                  <span style={{fontSize:10,marginLeft:8,padding:'1px 6px',borderRadius:4,background:t.status==='active'?'rgba(0,229,160,.2)':t.status==='ended'?'rgba(71,85,105,.3)':'rgba(245,158,11,.2)',color:t.status==='active'?'var(--accent)':t.status==='ended'?'var(--muted)':'var(--gold)',fontWeight:700}}>{t.status.toUpperCase()}</span>
                                  {t.prize_tokens > 0 && <span style={{fontSize:10,color:'var(--muted)',marginLeft:8}}>🎁 {t.prize_tokens} tokens to winner</span>}
                                </div>
                                <div style={{display:'flex',gap:6}}>
                                  {t.status==='upcoming'&&<button className="btn btn-green" style={{fontSize:10,padding:'4px 10px'}} onClick={async()=>{const res=await fetch('/api/tournament',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'start',tournamentId:t.id,classId:activeClass?.id})});const d=await res.json();setActionMsg({type:res.ok?'success':'error',msg:d.message||d.error||'Done'});setTimeout(()=>setActionMsg(null),4000);fetch(`/api/tournament?classId=${activeClass?.id}`).then(r=>r.ok?r.json():[]).then(d=>Array.isArray(d)&&setTournaments(d));}}>▶ Start Now</button>}
                                  {t.status==='active'&&<button className="btn btn-red" style={{fontSize:10,padding:'4px 10px'}} onClick={async()=>{if(!confirm(`End "${t.name}" and award prize?`))return;const res=await fetch('/api/tournament',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'end',tournamentId:t.id})});const d=await res.json();setActionMsg({type:res.ok?'success':'error',msg:res.ok?`🏆 Winner: ${d.winner?.name} (${d.winner?.returnPct?.toFixed(1)}%)`:d.error||'Done'});setTimeout(()=>setActionMsg(null),6000);fetch(`/api/tournament?classId=${activeClass?.id}`).then(r=>r.ok?r.json():[]).then(d=>Array.isArray(d)&&setTournaments(d));}}>🏁 End & Award</button>}
                                </div>
                              </div>
                              {t.status==='active'&&t.standings&&(
                                <div style={{marginTop:8,display:'flex',gap:8,flexWrap:'wrap'}}>
                                  {t.standings.slice(0,5).map((s,i)=>(
                                    <div key={s.studentId} style={{fontSize:11,color:i===0?'var(--gold)':i===1?'#94a3b8':i===2?'#a16207':'var(--muted)'}}>
                                      {i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`} {s.name} <span style={{color:s.returnPct>=0?'var(--up)':'var(--down)'}}>{s.returnPct>=0?'+':''}{s.returnPct.toFixed(1)}%</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    </>}

                    {controlsTab==='rewards' && <>
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
                    </>}

                    {/* ══ TRADING ══ */}
                    {controlsTab==='trading' && <>
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

                    {/* Margin Call */}
                    {tradeSettings.marginEnabled && (
                      <div className="ctrl-card" style={{border:'1px solid rgba(251,146,60,.25)',background:'rgba(251,146,60,.04)'}}>
                        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                          <div className="ctrl-title" style={{marginBottom:0}}>⚠️ Margin Call</div>
                          <div className={`status-pill ${marketStatus?.marginCallEnabled!==false?'warn':'off'}`} style={{margin:0}}>
                            {marketStatus?.marginCallEnabled!==false?'🟡 ACTIVE':'⚪ OFF'}
                          </div>
                        </div>
                        <div className="ctrl-desc">Auto-liquidate leveraged positions when equity falls below a threshold. Runs every cron cycle.</div>
                        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                          <div className="form-label" style={{marginBottom:0,whiteSpace:'nowrap'}}>Trigger at</div>
                          <input type="number" className="text-input" style={{marginBottom:0,width:80}} min={5} max={75} step={5}
                            defaultValue={25} id="mcThreshold"
                            onChange={e=>document.getElementById('mcThresholdLabel').textContent=`${e.target.value}%`}
                          />
                          <span id="mcThresholdLabel" style={{fontSize:12,color:'var(--muted)',whiteSpace:'nowrap'}}>25% equity remaining</span>
                        </div>
                        <div className="btn-row">
                          <button className="btn btn-gold" onClick={async()=>{
                            const t = parseFloat(document.getElementById('mcThreshold')?.value||25)/100;
                            await fetch('/api/teacher/margin-call',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:true,threshold:t})});
                            setActionMsg({type:'success',msg:`✅ Margin call set at ${Math.round(t*100)}% equity`});
                            setTimeout(()=>setActionMsg(null),3000);
                            fetchData(activeClass?.id);
                          }}>💾 Save</button>
                          <button className="btn btn-muted" onClick={async()=>{
                            await fetch('/api/teacher/margin-call',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:false})});
                            setActionMsg({type:'success',msg:'✅ Margin calls disabled'});
                            setTimeout(()=>setActionMsg(null),3000);
                            fetchData(activeClass?.id);
                          }}>Disable</button>
                        </div>
                      </div>
                    )}

                    {/* ══ CHALLENGES ══ */}
                    </>}
                    {controlsTab==='challenges' && <>
                    <div className="ctrl-card" style={{gridColumn:'1/-1',border:'1px solid rgba(245,158,11,.3)',background:'rgba(245,158,11,.04)'}}>
                      <div className="ctrl-title" style={{color:'#f59e0b'}}>🏆 Weekly Challenge</div>
                      <div className="ctrl-desc" style={{marginBottom:16}}>Set a weekly goal for your class. Students see it on their dashboard and earn tokens when they complete it.</div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12,marginBottom:12}}>
                        <div style={{gridColumn:'1/-1'}}>
                          <div className="form-label">Challenge Title</div>
                          <input className="text-input" style={{marginBottom:0}} placeholder="e.g. Trade at least 3 times this week" value={wcTitle} onChange={e=>setWcTitle(e.target.value)} maxLength={100} />
                        </div>
                        <div style={{gridColumn:'1/-1'}}>
                          <div className="form-label">Description (optional)</div>
                          <input className="text-input" style={{marginBottom:0}} placeholder="Additional context or hints for students" value={wcDesc} onChange={e=>setWcDesc(e.target.value)} maxLength={200} />
                        </div>
                        <div>
                          <div className="form-label">Challenge Type</div>
                          <select className="text-input" style={{marginBottom:0}} value={wcType} onChange={e=>{setWcType(e.target.value);setWcTarget(e.target.value==='profit'?'1':'3');}}>
                            <option value="min_trades">📊 Min Trades — make N trades this week</option>
                            <option value="hold_coins">🌈 Hold Coins — hold at least N different coins</option>
                            <option value="learn">📚 Learn — pass N lessons this week</option>
                            <option value="write_notes">✍️ Trade Notes — write N notes (50+ chars)</option>
                            <option value="profit">📈 Profit — be up at least N% by end of week</option>
                          </select>
                        </div>
                        <div>
                          <div className="form-label">{wcType==='profit'?'Min % Gain Required':'Target Count'}</div>
                          <input className="text-input" style={{marginBottom:0}} type="number" min="1" step={wcType==='profit'?'0.1':'1'} value={wcTarget} onChange={e=>setWcTarget(e.target.value)} />
                        </div>
                        <div>
                          <div className="form-label">Token Reward</div>
                          <input className="text-input" style={{marginBottom:0}} type="number" min="0" step="25" value={wcTokens} onChange={e=>setWcTokens(e.target.value)} />
                        </div>
                        <div>
                          <div className="form-label">Starts At</div>
                          <input className="text-input" style={{marginBottom:0}} type="datetime-local" value={wcStartsAt} onChange={e=>setWcStartsAt(e.target.value)} />
                        </div>
                        <div>
                          <div className="form-label">Ends At</div>
                          <input className="text-input" style={{marginBottom:0}} type="datetime-local" value={wcEndsAt} onChange={e=>setWcEndsAt(e.target.value)} />
                        </div>
                      </div>
                      <div className="btn-row">
                        <button className="btn btn-gold" style={{fontSize:11}} disabled={!wcTitle.trim()||!wcStartsAt||!wcEndsAt||wcLoading} onClick={async()=>{
                          setWcLoading(true);
                          const res=await fetch('/api/teacher/weekly-challenge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({classId:activeClass?.id,title:wcTitle.trim(),description:wcDesc.trim()||null,challengeType:wcType,targetValue:parseFloat(wcTarget)||1,tokensReward:parseInt(wcTokens)||0,startsAt:new Date(wcStartsAt).toISOString(),endsAt:new Date(wcEndsAt).toISOString()})});
                          if(res.ok){setActionMsg({type:'success',msg:'✅ Weekly challenge posted!'});setWcTitle('');setWcDesc('');setWcTarget('3');setWcTokens('100');setWcStartsAt('');setWcEndsAt('');fetch(`/api/teacher/weekly-challenge?classId=${activeClass?.id}`).then(r=>r.ok?r.json():{challenges:[]}).then(d=>setWeeklyChallenges(d.challenges||[]));}
                          else{const d=await res.json();setActionMsg({type:'error',msg:`❌ ${d.error||'Failed'}`});}
                          setWcLoading(false);
                        }}>{wcLoading?'Posting...':'📢 Post Challenge'}</button>
                      </div>
                      {weeklyChallenges.length>0 && (
                        <div style={{marginTop:20}}>
                          <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',letterSpacing:1,textTransform:'uppercase',marginBottom:8}}>Active & Past Challenges</div>
                          {weeklyChallenges.map(c=>{
                            const now=new Date();
                            const isLive=c.active&&new Date(c.starts_at)<=now&&new Date(c.ends_at)>=now;
                            const isPast=new Date(c.ends_at)<now;
                            return(
                              <div key={c.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:'var(--surface2)',borderRadius:10,marginBottom:8,flexWrap:'wrap'}}>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{fontSize:12,fontWeight:700,color:'var(--text)',marginBottom:2}}>{c.title}</div>
                                  <div style={{fontSize:10,color:'var(--muted)'}}>{c.challenge_type.replace('_',' ')} · target: {c.target_value} · {c.tokens_reward} tokens · ends {new Date(c.ends_at).toLocaleDateString()}</div>
                                </div>
                                <span style={{fontSize:10,padding:'2px 8px',borderRadius:5,fontWeight:700,background:isLive?'rgba(0,229,160,.15)':isPast?'rgba(71,85,105,.2)':'rgba(245,158,11,.15)',color:isLive?'var(--accent)':isPast?'var(--muted)':'#f59e0b'}}>
                                  {isLive?'🟢 LIVE':isPast?'ended':'upcoming'}
                                </span>
                                {!isPast&&<button onClick={async()=>{await fetch('/api/teacher/weekly-challenge',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:c.id})});setWeeklyChallenges(prev=>prev.filter(x=>x.id!==c.id));}} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:16}} title="Archive">✕</button>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    </>}

                    {/* ══ AI COACH ══ */}
                    {controlsTab==='ai' && <>
                    <div className="ctrl-card" style={{gridColumn:'1/-1',border:'1px solid rgba(139,92,246,.25)',background:'rgba(139,92,246,.04)'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6,flexWrap:'wrap',gap:8}}>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div className="ctrl-title" style={{marginBottom:0}}>🤖 AI Trade Coach</div>
                          <div className={`status-pill ${rewardConfig.ai_coach_enabled?'on':'off'}`} style={{margin:0}}>{rewardConfig.ai_coach_enabled?'🟢 ENABLED':'⚪ DISABLED'}</div>
                        </div>
                        {!aiConfigMigrated && (
                          <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(245,158,11,.08)',border:'1px solid rgba(245,158,11,.3)',borderRadius:8,padding:'6px 10px'}}>
                            <span style={{fontSize:11,color:'#fbbf24'}}>⚠ DB upgrade needed</span>
                            <button className="btn" style={{background:'rgba(245,158,11,.2)',color:'#fbbf24',border:'1px solid rgba(245,158,11,.4)',fontSize:11,padding:'3px 10px'}} onClick={runAiConfigMigration} disabled={migratingAiConfig}>
                              {migratingAiConfig?'Migrating…':'🔧 Run Migration'}
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="ctrl-desc" style={{marginBottom:16}}>
                        Students get a <strong>🤖 Analyze</strong> button on every trade in their History tab, plus a <strong>🤖 AI Portfolio Review</strong> button on their Holdings tab. Both powered by <strong>Google Gemini 1.5 Flash</strong> (free). Add <code style={{fontSize:10,background:'var(--surface2)',padding:'1px 5px',borderRadius:4}}>GEMINI_API_KEY</code> to your Vercel environment variables to activate the class-level key.
                      </div>

                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
                        <div>
                          <div className="tools-label" style={{marginBottom:6}}>Daily Queries per Student</div>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <input type="number" min={1} max={100} className="text-input" style={{width:80,marginBottom:0}}
                              value={rewardConfig.ai_coach_daily_quota}
                              onChange={e=>setRewardConfig(c=>({...c,ai_coach_daily_quota:Math.max(1,parseInt(e.target.value)||5)}))}
                              disabled={!rewardConfig.ai_coach_enabled} />
                            <span style={{fontSize:11,color:'var(--muted)'}}>queries/day (class key)</span>
                          </div>
                          <div style={{fontSize:10,color:'var(--muted)',marginTop:4}}>How many AI insights each student gets per day using your GEMINI_API_KEY</div>
                        </div>

                        <div>
                          <div className="tools-label" style={{marginBottom:6}}>Allow Student API Key</div>
                          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                            <button
                              onClick={()=>setRewardConfig(c=>({...c,ai_allow_student_key:!c.ai_allow_student_key}))}
                              disabled={!rewardConfig.ai_coach_enabled}
                              style={{fontSize:11,padding:'5px 14px',borderRadius:20,border:'none',cursor:rewardConfig.ai_coach_enabled?'pointer':'not-allowed',
                                background: rewardConfig.ai_allow_student_key ? 'rgba(0,229,160,.15)' : 'rgba(100,116,139,.15)',
                                color: rewardConfig.ai_allow_student_key ? '#00e5a0' : 'var(--muted)',fontWeight:700}}>
                              {rewardConfig.ai_allow_student_key ? '🟢 ALLOWED' : '⚪ NOT ALLOWED'}
                            </button>
                          </div>
                          <div style={{fontSize:10,color:'var(--muted)'}}>Students can paste their own free Gemini key in their dashboard to bypass the class quota</div>
                        </div>

                        {rewardConfig.ai_allow_student_key && (
                          <div style={{gridColumn:'1/-1'}}>
                            <div className="tools-label" style={{marginBottom:6}}>Student Key Daily Limit</div>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <input type="number" min={0} max={1000} className="text-input" style={{width:80,marginBottom:0}}
                                value={rewardConfig.ai_student_key_limit}
                                onChange={e=>setRewardConfig(c=>({...c,ai_student_key_limit:Math.max(0,parseInt(e.target.value)||0)}))}
                                disabled={!rewardConfig.ai_coach_enabled} />
                              <span style={{fontSize:11,color:'var(--muted)'}}>queries/day — <strong>0 = unlimited</strong></span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="btn-row">
                        <button className={`btn ${rewardConfig.ai_coach_enabled?'btn-red':'btn-green'}`}
                          onClick={()=>setRewardConfig(c=>({...c,ai_coach_enabled:!c.ai_coach_enabled}))}>
                          {rewardConfig.ai_coach_enabled?'Disable AI Coach':'Enable AI Coach'}
                        </button>
                        <button className="btn btn-gold" onClick={saveRewardConfig} disabled={rewardSaving}>
                          {rewardSaving?'Saving…':'💾 Save Settings'}
                        </button>
                      </div>
                    </div>
                    </>}

                    {/* ══ BOT ══ */}
                    {controlsTab==='bot' && <>
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
                    </>}
                    {controlsTab==='trading' && <>
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
                    </>}

                  </div>
                  </>
                )}

                {activeSection==='students' && (
                  <>
                    {studentsView==='class' && studentsSubView==='roster' && (
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
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:8}}>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:'var(--text)'}}>
                          {studentsView==='class' ? (studentsSubView==='lessons' ? `Lesson Progress — ${humans.length} Students` : `Students (${humans.length})`) : `All Students (${allStudents.length})`}
                        </div>
                        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                          {studentsView==='class' && (
                            <div style={{display:'flex',gap:2,background:'var(--surface2)',padding:3,borderRadius:10,border:'1px solid var(--border)'}}>
                              <button style={{padding:'4px 12px',borderRadius:7,border:'none',background:studentsSubView==='roster'?'var(--accent)':'transparent',color:studentsSubView==='roster'?'#000':'var(--muted)',cursor:'pointer',fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:studentsSubView==='roster'?600:400,transition:'all .2s'}} onClick={()=>setStudentsSubView('roster')}>📋 Roster</button>
                              <button style={{padding:'4px 12px',borderRadius:7,border:'none',background:studentsSubView==='lessons'?'var(--accent)':'transparent',color:studentsSubView==='lessons'?'#000':'var(--muted)',cursor:'pointer',fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:studentsSubView==='lessons'?600:400,transition:'all .2s'}} onClick={()=>{setStudentsSubView('lessons');if(!lessonProgress)loadLessonProgress(activeClass?.id);}}>📚 Lessons</button>
                            </div>
                          )}
                          {classes.length > 1 && studentsSubView==='roster' && (
                            <div style={{display:'flex',gap:2,background:'var(--surface2)',padding:3,borderRadius:10,border:'1px solid var(--border)'}}>
                              <button style={{padding:'4px 12px',borderRadius:7,border:'none',background:studentsView==='class'?'var(--accent)':'transparent',color:studentsView==='class'?'#000':'var(--muted)',cursor:'pointer',fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:studentsView==='class'?600:400,transition:'all .2s'}} onClick={()=>setStudentsView('class')}>This Class</button>
                              <button style={{padding:'4px 12px',borderRadius:7,border:'none',background:studentsView==='all'?'var(--accent)':'transparent',color:studentsView==='all'?'#000':'var(--muted)',cursor:'pointer',fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:studentsView==='all'?600:400,transition:'all .2s'}} onClick={()=>{setStudentsView('all');fetchAllStudents();}}>All Classes</button>
                            </div>
                          )}
                          <button className="btn btn-muted" onClick={()=>{if(studentsSubView==='lessons'){loadLessonProgress(activeClass.id);}else if(studentsView==='class'){fetchData(activeClass.id);}else{fetchAllStudents();}}}>↻ Refresh</button>
                        </div>
                      </div>

                      {/* Lesson Progress Grid */}
                      {studentsView==='class' && studentsSubView==='lessons' && (
                        lessonProgressLoading ? (
                          <div style={{color:'var(--muted)',textAlign:'center',padding:40,fontSize:13}}>Loading lesson progress…</div>
                        ) : !lessonProgress ? (
                          <div style={{color:'var(--muted)',textAlign:'center',padding:40,fontSize:13}}>Click Refresh to load lesson progress.</div>
                        ) : (() => {
                          const { lessons, modules, progress } = lessonProgress;
                          const classStudents = humans;
                          return (
                            <div style={{overflowX:'auto'}}>
                              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                                <thead>
                                  <tr>
                                    <th style={{padding:'8px 12px',textAlign:'left',color:'var(--muted)',fontSize:9,letterSpacing:'1px',textTransform:'uppercase',borderBottom:'2px solid var(--border)',minWidth:120,position:'sticky',left:0,background:'var(--surface)',zIndex:2}}>Student</th>
                                    <th style={{padding:'8px 8px',textAlign:'center',color:'var(--muted)',fontSize:9,letterSpacing:'1px',textTransform:'uppercase',borderBottom:'2px solid var(--border)',minWidth:60}}>Done</th>
                                    {modules.map(m => (
                                      lessons.filter(l=>l.module_id===m.id).map((l,li,arr) => (
                                        <th key={l.id} title={`${m.title}: ${l.title}`} style={{padding:'4px 3px',textAlign:'center',borderBottom:'2px solid var(--border)',minWidth:32,maxWidth:40,borderLeft:li===0?'2px solid var(--border)':'none'}}>
                                          <div style={{fontSize:8,color:'var(--muted)',fontWeight:400,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:36,transform:'rotate(-45deg)',transformOrigin:'bottom left',marginLeft:8,marginBottom:4,height:28}}>{l.title.length>12?l.title.slice(0,12)+'…':l.title}</div>
                                        </th>
                                      ))
                                    ))}
                                  </tr>
                                  <tr>
                                    <td style={{padding:'2px 12px',borderBottom:'1px solid var(--border)',position:'sticky',left:0,background:'var(--surface)',zIndex:2}}></td>
                                    <td style={{padding:'2px 8px',borderBottom:'1px solid var(--border)'}}></td>
                                    {modules.map(m => {
                                      const mLessons = lessons.filter(l=>l.module_id===m.id);
                                      return mLessons.map((l,li) => (
                                        <td key={l.id} style={{padding:'2px 3px',borderBottom:'1px solid var(--border)',textAlign:'center',borderLeft:li===0?'2px solid var(--border)':'none'}}>
                                          <div style={{fontSize:8,color:'var(--border)',fontWeight:400,textAlign:'center'}}>{li+1}</div>
                                        </td>
                                      ));
                                    })}
                                  </tr>
                                </thead>
                                <tbody>
                                  {classStudents.map(s => {
                                    const sp = progress[s.id] || {};
                                    const passedCount = lessons.filter(l => sp[l.id]?.passed).length;
                                    return (
                                      <tr key={s.id} className="srow">
                                        <td style={{padding:'7px 12px',fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:12,borderBottom:'1px solid var(--border)',position:'sticky',left:0,background:'var(--surface)',zIndex:1}}>{s.name}</td>
                                        <td style={{padding:'7px 8px',textAlign:'center',borderBottom:'1px solid var(--border)',color:'var(--accent)',fontWeight:700,fontSize:12}}>{passedCount}/{lessons.length}</td>
                                        {modules.map(m =>
                                          lessons.filter(l=>l.module_id===m.id).map((l,li) => {
                                            const att = sp[l.id];
                                            const bg = att?.passed ? 'rgba(0,229,160,.18)' : att ? 'rgba(251,191,36,.15)' : 'transparent';
                                            const icon = att?.passed ? '✓' : att ? `${att.score}%` : '·';
                                            const color = att?.passed ? 'var(--up)' : att ? 'var(--gold)' : 'var(--border)';
                                            return (
                                              <td key={l.id} title={att ? `${l.title}: ${att.score}% — ${att.passed?'Passed':'Failed'}` : `${l.title}: Not started`} style={{padding:'4px 3px',textAlign:'center',borderBottom:'1px solid var(--border)',background:bg,borderLeft:li===0?'2px solid var(--border)':'none'}}>
                                                <span style={{fontSize:10,color,fontWeight:att?.passed?700:400}}>{icon}</span>
                                              </td>
                                            );
                                          })
                                        )}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                              <div style={{marginTop:12,display:'flex',gap:16,fontSize:10,color:'var(--muted)'}}>
                                <span><span style={{color:'var(--up)',fontWeight:700}}>✓</span> Passed</span>
                                <span><span style={{color:'var(--gold)'}}>%</span> Attempted</span>
                                <span><span style={{color:'var(--border)'}}>·</span> Not started</span>
                              </div>
                            </div>
                          );
                        })()
                      )}

                      {/* Roster / All Classes */}
                      {(studentsSubView==='roster' || studentsView==='all') && (
                        studentsView==='class' ? (
                          <table className="student-table">
                            <thead><tr><th>Rank</th><th>Name</th><th>Portfolio</th><th>Return</th><th>P/L</th><th>Cash</th><th>Streak</th><th>Actions</th></tr></thead>
                            <tbody>
                              {students.map((s,i)=>{
                                const ret=clean(s.returnPct),pl=clean(s.pl),isPos=ret>=0;
                                const isExpanded = expandedStudentId === s.id;
                                const eData = expandedStudentData[s.id];
                                const isLoading = expandedStudentLoading === s.id;
                                return (
                                  <Fragment key={s.id}>
                                    <tr className="srow" onClick={()=>!s.isBot&&toggleStudentExpand(s)} style={{cursor:s.isBot?'default':'pointer',background:isExpanded?'var(--surface2)':''}}>
                                      <td style={{color:'var(--muted)',fontWeight:700}}>{i+1}</td>
                                      <td><div style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,display:'flex',alignItems:'center',gap:6}}>{s.isBot?'🤖 ':''}{s.name}{!s.isBot&&<span style={{fontSize:9,color:'var(--muted)'}}>{isExpanded?'▲':'▼'}</span>}</div></td>
                                      <td style={{fontFamily:"'Syne',sans-serif",fontWeight:700}}>{fmtUSD(s.total)}</td>
                                      <td style={{color:isPos?'var(--up)':'var(--down)',fontWeight:500}}>{fmtPct(ret)}</td>
                                      <td style={{color:isPos?'var(--up)':'var(--down)'}}>{isPos?'+':''}{fmtUSD(pl)}</td>
                                      <td style={{color:'var(--muted)'}}>{fmtUSD(s.cash)}</td>
                                      <td onClick={e=>e.stopPropagation()} title={s.loginStreakAtRisk?'Logged in yesterday but not yet today — streak will reset if they don\'t log in today':''}>
                                        {s.isBot ? <span style={{color:'var(--muted)'}}>—</span> : (
                                          <span style={{display:'flex',alignItems:'center',gap:4,color:s.loginStreakAtRisk?'#f59e0b':'var(--muted)',fontWeight:s.loginStreakAtRisk?700:400}}>
                                            🔥 {s.loginStreak || 0}
                                            {s.loginStreakAtRisk && <span>⚠️</span>}
                                            {s.freezesAvailable > 0 && <span title={`${s.freezesAvailable} streak freeze(s) available`}>🧊{s.freezesAvailable}</span>}
                                          </span>
                                        )}
                                      </td>
                                      <td onClick={e=>e.stopPropagation()}>
                                        <div className="btn-row">
                                          {classes.length > 1 && <button className="btn btn-muted" style={{padding:'4px 10px',fontSize:10}} onClick={()=>{setMoveStudent(s);setMoveTargetClass('');}}>⇄ Move</button>}
                                          <button className="btn btn-muted" style={{padding:'4px 10px',fontSize:10}} onClick={()=>{if(confirm(`Reset ${s.name}?`))teacherAction('reset-student',{studentId:s.id,classId:activeClass.id})}}>↺ Reset</button>
                                          <button className="btn btn-red" style={{padding:'4px 10px',fontSize:10}} onClick={()=>{if(confirm(`Remove ${s.name}?`))teacherAction('remove-student',{studentId:s.id,classId:activeClass.id})}}>✕</button>
                                        </div>
                                      </td>
                                    </tr>
                                    {isExpanded && (
                                      <tr>
                                        <td colSpan={8} style={{padding:'0 0 8px 0',background:'var(--surface2)',borderBottom:'2px solid var(--border)'}}>
                                          {isLoading ? (
                                            <div style={{padding:'16px 20px',color:'var(--muted)',fontSize:12}}>Loading holdings…</div>
                                          ) : eData ? (
                                            <div style={{padding:'12px 20px'}}>
                                              <div style={{display:'flex',gap:16,marginBottom:10,flexWrap:'wrap'}}>
                                                {[
                                                  ['Cash',fmtUSD(eData.summary?.cash),'var(--text)'],
                                                  ['Holdings',fmtUSD(eData.summary?.holdingsVal),'var(--text)'],
                                                  ['Total',fmtUSD(eData.summary?.totalVal),parseFloat(eData.summary?.returnPct)>=0?'var(--up)':'var(--down)'],
                                                  ['Return',fmtPct(eData.summary?.returnPct),parseFloat(eData.summary?.returnPct)>=0?'var(--up)':'var(--down)'],
                                                ].map(([lbl,val,color])=>(
                                                  <div key={lbl} style={{textAlign:'center',background:'var(--surface)',borderRadius:10,padding:'6px 14px',border:'1px solid var(--border)'}}>
                                                    <div style={{fontSize:9,color:'var(--muted)',marginBottom:2,textTransform:'uppercase',letterSpacing:'1px'}}>{lbl}</div>
                                                    <div style={{fontSize:13,fontWeight:700,color}}>{val}</div>
                                                  </div>
                                                ))}
                                                <a href={`/profile/${s.id}`} target="_blank" rel="noreferrer" style={{alignSelf:'center',fontSize:11,color:'var(--accent)',textDecoration:'none',padding:'6px 14px',borderRadius:10,border:'1px solid var(--border)',background:'var(--surface)',marginLeft:'auto'}}>Full Profile →</a>
                                              </div>
                                              {(eData.holdings||[]).filter(h=>Math.abs(h.qty)>0).length > 0 ? (
                                                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                                                  <thead><tr>{['Coin','Qty','Avg Buy','Current','Value','P/L'].map(h=><th key={h} style={{padding:'6px 10px',textAlign:'left',color:'var(--muted)',fontSize:9,letterSpacing:'1px',textTransform:'uppercase',borderBottom:'1px solid var(--border)'}}>{h}</th>)}</tr></thead>
                                                  <tbody>
                                                    {(eData.holdings||[]).filter(h=>Math.abs(h.qty)>0).map(h=>(
                                                      <tr key={h.coin}>
                                                        <td style={{padding:'6px 10px',fontWeight:700,fontFamily:"'Syne',sans-serif"}}>{h.isShort?'⬇ ':''}{h.coin}</td>
                                                        <td style={{padding:'6px 10px',color:'var(--muted)'}}>{Math.abs(h.qty).toFixed(4)}</td>
                                                        <td style={{padding:'6px 10px',color:'var(--muted)'}}>{fmtUSD(h.avgBuy)}</td>
                                                        <td style={{padding:'6px 10px'}}>{fmtUSD(h.curPrice)}</td>
                                                        <td style={{padding:'6px 10px',fontWeight:600}}>{fmtUSD(h.curVal)}</td>
                                                        <td style={{padding:'6px 10px',fontWeight:600,color:h.plPct>=0?'var(--up)':'var(--down)'}}>{h.plPct>=0?'+':''}{h.plPct?.toFixed(1)}% ({h.plPct>=0?'+':''}{fmtUSD(h.plTotal)})</td>
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              ) : (
                                                <div style={{fontSize:11,color:'var(--muted)',padding:'8px 0'}}>No open holdings.</div>
                                              )}
                                            </div>
                                          ) : (
                                            <div style={{padding:'16px 20px',color:'var(--muted)',fontSize:12}}>Failed to load data.</div>
                                          )}
                                        </td>
                                      </tr>
                                    )}
                                  </Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : allStudentsLoading ? (
                          <div style={{color:'var(--muted)',textAlign:'center',padding:32,fontSize:13}}>Loading all students...</div>
                        ) : (
                          <table className="student-table">
                            <thead><tr><th>Rank</th><th>Name</th><th>Class</th><th>Portfolio</th><th>Return</th><th>P/L</th><th>Cash</th><th>Streak</th></tr></thead>
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
                                    <td title={s.loginStreakAtRisk?'Logged in yesterday but not yet today — streak will reset if they don\'t log in today':''}>
                                      <span style={{display:'flex',alignItems:'center',gap:4,color:s.loginStreakAtRisk?'#f59e0b':'var(--muted)',fontWeight:s.loginStreakAtRisk?700:400}}>
                                        🔥 {s.loginStreak || 0}
                                        {s.loginStreakAtRisk && <span>⚠️</span>}
                                        {s.freezesAvailable > 0 && <span title={`${s.freezesAvailable} streak freeze(s) available`}>🧊{s.freezesAvailable}</span>}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )
                      )}
                    </div>

                    {/* Season Management */}
                    <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:20,padding:22,marginTop:16}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                        <div>
                          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:'var(--text)'}}>🏁 Season Management</div>
                          <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>Archive final standings and reset all portfolios for a new term.</div>
                        </div>
                        <button
                          className="btn btn-red"
                          onClick={() => { endSeason(); }}
                          disabled={seasonEnding}
                          style={{padding:'8px 16px',fontSize:12,flexShrink:0}}
                        >
                          {seasonEnding ? 'Ending…' : '🏁 End Season'}
                        </button>
                      </div>
                      {seasonResult && (
                        <div style={{marginTop:12,fontSize:12,padding:'8px 12px',borderRadius:8,background:seasonResult.type==='success'?'rgba(0,229,160,.1)':'rgba(244,63,94,.1)',color:seasonResult.type==='success'?'var(--up)':'var(--down)'}}>
                          {seasonResult.msg}
                        </div>
                      )}
                      {pastSeasons.length === 0 && (
                        <button style={{marginTop:12,background:'transparent',border:'none',color:'var(--accent)',fontSize:11,cursor:'pointer',padding:0}} onClick={()=>loadSeasons(activeClass?.id)}>
                          Load past seasons ↓
                        </button>
                      )}
                      {pastSeasons.length > 0 && (
                        <div style={{marginTop:16}}>
                          {pastSeasons.map(season => (
                            <details key={season.season} style={{marginBottom:8}}>
                              <summary style={{cursor:'pointer',fontSize:12,color:'var(--text)',padding:'8px 12px',background:'var(--surface2)',borderRadius:10,userSelect:'none'}}>
                                Season {season.season} — {new Date(season.endedAt).toLocaleDateString()} &nbsp;·&nbsp; {season.standings?.length} students
                              </summary>
                              <div style={{paddingTop:8,paddingLeft:8}}>
                                {(season.standings || []).slice(0, 5).map(s => (
                                  <div key={s.id} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 10px',fontSize:11,borderBottom:'1px solid var(--border)'}}>
                                    <span style={{color:'var(--muted)',minWidth:20,textAlign:'right'}}>#{s.rank}</span>
                                    <span style={{flex:1,fontWeight:600}}>{s.name}</span>
                                    <span style={{color:s.returnPct>=0?'var(--up)':'var(--down)',fontWeight:700}}>{s.returnPct>=0?'+':''}{s.returnPct?.toFixed(1)}%</span>
                                    <span style={{color:'var(--muted)'}}>${s.total?.toLocaleString()}</span>
                                  </div>
                                ))}
                                {season.standings?.length > 5 && <div style={{fontSize:10,color:'var(--muted)',padding:'4px 10px'}}>+{season.standings.length - 5} more</div>}
                              </div>
                            </details>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {activeSection==='analytics' && (
                  <div>
                    {analyticsLoading ? (
                      <div style={{display:'flex',flexDirection:'column',gap:10}}>
                        {[1,2,3,4].map(i=><div key={i} className="skeleton" style={{height:52}}/>)}
                      </div>
                    ) : !analyticsData ? (
                      <div style={{textAlign:'center',padding:48,color:'var(--muted)',fontSize:13}}>No data — click Analytics tab to load</div>
                    ) : (
                      <>
                        {/* Summary row */}
                        {(() => {
                          const inactive = analyticsData.filter(s=>s.isInactive).length;
                          const totalTrades = analyticsData.reduce((s,r)=>s+r.tradeCount,0);
                          const todayTrades = analyticsData.reduce((s,r)=>s+r.tradesToday,0);
                          const avgBadges = analyticsData.length ? (analyticsData.reduce((s,r)=>s+r.badgesCount,0)/analyticsData.length).toFixed(1) : 0;
                          return (
                            <div className="stats-grid" style={{marginBottom:16}}>
                              <div className="stat-card"><div className="stat-label">Trades Today</div><div className="stat-value gold">{todayTrades}</div></div>
                              <div className="stat-card"><div className="stat-label">Total Trades</div><div className="stat-value">{totalTrades}</div></div>
                              <div className="stat-card"><div className="stat-label">Inactive (&gt;3d)</div><div className={`stat-value ${inactive>0?'down':''}`}>{inactive}</div></div>
                              <div className="stat-card"><div className="stat-label">Avg Badges</div><div className="stat-value gold">{avgBadges}</div></div>
                            </div>
                          );
                        })()}
                        {/* Student table */}
                        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,overflow:'hidden'}}>
                          <table className="student-table">
                            <thead>
                              <tr>
                                <th>Student</th>
                                <th>7-Day Activity</th>
                                <th>Today</th>
                                <th>Total</th>
                                <th>Badges</th>
                                <th>Last Active</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...analyticsData].sort((a,b)=>b.tradesToday-a.tradesToday||b.tradeCount-a.tradeCount).map(s=>{
                                const lastDate = s.lastTradeAt ? new Date(s.lastTradeAt) : null;
                                const daysAgo = lastDate ? Math.floor((Date.now()-lastDate.getTime())/(1000*86400)) : null;
                                const days = s.tradesByDay || Array(7).fill(0);
                                const labels = s.dayLabels || ['','','','','','',''];
                                const maxTrades = Math.max(...days, 1);
                                return (
                                  <tr key={s.studentId} className="srow">
                                    <td>
                                      <div style={{fontWeight:600}}>{s.name}</div>
                                      <div style={{fontSize:10,color:'var(--muted)'}}>{s.email}</div>
                                    </td>
                                    <td>
                                      <div style={{display:'flex',gap:3,alignItems:'flex-end'}}>
                                        {days.map((count,i)=>{
                                          const intensity = count === 0 ? 0 : Math.max(0.2, count / maxTrades);
                                          const bg = count === 0
                                            ? 'rgba(71,85,105,.25)'
                                            : `rgba(0,229,160,${intensity})`;
                                          return (
                                            <div key={i} title={`${labels[i]}: ${count} trade${count!==1?'s':''}`} style={{width:14,height:14,borderRadius:3,background:bg,border:`1px solid ${count>0?'rgba(0,229,160,.3)':'rgba(71,85,105,.2)'}`,cursor:'default'}} />
                                          );
                                        })}
                                      </div>
                                      <div style={{display:'flex',gap:3,marginTop:2}}>
                                        {labels.map((l,i)=><div key={i} style={{width:14,fontSize:8,color:'var(--muted)',textAlign:'center',lineHeight:1}}>{l[0]}</div>)}
                                      </div>
                                    </td>
                                    <td style={{textAlign:'center'}}>
                                      <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:s.tradesToday>0?'var(--accent)':'var(--muted)'}}>{s.tradesToday}</span>
                                    </td>
                                    <td style={{textAlign:'center',color:'var(--muted)'}}>{s.tradeCount}</td>
                                    <td style={{textAlign:'center'}}>
                                      <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:s.badgesCount>0?'var(--gold)':'var(--muted)'}}>{s.badgesCount}</span>
                                    </td>
                                    <td style={{fontSize:11,color:'var(--muted)'}}>
                                      {lastDate ? (daysAgo===0 ? 'Today' : daysAgo===1 ? 'Yesterday' : `${daysAgo}d ago`) : 'Never'}
                                    </td>
                                    <td>
                                      {s.isInactive
                                        ? <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:6,background:'rgba(244,63,94,.12)',color:'var(--down)',border:'1px solid rgba(244,63,94,.25)'}}>INACTIVE</span>
                                        : <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:6,background:'rgba(0,229,160,.1)',color:'var(--up)',border:'1px solid rgba(0,229,160,.2)'}}>ACTIVE</span>
                                      }
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <div style={{fontSize:10,color:'var(--muted)',marginTop:8,textAlign:'right'}}>Inactive = no trade in 3+ days</div>
                      </>
                    )}
                  </div>
                )}

                {activeSection==='grades' && (
                  <div>
                    {gradesLoading ? (
                      <div style={{display:'flex',flexDirection:'column',gap:10}}>
                        {[1,2,3,4,5].map(i=><div key={i} className="skeleton" style={{height:52}}/>)}
                      </div>
                    ) : !gradesData ? (
                      <div style={{textAlign:'center',padding:48,color:'var(--muted)'}}>No data</div>
                    ) : (() => {
                      const lessons = gradesData.lessons || [];
                      const cols = [
                        {key:'rank',            label:'#',           fmt: r=>r.rank},
                        {key:'name',            label:'Student',     fmt: r=>r.name},
                        {key:'portfolio',       label:'Portfolio',   fmt: r=>`$${parseFloat(r.portfolio).toLocaleString('en-US',{maximumFractionDigits:0})}`},
                        {key:'returnPct',       label:'Return',      fmt: r=>{const v=parseFloat(r.returnPct);return <span style={{color:v>=0?'var(--up)':'var(--down)',fontWeight:600}}>{v>=0?'+':''}{v.toFixed(2)}%</span>;}},
                        {key:'tradeCount',      label:'Trades',      fmt: r=>r.tradeCount},
                        {key:'badges',          label:'Badges',      fmt: r=><span style={{color:'var(--gold)',fontWeight:600}}>{r.badges}</span>},
                        {key:'lessonsPassed',   label:'Lessons',     fmt: r=>r.lessonsTotal>0?<span style={{color:r.lessonsPassed===r.lessonsTotal?'var(--up)':'var(--text)',fontWeight:600}}>{r.lessonsPassed}/{r.lessonsTotal}</span>:'—'},
                        {key:'lessonsAvgScore', label:'Avg Quiz',    fmt: r=>r.lessonsAvgScore!=null?<span style={{color:r.lessonsAvgScore>=75?'var(--up)':r.lessonsAvgScore>=50?'var(--gold)':'var(--down)',fontWeight:600}}>{r.lessonsAvgScore}%</span>:'—'},
                        ...lessons.map(l=>({
                          key: `lesson_${l.id}`,
                          label: `${l.moduleEmoji||'📚'} ${l.title}`,
                          sortable: false,
                          fmt: r=>{
                            const a=r.lessonScores?.[l.id];
                            if(!a) return <span style={{color:'var(--muted)',fontSize:10}}>—</span>;
                            return <span style={{color:a.passed?'var(--up)':a.score!=null?'var(--down)':'var(--muted)',fontWeight:600,fontSize:11}}>{a.score!=null?`${a.score}%`:'—'}{a.passed?' ✓':''}</span>;
                          }
                        })),
                        {key:'winRate',         label:'Win %',       fmt: r=>r.winRate?`${parseFloat(r.winRate).toFixed(0)}%`:'—'},
                        {key:'note',            label:'Note',        fmt: ()=>null},
                      ];
                      const sorted = [...gradesData.rows].sort((a,b)=>{
                        if(gradesSortCol==='name') return gradesSortDir==='asc'?a.name.localeCompare(b.name):b.name.localeCompare(a.name);
                        const av=parseFloat(a[gradesSortCol])||0, bv=parseFloat(b[gradesSortCol])||0;
                        return gradesSortDir==='asc'?av-bv:bv-av;
                      });
                      return (
                        <>
                          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
                            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15}}>{gradesData.className} — {gradesData.rows.length} students</div>
                            <div style={{display:'flex',gap:8}}>
                              <button className="btn btn-muted" style={{fontSize:11}} onClick={()=>{setGradesLoading(true);fetch(`/api/teacher/export?classId=${activeClass?.id}&format=json`).then(r=>r.ok?r.json():null).then(d=>{if(d)setGradesData(d);setGradesLoading(false);}).catch(()=>setGradesLoading(false));}}>↻ Refresh</button>
                              <button className="btn btn-green" style={{fontSize:11}} onClick={exportCSV}>⬇ CSV</button>
                            </div>
                          </div>
                          <div style={{overflowX:'auto',borderRadius:16,border:'1px solid var(--border)'}}>
                            <table className="student-table" style={{minWidth:900}}>
                              <thead>
                                <tr>
                                  {cols.map(c=>(
                                    <th key={c.key} style={{cursor:(c.sortable!==false&&c.key!=='note')?'pointer':undefined,userSelect:'none',whiteSpace:'nowrap'}} onClick={()=>{if(c.sortable===false||c.key==='note')return;if(gradesSortCol===c.key)setGradesSortDir(d=>d==='asc'?'desc':'asc');else{setGradesSortCol(c.key);setGradesSortDir('desc');}}}>
                                      {c.label} {c.sortable!==false&&c.key!=='note'&&<span style={{opacity:.5,fontSize:9}}>{gradesSortCol===c.key?(gradesSortDir==='asc'?'↑':'↓'):'↕'}</span>}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sorted.map(r=>(
                                  <tr key={r.email} className="srow">
                                    {cols.map(c=>(
                                      <td key={c.key} style={{padding:'10px 14px',fontSize:12}}>
                                        {c.key==='note' ? (
                                          editingNote?.email===r.email ? (
                                            <input
                                              autoFocus
                                              style={{width:'100%',background:'var(--surface2)',border:'1px solid var(--accent)',borderRadius:6,padding:'4px 8px',color:'var(--text)',fontFamily:"'DM Mono',monospace",fontSize:11}}
                                              value={editingNote.value}
                                              onChange={e=>setEditingNote(n=>({...n,value:e.target.value}))}
                                              onBlur={async()=>{
                                                await fetch(`/api/teacher/note/save`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({classId:activeClass?.id,email:r.email,note:editingNote.value})});
                                                setGradesData(d=>({...d,rows:d.rows.map(x=>x.email===r.email?{...x,note:editingNote.value}:x)}));
                                                setEditingNote(null);
                                              }}
                                              onKeyDown={e=>{if(e.key==='Enter')e.target.blur();if(e.key==='Escape')setEditingNote(null);}}
                                            />
                                          ) : (
                                            <span style={{cursor:'pointer',color:r.note?'var(--text)':'var(--muted)',fontSize:11,display:'block',minWidth:120,padding:'2px 4px',borderRadius:4,border:'1px solid transparent'}} title="Click to add note" onClick={()=>setEditingNote({email:r.email,value:r.note||''})}>
                                              {r.note || <span style={{opacity:.4}}>+ add note</span>}
                                            </span>
                                          )
                                        ) : c.fmt(r)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      );
                    })()}
                  </div>
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

      {/* General migration SQL modal */}
      {migrationSql && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}} onClick={()=>setMigrationSql(null)}>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:20,padding:28,maxWidth:660,width:'100%',maxHeight:'85vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,marginBottom:6,color:'var(--text)'}}>🔧 Database Migration Required</div>
            <div style={{fontSize:12,color:'#94a3b8',marginBottom:4,lineHeight:1.6}}>
              The automatic migration couldn't run (Supabase doesn't expose a <code>run_sql</code> RPC by default). <strong>Copy the SQL below</strong>, paste it into <strong>Supabase → SQL Editor</strong>, click <strong>Run</strong>, then come back here and save your settings.
            </div>
            <div style={{fontSize:11,color:'#fbbf24',marginBottom:14,padding:'6px 10px',background:'rgba(245,158,11,.08)',border:'1px solid rgba(245,158,11,.25)',borderRadius:8}}>
              ⚠ Do NOT paste this into the schema.sql file — run it directly in Supabase SQL Editor. The <code>CREATE TABLE IF NOT EXISTS</code> in schema.sql won't add columns to existing tables.
            </div>
            <pre style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:12,padding:16,fontSize:11,color:'var(--accent)',overflowX:'auto',whiteSpace:'pre-wrap',wordBreak:'break-all',marginBottom:16,userSelect:'all'}}>
              {migrationSql}
            </pre>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <button className="btn btn-accent" style={{flex:1}} onClick={()=>{navigator.clipboard?.writeText(migrationSql);setActionMsg({type:'success',msg:'✅ SQL copied!'});setTimeout(()=>setActionMsg(null),2500);}}>
                📋 Copy SQL
              </button>
              <button className="btn btn-muted" onClick={()=>{setMigrationSql(null);setGameRewardsMigrated(true);setAiConfigMigrated(true);}}>
                ✓ I ran it in Supabase
              </button>
              <button className="btn btn-muted" onClick={()=>setMigrationSql(null)}>✕ Close</button>
            </div>
          </div>
        </div>
      )}

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