"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function GradebookPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [hover, setHover]   = useState(null); // {studentId, lessonId}

  useEffect(() => { if (status === 'unauthenticated') router.replace('/'); }, [status, router]);
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/teacher/gradebook').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [status]);

  const downloadCSV = () => {
    if (!data) return;
    const { modules, students } = data;
    const allLessons = modules.flatMap(m => m.lessons);
    const header = ['Student', ...allLessons.map(l => l.title), 'Passed', 'Total'].join(',');
    const rows = students.map(s => [
      `"${s.name}"`,
      ...allLessons.map(l => {
        const r = s.lessonResults[l.id];
        return r ? (r.passed ? `${r.score}%` : `F(${r.score}%)`) : '';
      }),
      s.passed,
      s.total,
    ].join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'gradebook.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const S = { fontSize:11, fontFamily:"'DM Mono',monospace" };

  if (loading) return (
    <div style={{ maxWidth:1200, margin:'0 auto', padding:24, fontFamily:"'DM Mono',monospace", color:'var(--text,#e2e8f0)' }}>
      <style>{`body{background:var(--bg,#080c14)}`}</style>
      <div style={{ height:60, borderRadius:12, background:'#1e293b', marginBottom:16, animation:'shimmer 1.5s infinite', backgroundImage:'linear-gradient(90deg,#1e293b 25%,#334155 50%,#1e293b 75%)', backgroundSize:'200% 100%' }} />
      <div style={{ height:400, borderRadius:12, background:'#1e293b', animation:'shimmer 1.5s infinite', backgroundImage:'linear-gradient(90deg,#1e293b 25%,#334155 50%,#1e293b 75%)', backgroundSize:'200% 100%' }} />
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );

  if (!data) return <div style={{ padding:40, color:'#94a3b8', fontFamily:'monospace' }}>Failed to load gradebook.</div>;

  const { modules, students, totalLessons } = data;
  const allLessons = modules.flatMap(m => m.lessons);
  const filtered = students.filter(s => !filter || s.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div style={{ maxWidth:1400, margin:'0 auto', padding:'24px 16px 60px', fontFamily:"'DM Mono',monospace", color:'var(--text,#e2e8f0)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@400;500&display=swap');
        body{background:var(--bg,#080c14)}
        .gb-table{border-collapse:collapse;width:100%;font-size:11px}
        .gb-table th,.gb-table td{padding:0;border:1px solid rgba(30,41,59,.6)}
        .gb-table th{background:var(--surface,#0f172a);white-space:nowrap}
        .cell-pass{background:rgba(0,229,160,.12)}
        .cell-fail{background:rgba(244,63,94,.08)}
        .cell-empty{background:transparent}
        .cell-hover{outline:2px solid var(--accent,#00e5a0);z-index:2;position:relative}
      `}</style>

      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24, flexWrap:'wrap' }}>
        <button onClick={() => router.back()} style={{ padding:'7px 14px', borderRadius:9, border:'1px solid #1e293b', background:'#0f172a', color:'#64748b', cursor:'pointer', fontSize:12 }}>← Back</button>
        <div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:24, letterSpacing:-1 }}>📊 Gradebook</div>
          <div style={{ fontSize:11, color:'#64748b' }}>{students.length} students · {totalLessons} lessons · {modules.length} modules</div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:10, alignItems:'center' }}>
          <input
            placeholder="Filter students…"
            value={filter} onChange={e => setFilter(e.target.value)}
            style={{ padding:'7px 12px', borderRadius:9, border:'1px solid #1e293b', background:'#0f172a', color:'#e2e8f0', fontSize:12, fontFamily:"'DM Mono',monospace", width:180 }}
          />
          <button onClick={downloadCSV} style={{ padding:'7px 16px', borderRadius:9, border:'1px solid rgba(0,229,160,.3)', background:'rgba(0,229,160,.1)', color:'#00e5a0', cursor:'pointer', fontSize:12, fontFamily:"'DM Mono',monospace", whiteSpace:'nowrap' }}>
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:16, marginBottom:16, fontSize:11, color:'#64748b', flexWrap:'wrap' }}>
        <span><span style={{ display:'inline-block', width:12, height:12, borderRadius:3, background:'rgba(0,229,160,.2)', marginRight:5, verticalAlign:'middle' }} />Pass</span>
        <span><span style={{ display:'inline-block', width:12, height:12, borderRadius:3, background:'rgba(244,63,94,.15)', marginRight:5, verticalAlign:'middle' }} />Fail</span>
        <span><span style={{ display:'inline-block', width:12, height:12, borderRadius:3, background:'#0f172a', border:'1px solid #1e293b', marginRight:5, verticalAlign:'middle' }} />Not attempted</span>
        <span style={{ marginLeft:'auto', color:'#94a3b8' }}>Hover a cell for details · Score = best attempt</span>
      </div>

      <div style={{ overflowX:'auto', borderRadius:16, border:'1px solid #1e293b' }}>
        <table className="gb-table">
          <thead>
            {/* Module header row */}
            <tr>
              <th style={{ padding:'10px 14px', textAlign:'left', minWidth:160, position:'sticky', left:0, background:'#0f172a', zIndex:3, borderRight:'2px solid #334155' }}>
                <span style={{ ...S, color:'#64748b', letterSpacing:2, textTransform:'uppercase' }}>Student</span>
              </th>
              {modules.map(m => (
                <th key={m.id} colSpan={m.lessons.length} style={{ padding:'8px 12px', textAlign:'center', background:'#0c1322', borderBottom:'2px solid #1e293b', borderRight:'2px solid #334155' }}>
                  <span style={{ ...S, color:'#94a3b8', fontWeight:600 }}>{m.emoji} {m.title}</span>
                </th>
              ))}
              <th style={{ padding:'8px 12px', textAlign:'center', background:'#0c1322', minWidth:80 }}>
                <span style={{ ...S, color:'#64748b' }}>Passed</span>
              </th>
            </tr>
            {/* Lesson header row */}
            <tr>
              <th style={{ padding:'8px 14px', position:'sticky', left:0, background:'#0f172a', zIndex:3, borderRight:'2px solid #334155' }} />
              {allLessons.map((l, li) => {
                const isLastInMod = modules.find(m => m.lessons[m.lessons.length - 1]?.id === l.id);
                return (
                  <th key={l.id} style={{ padding:'8px 10px', background:'#0f172a', textAlign:'center', maxWidth:110, borderRight: isLastInMod ? '2px solid #334155' : undefined }}>
                    <div style={{ ...S, color:'#94a3b8', writingMode:'vertical-rl', transform:'rotate(180deg)', maxHeight:100, overflow:'hidden', textOverflow:'ellipsis', lineHeight:1.3 }}>
                      {l.title}
                    </div>
                  </th>
                );
              })}
              <th style={{ background:'#0f172a' }} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, si) => (
              <tr key={s.id} style={{ background: si % 2 === 0 ? '#080c14' : '#0a0f1a' }}>
                <td style={{ padding:'9px 14px', position:'sticky', left:0, background: si % 2 === 0 ? '#080c14' : '#0a0f1a', zIndex:2, borderRight:'2px solid #334155', whiteSpace:'nowrap' }}>
                  <a href={`/profile/${s.id}`} style={{ color:'var(--text,#e2e8f0)', textDecoration:'none', fontSize:12, fontWeight:600, display:'block' }}>{s.name}</a>
                  <div style={{ fontSize:10, color:'#475569' }}>{s.email}</div>
                </td>
                {allLessons.map((l, li) => {
                  const r = s.lessonResults[l.id];
                  const isHov = hover?.studentId === s.id && hover?.lessonId === l.id;
                  const isLastInMod = modules.find(m => m.lessons[m.lessons.length - 1]?.id === l.id);
                  return (
                    <td
                      key={l.id}
                      className={`${r ? (r.passed ? 'cell-pass' : 'cell-fail') : 'cell-empty'}${isHov ? ' cell-hover' : ''}`}
                      style={{ textAlign:'center', cursor:'default', padding:'6px 4px', borderRight: isLastInMod ? '2px solid #334155' : undefined, position:'relative' }}
                      onMouseEnter={() => setHover({ studentId:s.id, lessonId:l.id })}
                      onMouseLeave={() => setHover(null)}
                      title={r ? `${r.passed ? '✅' : '❌'} ${r.score}% · ${r.attempts} attempt${r.attempts !== 1 ? 's' : ''} · ${new Date(r.date).toLocaleDateString()}` : 'Not attempted'}
                    >
                      {r ? (
                        <div>
                          <div style={{ fontSize:13 }}>{r.passed ? '✅' : '❌'}</div>
                          <div style={{ fontSize:9, color: r.passed ? '#00e5a0' : '#f43f5e', marginTop:1 }}>{r.score}%</div>
                        </div>
                      ) : (
                        <div style={{ fontSize:11, color:'#334155' }}>—</div>
                      )}
                    </td>
                  );
                })}
                <td style={{ textAlign:'center', padding:'6px 10px' }}>
                  <div style={{ fontSize:12, fontWeight:700, color: s.passed === s.total ? '#00e5a0' : s.passed > 0 ? '#fbbf24' : '#475569' }}>
                    {s.passed}/{s.total}
                  </div>
                  <div style={{ fontSize:9, color:'#475569', marginTop:1 }}>
                    {s.total > 0 ? Math.round((s.passed / s.total) * 100) : 0}%
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
