"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { applyTheme, getTheme } from "@/lib/theme";

function ContentBlock({ block }) {
  const { block_type, content } = block;

  if (block_type === "heading") {
    return <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, color: "var(--text)", margin: "24px 0 10px" }}>{content.text}</h2>;
  }
  if (block_type === "subheading") {
    return <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, color: "var(--text)", margin: "20px 0 8px" }}>{content.text}</h3>;
  }
  if (block_type === "text") {
    return (
      <div style={{ fontSize: 13, lineHeight: 1.8, color: "#cbd5e1", marginBottom: 12, whiteSpace: "pre-wrap" }}
        dangerouslySetInnerHTML={{ __html: content.text
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\|(.+)\|/g, (match) => {
            const rows = match.trim().split("\n").filter(r => r.includes("|"));
            const trs = rows.map((row, i) => {
              const cells = row.split("|").filter((_, j) => j > 0 && j < row.split("|").length - 1);
              const tag = i === 0 ? "th" : "td";
              const style = i === 0 ? "background:#1a2235;font-weight:700;" : "";
              if (i === 1 && cells.every(c => /^[-\s]+$/.test(c))) return "";
              return `<tr>${cells.map(c => `<${tag} style="padding:8px 12px;border:1px solid #1e293b;${style}">${c.trim()}</${tag}>`).join("")}</tr>`;
            }).join("");
            return `<table style="border-collapse:collapse;width:100%;margin:12px 0;font-size:12px">${trs}</table>`;
          })
        }}
      />
    );
  }
  if (block_type === "divider") {
    return <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "20px 0" }} />;
  }
  if (block_type === "video") {
    const ytMatch = (content.url || "").match(/(?:youtu\.be\/|v=)([A-Za-z0-9_-]{11})/);
    if (ytMatch) {
      return (
        <div style={{ margin: "16px 0" }}>
          {content.title && <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>▶ {content.title}</div>}
          <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 12, overflow: "hidden", background: "#000" }}>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${ytMatch[1]}`}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
              allowFullScreen
              title={content.title || "Video"}
            />
          </div>
          {content.description && <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>{content.description}</div>}
        </div>
      );
    }
    return (
      <a href={content.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 12, padding: 14, margin: "12px 0", textDecoration: "none" }}>
        <div style={{ fontSize: 12, color: "var(--accent)" }}>▶ {content.title || content.url}</div>
        {content.description && <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{content.description}</div>}
      </a>
    );
  }
  if (block_type === "article") {
    return (
      <a href={content.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 12, padding: 14, margin: "12px 0", textDecoration: "none" }}>
        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>📖 FURTHER READING</div>
        <div style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>{content.title || content.url}</div>
        {content.description && <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{content.description}</div>}
      </a>
    );
  }
  return null;
}

export default function LessonPageWrapper() {
  return (
    <Suspense fallback={<div style={{ background: "var(--bg,#080c14)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>Loading...</div>}>
      <LessonPage />
    </Suspense>
  );
}

function LessonPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lessonId = searchParams.get("lessonId");

  const [lesson, setLesson] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classId, setClassId] = useState(null);

  const [phase, setPhase] = useState("content"); // "content" | "quiz" | "results"
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => { applyTheme(getTheme()); }, []);
  useEffect(() => { if (status === "unauthenticated") router.replace("/"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || !lessonId) return;
    Promise.all([
      fetch(`/api/learn/lesson?lessonId=${lessonId}`).then(r => r.json()),
      fetch("/api/me").then(r => r.json()),
    ]).then(([lessonData, meData]) => {
      if (lessonData.error) { router.replace("/learn"); return; }
      setLesson(lessonData.lesson);
      setBlocks(lessonData.blocks || []);
      setQuestions(lessonData.questions || []);
      const firstClass = (meData.classes || [])[0];
      if (firstClass?.id) setClassId(firstClass.id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [status, lessonId]);

  const submitQuiz = useCallback(async () => {
    if (!classId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/learn/lesson/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, classId, answers }),
      });
      const data = await res.json();
      setResults(data);
      setPhase("results");
    } finally {
      setSubmitting(false);
    }
  }, [lessonId, classId, answers]);

  if (status === "loading" || status === "unauthenticated") {
    return <div style={{ background: "var(--bg,#080c14)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>Loading...</div>;
  }

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length && questions.length > 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#080c14;--surface:#0f172a;--surface2:#1a2235;--border:#1e293b;--accent:#00e5a0;--text:#e2e8f0;--muted:#475569}
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:760px;margin:0 auto;padding:24px 16px}
        .nav{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;margin-bottom:28px;background:var(--surface);border:1px solid var(--border);border-radius:16px;flex-wrap:wrap;gap:10px}
        .logo{font-family:'Syne',sans-serif;font-weight:800;font-size:16px}.logo span{color:var(--accent)}
        .nav-links{display:flex;gap:8px;flex-wrap:wrap}
        .nav-link{padding:6px 14px;border-radius:8px;font-size:11px;text-decoration:none;color:var(--muted);letter-spacing:1px;transition:all .2s;text-transform:uppercase}
        .nav-link:hover{color:var(--accent)}.nav-link.active{background:rgba(0,229,160,.12);color:var(--accent);border:1px solid rgba(0,229,160,.2)}
        .card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:28px}
        .option-btn{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:14px 16px;cursor:pointer;font-family:'DM Mono',monospace;font-size:13px;color:var(--text);transition:all .2s;margin-bottom:8px}
        .option-btn:hover{border-color:var(--accent);background:rgba(0,229,160,.06)}
        .option-btn.selected{border-color:var(--accent);background:rgba(0,229,160,.1);color:var(--accent)}
        .option-btn.correct{border-color:#00e5a0;background:rgba(0,229,160,.15);color:#00e5a0}
        .option-btn.wrong{border-color:#ef4444;background:rgba(239,68,68,.1);color:#ef4444}
        .option-btn.reveal-correct{border-color:#00e5a0;background:rgba(0,229,160,.08)}
        .btn{padding:12px 28px;border-radius:12px;font-family:'DM Mono',monospace;font-size:12px;font-weight:600;cursor:pointer;border:none;transition:all .2s;letter-spacing:.5px}
        .btn-primary{background:var(--accent);color:#000}.btn-primary:hover{background:#00c98e}.btn-primary:disabled{opacity:.5;cursor:not-allowed}
        .skeleton{background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:12px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>
      <div className="page">
        <nav className="nav">
          <div className="logo">CRYPTO<span>CLASS</span></div>
          <div className="nav-links">
            <Link href="/dashboard" className="nav-link">Wallet</Link>
            <Link href="/market" className="nav-link">Market</Link>
            <Link href="/learn" className="nav-link active">Learn</Link>
          </div>
          <ThemeToggle />
        </nav>

        <div style={{ marginBottom: 20 }}>
          <Link href="/learn" style={{ fontSize: 11, color: "#475569", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
            ← Back to modules
          </Link>
        </div>

        {loading ? (
          <>
            <div className="skeleton" style={{ height: 80, marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 400 }} />
          </>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, letterSpacing: -0.5 }}>{lesson?.title}</div>
              {lesson?.description && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{lesson.description}</div>}
              <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
                {lesson?.tokens_reward > 0 && (
                  <span style={{ fontSize: 11, color: "var(--accent)", background: "rgba(0,229,160,.1)", padding: "3px 10px", borderRadius: 6 }}>
                    +{lesson.tokens_reward} tokens on pass
                  </span>
                )}
                <span style={{ fontSize: 11, color: "#94a3b8", background: "var(--surface2)", padding: "3px 10px", borderRadius: 6 }}>
                  Pass at {lesson?.pass_threshold || 75}%
                </span>
                {questions.length > 0 && (
                  <span style={{ fontSize: 11, color: "#94a3b8", background: "var(--surface2)", padding: "3px 10px", borderRadius: 6 }}>
                    {questions.length} question{questions.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            {/* Phase: content */}
            {phase === "content" && (
              <div className="card">
                {blocks.map(b => <ContentBlock key={b.id} block={b} />)}

                {blocks.length === 0 && (
                  <div style={{ color: "#475569", fontSize: 13, padding: "20px 0" }}>No content yet.</div>
                )}

                {questions.length > 0 && (
                  <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
                    <button className="btn btn-primary" onClick={() => setPhase("quiz")}>
                      Take Quiz →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Phase: quiz */}
            {phase === "quiz" && (
              <div className="card">
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Quiz</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 24 }}>
                  {answeredCount}/{questions.length} answered
                </div>

                {questions.map((q, qi) => (
                  <div key={q.id} style={{ marginBottom: 28 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--text)" }}>
                      <span style={{ color: "var(--accent)", marginRight: 8 }}>{qi + 1}.</span>{q.question_text}
                    </div>
                    {(q.options || []).map(opt => (
                      <button
                        key={opt.id}
                        className={`option-btn ${answers[q.id] === opt.id ? "selected" : ""}`}
                        onClick={() => setAnswers(a => ({ ...a, [q.id]: opt.id }))}
                      >
                        <span style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid", borderColor: answers[q.id] === opt.id ? "var(--accent)" : "#334155", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {answers[q.id] === opt.id && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />}
                        </span>
                        {opt.option_text}
                      </button>
                    ))}
                  </div>
                ))}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                  <button className="btn" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)" }} onClick={() => setPhase("content")}>
                    ← Back to lesson
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={!allAnswered || submitting || !classId}
                    onClick={submitQuiz}
                  >
                    {submitting ? "Submitting..." : "Submit →"}
                  </button>
                </div>
              </div>
            )}

            {/* Phase: results */}
            {phase === "results" && results && (
              <div className="card">
                <div style={{ textAlign: "center", padding: "16px 0 28px" }}>
                  <div style={{ fontSize: 56, marginBottom: 8 }}>{results.passed ? "🎉" : "📚"}</div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 48, color: results.passed ? "var(--accent)" : "#ef4444", lineHeight: 1 }}>
                    {results.score}%
                  </div>
                  <div style={{ fontSize: 14, color: "#94a3b8", marginTop: 8 }}>
                    {results.correct}/{results.total} correct
                  </div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, marginTop: 12, color: results.passed ? "var(--accent)" : "#94a3b8" }}>
                    {results.passed ? "Passed!" : `Needs ${lesson?.pass_threshold || 75}% to pass`}
                  </div>
                  {results.tokensAwarded > 0 && (
                    <div style={{ marginTop: 10, background: "rgba(0,229,160,.1)", border: "1px solid rgba(0,229,160,.3)", borderRadius: 10, display: "inline-block", padding: "6px 16px", fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>
                      +{results.tokensAwarded} tokens earned!
                    </div>
                  )}
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Answer Review</div>
                  {(results.questions || []).map((q, qi) => (
                    <div key={q.id} style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <span style={{ color: q.is_correct ? "#00e5a0" : "#ef4444", flexShrink: 0 }}>{q.is_correct ? "✓" : "✗"}</span>
                        <span>{q.question_text}</span>
                      </div>
                      {(q.options || []).map(opt => {
                        const isChosen = q.chosen_option_id === opt.id;
                        const isCorrect = q.correct_option_id === opt.id;
                        let cls = "option-btn";
                        if (isCorrect) cls += " correct";
                        else if (isChosen && !isCorrect) cls += " wrong";
                        return (
                          <div key={opt.id} className={cls} style={{ cursor: "default" }}>
                            <span style={{ width: 16, height: 16, flexShrink: 0 }}>
                              {isCorrect ? "✓" : isChosen ? "✗" : ""}
                            </span>
                            {opt.option_text}
                          </div>
                        );
                      })}
                      {q.explanation && (
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6, padding: "8px 12px", background: "rgba(71,85,105,.15)", borderRadius: 8, borderLeft: "3px solid var(--accent)" }}>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                  <Link href="/learn" className="btn" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                    ← All modules
                  </Link>
                  {!results.passed && (
                    <button className="btn btn-primary" onClick={() => { setAnswers({}); setPhase("quiz"); }}>
                      Try again →
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
