"use client";
import { useEffect, useState } from "react";
import CoinLogo from "@/components/CoinLogo";
import { useParams } from "next/navigation";

const fmtUSD = n => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
const fmtPct = n => (n >= 0 ? "+" : "") + parseFloat(n || 0).toFixed(2) + "%";

const COIN_COLORS = { BTC:"#f7931a",ETH:"#627eea",SOL:"#9945ff",ADA:"#0033ad",DOGE:"#c2a633",AVAX:"#e84142",DOT:"#e6007a",LINK:"#2a5ada",MATIC:"#8247e5",XRP:"#00aae4",BNB:"#f3ba2f",DEFAULT:"#00e5a0" };
const coinColor = t => COIN_COLORS[t?.toUpperCase()] || COIN_COLORS.DEFAULT;

export default function SharePage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/share/${token}`)
      .then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.error || "Invalid link"); }))
      .then(setData)
      .catch(e => setError(e.message));
  }, [token]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#080c14;color:#e2e8f0;font-family:'DM Mono',monospace;min-height:100vh;padding:24px 16px}
        .page{max-width:1200px;margin:0 auto}
        .card{background:#0f172a;border:1px solid #1e293b;border-radius:20px;padding:22px;margin-bottom:16px}
        .label{font-size:9px;color:#475569;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px}
        .val{font-family:'Syne',sans-serif;font-weight:700}
        .up{color:#00e5a0}.down{color:#f43f5e}
        .stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
        .stat{background:#1a2235;border:1px solid #1e293b;border-radius:12px;padding:12px 14px}
        .holding-row{display:grid;grid-template-columns:34px 1fr auto auto;align-items:center;gap:12px;padding:10px 14px;background:#1a2235;border:1px solid #1e293b;border-radius:12px;margin-bottom:8px}
        .trade-row{display:flex;align-items:center;gap:10px;padding:8px 14px;background:#1a2235;border:1px solid #1e293b;border-radius:10px;margin-bottom:6px;font-size:11px}
        .badge{font-size:9px;padding:2px 8px;border-radius:6px;font-weight:700;letter-spacing:1px}
        .buy-badge{background:rgba(0,229,160,.12);color:#00e5a0}
        .sell-badge{background:rgba(244,63,94,.1);color:#f43f5e}
        @media(max-width:480px){.stat-grid{grid-template-columns:1fr 1fr}}
      ` }} />

      <div className="page">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:8}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,letterSpacing:-1}}>
            CRYPTO<span style={{color:'#00e5a0'}}>CLASS</span>
          </div>
          <div style={{fontSize:10,color:'#475569',background:'#0f172a',border:'1px solid #1e293b',borderRadius:8,padding:'4px 10px'}}>
            📖 Read-only portfolio
          </div>
        </div>

        {error && (
          <div style={{background:'rgba(244,63,94,.1)',border:'1px solid rgba(244,63,94,.3)',borderRadius:16,padding:32,textAlign:'center'}}>
            <div style={{fontSize:28,marginBottom:12}}>🔗</div>
            <div style={{fontSize:14,color:'#f43f5e'}}>{error}</div>
          </div>
        )}

        {!data && !error && (
          <div style={{textAlign:'center',padding:48,color:'#475569',fontSize:12}}>Loading...</div>
        )}

        {data && (() => {
          const { student, class: cls, summary, holdings, recentTrades, badgeCount, sharpe, maxDrawdown, winRate, tradeCount } = data;
          const up = summary.pl >= 0;
          return (
            <>
              <div className="card">
                <div style={{marginBottom:4,fontSize:11,color:'#475569'}}>{cls?.name}</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,marginBottom:4}}>{student.name}</div>
                <div className="label">Total Portfolio Value</div>
                <div className="val" style={{fontSize:40,letterSpacing:-1.5,color:up?'#00e5a0':'#f43f5e',marginBottom:6}}>
                  {fmtUSD(summary.totalVal)}
                </div>
                <div style={{fontSize:13,color:up?'#00e5a0':'#f43f5e',fontWeight:600}}>
                  {up?'▲':'▼'} {fmtUSD(Math.abs(summary.pl))} ({fmtPct(summary.returnPct)})
                </div>
              </div>

              <div className="stat-grid">
                <div className="stat"><div className="label">Cash</div><div className="val" style={{fontSize:14}}>{fmtUSD(summary.cash)}</div></div>
                <div className="stat"><div className="label">Holdings</div><div className="val" style={{fontSize:14}}>{fmtUSD(summary.holdingsVal)}</div></div>
                <div className="stat"><div className="label">Trades</div><div className="val" style={{fontSize:14}}>{tradeCount}</div></div>
                <div className="stat"><div className="label">Badges</div><div className="val" style={{fontSize:14,color:'#f59e0b'}}>{badgeCount}</div></div>
                {sharpe != null && <div className="stat"><div className="label">Sharpe</div><div className={`val ${sharpe>=1?'up':sharpe<0?'down':''}`} style={{fontSize:14}}>{sharpe.toFixed(2)}</div></div>}
                {winRate != null && <div className="stat"><div className="label">Win Rate</div><div className={`val ${winRate>=50?'up':'down'}`} style={{fontSize:14}}>{winRate.toFixed(0)}%</div></div>}
              </div>

              {holdings.length > 0 && (
                <div className="card">
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,marginBottom:14}}>Holdings</div>
                  {holdings.map((h,i) => (
                    <div className="holding-row" key={i}>
                      <CoinLogo symbol={h.coin} size={34} />
                      <div>
                        <div style={{fontSize:12,fontWeight:600}}>{h.coin}</div>
                        <div style={{fontSize:10,color:'#475569'}}>{h.qty.toFixed(6)} @ ${h.avgBuy.toLocaleString()}</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:13,fontWeight:700}}>{fmtUSD(h.curVal)}</div>
                      </div>
                      <div style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:6,background:h.plPct>=0?'rgba(0,229,160,.12)':'rgba(244,63,94,.1)',color:h.plPct>=0?'#00e5a0':'#f43f5e'}}>
                        {h.plPct>=0?'▲':'▼'}{Math.abs(h.plPct).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {recentTrades.length > 0 && (
                <div className="card">
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,marginBottom:14}}>Recent Trades</div>
                  {recentTrades.map((t,i) => (
                    <div className="trade-row" key={i}>
                      <span className={`badge ${t.action==='BUY'?'buy-badge':'sell-badge'}`}>{t.action}</span>
                      <span style={{fontWeight:600,color:'#e2e8f0'}}>{t.coin}</span>
                      <span style={{color:'#475569',flex:1}}>{fmtUSD(parseFloat(t.gross_value))}</span>
                      <span style={{color:'#334155'}}>{new Date(t.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{textAlign:'center',fontSize:10,color:'#1e293b',marginTop:8}}>
                Educational simulator only · No real money involved · Not financial advice
              </div>
            </>
          );
        })()}
      </div>
    </>
  );
}
