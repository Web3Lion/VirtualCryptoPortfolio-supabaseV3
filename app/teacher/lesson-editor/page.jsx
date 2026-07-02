"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const BLOCK_TYPES = [
  { value: 'heading',    label: 'Heading' },
  { value: 'subheading', label: 'Subheading' },
  { value: 'text',       label: 'Text / Markdown' },
  { value: 'video',      label: 'YouTube Video' },
  { value: 'article',    label: 'Article / Link' },
];

function uid() { return 'new_' + Math.random().toString(36).slice(2); }

function BlockEditor({ block, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  const upd = (patch) => onChange({ ...block, content: { ...block.content, ...patch } });
  const inputStyle = { width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg)', color:'var(--text)', fontFamily:"'DM Mono',monospace", fontSize:12 };
  const labelStyle = { fontSize:10, color:'var(--muted)', letterSpacing:2, textTransform:'uppercase', display:'block', marginBottom:4 };

  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:16, display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <select
          value={block.block_type}
          onChange={e => onChange({ ...block, block_type: e.target.value, content: {} })}
          style={{ ...inputStyle, width:'auto', flex:1 }}
        >
          {BLOCK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button onClick={onMoveUp}   disabled={isFirst} style={arrowBtn}>↑</button>
        <button onClick={onMoveDown} disabled={isLast}  style={arrowBtn}>↓</button>
        <button onClick={onDelete} style={{ ...arrowBtn, color:'#ef4444', borderColor:'rgba(239,68,68,.3)' }}>✕</button>
      </div>

      {(block.block_type === 'heading' || block.block_type === 'subheading') && (
        <>
          <label style={labelStyle}>Text</label>
          <input style={inputStyle} value={block.content.text || ''} onChange={e => upd({ text: e.target.value })} placeholder="Heading text…" />
        </>
      )}

      {block.block_type === 'text' && (
        <>
          <label style={labelStyle}>Content (Markdown supported)</label>
          <textarea
            style={{ ...inputStyle, minHeight:120, resize:'vertical', lineHeight:1.6 }}
            value={block.content.text || ''}
            onChange={e => upd({ text: e.target.value })}
            placeholder="Paragraph text… **bold**, *italic*, bullet lists with -"
          />
        </>
      )}

      {(block.block_type === 'video' || block.block_type === 'article') && (
        <>
          <label style={labelStyle}>URL</label>
          <input style={inputStyle} value={block.content.url || ''} onChange={e => upd({ url: e.target.value })} placeholder={block.block_type === 'video' ? 'https://www.youtube.com/watch?v=…' : 'https://…'} />
          <label style={labelStyle}>Title</label>
          <input style={inputStyle} value={block.content.title || ''} onChange={e => upd({ title: e.target.value })} placeholder="Display title" />
          <label style={labelStyle}>Description</label>
          <input style={inputStyle} value={block.content.description || ''} onChange={e => upd({ description: e.target.value })} placeholder="Short description (optional)" />
        </>
      )}
    </div>
  );
}

const arrowBtn = { padding:'5px 10px', borderRadius:7, border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--muted)', cursor:'pointer', fontSize:12, fontFamily:"'DM Mono',monospace" };

function QuestionEditor({ q, idx, onChange, onDelete }) {
  const inputStyle = { width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg)', color:'var(--text)', fontFamily:"'DM Mono',monospace", fontSize:12 };
  const labelStyle = { fontSize:10, color:'var(--muted)', letterSpacing:2, textTransform:'uppercase', display:'block', marginBottom:4 };

  const updOpt = (oi, patch) => {
    const newOpts = q.options.map((o, i) => i === oi ? { ...o, ...patch } : o);
    onChange({ ...q, options: newOpts });
  };
  const markCorrect = (oi) => {
    const newOpts = q.options.map((o, i) => ({ ...o, is_correct: i === oi }));
    onChange({ ...q, options: newOpts });
  };

  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:16, display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:11, fontWeight:600, color:'var(--accent)' }}>Question {idx + 1}</span>
        <button onClick={onDelete} style={{ ...arrowBtn, color:'#ef4444', borderColor:'rgba(239,68,68,.3)', fontSize:11 }}>Remove</button>
      </div>

      <div>
        <label style={labelStyle}>Question Text</label>
        <textarea
          style={{ ...inputStyle, minHeight:60, resize:'vertical' }}
          value={q.question_text}
          onChange={e => onChange({ ...q, question_text: e.target.value })}
          placeholder="What is…?"
        />
      </div>

      <div>
        <label style={labelStyle}>Explanation (shown after answering)</label>
        <input style={inputStyle} value={q.explanation || ''} onChange={e => onChange({ ...q, explanation: e.target.value })} placeholder="Why is this the correct answer?" />
      </div>

      <div>
        <label style={{ ...labelStyle, marginBottom:8 }}>Answer Choices — click the circle to mark correct</label>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {q.options.map((opt, oi) => (
            <div key={oi} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <button
                onClick={() => markCorrect(oi)}
                title="Mark as correct"
                style={{ width:20, height:20, borderRadius:'50%', border:`2px solid ${opt.is_correct ? '#00e5a0' : 'var(--border)'}`, background: opt.is_correct ? '#00e5a0' : 'transparent', cursor:'pointer', flexShrink:0, transition:'all .15s' }}
              />
              <input
                style={{ ...inputStyle, flex:1 }}
                value={opt.option_text}
                onChange={e => updOpt(oi, { option_text: e.target.value })}
                placeholder={`Option ${oi + 1}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LessonEditor() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [modules, setModules]       = useState([]);
  const [selectedMod, setSelectedMod] = useState('');
  const [selectedLesson, setSelectedLesson] = useState('');
  const [lessonData, setLessonData] = useState(null);
  const [blocks, setBlocks]         = useState([]);
  const [questions, setQuestions]   = useState([]);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [status2, setStatus2]       = useState(null); // {type,msg}

  useEffect(() => { if (status === 'unauthenticated') router.replace('/'); }, [status, router]);

  useEffect(() => {
    fetch('/api/teacher/lesson-editor').then(r => r.json()).then(d => Array.isArray(d) && setModules(d));
  }, []);

  const activeMod = modules.find(m => m.id === selectedMod);

  const loadLesson = useCallback(async (id) => {
    setLoading(true);
    setLessonData(null);
    const res = await fetch(`/api/teacher/lesson-editor?lessonId=${id}`);
    const d = await res.json();
    if (d.lesson) {
      setLessonData(d.lesson);
      setBlocks(d.blocks || []);
      setQuestions(d.questions || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (selectedLesson) loadLesson(selectedLesson); }, [selectedLesson, loadLesson]);

  const updLesson = (patch) => setLessonData(p => ({ ...p, ...patch }));

  // Block helpers
  const updBlock = (i, val) => setBlocks(bs => bs.map((b, idx) => idx === i ? val : b));
  const delBlock = (i) => setBlocks(bs => bs.filter((_, idx) => idx !== i));
  const moveBlock = (i, dir) => {
    setBlocks(bs => {
      const arr = [...bs];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return bs;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr.map((b, idx) => ({ ...b, order_index: idx + 1 }));
    });
  };
  const addBlock = (type) => setBlocks(bs => [...bs, { id: uid(), block_type: type, content: {}, order_index: bs.length + 1 }]);

  // Question helpers
  const updQ = (i, val) => setQuestions(qs => qs.map((q, idx) => idx === i ? val : q));
  const delQ  = (i) => setQuestions(qs => qs.filter((_, idx) => idx !== i).map((q, idx) => ({ ...q, order_index: idx + 1 })));
  const addQ = () => setQuestions(qs => [...qs, {
    id: uid(), question_text: '', explanation: '', order_index: qs.length + 1,
    options: [
      { option_text: '', is_correct: true,  order_index: 1 },
      { option_text: '', is_correct: false, order_index: 2 },
      { option_text: '', is_correct: false, order_index: 3 },
      { option_text: '', is_correct: false, order_index: 4 },
    ],
  }]);

  const save = async () => {
    setSaving(true);
    setStatus2(null);
    const blocksWithOrder = blocks.map((b, i) => ({ ...b, order_index: i + 1 }));
    const questionsWithOrder = questions.map((q, i) => ({ ...q, order_index: i + 1, options: q.options.map((o, j) => ({ ...o, order_index: j + 1 })) }));
    const res = await fetch('/api/teacher/lesson-editor', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: selectedLesson, lesson: lessonData, blocks: blocksWithOrder, questions: questionsWithOrder }),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      setStatus2({ type: 'success', msg: '✅ Lesson saved!' });
    } else {
      setStatus2({ type: 'error', msg: `Failed: ${d.error || res.status}` });
    }
    setTimeout(() => setStatus2(null), 4000);
  };

  const inputStyle = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg)', color:'var(--text)', fontFamily:"'DM Mono',monospace", fontSize:13 };
  const labelStyle = { fontSize:10, color:'var(--muted)', letterSpacing:2, textTransform:'uppercase', display:'block', marginBottom:5 };
  const sectionHead = { fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, marginBottom:14, display:'flex', alignItems:'center', justifyContent:'space-between' };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:var(--bg,#080c14);color:var(--text,#e2e8f0);font-family:'DM Mono',monospace;min-height:100vh}
        select option{background:#0f172a;color:#e2e8f0}
      `}</style>

      <div style={{ maxWidth:820, margin:'0 auto', padding:'28px 16px 60px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
          <button onClick={() => router.back()} style={{ padding:'7px 14px', borderRadius:9, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--muted)', cursor:'pointer', fontSize:12, fontFamily:"'DM Mono',monospace" }}>← Back</button>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:24, letterSpacing:-1 }}>📝 Lesson Editor</div>
            <div style={{ fontSize:11, color:'var(--muted)' }}>Select a module and lesson to begin editing</div>
          </div>
        </div>

        {/* Picker */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:18, padding:20, marginBottom:24, display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div>
            <label style={labelStyle}>Module</label>
            <select style={inputStyle} value={selectedMod} onChange={e => { setSelectedMod(e.target.value); setSelectedLesson(''); setLessonData(null); }}>
              <option value="">— Choose a module —</option>
              {modules.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.title}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Lesson</label>
            <select style={inputStyle} value={selectedLesson} onChange={e => setSelectedLesson(e.target.value)} disabled={!selectedMod}>
              <option value="">— Choose a lesson —</option>
              {(activeMod?.lessons || []).map(l => <option key={l.id} value={l.id}>{l.title}{!l.is_published ? ' (unpublished)' : ''}</option>)}
            </select>
          </div>
        </div>

        {loading && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[1,2,3].map(i => <div key={i} style={{ height:72, borderRadius:14, background:'var(--surface)', animation:'shimmer 1.5s infinite', backgroundImage:'linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%)', backgroundSize:'200% 100%' }} />)}
            <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
          </div>
        )}

        {!loading && lessonData && (
          <>
            {/* Lesson Settings */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:18, padding:20, marginBottom:20 }}>
              <div style={sectionHead}>Lesson Settings</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={labelStyle}>Title</label>
                  <input style={inputStyle} value={lessonData.title} onChange={e => updLesson({ title: e.target.value })} />
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={labelStyle}>Description</label>
                  <textarea style={{ ...inputStyle, minHeight:60, resize:'vertical' }} value={lessonData.description || ''} onChange={e => updLesson({ description: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Token Reward</label>
                  <input style={inputStyle} type="number" min={0} max={500} value={lessonData.tokens_reward ?? 25} onChange={e => updLesson({ tokens_reward: parseInt(e.target.value)||0 })} />
                </div>
                <div>
                  <label style={labelStyle}>Pass Threshold (%)</label>
                  <input style={inputStyle} type="number" min={0} max={100} value={lessonData.pass_threshold ?? 70} onChange={e => updLesson({ pass_threshold: parseInt(e.target.value)||70 })} />
                </div>
                <div>
                  <label style={labelStyle}>Questions to Show</label>
                  <input style={inputStyle} type="number" min={1} max={20} value={lessonData.questions_to_show ?? 5} onChange={e => updLesson({ questions_to_show: parseInt(e.target.value)||5 })} />
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10, paddingTop:18 }}>
                  <input type="checkbox" id="published" checked={!!lessonData.is_published} onChange={e => updLesson({ is_published: e.target.checked })} style={{ width:16, height:16, accentColor:'var(--accent)', cursor:'pointer' }} />
                  <label htmlFor="published" style={{ fontSize:12, color:'var(--text)', cursor:'pointer' }}>Published (visible to students)</label>
                </div>
              </div>
            </div>

            {/* Content Blocks */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:18, padding:20, marginBottom:20 }}>
              <div style={{ ...sectionHead, flexWrap:'wrap', gap:10 }}>
                <span>Content Blocks ({blocks.length})</span>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {[
                    { type:'video',      label:'🎬 Add Video',   color:'rgba(56,189,248,.3)',  bg:'rgba(56,189,248,.1)',  text:'#38bdf8' },
                    { type:'article',    label:'📰 Add Article', color:'rgba(251,191,36,.3)',  bg:'rgba(251,191,36,.1)',  text:'#fbbf24' },
                    { type:'text',       label:'📝 Add Text',    color:'rgba(0,229,160,.3)',   bg:'rgba(0,229,160,.1)',   text:'var(--accent)' },
                    { type:'heading',    label:'H Add Heading',  color:'rgba(148,163,184,.3)', bg:'rgba(148,163,184,.08)',text:'var(--muted)' },
                  ].map(({ type, label, color, bg, text }) => (
                    <button key={type} onClick={() => addBlock(type)} style={{ padding:'5px 14px', borderRadius:8, border:`1px solid ${color}`, background:bg, color:text, cursor:'pointer', fontSize:11, fontFamily:"'DM Mono',monospace", fontWeight:600, whiteSpace:'nowrap' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {blocks.length === 0 && (
                  <div style={{ textAlign:'center', padding:'28px 16px', border:'1px dashed var(--border)', borderRadius:12 }}>
                    <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>No content blocks yet</div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>Use the buttons above to add a video, article, or text block.</div>
                  </div>
                )}
                {blocks.map((b, i) => (
                  <BlockEditor
                    key={b.id || i}
                    block={b}
                    onChange={v => updBlock(i, v)}
                    onDelete={() => delBlock(i)}
                    onMoveUp={() => moveBlock(i, -1)}
                    onMoveDown={() => moveBlock(i, 1)}
                    isFirst={i === 0}
                    isLast={i === blocks.length - 1}
                  />
                ))}
              </div>
            </div>

            {/* Quiz Questions */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:18, padding:20, marginBottom:24 }}>
              <div style={{ ...sectionHead, flexWrap:'wrap', gap:10 }}>
                <span>Quiz Questions ({questions.length})</span>
                <button onClick={addQ} style={{ padding:'5px 18px', borderRadius:8, border:'1px solid rgba(167,139,250,.35)', background:'rgba(167,139,250,.1)', color:'#a78bfa', cursor:'pointer', fontSize:11, fontFamily:"'DM Mono',monospace", fontWeight:600 }}>+ Add Question</button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {questions.length === 0 && (
                  <div style={{ textAlign:'center', padding:'28px 16px', border:'1px dashed var(--border)', borderRadius:12 }}>
                    <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>No quiz questions yet</div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>Click <strong style={{color:'#a78bfa'}}>+ Add Question</strong> to create a multiple-choice question for this lesson.</div>
                  </div>
                )}
                {questions.map((q, i) => (
                  <QuestionEditor key={q.id || i} q={q} idx={i} onChange={v => updQ(i, v)} onDelete={() => delQ(i)} />
                ))}
                {questions.length > 0 && (
                  <button onClick={addQ} style={{ padding:'9px 0', borderRadius:10, border:'1px dashed rgba(167,139,250,.4)', background:'transparent', color:'#a78bfa', cursor:'pointer', fontSize:12, fontFamily:"'DM Mono',monospace", marginTop:4 }}>
                    + Add Another Question
                  </button>
                )}
              </div>
            </div>

            {/* Save bar */}
            <div style={{ position:'sticky', bottom:16, display:'flex', alignItems:'center', gap:14, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'14px 20px', boxShadow:'0 8px 32px rgba(0,0,0,.4)' }}>
              {status2 && (
                <span style={{ fontSize:12, fontWeight:600, color: status2.type === 'success' ? 'var(--accent)' : '#ef4444', flex:1 }}>{status2.msg}</span>
              )}
              {!status2 && <span style={{ flex:1, fontSize:11, color:'var(--muted)' }}>Changes save directly to the database.</span>}
              <button
                onClick={save}
                disabled={saving}
                style={{ padding:'10px 28px', borderRadius:11, border:'none', background:saving?'var(--surface2)':'var(--accent)', color:saving?'var(--muted)':'#000', cursor:saving?'not-allowed':'pointer', fontFamily:"'DM Mono',monospace", fontWeight:600, fontSize:13, transition:'all .2s' }}
              >
                {saving ? 'Saving…' : 'Save Lesson'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
