'use client';
import { useState, useEffect } from 'react';

const ALL_BADGES = {
  first_trade:'🥇',active_trader:'⚡',power_trader:'🔥',whale:'🐳',doubled_up:'💰',triple_threat:'🎰',
  first_profit:'🌱',ten_pct:'🚀',diamond_hands:'💎',to_the_moon:'🌕',portfolio_x2:'🔱',crash_survivor:'🌊',
  diversified:'🌈',sharpshooter:'🎯',sniper:'🏹',hodler:'🧘',stop_loss_pro:'✂️',bought_dip:'📉',sector_pro:'🗂️',sector_specialist:'🏆',
  analyst:'📝',researcher:'📖',due_diligence:'🔍',first_watch:'👀',serious_watch:'🎯',veteran_watch:'🔭',
  bull_rider:'🐂',flash_deal:'⚡',news_trader:'📰',bot_copycat:'🤖',patient_investor:'💤',eager_investor:'📅',fomo_investor:'😰',
  champion:'🏆',beat_the_bot:'🤖',most_improved:'📊',comeback_kid:'🔄',fee_conscious:'💸',
  signal_found:'📡',data_chef:'🍳',market_pulse:'💓',price_oracle:'🔮',omniscient:'🌐',
  first_lesson:'📚',lesson_five:'📖',lesson_fifteen:'🎓',perfect_score:'💯',quiz_ace:'🌟',speed_learner:'💨',study_streak:'🧠',module_master:'🗺️',module_trio:'🎖️',crypto_professor:'🎩',
  order_placed:'📋',order_sniper:'🎯',limit_master:'📊',order_hit:'✅',triple_trigger:'🔱',short_seller:'📉',patient_limit:'⏳',stacked_orders:'🃏',cut_bait:'✂️',
  crush_rookie:'🎮',crush_500:'💫',crush_1000:'🌊',crush_3000:'👑',crush_veteran:'🕹️',crush_daily_max:'⭐',crush_grinder:'🎰',
};

const BADGE_NAMES = {
  first_trade:'First Trade',active_trader:'Active Trader',power_trader:'Power Trader',whale:'Whale',doubled_up:'Doubled Up',triple_threat:'Triple Threat',
  first_profit:'First Profit',ten_pct:'10% Club',diamond_hands:'Diamond Hands',to_the_moon:'To The Moon',portfolio_x2:'Portfolio Doubled',crash_survivor:'Crash Survivor',
  diversified:'Diversified',sharpshooter:'Sharpshooter',sniper:'Sniper',hodler:'HODLer',stop_loss_pro:'Stop Loss Pro',bought_dip:'Bought The Dip',sector_pro:'Sector Pro',sector_specialist:'Sector Specialist',
  analyst:'Analyst',researcher:'Researcher',due_diligence:'Due Diligence',first_watch:'First Watch',serious_watch:'Serious Watchman',veteran_watch:'Veteran Watchman',
  bull_rider:'Bull Rider',flash_deal:'Flash Deal',news_trader:'News Trader',bot_copycat:'Bot Copycat',patient_investor:'Patient Investor',eager_investor:'Eager Investor',fomo_investor:'FOMO Investor',
  champion:'Class Champion',beat_the_bot:'Beat The Bot',most_improved:'Most Improved',comeback_kid:'Comeback Kid',fee_conscious:'Fee Conscious',
  signal_found:'Signal Found',data_chef:'Data Chef',market_pulse:'Market Pulse',price_oracle:'Price Oracle',omniscient:'Omniscient',
  first_lesson:'First Lesson',lesson_five:'Quick Study',lesson_fifteen:'Dedicated Learner',perfect_score:'Perfect Score',quiz_ace:'Quiz Ace',speed_learner:'Speed Learner',study_streak:'Study Streak',module_master:'Module Master',module_trio:'Triple Scholar',crypto_professor:'Crypto Professor',
  order_placed:'Order Placed',order_sniper:'Order Sniper',limit_master:'Limit Master',order_hit:'Order Hit',triple_trigger:'Triple Trigger',short_seller:'Short Seller',patient_limit:'Patient Limit',stacked_orders:'Stacked',cut_bait:'Cut Bait',
  crush_rookie:'Crush Rookie',crush_500:'Match Maestro',crush_1000:'Chain Crusher',crush_3000:'Crush Legend',crush_veteran:'Crush Veteran',crush_daily_max:'Daily Maxer',crush_grinder:'Crush Grinder',
};

export default function BadgeToast({ badgeIds = [] }) {
  const [visible, setVisible] = useState([]);

  useEffect(() => {
    if (!badgeIds.length) return;
    const items = badgeIds.map((id, i) => ({ id, key: `${id}-${Date.now()}-${i}` }));
    setVisible(prev => [...prev, ...items]);
    const t = setTimeout(() => setVisible(prev => prev.filter(v => !items.find(i => i.key === v.key))), 5000);
    return () => clearTimeout(t);
  }, [badgeIds.join(',')]);

  if (!visible.length) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .badge-toast-wrap{position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none}
        .badge-toast{background:var(--surface,#0f172a);border:1px solid rgba(0,229,160,.4);border-radius:16px;padding:14px 18px;display:flex;align-items:center;gap:14px;box-shadow:0 8px 32px rgba(0,0,0,.5),0 0 24px rgba(0,229,160,.15);animation:toastIn .35s ease;min-width:220px}
        .badge-toast-emoji{font-size:28px;line-height:1;flex-shrink:0}
        .badge-toast-label{font-size:9px;color:#00e5a0;letter-spacing:2px;text-transform:uppercase;margin-bottom:3px;font-family:'DM Mono',monospace}
        .badge-toast-name{font-family:'Syne',sans-serif;font-weight:700;font-size:15px;color:#e2e8f0}
        @keyframes toastIn{from{opacity:0;transform:translateY(16px) scale(.95)}to{opacity:1;transform:none}}
      ` }} />
      <div className="badge-toast-wrap">
        {visible.map(({ id, key }) => (
          <div key={key} className="badge-toast">
            <span className="badge-toast-emoji">{ALL_BADGES[id] || '🏅'}</span>
            <div>
              <div className="badge-toast-label">Badge Unlocked</div>
              <div className="badge-toast-name">{BADGE_NAMES[id] || id}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
