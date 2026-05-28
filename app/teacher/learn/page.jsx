"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { applyTheme, getTheme } from "@/lib/theme";

export default function TeacherLearn() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  // DB setup state
  const [dbReady, setDbReady] = useState(null);
  const [setupSQL, setSetupSQL] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [migrating, setMigrating] = useState(false);

  // Expanded lesson (to show questions)
  const [expandedLesson, setExpandedLesson] = useState(null);
  const [lessonQuestions, setLessonQuestions] = useState({});

  // Create module form
  const [showNewModule, setShowNewModule] = useState(false);
  const [newModule, setNewModule] = useState({ title: "", description: "", emoji: "📚" });

  // Create lesson form
  const [showNewLesson, setShowNewLesson] = useState(null); // moduleId
  const [newLesson, setNewLesson] = useState({ title: "", description: "", tokensReward: 25, passThreshold: 75, questionsToShow: 4 });

  // Create question form
  const [showNewQuestion, setShowNewQuestion] = useState(null); // lessonId
  const [newQuestion, setNewQuestion] = useState({ questionText: "", explanation: "", options: ["", "", "", ""], correctIndex: 0 });

  useEffect(() => { applyTheme(getTheme()); }, []);
  useEffect(() => { if (status === "unauthenticated") router.replace("/"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/classes").then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : (d.classes || []);
      setClasses(list);
      if (list.length > 0) setClassId(list[0].id);
    }).catch(() => {});
  }, [status]);

  const checkDb = useCallback(() => {
    fetch("/api/admin/migrate-learn").then(r => r.json()).then(d => {
      setDbReady(d.ready);
      if (!d.ready) setSetupSQL(d.sql);
    });
  }, []);

  useEffect(() => { if (status === "authenticated") checkDb(); }, [status, checkDb]);

  const fetchModules = useCallback(() => {
    if (!classId) return;
    setLoading(true);
    fetch(`/api/teacher/learn?classId=${classId}`).then(r => r.json()).then(d => {
      setModules(Array.isArray(d) ? d : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [classId]);

  useEffect(() => { fetchModules(); }, [fetchModules]);

  const [importing, setImporting] = useState(false);

  const flash = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3500); };

  const seedSample = async () => {
    setSeeding(true);
    const res = await fetch("/api/admin/migrate-learn", { method: "POST" });
    const d = await res.json();
    if (d.success) { flash(d.results ? `Modules seeded: ${d.results.map(r => r.module).join(", ")}` : "Modules seeded!"); fetchModules(); }
    else flash(d.error || "Seed failed", false);
    setSeeding(false);
  };

  const importJSON = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    try {
      const json = JSON.parse(await file.text());
      const lessons = json.lessons || [];
      const moduleTitle = json.moduleTitle;
      if (!moduleTitle || !lessons.length) { flash("JSON must have moduleTitle and lessons[]", false); setImporting(false); return; }
      let ok = 0, skip = 0, fail = 0;
      for (const lesson of lessons) {
        const res = await fetch("/api/teacher/learn/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moduleTitle, lesson }),
        });
        const d = await res.json();
        if (res.status === 409) skip++;
        else if (d.success) ok++;
        else fail++;
      }
      flash(`Imported ${ok} lesson(s)${skip ? `, ${skip} skipped (already exist)` : ""}${fail ? `, ${fail} failed` : ""}`);
      fetchModules();
    } catch {
      flash("Invalid JSON file", false);
    }
    setImporting(false);
  };

  const togglePublish = async (type, id, current) => {
    setSaving(true);
    await fetch("/api/teacher/learn", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id, isPublished: !current }),
    });
    flash(`${type} ${!current ? "published" : "unpublished"}`);
    fetchModules();
    setSaving(false);
  };

  const deleteItem = async (type, id) => {
    if (!confirm(`Delete this ${type}? This cannot be undone.`)) return;
    setSaving(true);
    await fetch(`/api/teacher/learn?type=${type}&id=${id}`, { method: "DELETE" });
    flash(`${type} deleted`);
    fetchModules();
    setSaving(false);
  };

  const createModule = async () => {
    if (!newModule.title.trim()) return;
    setSaving(true);
    await fetch("/api/teacher/learn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "module", classId, ...newModule }),
    });
    flash("Module created");
    setShowNewModule(false);
    setNewModule({ title: "", description: "", emoji: "📚" });
    fetchModules();
    setSaving(false);
  };

  const createLesson = async () => {
    if (!newLesson.title.trim() || !showNewLesson) return;
    setSaving(true);
    await fetch("/api/teacher/learn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "lesson", moduleId: showNewLesson, ...newLesson }),
    });
    flash("Lesson created");
    setShowNewLesson(null);
    setNewLesson({ title: "", description: "", tokensReward: 25, passThreshold: 75, questionsToShow: 4 });
    fetchModules();
    setSaving(false);
  };

  const loadQuestions = async (lessonId) => {
    if (lessonQuestions[lessonId]) return;
    const [lessonData] = await Promise.all([
      fetch(`/api/learn/lesson?lessonId=${lessonId}`).then(r => r.json()),
    ]);
    setLessonQuestions(q => ({ ...q, [lessonId]: lessonData.questions || [] }));
  };

  const toggleLesson = async (lessonId) => {
    if (expandedLesson === lessonId) { setExpandedLesson(null); return; }
    setExpandedLesson(lessonId);
    await loadQuestions(lessonId);
  };

  const createQuestion = async () => {
    const { questionText, explanation, options, correctIndex } = newQuestion;
    if (!questionText.trim() || options.some(o => !o.trim())) {
      flash("Fill in the question and all 4 options", false); return;
    }
    setSaving(true);
    await fetch("/api/teacher/learn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "question",
        lessonId: showNewQuestion,
        questionText,
        explanation,
        options: options.map((text, i) => ({ text, isCorrect: i === correctIndex })),
      }),
    });
    flash("Question added");
    setLessonQuestions(q => ({ ...q, [showNewQuestion]: undefined }));
    await loadQuestions(showNewQuestion);
    setShowNewQuestion(null);
    setNewQuestion({ questionText: "", explanation: "", options: ["", "", "", ""], correctIndex: 0 });
    setSaving(false);
  };

  const deleteQuestion = async (lessonId, questionId) => {
    if (!confirm("Delete this question?")) return;
    await fetch(`/api/teacher/learn?type=question&id=${questionId}`, { method: "DELETE" });
    setLessonQuestions(q => ({ ...q, [lessonId]: (q[lessonId] || []).filter(x => x.id !== questionId) }));
    flash("Question deleted");
  };

  if (status === "loading" || status === "unauthenticated") {
    return <div style={{ background: "var(--bg,#080c14)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>Loading...</div>;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#080c14;--surface:#0f172a;--surface2:#1a2235;--border:#1e293b;--accent:#00e5a0;--text:#e2e8f0;--muted:#475569}
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:960px;margin:0 auto;padding:24px 16px}
        .nav{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;margin-bottom:28px;background:var(--surface);border:1px solid var(--border);border-radius:16px;flex-wrap:wrap;gap:10px}
        .logo{font-family:'Syne',sans-serif;font-weight:800;font-size:16px}.logo span{color:var(--accent)}
        .nav-links{display:flex;gap:8px;flex-wrap:wrap}
        .nav-link{padding:6px 14px;border-radius:8px;font-size:11px;text-decoration:none;color:var(--muted);letter-spacing:1px;transition:all .2s;text-transform:uppercase}
        .nav-link:hover{color:var(--accent)}.nav-link.active{background:rgba(0,229,160,.12);color:var(--accent);border:1px solid rgba(0,229,160,.2)}
        .card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:24px;margin-bottom:16px}
        .module-header{display:flex;align-items:center;gap:12px;margin-bottom:12px}
        .lesson-row{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;background:var(--surface2);margin-top:8px;border:1px solid transparent}
        .lesson-row:hover{border-color:rgba(71,85,105,.4)}
        .btn{padding:8px 16px;border-radius:10px;font-family:'DM Mono',monospace;font-size:11px;font-weight:600;cursor:pointer;border:none;transition:all .2s}
        .btn-primary{background:var(--accent);color:#000}.btn-primary:hover{background:#00c98e}.btn-primary:disabled{opacity:.5;cursor:not-allowed}
        .btn-ghost{background:transparent;border:1px solid var(--border);color:var(--muted)}.btn-ghost:hover{border-color:var(--accent);color:var(--accent)}
        .btn-danger{background:transparent;border:1px solid rgba(239,68,68,.3);color:#ef4444}.btn-danger:hover{background:rgba(239,68,68,.1)}
        .tag{display:inline-block;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600}
        .tag-pub{background:rgba(0,229,160,.12);color:var(--accent);border:1px solid rgba(0,229,160,.2)}
        .tag-draft{background:rgba(71,85,105,.15);color:#94a3b8;border:1px solid rgba(71,85,105,.25)}
        input,textarea,select{background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:10px;padding:8px 12px;font-family:'DM Mono',monospace;font-size:12px;width:100%}
        input:focus,textarea:focus,select:focus{outline:none;border-color:var(--accent)}
        .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .flash{position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:12px;font-size:12px;z-index:999;animation:fadein .3s}
        .flash.ok{background:#00e5a0;color:#000}.flash.err{background:#ef4444;color:#fff}
        @keyframes fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .skeleton{background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:12px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>

      {msg && <div className={`flash ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}

      <div className="page">
        <nav className="nav">
          <div className="logo">CRYPTO<span>CLASS</span></div>
          <div className="nav-links">
            <Link href="/teacher" className="nav-link">Dashboard</Link>
            <Link href="/teacher/cockpit" className="nav-link">Cockpit</Link>
            <a href="/teacher/learn" className="nav-link active">Learn</a>
            <Link href="/teacher/migrate" className="nav-link">Migrate</Link>
          </div>
          <ThemeToggle />
        </nav>

        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, marginBottom: 4 }}>
          🎓 <span style={{ color: "var(--accent)" }}>Learning Modules</span>
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 24 }}>Create and manage educational content for your students</div>

        {/* DB not ready banner */}
        {dbReady === false && (
          <div className="card" style={{ borderColor: "rgba(245,158,11,.3)", background: "rgba(245,158,11,.05)", marginBottom: 20 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, color: "#f59e0b", marginBottom: 8 }}>⚠ Database tables not set up yet</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 14 }}>Run this SQL in your Supabase console, then refresh this page.</div>
            <pre style={{ background: "#000", border: "1px solid var(--border)", borderRadius: 10, padding: 14, fontSize: 10, color: "#94a3b8", overflowX: "auto", maxHeight: 200, marginBottom: 14 }}>{setupSQL}</pre>
            <button className="btn btn-primary" onClick={checkDb}>Check again</button>
          </div>
        )}

        {/* Class picker */}
        {classes.length > 1 && (
          <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>Class:</span>
            <select value={classId || ""} onChange={e => setClassId(e.target.value)} style={{ width: "auto" }}>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name || c.id}</option>)}
            </select>
          </div>
        )}

        {/* Controls */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn btn-primary" onClick={() => setShowNewModule(true)} disabled={dbReady === false}>
            + New Module
          </button>
          <button className="btn btn-ghost" onClick={seedSample} disabled={seeding || dbReady === false}>
            {seeding ? "Seeding..." : "Seed 4 Modules"}
          </button>
          <label style={{ cursor: importing || dbReady === false ? "not-allowed" : "pointer", opacity: importing || dbReady === false ? 0.5 : 1 }}>
            <input type="file" accept=".json" onChange={importJSON} style={{ display: "none" }} disabled={importing || dbReady === false} />
            <span className="btn btn-ghost" style={{ pointerEvents: "none" }}>
              {importing ? "Importing..." : "⬆ Import JSON"}
            </span>
          </label>
          <span style={{ fontSize: 10, color: "var(--muted)" }}>Upload a module JSON from /content/learn/</span>
        </div>

        {/* New module form */}
        {showNewModule && (
          <div className="card" style={{ marginBottom: 16, borderColor: "rgba(0,229,160,.2)" }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, marginBottom: 14 }}>New Module</div>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", gap: 10 }}>
                <input value={newModule.emoji} onChange={e => setNewModule(m => ({ ...m, emoji: e.target.value }))} placeholder="📚" />
                <input value={newModule.title} onChange={e => setNewModule(m => ({ ...m, title: e.target.value }))} placeholder="Module title" />
              </div>
              <input value={newModule.description} onChange={e => setNewModule(m => ({ ...m, description: e.target.value }))} placeholder="Description (optional)" />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn btn-primary" onClick={createModule} disabled={saving || !newModule.title.trim()}>Create</button>
              <button className="btn btn-ghost" onClick={() => setShowNewModule(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Module list */}
        {loading ? (
          <>
            <div className="skeleton" style={{ height: 120, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 120 }} />
          </>
        ) : modules.length === 0 ? (
          <div className="card" style={{ textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 6, color: "var(--text)" }}>No modules yet</div>
            <div style={{ fontSize: 12 }}>Create your first module or seed the sample to get started.</div>
          </div>
        ) : modules.map(mod => (
          <div key={mod.id} className="card">
            <div className="module-header">
              <span style={{ fontSize: 26 }}>{mod.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16 }}>{mod.title}</div>
                {mod.description && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{mod.description}</div>}
              </div>
              <span className={`tag ${mod.is_published ? "tag-pub" : "tag-draft"}`}>{mod.is_published ? "Published" : "Draft"}</span>
              <button className="btn btn-ghost" style={{ fontSize: 10 }} onClick={() => togglePublish("module", mod.id, mod.is_published)}>
                {mod.is_published ? "Unpublish" : "Publish"}
              </button>
              <button className="btn btn-danger" style={{ fontSize: 10 }} onClick={() => deleteItem("module", mod.id)}>Delete</button>
            </div>

            {/* Lessons */}
            {(mod.lessons || []).map(lesson => (
              <div key={lesson.id}>
                <div className="lesson-row">
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => toggleLesson(lesson.id)}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                      {expandedLesson === lesson.id ? "▾" : "▸"} {lesson.title}
                    </div>
                    {lesson.description && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{lesson.description}</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, color: "#475569" }}>{lesson.question_count} Q</span>
                    <span style={{ fontSize: 10, color: "var(--accent)" }}>+{lesson.tokens_reward}t</span>
                    <span className={`tag ${lesson.is_published ? "tag-pub" : "tag-draft"}`} style={{ fontSize: 9 }}>
                      {lesson.is_published ? "pub" : "draft"}
                    </span>
                    <button className="btn btn-ghost" style={{ fontSize: 9, padding: "4px 8px" }} onClick={() => togglePublish("lesson", lesson.id, lesson.is_published)}>
                      {lesson.is_published ? "Unpublish" : "Publish"}
                    </button>
                    <button className="btn btn-danger" style={{ fontSize: 9, padding: "4px 8px" }} onClick={() => deleteItem("lesson", lesson.id)}>✕</button>
                  </div>
                </div>

                {/* Expanded: questions */}
                {expandedLesson === lesson.id && (
                  <div style={{ marginLeft: 16, marginTop: 4, paddingLeft: 12, borderLeft: "2px solid var(--border)" }}>
                    {(lessonQuestions[lesson.id] || []).map(q => (
                      <div key={q.id} style={{ background: "rgba(0,0,0,.2)", borderRadius: 10, padding: "10px 12px", marginTop: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}>{q.question_text}</div>
                          <button className="btn btn-danger" style={{ fontSize: 9, padding: "3px 8px", flexShrink: 0 }} onClick={() => deleteQuestion(lesson.id, q.id)}>✕</button>
                        </div>
                        {(q.options || []).map(opt => (
                          <div key={opt.id} style={{ fontSize: 11, color: opt.is_correct ? "#00e5a0" : "#475569", marginTop: 4, display: "flex", gap: 6 }}>
                            <span>{opt.is_correct ? "✓" : "○"}</span>
                            <span>{opt.option_text}</span>
                          </div>
                        ))}
                        {q.explanation && <div style={{ fontSize: 10, color: "#475569", marginTop: 6, fontStyle: "italic" }}>{q.explanation}</div>}
                      </div>
                    ))}

                    <button className="btn btn-ghost" style={{ fontSize: 10, marginTop: 10 }} onClick={() => setShowNewQuestion(lesson.id)}>
                      + Add Question
                    </button>

                    {/* New question form */}
                    {showNewQuestion === lesson.id && (
                      <div style={{ background: "var(--surface2)", borderRadius: 12, padding: 14, marginTop: 10, border: "1px solid rgba(0,229,160,.2)" }}>
                        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 10 }}>New Question</div>
                        <div style={{ display: "grid", gap: 8 }}>
                          <textarea
                            rows={2}
                            value={newQuestion.questionText}
                            onChange={e => setNewQuestion(q => ({ ...q, questionText: e.target.value }))}
                            placeholder="Question text"
                          />
                          <input
                            value={newQuestion.explanation}
                            onChange={e => setNewQuestion(q => ({ ...q, explanation: e.target.value }))}
                            placeholder="Explanation (shown after answering)"
                          />
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Options — click radio to mark correct:</div>
                          {newQuestion.options.map((opt, i) => (
                            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <input
                                type="radio"
                                name="correctOpt"
                                checked={newQuestion.correctIndex === i}
                                onChange={() => setNewQuestion(q => ({ ...q, correctIndex: i }))}
                                style={{ width: 16, flex: "none", accentColor: "var(--accent)" }}
                              />
                              <input
                                value={opt}
                                onChange={e => setNewQuestion(q => {
                                  const opts = [...q.options]; opts[i] = e.target.value;
                                  return { ...q, options: opts };
                                })}
                                placeholder={`Option ${i + 1}`}
                              />
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                          <button className="btn btn-primary" onClick={createQuestion} disabled={saving}>Add</button>
                          <button className="btn btn-ghost" onClick={() => setShowNewQuestion(null)}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Add lesson */}
            {showNewLesson === mod.id ? (
              <div style={{ background: "var(--surface2)", borderRadius: 12, padding: 14, marginTop: 12, border: "1px solid rgba(0,229,160,.2)" }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 10 }}>New Lesson</div>
                <div style={{ display: "grid", gap: 8 }}>
                  <input value={newLesson.title} onChange={e => setNewLesson(l => ({ ...l, title: e.target.value }))} placeholder="Lesson title" />
                  <input value={newLesson.description} onChange={e => setNewLesson(l => ({ ...l, description: e.target.value }))} placeholder="Description (optional)" />
                  <div className="form-grid">
                    <div>
                      <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 4 }}>Tokens reward</div>
                      <input type="number" value={newLesson.tokensReward} onChange={e => setNewLesson(l => ({ ...l, tokensReward: parseInt(e.target.value) || 0 }))} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 4 }}>Pass threshold (%)</div>
                      <input type="number" value={newLesson.passThreshold} onChange={e => setNewLesson(l => ({ ...l, passThreshold: parseInt(e.target.value) || 75 }))} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 4 }}>Questions to show</div>
                      <input type="number" value={newLesson.questionsToShow} onChange={e => setNewLesson(l => ({ ...l, questionsToShow: parseInt(e.target.value) || 4 }))} />
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button className="btn btn-primary" onClick={createLesson} disabled={saving || !newLesson.title.trim()}>Create</button>
                  <button className="btn btn-ghost" onClick={() => setShowNewLesson(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button className="btn btn-ghost" style={{ fontSize: 10, marginTop: 12 }} onClick={() => setShowNewLesson(mod.id)}>
                + Add Lesson
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
