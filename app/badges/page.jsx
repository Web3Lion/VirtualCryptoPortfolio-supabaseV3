"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
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
  // Data Contributor
  {id:'signal_found',   cat:'data',       emoji:'📡',name:'Signal Found',      hint:'Manually refresh prices for the first time'},
  {id:'data_chef',      cat:'data',       emoji:'🍳',name:'Data Chef',         hint:'Refresh prices 5 times — cooking up fresh data!'},
  {id:'market_pulse',   cat:'data',       emoji:'💓',name:'Market Pulse',      hint:'Refresh prices 25 times — you feel the heartbeat'},
  {id:'price_oracle',   cat:'data',       emoji:'🔮',name:'Price Oracle',      hint:'Refresh prices 50 times — the market whispers to you'},
  {id:'omniscient',     cat:'data',       emoji:'🌐',name:'Omniscient',        hint:'Refresh prices 100 times — you ARE the market'},
  // Curriculum (Learning modules)
  {id:'first_lesson',   cat:'curriculum', emoji:'📚',name:'First Lesson',      hint:'Complete your first lesson'},
  {id:'lesson_five',    cat:'curriculum', emoji:'📖',name:'Quick Study',        hint:'Complete 5 lessons'},
  {id:'lesson_fifteen', cat:'curriculum', emoji:'🎓',name:'Dedicated Learner', hint:'Complete 15 lessons'},
  {id:'perfect_score',  cat:'curriculum', emoji:'💯',name:'Perfect Score',     hint:'Score 100% on any quiz or game lesson'},
  {id:'quiz_ace',       cat:'curriculum', emoji:'🌟',name:'Quiz Ace',          hint:'Score 100% five times'},
  {id:'speed_learner',  cat:'curriculum', emoji:'💨',name:'Speed Learner',     hint:'Complete 3 lessons in a single day'},
  {id:'study_streak',   cat:'curriculum', emoji:'🧠',name:'Study Streak',      hint:'Complete lessons 5 days in a row'},
  {id:'module_master',  cat:'curriculum', emoji:'🗺️',name:'Module Master',     hint:'Finish every lesson in a module'},
  {id:'module_trio',    cat:'curriculum', emoji:'🎖️',name:'Triple Scholar',    hint:'Complete 3 full modules'},
  {id:'crypto_professor',cat:'curriculum',emoji:'🎩',name:'Crypto Professor',  hint:'Complete 5 full modules'},
  // Orders (Limit Orders)
  {id:'order_placed',   cat:'orders',     emoji:'📋',name:'Order Placed',      hint:'Place your first limit order'},
  {id:'order_sniper',   cat:'orders',     emoji:'🎯',name:'Order Sniper',      hint:'Place 5 limit orders'},
  {id:'limit_master',   cat:'orders',     emoji:'📊',name:'Limit Master',      hint:'Place 20 limit orders'},
  {id:'order_hit',      cat:'orders',     emoji:'✅',name:'Order Hit',         hint:'Have your first limit order execute'},
  {id:'triple_trigger', cat:'orders',     emoji:'🔱',name:'Triple Trigger',    hint:'Have 3 limit orders execute successfully'},
  {id:'short_seller',   cat:'orders',     emoji:'📉',name:'Short Seller',      hint:'Place your first SHORT order'},
  {id:'patient_limit',  cat:'orders',     emoji:'⏳',name:'Patient Limit',     hint:'An order stays pending 24+ hours, then fires'},
  {id:'stacked_orders', cat:'orders',     emoji:'🃏',name:'Stacked',           hint:'Have 3+ active limit orders at once'},
  {id:'cut_bait',       cat:'orders',     emoji:'✂️',name:'Cut Bait',          hint:'Cancel a limit order — knowing when to quit counts'},
  // Daily Challenge Streaks
  {id:'streak_3',  cat:'streak', emoji:'🔥', name:'Hot Streak',       hint:'Complete the daily challenge 3 days in a row'},
  {id:'streak_7',  cat:'streak', emoji:'🌟', name:'Week Warrior',      hint:'Complete the daily challenge 7 days in a row'},
  {id:'streak_14', cat:'streak', emoji:'💪', name:'Fortnight Fighter', hint:'Complete the daily challenge 14 days in a row'},
  {id:'streak_30', cat:'streak', emoji:'👑', name:'Monthly Master',    hint:'Complete the daily challenge 30 days in a row'},
  // Games (Crypto Crush)
  {id:'crush_rookie',   cat:'games',      emoji:'🎮',name:'Crush Rookie',      hint:'Play your first Crypto Crush game'},
  {id:'crush_500',      cat:'games',      emoji:'💫',name:'Match Maestro',     hint:'Score 500+ in a single Crush game'},
  {id:'crush_1000',     cat:'games',      emoji:'🌊',name:'Chain Crusher',     hint:'Score 1000+ in a single Crush game'},
  {id:'crush_3000',     cat:'games',      emoji:'👑',name:'Crush Legend',      hint:'Score 3000+ in a single Crush game'},
  {id:'crush_veteran',  cat:'games',      emoji:'🕹️',name:'Crush Veteran',     hint:'Play 10 Crypto Crush games'},
  {id:'crush_daily_max',cat:'games',      emoji:'⭐',name:'Daily Maxer',       hint:'Earn the full daily token cap in Crypto Crush'},
  {id:'crush_grinder',  cat:'games',      emoji:'🎰',name:'Crush Grinder',     hint:'Play Crypto Crush on 3 different days'},
  // Miner Runner
  {id:'miner_rookie',   cat:'games',      emoji:'🏃',name:'Miner Rookie',      hint:'Play your first Miner Runner game'},
  {id:'miner_500',      cat:'games',      emoji:'⛏',name:'Cave Explorer',     hint:'Score 500+ in a single Miner run (~10s)'},
  {id:'miner_1500',     cat:'games',      emoji:'💣',name:'Deep Miner',        hint:'Score 1,500+ — survive past Level 2'},
  {id:'miner_4000',     cat:'games',      emoji:'🌋',name:'Miner Legend',      hint:'Score 4,000+ — survive past Level 5'},
  {id:'miner_veteran',  cat:'games',      emoji:'🎮',name:'Miner Veteran',     hint:'Play 10 Miner Runner games'},
  {id:'miner_daily_max',cat:'games',      emoji:'⭐',name:'Full Shift',        hint:'Hit the daily token cap in Miner Runner'},
  {id:'miner_grinder',  cat:'games',      emoji:'🔄',name:'Miner Grinder',     hint:'Play Miner Runner on 3 different days'},
];

const CAT_COLORS = {
  milestone:'#f59e0b', performance:'#00e5a0', strategy:'#3b82f6',
  learning:'#8b5cf6',  situational:'#f43f5e', simulation:'#06b6d4',
  data:'#22d3ee',      curriculum:'#a78bfa',  orders:'#34d399',  streak:'#f97316', games:'#fb923c',
};

const CAT_LABELS = {
  milestone:'Milestone', performance:'Performance', strategy:'Strategy',
  learning:'Learning',   situational:'Situational', simulation:'Simulation',
  data:'Data Contributor', curriculum:'Curriculum', orders:'Limit Orders', streak:'Daily Streaks', games:'Games',
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
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:1200px;margin:0 auto;padding:24px 16px}
        .progress-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:24px;margin-bottom:24px;display:flex;align-items:center;gap:24px}
        .progress-num{font-family:'Syne',sans-serif;font-weight:800;font-size:48px;color:var(--accent)}
        .progress-bar-wrap{flex:1;background:var(--surface2);border-radius:8px;height:12px;overflow:hidden}
        .progress-bar-fill{height:100%;border-radius:8px;background:linear-gradient(90deg,var(--accent),#3b82f6);transition:width .8s ease}
        .cat-section{margin-bottom:32px}
        .cat-title{font-family:'Syne',sans-serif;font-weight:700;font-size:16px;margin-bottom:14px;display:flex;align-items:center;gap:8px;color:var(--text)}
        .badge-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:10px}
        .badge-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px 12px 14px;text-align:center;transition:transform .2s,box-shadow .2s;position:relative;overflow:hidden;cursor:default}
        .badge-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;opacity:0;transition:opacity .2s}
        .badge-card.earned::before{opacity:1}
        .badge-card:hover{transform:translateY(-2px)}
        .badge-card.earned:hover{box-shadow:0 8px 24px rgba(0,0,0,.25)}
        .badge-card.locked{border-style:dashed;border-color:rgba(148,163,184,.2)}
        .badge-icon{width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:26px;transition:box-shadow .2s;position:relative}
        .badge-card.locked .badge-icon{filter:grayscale(1);opacity:.35}
        .badge-name{font-family:'Syne',sans-serif;font-weight:700;font-size:11px;margin-bottom:4px}
        .badge-card.locked .badge-name{color:var(--muted)}
        .badge-hint{font-size:9px;color:var(--muted);line-height:1.5}
        .earned-tag{display:inline-block;font-size:8px;fontWeight:700;letter-spacing:1.5px;text-transform:uppercase;padding:2px 7px;border-radius:20px;margin-top:8px}
        .lock-overlay{position:absolute;top:6px;right:8px;font-size:11px;opacity:.4}
        .skeleton{background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes badgePop{0%{transform:scale(.8);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
      ` }} />
      <div className="page">
        <Nav active="badges" />

        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:32,letterSpacing:-1,marginBottom:4,color:"var(--text)"}}>
          🏅 <span style={{color:"var(--accent)"}}>Badges</span>
        </div>
        <div style={{fontSize:11,color:"#94a3b8",marginBottom:24}}>Earn badges by trading, learning, and playing games</div>

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

        {cats.map(cat=>{
          const catColor = CAT_COLORS[cat];
          const catBadges = ALL_BADGES.filter(b=>b.cat===cat);
          const catEarned = catBadges.filter(b=>earned.includes(b.id)).length;
          const catPct = Math.round((catEarned/catBadges.length)*100);
          return (
            <div className="cat-section" key={cat}>
              {/* Section header */}
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <div style={{width:4,height:22,borderRadius:2,background:catColor,flexShrink:0}}/>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:'var(--text)'}}>{CAT_LABELS[cat]}</div>
                <div style={{flex:1,height:1,background:`linear-gradient(90deg,${catColor}40,transparent)`,marginLeft:4}}/>
                <div style={{fontSize:10,color:'var(--muted)',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:20,padding:'2px 8px',flexShrink:0}}>
                  {catEarned}/{catBadges.length}
                  {catPct === 100 && <span style={{marginLeft:5,color:catColor}}>✓</span>}
                </div>
              </div>
              <div className="badge-grid">
                {catBadges.map(badge=>{
                  const isEarned = earned.includes(badge.id);
                  return (
                    <div key={badge.id} className={`badge-card ${isEarned?'earned':'locked'}`}
                      style={isEarned ? {
                        borderColor:`${catColor}60`,
                        background:`linear-gradient(160deg,${catColor}0d,var(--surface) 60%)`,
                        boxShadow:`0 0 0 1px ${catColor}30`,
                        '--before-bg': `linear-gradient(90deg,transparent,${catColor},transparent)`,
                      } : {}}>
                      {/* Top accent line for earned */}
                      {isEarned && <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${catColor},transparent)`}}/>}
                      {/* Lock icon for locked */}
                      {!isEarned && <span className="lock-overlay">🔒</span>}
                      {/* Icon circle */}
                      <div className="badge-icon" style={isEarned ? {
                        background:`${catColor}20`,
                        border:`2px solid ${catColor}50`,
                        boxShadow:`0 0 16px ${catColor}30`,
                        animation:'badgePop .4s ease both',
                      } : {
                        background:'var(--surface2)',
                        border:'2px solid var(--border)',
                      }}>
                        {badge.emoji}
                      </div>
                      <div className="badge-name" style={isEarned?{color:'var(--text)'}:{}}>{badge.name}</div>
                      <div className="badge-hint">{badge.hint}</div>
                      {isEarned && (
                        <div className="earned-tag" style={{background:`${catColor}20`,color:catColor,border:`1px solid ${catColor}40`}}>
                          EARNED
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}