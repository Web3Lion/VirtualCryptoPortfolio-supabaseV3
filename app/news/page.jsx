"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { applyTheme, getTheme } from "@/lib/theme";

const SOURCE_COLORS = {
  'CoinDesk':'#f7931a','CoinTelegraph':'#2b6cb0','Decrypt':'#805ad5',
  'Bitcoin.com':'#f59e0b','CryptoNews':'#e53e3e','The Block':'#2d3748','Manual':'#00a651',
};

function NewsFallback({ color, source, height }) {
  const initial = (source || 'C')[0].toUpperCase();
  const c = color || '#00e5a0';
  const pts = [[0,72],[20,58],[40,65],[60,40],[80,48],[100,28],[120,36],[140,16],[160,10]];
  const linePath = pts.map(([x,y], i) => `${i===0?'M':'L'}${x},${y}`).join(' ');
  const fillPath = `${linePath} L160,80 L0,80 Z`;
  return (
    <div style={{ width:'100%', height, background:'linear-gradient(160deg,#0a0f1a,#0f172a)', position:'relative', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <svg width="100%" height="100%" style={{ position:'absolute', inset:0, opacity:.07 }} preserveAspectRatio="xMidYMid slice">
        {[25,50,75].map(p => <line key={`h${p}`} x1="0" y1={`${p}%`} x2="100%" y2={`${p}%`} stroke="#94a3b8" strokeWidth="1"/>)}
        {[20,40,60,80].map(p => <line key={`v${p}`} x1={`${p}%`} y1="0" x2={`${p}%`} y2="100%" stroke="#94a3b8" strokeWidth="1"/>)}
      </svg>
      <svg viewBox="0 0 160 80" preserveAspectRatio="none" style={{ position:'absolute', bottom:0, left:0, width:'100%', height:'60%', opacity:.55 }}>
        <defs>
          <linearGradient id={`nfg-${initial}-${c.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity=".35"/>
            <stop offset="100%" stopColor={c} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={fillPath} fill={`url(#nfg-${initial}-${c.slice(1)})`}/>
        <path d={linePath} fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div style={{ position:'relative', zIndex:1, width:50, height:50, borderRadius:'50%', background:`${c}18`, border:`2px solid ${c}40`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, color:c }}>
        {initial}
      </div>
      <div style={{ position:'absolute', bottom:8, left:0, right:0, textAlign:'center', fontSize:9, letterSpacing:2, textTransform:'uppercase', color:`${c}70`, fontFamily:"'DM Mono',monospace" }}>
        {source || 'Crypto News'}
      </div>
    </div>
  );
}

function ArticleTile({ article, featured=false }) {
  const [imgFailed, setImgFailed] = useState(false);
  const color = SOURCE_COLORS[article.source] || '#00a651';
  const date  = (article.published_at || article.pushed_at)
    ? new Date(article.published_at || article.pushed_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})
    : '';
  const imgHeight = featured ? 180 : 150;
  return (
    <a href={article.url} target="_blank" rel="noopener noreferrer" style={{
      display:'block', textDecoration:'none',
      background:'var(--surface)', border:`1px solid ${featured?'rgba(245,158,11,.35)':'var(--border)'}`,
      borderRadius:20, overflow:'hidden', transition:'all .2s',
    }}
    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 12px 32px rgba(0,0,0,.2)';}}
    onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='';}}
    >
      <div style={{width:'100%',height:imgHeight,overflow:'hidden',flexShrink:0}}>
        {article.image_url && !imgFailed
          ? <img src={article.image_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} onError={() => setImgFailed(true)}/>
          : <NewsFallback color={color} source={article.source} height={imgHeight} />}
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
  const [pushed, setPushed]           = useState([]);
  const [articles, setArticles]       = useState([]);
  const [loading, setLoading]         = useState(true);
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
        <Nav active="news" />

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
