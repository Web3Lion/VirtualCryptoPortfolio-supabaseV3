"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { applyTheme, getTheme } from "@/lib/theme";

export default function Learn() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notReady, setNotReady] = useState(false);
  const [openIds, setOpenIds] = useState(new Set());

  useEffect(() => { applyTheme(getTheme()); }, []);
  useEffect(() => { if (status === "unauthenticated") router.replace("/"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/learn")
      .then(r => r.json())
      .then(d => {
        if (d.notReady) { setNotReady(true); setLoading(false); return; }
        const mods = Array.isArray(d) ? d : [];
        setModules(mods);
        // Auto-open the first module that isn't fully complete
        const firstIncomplete = mods.find(m => {
          const lessons = m.lessons || [];
          return lessons.length === 0 || lessons.some(l => !l.progress?.passed);
        });
        if (firstIncomplete) setOpenIds(new Set([firstIncomplete.id]));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status]);

  if (status === "loading" || status === "unauthenticated") {
    return <div style={{ background: "var(--bg,#080c14)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>Loading...</div>;
  }

  const totalLessons = modules.reduce((s, m) => s + (m.lessons || []).length, 0);
  const passedLessons = modules.reduce((s, m) => s + (m.lessons || []).filter(l => l.progress?.passed).length, 0);

  const toggle = (id) => setOpenIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:900px;margin:0 auto;padding:24px 16px}
        .progress-bar-wrap{flex:1;background:var(--surface2);border-radius:8px;height:10px;overflow:hidden}
        .progress-bar-fill{height:100%;border-radius:8px;background:linear-gradient(90deg,var(--accent),#3b82f6);transition:width .8s ease}
        .module-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;margin-bottom:12px;overflow:hidden;transition:border-color .2s}
        .module-card.complete{border-color:rgba(0,229,160,.35)}
        .module-header{display:flex;align-items:center;gap:14px;padding:20px 24px;cursor:pointer;user-select:none;transition:background .15s}
        .module-header:hover{background:rgba(255,255,255,.03)}
        .module-emoji{font-size:26px;flex-shrink:0;line-height:1}
        .module-meta{flex:1;min-width:0}
        .module-title{font-family:'Syne',sans-serif;font-weight:700;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .module-desc{font-size:11px;color:var(--muted);margin-top:2px}
        .module-right{display:flex;align-items:center;gap:12px;flex-shrink:0}
        .mod-progress-dots{display:flex;gap:4px;align-items:center}
        .mod-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
        .mod-badge{font-size:11px;padding:3px 10px;border-radius:20px;font-weight:600;white-space:nowrap}
        .chevron{font-size:13px;color:var(--muted);transition:transform .25s ease;flex-shrink:0}
        .chevron.open{transform:rotate(180deg)}
        .lessons-wrap{display:grid;grid-template-rows:0fr;transition:grid-template-rows .28s ease}
        .lessons-wrap.open{grid-template-rows:1fr}
        .lessons-inner{overflow:hidden;padding:0 16px}
        .lessons-inner-pad{padding-bottom:16px}
        .lesson-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;background:var(--surface2);margin-top:8px;text-decoration:none;transition:all .2s;border:1px solid transparent}
        .lesson-row:hover{border-color:var(--accent);background:rgba(0,229,160,.06)}
        .lesson-row.passed{border-color:rgba(0,229,160,.3);background:rgba(0,229,160,.05)}
        .lesson-row.failed{border-color:rgba(239,68,68,.2)}
        .status-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
        .skeleton{background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:12px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      ` }} />
      <div className="page">
        <Nav active="learn" />

        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 32, letterSpacing: -1, marginBottom: 4 }}>
          🎓 <span style={{ color: "var(--accent)" }}>Learn</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 24 }}>Complete lessons to earn tokens and level up your crypto knowledge</div>

        {loading ? (
          <>
            <div className="skeleton" style={{ height: 68, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 68, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 68, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 68 }} />
          </>
        ) : notReady ? (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 32, textAlign: "center", color: "var(--muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🚧</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 8, color: "var(--text)" }}>Learning modules not set up yet</div>
            <div style={{ fontSize: 12 }}>Ask your teacher to enable this feature.</div>
          </div>
        ) : modules.length === 0 ? (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 32, textAlign: "center", color: "var(--muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 8, color: "var(--text)" }}>No modules yet</div>
            <div style={{ fontSize: 12 }}>Check back soon — your teacher is building content.</div>
          </div>
        ) : (
          <>
            {totalLessons > 0 && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 18, marginBottom: 20, display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 36, color: "var(--accent)", lineHeight: 1 }}>{passedLessons}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>of {totalLessons} lessons passed</div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{ width: `${totalLessons > 0 ? (passedLessons / totalLessons) * 100 : 0}%` }} />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  {modules.filter(m => {
                    const ls = m.lessons || [];
                    return ls.length > 0 && ls.every(l => l.progress?.passed);
                  }).length}/{modules.length} modules done
                </div>
              </div>
            )}

            {modules.map(mod => {
              const lessons = mod.lessons || [];
              const doneLessons = lessons.filter(l => l.progress?.passed).length;
              const isComplete = lessons.length > 0 && doneLessons === lessons.length;
              const isOpen = openIds.has(mod.id);

              return (
                <div key={mod.id} className={`module-card${isComplete ? " complete" : ""}`}>
                  <div className="module-header" onClick={() => toggle(mod.id)} role="button" aria-expanded={isOpen}>
                    <span className="module-emoji">{mod.emoji || "📚"}</span>
                    <div className="module-meta">
                      <div className="module-title">{mod.title}</div>
                      {mod.description && <div className="module-desc">{mod.description}</div>}
                    </div>
                    <div className="module-right">
                      {lessons.length > 0 && (
                        <div className="mod-progress-dots">
                          {lessons.map(l => (
                            <div key={l.id} className="mod-dot" style={{
                              background: l.progress?.passed ? "#00e5a0" : l.progress ? "#ef4444" : "#1e293b",
                              border: l.progress ? "none" : "1px solid var(--border)",
                            }} />
                          ))}
                        </div>
                      )}
                      {isComplete ? (
                        <span className="mod-badge" style={{ background: "rgba(0,229,160,.15)", color: "#00e5a0" }}>✓ Complete</span>
                      ) : lessons.length > 0 ? (
                        <span className="mod-badge" style={{ background: "var(--surface2)", color: "var(--muted)" }}>{doneLessons}/{lessons.length}</span>
                      ) : null}
                      <span className={`chevron${isOpen ? " open" : ""}`}>▼</span>
                    </div>
                  </div>

                  <div className={`lessons-wrap${isOpen ? " open" : ""}`}>
                    <div className="lessons-inner">
                      <div className="lessons-inner-pad">
                        {lessons.length === 0 ? (
                          <div style={{ fontSize: 11, color: "var(--muted)", padding: "8px 0" }}>No lessons yet</div>
                        ) : lessons.map(lesson => {
                          const prog = lesson.progress;
                          const passed = prog?.passed;
                          const attempted = !!prog;
                          const dotColor = passed ? "#00e5a0" : attempted ? "#ef4444" : "var(--muted)";
                          return (
                            <Link
                              key={lesson.id}
                              href={`/learn/lesson?lessonId=${lesson.id}`}
                              className={`lesson-row ${passed ? "passed" : attempted ? "failed" : ""}`}
                            >
                              <div className="status-dot" style={{ background: dotColor }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{lesson.title}</div>
                                {lesson.description && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{lesson.description}</div>}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                                {lesson.tokens_reward > 0 && (
                                  <span style={{ fontSize: 11, color: passed ? "var(--muted)" : "var(--accent)", background: passed ? "var(--surface2)" : "rgba(0,229,160,.1)", padding: "2px 8px", borderRadius: 6 }}>
                                    {passed ? "✓" : "+"}{lesson.tokens_reward} tokens
                                  </span>
                                )}
                                {prog && (
                                  <span style={{ fontSize: 11, color: passed ? "#00e5a0" : "#ef4444" }}>
                                    {prog.score}%
                                  </span>
                                )}
                                <span style={{ fontSize: 14, color: "var(--muted)" }}>→</span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}
