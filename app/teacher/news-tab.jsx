"use client";
import { useState, useEffect } from "react";

const SOURCE_COLORS = {
  'CoinDesk':'#f7931a','CoinTelegraph':'#2b6cb0','Decrypt':'#805ad5',
  'Bitcoin.com':'#f59e0b','CryptoNews':'#e53e3e','The Block':'#2d3748','Manual':'#00e5a0',
};
const SOURCES = ['All','CoinDesk','CoinTelegraph','Decrypt','Bitcoin.com','CryptoNews','The Block'];

export default function NewsTab() {
  const [available, setAvailable] = useState([]);
  const [pushed, setPushed]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sourceFilter, setSource] = useState('All');
  const [searchQ, setSearchQ]     = useState('');
  const [actionMsg, setActionMsg] = useState(null);
  const [activeView, setActiveView] = useState('available');
  const [manual, setManual]       = useState({ title:'', url:'', source:'', summary:'' });
  const [pushing, setPushing]     = useState(null);

  const showMsg = (type, msg) => { setActionMsg({type,msg}); setTimeout(()=>setActionMsg(null),4000); };

  const fetchAll = async () => {
    setLoading(true);
    const [avRes, puRes] = await Promise.all([fetch('/api/news'), fetch('/api/news?view=pushed')]);
    if(avRes.ok) setAvailable(await avRes.json());
    if(puRes.ok) setPushed(await puRes.json());
    setLoading(false);
  };

  useEffect(()=>{ fetchAll(); },[]);

  // ── Refresh RSS feeds via server-side endpoint ────────────
  const refreshFeed = async () => {
    setRefreshing(true);
    showMsg('pending', '📡 Fetching latest articles from all feeds...');
    try {
      const res  = await fetch('/api/news/refresh', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showMsg('success', data.message || '✅ Articles refreshed!');
        await fetchAll();
      } else {
        showMsg('error', data.error || '❌ Refresh failed');
      }
    } catch(e) {
      showMsg('error', '❌ Network error — ' + e.message);
    }
    setRefreshing(false);
  };

  const pushArticle = async (article) => {
    setPushing(article.id);
    const res = await fetch('/api/news',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({articleId:article.id})});
    const data = await res.json();
    if(res.ok){ showMsg('success',data.message); fetchAll(); } else showMsg('error',data.error||'Failed');
    setPushing(null);
  };

  const removeArticle = async (pushedId) => {
    const res = await fetch('/api/news',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({pushedId})});
    const data = await res.json();
    if(res.ok){ showMsg('success',data.message); fetchAll(); } else showMsg('error',data.error||'Failed');
  };

  const pushManual = async () => {
    if(!manual.title||!manual.url){ showMsg('error','Title and URL are required'); return; }
    const res = await fetch('/api/news',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({manual:true,...manual})});
    const data = await res.json();
    if(res.ok){ showMsg('success',data.message); setManual({title:'',url:'',source:'',summary:''}); fetchAll(); setActiveView('pushed'); }
    else showMsg('error',data.error||'Failed');
  };

  const pushedUrls = new Set(pushed.map(p=>p.url));
  const filtered = available.filter(a=>{
    const ms = sourceFilter==='All'||a.source===sourceFilter;
    const mq = !searchQ||a.title.toLowerCase().includes(searchQ.toLowerCase());
    return ms&&mq;
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .ntabs{display:flex;gap:4px;background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:4px;margin-bottom:20px}
        .ntab{flex:1;padding:8px;text-align:center;border-radius:8px;border:none;background:transparent;font-family:'DM Mono',monospace;font-size:11px;color:#475569;cursor:pointer;transition:all .2s}
        .ntab.active{background:#1a2235;color:#f59e0b;border:1px solid #1e293b}
        .ngrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;max-height:560px;overflow-y:auto;padding:2px}
        .ncard{background:#1a2235;border:1px solid #1e293b;border-radius:14px;overflow:hidden;transition:all .2s;position:relative}
        .ncard.npushed{border-color:rgba(0,229,160,.4);background:rgba(0,229,160,.04)}
        .ncard-img{width:100%;height:110px;object-fit:cover;background:#0f172a;display:block}
        .ncard-ph{width:100%;height:110px;background:linear-gradient(135deg,#0f172a,#1a2235);display:flex;align-items:center;justify-content:center;font-size:28px}
        .ncard-body{padding:12px}
        .nsource{display:inline-block;font-size:9px;letter-spacing:2px;text-transform:uppercase;padding:2px 7px;border-radius:5px;margin-bottom:6px;font-weight:600}
        .ntitle{font-family:'Syne',sans-serif;font-weight:700;font-size:11px;line-height:1.5;color:#e2e8f0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:8px}
        .npush-btn{width:100%;padding:7px;border-radius:8px;border:none;font-family:'DM Mono',monospace;font-size:10px;font-weight:500;cursor:pointer;transition:all .2s}
        .npush-yes{background:rgba(0,229,160,.12);color:#00e5a0;border:1px solid rgba(0,229,160,.3)}.npush-yes:hover{background:rgba(0,229,160,.22)}.npush-yes:disabled{opacity:.5;cursor:not-allowed}
        .nbadge{position:absolute;top:7px;right:7px;background:rgba(0,229,160,.9);color:#000;font-size:8px;font-weight:700;padding:2px 6px;border-radius:5px}
        .sfs{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px}
        .sfb{padding:3px 10px;border-radius:14px;border:1px solid #1e293b;background:transparent;font-family:'DM Mono',monospace;font-size:10px;color:#475569;cursor:pointer;transition:all .2s}
        .sfb.active{background:rgba(0,229,160,.1);color:#00e5a0;border-color:rgba(0,229,160,.3)}
        .sinput{width:100%;background:#1a2235;border:1px solid #1e293b;border-radius:10px;padding:8px 12px;color:#e2e8f0;font-family:'DM Mono',monospace;font-size:12px;outline:none;margin-bottom:12px;transition:border-color .2s}
        .sinput:focus{border-color:#00e5a0}
        .pcard{background:#1a2235;border:1px solid rgba(0,229,160,.2);border-radius:12px;padding:12px;display:flex;gap:10px;align-items:flex-start;margin-bottom:8px}
        .mform{background:#1a2235;border:1px solid #1e293b;border-radius:16px;padding:20px}
        .flabel{font-size:10px;color:#475569;letter-spacing:2px;text-transform:uppercase;display:block;margin-bottom:4px}
        .finput{width:100%;background:#0f172a;border:1px solid #1e293b;border-radius:10px;padding:9px 12px;color:#e2e8f0;font-family:'DM Mono',monospace;font-size:12px;outline:none;margin-bottom:10px;transition:border-color .2s}
        .finput:focus{border-color:#00e5a0}
        .toast{position:fixed;bottom:24px;right:24px;padding:12px 18px;border-radius:12px;font-size:12px;z-index:9999;border:1px solid;font-family:'DM Mono',monospace}
        .toast.success{background:rgba(0,229,160,.1);color:#00e5a0;border-color:rgba(0,229,160,.3)}
        .toast.error{background:rgba(244,63,94,.1);color:#f43f5e;border-color:rgba(244,63,94,.3)}
        .toast.pending{background:rgba(59,130,246,.1);color:#60a5fa;border-color:rgba(59,130,246,.3)}
        .empty-news{text-align:center;padding:48px 0;color:#475569}
        .refresh-btn{display:flex;align-items:center;gap:6px;background:rgba(0,229,160,.12);color:#00e5a0;border:1px solid rgba(0,229,160,.3);border-radius:10px;padding:8px 16px;font-family:'DM Mono',monospace;font-size:11px;font-weight:600;cursor:pointer;transition:all .2s}
        .refresh-btn:hover{background:rgba(0,229,160,.22)}
        .refresh-btn:disabled{opacity:.5;cursor:not-allowed}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spinning{animation:spin .8s linear infinite;display:inline-block}
      ` }} />

      {/* Header row with title + refresh button */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16}}>📰 News Manager</div>
          <div style={{fontSize:11,color:'#475569',marginTop:2}}>{pushed.length}/6 pushed · {available.length} articles available</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button className="refresh-btn" onClick={refreshFeed} disabled={refreshing}>
            <span className={refreshing?'spinning':''}>📡</span>
            {refreshing ? 'Fetching...' : 'Fetch Latest News'}
          </button>
          <button onClick={fetchAll} style={{background:'#1a2235',border:'1px solid #1e293b',borderRadius:8,padding:'7px 12px',color:'#e2e8f0',fontFamily:"'DM Mono',monospace",fontSize:11,cursor:'pointer'}}>↺ Reload</button>
        </div>
      </div>

      <div className="ntabs">
        {[['available',`📡 Feed (${available.length})`],['pushed',`⭐ Pushed (${pushed.length}/6)`],['manual','✏️ Manual']].map(([v,label])=>(
          <button key={v} className={`ntab${activeView===v?' active':''}`} onClick={()=>setActiveView(v)}>{label}</button>
        ))}
      </div>

      {activeView==='available' && (
        <>
          <input className="sinput" placeholder="Search articles..." value={searchQ} onChange={e=>setSearchQ(e.target.value)}/>
          <div className="sfs">{SOURCES.map(s=><button key={s} className={`sfb${sourceFilter===s?' active':''}`} onClick={()=>setSource(s)}>{s}</button>)}</div>
          {loading ? (
            <div style={{color:'#475569',fontSize:12,textAlign:'center',padding:40}}>Loading articles...</div>
          ) : filtered.length===0 ? (
            <div className="empty-news">
              <div style={{fontSize:36,marginBottom:12}}>📭</div>
              <div style={{marginBottom:16}}>No articles yet.</div>
              <button className="refresh-btn" onClick={refreshFeed} disabled={refreshing} style={{margin:'0 auto'}}>
                <span className={refreshing?'spinning':''}>📡</span>
                {refreshing ? 'Fetching...' : 'Click here to fetch latest news'}
              </button>
            </div>
          ) : (
            <div className="ngrid">
              {filtered.map(a=>{
                const isPushed=pushedUrls.has(a.url);
                const color=SOURCE_COLORS[a.source]||'#00e5a0';
                return (
                  <div key={a.id} className={`ncard${isPushed?' npushed':''}`}>
                    {isPushed&&<div className="nbadge">✓ PUSHED</div>}
                    {a.image_url?<img src={a.image_url} className="ncard-img" alt="" onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}}/>:null}
                    <div className="ncard-ph" style={{display:a.image_url?'none':'flex'}}>📰</div>
                    <div className="ncard-body">
                      <div className="nsource" style={{background:`${color}22`,color}}>{a.source}</div>
                      <div className="ntitle">{a.title}</div>
                      {!isPushed?(
                        <button className="npush-btn npush-yes" onClick={()=>pushArticle(a)} disabled={pushing===a.id}>
                          {pushing===a.id?'Pushing...':'📤 Push to Students'}
                        </button>
                      ):<div style={{fontSize:10,color:'#00e5a0',textAlign:'center'}}>✓ Pushed to students</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeView==='pushed' && (
        pushed.length===0?(
          <div className="empty-news"><div style={{fontSize:36,marginBottom:12}}>📭</div><div>No articles pushed yet. Go to Feed tab to push articles.</div></div>
        ):(
          pushed.map(a=>{
            const color=SOURCE_COLORS[a.source]||'#00e5a0';
            const date=a.pushed_at?new Date(a.pushed_at).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'';
            return (
              <div key={a.id} className="pcard">
                <div style={{width:56,height:56,borderRadius:9,overflow:'hidden',flexShrink:0,background:'#0f172a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>
                  {a.image_url?<img src={a.image_url} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{e.target.style.display='none';}}/>:'📰'}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div className="nsource" style={{background:`${color}22`,color,display:'inline-block'}}>{a.source}{a.is_manual?' · Manual':''}</div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:12,color:'#e2e8f0',marginBottom:4,lineHeight:1.4}}>{a.title}</div>
                  <div style={{fontSize:10,color:'#475569',marginBottom:7}}>Pushed {date}</div>
                  <div style={{display:'flex',gap:8}}>
                    <a href={a.url} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:'#00e5a0',textDecoration:'none'}}>↗ View</a>
                    <button onClick={()=>removeArticle(a.id)} style={{background:'rgba(244,63,94,.1)',border:'1px solid rgba(244,63,94,.3)',color:'#f43f5e',borderRadius:6,padding:'2px 8px',fontFamily:"'DM Mono',monospace",fontSize:10,cursor:'pointer'}}>✕ Remove</button>
                  </div>
                </div>
              </div>
            );
          })
        )
      )}

      {activeView==='manual' && (
        <div className="mform">
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,marginBottom:16}}>✏️ Manually Post an Article</div>
          <label className="flabel">Article Title *</label>
          <input className="finput" placeholder="e.g. Bitcoin hits new all-time high" value={manual.title} onChange={e=>setManual(m=>({...m,title:e.target.value}))}/>
          <label className="flabel">Article URL *</label>
          <input className="finput" placeholder="https://..." value={manual.url} onChange={e=>setManual(m=>({...m,url:e.target.value}))}/>
          <label className="flabel">Source Name</label>
          <input className="finput" placeholder="e.g. Bloomberg, CNBC, WSJ" value={manual.source} onChange={e=>setManual(m=>({...m,source:e.target.value}))}/>
          <label className="flabel">Summary (optional)</label>
          <textarea className="finput" placeholder="Brief description..." value={manual.summary} onChange={e=>setManual(m=>({...m,summary:e.target.value}))} style={{resize:'vertical',minHeight:70}}/>
          <button onClick={pushManual} style={{background:'#00e5a0',color:'#000',border:'none',borderRadius:10,padding:'10px 20px',fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:600,cursor:'pointer',width:'100%'}}>
            📤 Push to Students
          </button>
        </div>
      )}

      {actionMsg&&<div className={`toast ${actionMsg.type}`}>{actionMsg.msg}</div>}
    </>
  );
}