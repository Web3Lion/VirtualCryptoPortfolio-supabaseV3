"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { applyTheme, getTheme } from "@/lib/theme";

const ALL_BADGES = [
  // Milestone
  {id:'first_trade',    cat:'milestone',  emoji:'🥇',name:'First Trade',      hint:'Execute your first trade'},
  {id:'active_trader',  cat:'milestone',  emoji:'⚡',name:'Active Trader',     hint:'Complete 10 trades'},
  {id:'power_trader',   cat:'milestone',  emoji:'🔥',name:'Power Trader',      hint:'Complete 25 trades'},
  {id:'whale',          cat:'milestone',  emoji:'🐳',name:'Whale',             hint:'Net $2,000 gain on a single trade'},
  {id:'doubled_up',     cat:'milestone',  emoji:'💰',name:'Doubled Up',        hint:'Double your money on a single investment'},
  {id:'triple_threat',  cat:'milestone',  emoji:'🎰',name:'Triple Threat',     hint:'Triple your money on a single investment'},
  // Performance
  {id:'first_profit',   cat:'performance',emoji:'🌱',name:'First Profit',      hint:'Make money on your first sell'},
  {id:'ten_pct',        cat:'performance',emoji:'🚀',name:'10% Club',          hint:'Portfolio hits +10% return'},
  {id:'diamond_hands',  cat:'performance',emoji:'💎',name:'Diamond Hands',     hint:'Portfolio hits +25% return'},
  {id:'to_the_moon',    cat:'performance',emoji:'🌕',name:'To The Moon',       hint:'Portfolio hits +50% return'},
  {id:'portfolio_x2',   cat:'performance',emoji:'🔱',name:'Portfolio Doubled', hint:'Portfolio hits +100% return'},
  {id:'crash_survivor', cat:'performance',emoji:'🌊',name:'Crash Survivor',    hint:'Portfolio drops 15%+, then recovers'},
  // Strategy
  {id:'diversified',    cat:'strategy',   emoji:'🌈',name:'Diversified',       hint:'Hold 4+ different coins at once'},
  {id:'sharpshooter',   cat:'strategy',   emoji:'🎯',name:'Sharpshooter',      hint:'3 consecutive profitable sells'},
  {id:'sniper',         cat:'strategy',   emoji:'🏹',name:'Sniper',            hint:'5 consecutive profitable sells'},
  {id:'hodler',         cat:'strategy',   emoji:'🧘',name:'HODLer',            hint:'Hold a coin 7+ days, sell profitably'},
  {id:'stop_loss_pro',  cat:'strategy',   emoji:'✂️',name:'Stop Loss Pro',     hint:'Cut a loss before -15% drop'},
  {id:'bought_dip',     cat:'strategy',   emoji:'📉',name:'Bought The Dip',    hint:'Buy after -10% drop, sell profitably'},
  {id:'sector_pro',     cat:'strategy',   emoji:'🗂️',name:'Sector Pro',        hint:'Hold coins in 3+ different sectors'},
  {id:'sector_specialist',cat:'strategy', emoji:'🏆',name:'Sector Specialist', hint:'Hold 3+ coins in same sector, all profitable'},
  // Learning
  {id:'analyst',        cat:'learning',   emoji:'📝',name:'Analyst',           hint:'Write trade notes on 5 trades'},
  {id:'researcher',     cat:'learning',   emoji:'📖',name:'Researcher',        hint:'Write trade notes on 15 trades'},
  {id:'due_diligence',  cat:'learning',   emoji:'🔍',name:'Due Diligence',     hint:'Write a note longer than 50 characters'},
  {id:'first_watch',    cat:'learning',   emoji:'👀',name:'First Watch',       hint:'Set your first watchlist price alert'},
  {id:'serious_watch',  cat:'learning',   emoji:'🎯',name:'Serious Watchman',  hint:'Set 10 price alerts'},
  {id:'veteran_watch',  cat:'learning',   emoji:'🔭',name:'Veteran Watchman',  hint:'Set 20+ watchlist alerts over time'},
  // Situational
  {id:'bull_rider',     cat:'situational',emoji:'🐂',name:'Bull Rider',        hint:'Hold during a bull run and profit'},
  {id:'flash_deal',     cat:'situational',emoji:'⚡',name:'Flash Deal',        hint:'Buy a coin during a flash sale'},
  {id:'news_trader',    cat:'situational',emoji:'📰',name:'News Trader',       hint:'Trade within 30 min of a headline'},
  {id:'bot_copycat',    cat:'situational',emoji:'🤖',name:'Bot Copycat',       hint:'Mirror a bot trade within 30 min'},
  {id:'patient_investor',cat:'situational',emoji:'💤',name:'Patient Investor', hint:'Go 3+ days without trading, then profit'},
  {id:'eager_investor', cat:'situational',emoji:'📅',name:'Eager Investor',    hint:'Trade every day for 5 days straight'},
  {id:'fomo_investor',  cat:'situational',emoji:'😰',name:'FOMO Investor',     hint:'Trade every day for 10 days straight'},
  // Simulation
  {id:'champion',       cat:'simulation', emoji:'🏆',name:'Class Champion',    hint:'Finish 1st in the simulation'},
  {id:'beat_the_bot',   cat:'simulation', emoji:'🤖',name:'Beat The Bot',      hint:'Finish above Satoshi Botomoto'},
  {id:'most_improved',  cat:'simulation', emoji:'📊',name:'Most Improved',     hint:'Biggest week-over-week gain'},
  {id:'comeback_kid',   cat:'simulation', emoji:'🔄',name:'Comeback Kid',      hint:'Recover from last place to top 3'},
  {id:'fee_conscious',  cat:'simulation', emoji:'💸',name:'Fee Conscious',     hint:'10+ trades with total fees under $50'},
];

const CAT_COLORS = {
  milestone:'#f59e0b', performance:'#00e5a0', strategy:'#3b82f6',
  learning:'#8b5cf6',  situational:'#f43f5e', simulation:'#06b6d4',
};

const CAT_LABELS = {
  milestone:'Milestone', performance:'Performance', strategy:'Strategy',
  learning:'Learning',   situational:'Situational', simulation:'Simulation',
};

export default function Badges() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [earned, setEarned]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { applyTheme(getTheme()); }, []);
  useEffect(()=>{ if(status==='unauthenticated') router.replace('/'); },[status,router]);
  useEffect(()=>{
    if(status==='authenticated'){
      fetch('/api/badges').then(r=>r.ok?r.json():[]).then(d=>{ setEarned(Array.isArray(d)?d.map(b=>b.badge_id||b):[]); setLoading(false); }).catch(()=>setLoading(false));
    }
  },[status]);

  if(status==='loading'||status==='unauthenticated') return <div style={{background:'var(--bg,#080c14)',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)'}}>Loading...</div>;

  const cats = [...new Set(ALL_BADGES.map(b=>b.cat))];
  const earnedCount = ALL_BADGES.filter(b=>earned.includes(b.id)).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#080c14;--surface:#0f172a;--surface2:#1a2235;--border:#1e293b;--accent:#00e5a0;--text:#e2e8f0;--muted:#475569;--gold:#f59e0b}
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:1200px;margin:0 auto;padding:24px 16px}
        .nav{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;margin-bottom:28px;background:var(--surface);border:1px solid var(--border);border-radius:16px;flex-wrap:wrap;gap:10px}
        .logo{font-family:'Syne',sans-serif;font-weight:800;font-size:16px}.logo span{color:var(--accent)}
        .nav-links{display:flex;gap:8px;flex-wrap:wrap}
        .nav-link{padding:6px 14px;border-radius:8px;font-size:11px;text-decoration:none;color:var(--muted);letter-spacing:1px;transition:all .2s;text-transform:uppercase}
        .nav-link:hover{color:var(--accent)}.nav-link.active{background:rgba(128,200,128,.12);color:var(--accent);border:1px solid rgba(128,200,128,.2)}
        .progress-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:24px;margin-bottom:24px;display:flex;align-items:center;gap:24px}
        .progress-num{font-family:'Syne',sans-serif;font-weight:800;font-size:48px;color:var(--accent)}
        .progress-bar-wrap{flex:1;background:var(--surface2);border-radius:8px;height:12px;overflow:hidden}
        .progress-bar-fill{height:100%;border-radius:8px;background:linear-gradient(90deg,var(--accent),#3b82f6);transition:width .8s ease}
        .cat-section{margin-bottom:32px}
        .cat-title{font-family:'Syne',sans-serif;font-weight:700;font-size:16px;margin-bottom:14px;display:flex;align-items:center;gap:8px;color:var(--text)}
        .badge-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}
        .badge-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px;text-align:center;transition:all .2s;position:relative}
        .badge-card.earned{background:rgba(0,229,160,.08);border-color:var(--accent);box-shadow:0 0 12px rgba(0,229,160,.1)}
        .badge-card.locked{opacity:1;border:1px dashed rgba(128,128,128,.35)} .badge-card.locked .badge-emoji{opacity:.25;filter:grayscale(1)} .badge-card.locked .badge-name{color:#94a3b8} .badge-card.locked .badge-hint{color:#94a3b8}
        .badge-emoji{font-size:32px;margin-bottom:8px;display:block}
        .badge-name{font-family:'Syne',sans-serif;font-weight:700;font-size:11px;margin-bottom:4px;color:var(--text)}
        .badge-hint{font-size:10px;color:#94a3b8;line-height:1.5}
        .earned-check{position:absolute;top:8px;right:8px;font-size:14px}
        .skeleton{background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>
      <div className="page">
        <nav className="nav">
          <div className="logo">CRYPTO<span>CLASS</span></div>
          <div className="nav-links">
            <Link href="/dashboard" className="nav-link">Wallet</Link>
            <Link href="/leaderboard" className="nav-link">Leaderboard</Link>
            <Link href="/market" className="nav-link">Market</Link>
            <Link href="/news" className="nav-link">News</Link>
            <a href="/badges" className="nav-link active">Badges</a>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <ThemeToggle/>
          </div>
        </nav>

        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:32,letterSpacing:-1,marginBottom:4,color:"var(--text)"}}>
          🏅 <span style={{color:"var(--accent)"}}>Badges</span>
        </div>
        <div style={{fontSize:11,color:"#94a3b8",marginBottom:24}}>Earn badges by hitting trading milestones</div>

        {loading ? <div className="skeleton" style={{height:100,marginBottom:24}}/> : (
          <div className="progress-card">
            <div className="progress-num">{earnedCount}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:"#94a3b8",marginBottom:8}}>of {ALL_BADGES.length} badges earned</div>
              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{width:`${(earnedCount/ALL_BADGES.length)*100}%`}}/>
              </div>
            </div>
          </div>
        )}

        {cats.map(cat=>(
          <div className="cat-section" key={cat}>
            <div className="cat-title">
              <span style={{width:12,height:12,borderRadius:3,background:CAT_COLORS[cat],display:'inline-block'}}/>
              {CAT_LABELS[cat]}
              <span style={{fontSize:11,color:"#94a3b8",fontWeight:400}}>
                ({ALL_BADGES.filter(b=>b.cat===cat&&earned.includes(b.id)).length}/{ALL_BADGES.filter(b=>b.cat===cat).length})
              </span>
            </div>
            <div className="badge-grid">
              {ALL_BADGES.filter(b=>b.cat===cat).map(badge=>{
                const isEarned = earned.includes(badge.id);
                return (
                  <div key={badge.id} className={`badge-card ${isEarned?'earned':'locked'}`}
                    style={isEarned?{borderColor:CAT_COLORS[badge.cat]}:{}}>
                    {isEarned&&<span className="earned-check">✓</span>}
                    <span className="badge-emoji">{isEarned?badge.emoji:'🔒'}</span>
                    <div className="badge-name">{badge.name}</div>
                    <div className="badge-hint">{badge.hint}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}