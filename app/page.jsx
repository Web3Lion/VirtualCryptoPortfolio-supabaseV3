"use client";
import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const TICKER_ITEMS = [
  { sym: 'BTC', val: '+2.4%', color: '#f7931a' },
  { sym: 'ETH', val: '+1.8%', color: '#627eea' },
  { sym: 'SOL', val: '+5.2%', color: '#9945ff' },
  { sym: 'ADA', val: '-0.7%', color: '#0033ad' },
  { sym: 'DOGE', val: '+12.1%', color: '#c2a633' },
  { sym: 'AVAX', val: '+3.3%', color: '#e84142' },
  { sym: 'BNB', val: '+0.9%', color: '#f3ba2f' },
  { sym: 'LINK', val: '+4.6%', color: '#2a5ada' },
  { sym: 'XRP', val: '-1.2%', color: '#00aae4' },
  { sym: 'DOT', val: '+2.1%', color: '#e6007a' },
];

const FEATURES = [
  { icon: '📈', label: 'Live Prices' },
  { icon: '🏆', label: 'Leaderboard' },
  { icon: '🎓', label: 'Learn & Earn' },
  { icon: '💎', label: 'Badges' },
  { icon: '🔄', label: 'DCA Orders' },
  { icon: '📰', label: 'Crypto News' },
];

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#05080f;min-height:100vh;font-family:'DM Mono',monospace;overflow-x:hidden}

        /* ── Animated grid background ── */
        .hero-bg{
          position:fixed;inset:0;z-index:0;
          background:
            radial-gradient(ellipse 80% 60% at 20% 30%, rgba(0,229,160,.06) 0%, transparent 60%),
            radial-gradient(ellipse 60% 80% at 80% 70%, rgba(99,102,241,.06) 0%, transparent 60%),
            #05080f;
        }
        .hero-bg::before{
          content:'';position:absolute;inset:0;
          background-image:
            linear-gradient(rgba(30,41,59,.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(30,41,59,.4) 1px, transparent 1px);
          background-size:48px 48px;
          mask-image:radial-gradient(ellipse 100% 100% at 50% 50%, black 30%, transparent 80%);
        }

        /* ── Floating orbs ── */
        .orb{position:fixed;border-radius:50%;filter:blur(80px);pointer-events:none;z-index:0}
        .orb-1{width:400px;height:400px;background:rgba(0,229,160,.07);top:-100px;left:-100px;animation:drift1 18s ease-in-out infinite}
        .orb-2{width:300px;height:300px;background:rgba(99,102,241,.07);bottom:-80px;right:-80px;animation:drift2 22s ease-in-out infinite}
        .orb-3{width:200px;height:200px;background:rgba(245,158,11,.05);top:50%;left:60%;animation:drift3 14s ease-in-out infinite}
        @keyframes drift1{0%,100%{transform:translate(0,0)}50%{transform:translate(40px,60px)}}
        @keyframes drift2{0%,100%{transform:translate(0,0)}50%{transform:translate(-50px,-40px)}}
        @keyframes drift3{0%,100%{transform:translate(0,0)}50%{transform:translate(-30px,40px)}}

        /* ── Ticker bar ── */
        .ticker-wrap{position:fixed;top:0;left:0;right:0;z-index:10;overflow:hidden;
          background:rgba(5,8,15,.8);border-bottom:1px solid rgba(30,41,59,.8);
          backdrop-filter:blur(12px);height:36px;display:flex;align-items:center}
        .ticker-track{display:flex;gap:0;animation:scroll 30s linear infinite;white-space:nowrap}
        .ticker-item{display:flex;align-items:center;gap:6px;padding:0 20px;font-size:11px;letter-spacing:.5px}
        @keyframes scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}

        /* ── Main layout ── */
        .page{position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 16px 40px}

        /* ── Card ── */
        .card{
          background:rgba(15,23,42,.85);
          border:1px solid rgba(30,41,59,.9);
          border-radius:28px;
          padding:48px 44px;
          text-align:center;
          max-width:420px;width:100%;
          backdrop-filter:blur(20px);
          box-shadow:0 0 0 1px rgba(0,229,160,.05),0 32px 64px rgba(0,0,0,.6);
          position:relative;overflow:hidden;
        }
        .card::before{
          content:'';position:absolute;top:0;left:0;right:0;height:1px;
          background:linear-gradient(90deg,transparent,rgba(0,229,160,.4),transparent);
        }

        /* ── Logo ── */
        .logo{font-family:'Syne',sans-serif;font-weight:800;font-size:32px;letter-spacing:-1.5px;color:#e2e8f0;margin-bottom:6px;line-height:1}
        .logo-accent{color:#00e5a0;text-shadow:0 0 24px rgba(0,229,160,.5)}
        .tagline{font-size:11px;color:#475569;margin-bottom:6px;letter-spacing:2px;text-transform:uppercase}
        .tagline-sub{font-size:12px;color:#64748b;margin-bottom:32px;line-height:1.6}

        /* ── Feature pills ── */
        .features{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-bottom:28px}
        .feature-pill{display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.03);border:1px solid rgba(30,41,59,.8);border-radius:20px;padding:5px 12px;font-size:10px;color:#475569;letter-spacing:.5px}

        /* ── Sign-in button ── */
        .btn{
          width:100%;padding:15px;border-radius:14px;border:none;
          background:linear-gradient(135deg,#00e5a0,#00c48a);
          color:#000;font-family:'DM Mono',monospace;font-size:13px;font-weight:700;
          cursor:pointer;transition:all .2s;letter-spacing:.5px;
          display:flex;align-items:center;justify-content:center;gap:10px;
          box-shadow:0 4px 24px rgba(0,229,160,.25);
        }
        .btn:hover{filter:brightness(1.08);transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,229,160,.35)}
        .btn:active{transform:translateY(0)}
        .google-icon{width:18px;height:18px;flex-shrink:0}

        /* ── Divider ── */
        .divider{display:flex;align-items:center;gap:12px;margin:20px 0;color:#1e293b;font-size:10px;letter-spacing:1px}
        .divider::before,.divider::after{content:'';flex:1;height:1px;background:#1e293b}

        /* ── Stats bar below card ── */
        .stats-bar{display:flex;gap:24px;margin-top:28px;justify-content:center;flex-wrap:wrap}
        .stat-item{text-align:center}
        .stat-val{font-family:'Syne',sans-serif;font-weight:800;font-size:18px;color:#e2e8f0;letter-spacing:-0.5px}
        .stat-lbl{font-size:9px;color:#334155;letter-spacing:1.5px;text-transform:uppercase;margin-top:2px}

        .disclaimer{font-size:11px;color:#64748b;margin-top:16px;line-height:1.7;padding:12px 14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;text-align:center}

        @media(max-width:400px){.card{padding:36px 24px}.logo{font-size:26px}}
      `}</style>

      {/* Animated background */}
      <div className="hero-bg" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Ticker bar */}
      <div className="ticker-wrap">
        <div className="ticker-track">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <div key={i} className="ticker-item">
              <span style={{ color: item.color, fontWeight: 700 }}>{item.sym}</span>
              <span style={{ color: item.val.startsWith('+') ? '#00e5a0' : '#f43f5e', fontSize: 10 }}>{item.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="page">
        <div className="card">
          {/* Logo */}
          <div className="logo">CRYPTO<span className="logo-accent">CLASS</span></div>
          <div className="tagline">Virtual Trading Simulator</div>
          <div className="tagline-sub">Trade crypto with $10,000 in virtual cash.<br/>Learn, compete, and earn badges.</div>

          {/* Feature pills */}
          <div className="features">
            {FEATURES.map(f => (
              <div key={f.label} className="feature-pill">
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>

          {/* Sign-in */}
          <button className="btn" onClick={() => signIn("google")}>
            <svg className="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          <div className="disclaimer">
            ⚠️ <strong style={{color:'#94a3b8'}}>Not financial advice.</strong> CryptoClassroom is an educational simulator for entertainment and learning purposes only. No real money is used. Past simulated performance does not reflect real-world results. Always consult a qualified financial advisor before making real investment decisions.
          </div>
        </div>

        {/* Stats bar */}
        <div className="stats-bar">
          {[
            { val: '$10,000', lbl: 'Starting Cash' },
            { val: '50+', lbl: 'Badges to Earn' },
            { val: '3', lbl: 'Mini-Games' },
            { val: '∞', lbl: 'Lessons' },
          ].map(s => (
            <div key={s.lbl} className="stat-item">
              <div className="stat-val">{s.val}</div>
              <div className="stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
