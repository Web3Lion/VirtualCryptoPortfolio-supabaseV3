"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AssignmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [classes, setClasses]         = useState([]);
  const [classId, setClassId]         = useState('');
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [form, setForm]               = useState({ title: '', description: '', dueAt: '' });
  const [saving, setSaving]           = useState(false);
  const [msg, setMsg]                 = useState(null);

  useEffect(() => { if (status === 'unauthenticated') router.replace('/'); }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/classes').then(r => r.ok ? r.json() : []).then(d => {
      if (Array.isArray(d) && d.length) {
        setClasses(d);
        setClassId(d[0].id);
      }
    }).catch(() => {});
  }, [status]);

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    fetch(`/api/teacher/assignments?classId=${classId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.assignments) setAssignments(d.assignments); setLoading(false); })
      .catch(() => setLoading(false));
  }, [classId]);

  const createAssignment = async () => {
    if (!form.title.trim() || !classId || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/teacher/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, title: form.title, description: form.description, dueAt: form.dueAt || null }),
      });
      const d = await res.json();
      if (res.ok) {
        setAssignments(prev => [{ ...d.assignment, completions: 0 }, ...prev]);
        setForm({ title: '', description: '', dueAt: '' });
        setMsg({ type: 'success', text: '✅ Assignment created!' });
      } else {
        setMsg({ type: 'error', text: d.error || 'Failed' });
      }
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const toggleActive = async (a) => {
    await fetch('/api/teacher/assignments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: a.id, active: !a.active }),
    });
    setAssignments(prev => prev.map(x => x.id === a.id ? { ...x, active: !x.active } : x));
  };

  const S = {
    label: { fontSize: 11, color: '#64748b', letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 5 },
    input: { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #1e293b', background: '#080c14', color: '#e2e8f0', fontFamily: "'DM Mono',monospace", fontSize: 13 },
  };

  if (loading && !assignments.length) return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24, fontFamily: "'DM Mono',monospace", color: '#e2e8f0' }}>
      <style dangerouslySetInnerHTML={{ __html: `body{background:#080c14}` }} />
      Loading assignments…
    </div>
  );

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px 60px', fontFamily: "'DM Mono',monospace", color: '#e2e8f0' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@400;500&display=swap');
        body{background:#080c14}
        select option{background:#0f172a}
      ` }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <button onClick={() => router.back()} style={{ padding: '7px 14px', borderRadius: 9, border: '1px solid #1e293b', background: '#0f172a', color: '#64748b', cursor: 'pointer', fontSize: 12 }}>← Back</button>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 24, letterSpacing: -1 }}>📋 Assignments</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Assign lessons and tasks to students with optional due dates</div>
        </div>
        {classes.length > 1 && (
          <select value={classId} onChange={e => setClassId(e.target.value)}
            style={{ marginLeft: 'auto', padding: '7px 12px', borderRadius: 9, border: '1px solid #1e293b', background: '#0f172a', color: '#e2e8f0', fontFamily: "'DM Mono',monospace", fontSize: 12 }}>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {/* Create new */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 18, padding: 20, marginBottom: 24 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 16 }}>+ New Assignment</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={S.label}>Title *</label>
            <input style={S.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Complete the Bitcoin Basics lesson" />
          </div>
          <div>
            <label style={S.label}>Description (optional)</label>
            <textarea style={{ ...S.input, minHeight: 60, resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Instructions or context for students…" />
          </div>
          <div>
            <label style={S.label}>Due date (optional)</label>
            <input type="datetime-local" style={{ ...S.input, width: 'auto' }} value={form.dueAt} onChange={e => setForm(f => ({ ...f, dueAt: e.target.value }))} />
          </div>
          {msg && <div style={{ fontSize: 12, fontWeight: 600, color: msg.type === 'success' ? '#00e5a0' : '#f87171' }}>{msg.text}</div>}
          <button onClick={createAssignment} disabled={!form.title.trim() || saving}
            style={{ alignSelf: 'flex-start', padding: '10px 24px', borderRadius: 11, border: 'none', background: (!form.title.trim()||saving) ? '#1e293b' : '#00e5a0', color: (!form.title.trim()||saving) ? '#475569' : '#000', cursor: (!form.title.trim()||saving) ? 'not-allowed' : 'pointer', fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 13 }}>
            {saving ? 'Creating…' : 'Create Assignment'}
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
          {assignments.length} assignment{assignments.length !== 1 ? 's' : ''} total
          {' · '}
          <span style={{ color: '#00e5a0' }}>{assignments.filter(a => a.active).length} active</span>
        </div>
        {assignments.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', border: '1px dashed #1e293b', borderRadius: 14, color: '#475569', fontSize: 13 }}>No assignments yet</div>
        )}
        {assignments.map(a => {
          const dueDate = a.due_at ? new Date(a.due_at) : null;
          const isOverdue = dueDate && dueDate < new Date() && a.active;
          return (
            <div key={a.id} style={{ background: '#0f172a', border: `1px solid ${a.active ? (isOverdue ? 'rgba(244,63,94,.3)' : '#1e293b') : '#0c1322'}`, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, opacity: a.active ? 1 : 0.55 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, color: a.active ? '#e2e8f0' : '#64748b' }}>{a.title}</div>
                {a.description && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{a.description}</div>}
                {a.lessonTitle && <div style={{ fontSize: 11, color: '#00e5a0', marginTop: 3 }}>📝 {a.lessonTitle}</div>}
                <div style={{ fontSize: 10, color: '#334155', marginTop: 4, display: 'flex', gap: 12 }}>
                  {dueDate && <span style={{ color: isOverdue ? '#f87171' : '#64748b' }}>Due: {dueDate.toLocaleDateString()} {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                  <span>{a.completions} completion{a.completions !== 1 ? 's' : ''}</span>
                  <span>Created {new Date(a.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <button onClick={() => toggleActive(a)}
                style={{ padding: '6px 14px', borderRadius: 9, border: `1px solid ${a.active ? 'rgba(244,63,94,.3)' : 'rgba(0,229,160,.3)'}`, background: a.active ? 'rgba(244,63,94,.08)' : 'rgba(0,229,160,.08)', color: a.active ? '#f87171' : '#00e5a0', cursor: 'pointer', fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 600, whiteSpace: 'nowrap' }}>
                {a.active ? 'Close' : 'Reopen'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
