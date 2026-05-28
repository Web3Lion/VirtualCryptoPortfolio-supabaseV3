"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { applyTheme, getTheme } from "@/lib/theme";

const SOURCE_COLORS = {
  'CoinDesk':'#f7931a','CoinTelegraph':'#2b6cb0','Decrypt':'#805ad5',
  'Bitcoin.com':'#f59e0b','CryptoNews':'#e53e3e','The Block':'#2d3748','Manual':'#00a651',
};

function ArticleTile({ article, featured=false }) {
  const color = SOURCE_COLORS[article.source] || '#00a651';
  const date  = (article.published_at || article.pushed_at)
    ? new Date(article.published_at || article.pushed_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})
    : '';
  return (
    <a href={article.url} target="_blank" rel="noopener noreferrer" style={{
      display:'block', textDecoration:'none',
      background:'var(--surface)', border:`1px solid ${featured?'rgba(245,158,11,.35)':'var(--border)'}`,
      borderRadius:20, overflow:'hidden', transition:'all .2s',
    }}
    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 12px 32px rgba(0,0,0,.2)';}}
    onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='';}}
    >
      <div style={{width:'100%',height:featured?180:150,overflow:'hidden',background:'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:40}}>
        {article.image_url
          ? <img src={article.image_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{e.target.style.display='none';e.target.parentElement.innerText='📰';}}/>
          : '📰'}
      </div>
      <div style={{padding:featured?'16px 18px':'14px 16px'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
          <span style={{background:`${color}22`,color,fontSize:9,letterSpacing:2,textTransform:'uppercase',padding:'2px 8px',borderRadius:6,fontWeight:600}}>{article.source}</span>
          {featured && <span style={{background:'rgba(245,158,11,.15)',color:'var(--gold)',fontSize:9,letterSpacing:1,textTransform:'uppercase',padding:'2px 8px',borderRadius:6}}>⭐ Recommended</span>}
          <span style={{fontSize:10,color:'var(--muted)',marginLeft:'auto'}}>{date}</span>
        </div>
        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:featured?14:12,color:'var(--text)',lineHeight:1.5,
          display:'-webkit-box',WebkitLineClamp:featured?3:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
          {article.title}
        </div>
        {article.summary && (
          <div style={{fontSize:11,color:'var(--muted)',lineHeight:1.6,marginTop:8,
            display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
            {article.summary}
          </div>
        )}
      </div>
    </a>
  );
}

export default function NewsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pushed, setPushed]     = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(()=>{ applyTheme(getTheme()); },[]);
  useEffect(()=>{ if(status==='unauthenticated') router.replace('/'); },[status,router]);

  useEffect(()=>{
    if(status==='authenticated'){
      Promise.all([
        fetch('/api/news?view=pushed').then(r=>r.json()),
        fetch('/api/news').then(r=>r.json()),
      ]).then(([p,a])=>{
        setPushed(Array.isArray(p)?p:[]);
        setArticles(Array.isArray(a)?a:[]);
        setLastUpdated(new Date());
        setLoading(false);
      });
    }
  },[status]);

  if(status==='loading'||status==='unauthenticated') return (
    <div style={{background:'var(--bg,#080c14)',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)'}}>Loading...</div>
  );

  const pushedUrls = new Set(pushed.map(p=>p.url));
  const general = articles.filter(a=>!pushedUrls.has(a.url));

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
        .nav-link:hover{color:var(--accent)}.nav-link.active{background:rgba(128,200,128,.15);color:var(--accent);border:1px solid rgba(128,200,128,.25)}
        .section-title{font-family:'Syne',sans-serif;font-weight:800;font-size:18px;letter-spacing:-0.5px;margin-bottom:16px;display:flex;align-items:center;gap:10px;color:var(--text)}
        .badge{font-size:10px;padding:3px 10px;border-radius:8px;font-family:'DM Mono',monospace;font-weight:500;letter-spacing:1px}
        .grid-featured{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;margin-bottom:48px}
        .grid-general{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
        .divider{border:none;border-top:1px solid var(--border);margin:40px 0}
        .skeleton{background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:20px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .empty{text-align:center;padding:60px 0;color:var(--muted)}
      `}</style>

      <div className="page">
        <nav className="nav">
          <div className="logo">CRYPTO<span>CLASS</span></div>
          <div className="nav-links">
            <Link href="/dashboard" className="nav-link">Wallet</Link>
            <Link href="/leaderboard" className="nav-link">Leaderboard</Link>
            <Link href="/market" className="nav-link">Market</Link>
            <a href="/news" className="nav-link active">News</a>
            <Link href="/badges" className="nav-link">Badges</Link>
            <Link href="/learn" className="nav-link">Learn</Link>
            <Link href="/games/crypto-crush" className="nav-link">Crush</Link>
          </div>
          {lastUpdated && <span style={{fontSize:10,color:'var(--muted)'}}>Updated {lastUpdated.toLocaleTimeString()}</span>}
        </nav>

        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:32,letterSpacing:-1,marginBottom:4,color:'var(--text)'}}>
          📰 Crypto <span style={{color:'var(--accent)'}}>News</span>
        </div>
        <div style={{fontSize:11,color:'var(--muted)',marginBottom:32}}>Articles refreshed daily at 7am · Recommended by your teacher appear first</div>

        {loading ? (
          <>
            <div style={{height:24,width:200,marginBottom:16}} className="skeleton"/>
            <div className="grid-featured">{[1,2,3].map(i=><div key={i} className="skeleton" style={{height:320}}/>)}</div>
            <div style={{height:24,width:200,marginBottom:16}} className="skeleton"/>
            <div className="grid-general">{[1,2,3,4,5,6].map(i=><div key={i} className="skeleton" style={{height:280}}/>)}</div>
          </>
        ) : (
          <>
            {pushed.length > 0 && (
              <>
                <div className="section-title">
                  ⭐ Teacher Recommended
                  <span className="badge" style={{background:'rgba(245,158,11,.15)',color:'var(--gold)'}}>{pushed.length} of 6</span>
                </div>
                <div className="grid-featured">
                  {pushed.map(a=><ArticleTile key={a.id} article={a} featured={true}/>)}
                </div>
                <hr className="divider"/>
              </>
            )}
            <div className="section-title">
              📡 Today's Top Stories
              <span className="badge" style={{background:'rgba(128,200,128,.12)',color:'var(--accent)'}}>{general.length} articles</span>
            </div>
            {general.length === 0 ? (
              <div className="empty">
                <div style={{fontSize:40,marginBottom:12}}>📭</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,marginBottom:8,color:'var(--text)'}}>No articles yet</div>
                <div style={{fontSize:12}}>Articles are fetched daily at 7am. Ask your teacher to refresh!</div>
              </div>
            ) : (
              <div className="grid-general">
                {general.map(a=><ArticleTile key={a.id} article={a}/>)}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
