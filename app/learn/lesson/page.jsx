"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import BadgeToast from "@/components/BadgeToast";
import { applyTheme, getTheme } from "@/lib/theme";
import dynamic from "next/dynamic";

const CryptoCrossword = dynamic(() => import("./games/CryptoCrossword"), { ssr: false });
const WordSearch      = dynamic(() => import("./games/WordSearch"),       { ssr: false });
const MatchingGame    = dynamic(() => import("./games/MatchingGame"),     { ssr: false });
const Flashcards      = dynamic(() => import("./games/Flashcards"),       { ssr: false });
const EmojiDecode     = dynamic(() => import("./games/EmojiDecode"),      { ssr: false });
const TrueFalse       = dynamic(() => import("./games/TrueFalse"),        { ssr: false });
const SpeedRound      = dynamic(() => import("./games/SpeedRound"),       { ssr: false });

function bold(text) {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function renderTextContent(text) {
  const lines = text.split("\n");
  const segments = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].trim().startsWith("|")) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.filter(r => !/^[\s|:-]+$/.test(r));
      const html = `<table style="border-collapse:collapse;width:100%;margin:12px 0;font-size:12px;overflow-x:auto;display:block">${
        rows.map((row, ri) => {
          const cells = row.split("|").slice(1, -1);
          const tag = ri === 0 ? "th" : "td";
          const bg = ri === 0 ? "background:var(--surface2);" : ri % 2 === 0 ? "background:var(--surface2);" : "";
          return `<tr>${cells.map(c => `<${tag} style="padding:10px 14px;border:1px solid var(--border);text-align:left;color:var(--text);${bg}white-space:nowrap">${bold(c.trim())}</${tag}>`).join("")}</tr>`;
        }).join("")
      }</table>`;
      segments.push({ type: "table", html });
    } else {
      const textLines = [];
      while (i < lines.length && !lines[i].trim().startsWith("|")) {
        textLines.push(lines[i]);
        i++;
      }
      segments.push({ type: "text", content: textLines.join("\n") });
    }
  }
  return segments;
}

function ContentBlock({ block }) {
  const { block_type, content } = block;

  if (block_type === "heading") {
    return <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, color: "var(--text)", margin: "24px 0 10px" }}>{content.text}</h2>;
  }
  if (block_type === "subheading") {
    return <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, color: "var(--text)", margin: "20px 0 8px" }}>{content.text}</h3>;
  }
  if (block_type === "text") {
    const segments = renderTextContent(content.text);
    return (
      <div style={{ marginBottom: 12 }}>
        {segments.map((seg, i) =>
          seg.type === "table"
            ? <div key={i} style={{ overflowX: "auto", margin: "12px 0" }} dangerouslySetInnerHTML={{ __html: seg.html }} />
            : <div key={i} style={{ fontSize: 13, lineHeight: 1.9, color: "var(--text)", whiteSpace: "pre-wrap" }}
                dangerouslySetInnerHTML={{ __html: bold(seg.content) }} />
        )}
      </div>
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
          {content.title && <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>▶ {content.title}</div>}
          <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 12, overflow: "hidden", background: "#000" }}>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${ytMatch[1]}`}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
              allowFullScreen
              title={content.title || "Video"}
            />
          </div>
          {content.description && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>{content.description}</div>}
        </div>
      );
    }
    return (
      <a href={content.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 12, padding: 14, margin: "12px 0", textDecoration: "none" }}>
        <div style={{ fontSize: 12, color: "var(--accent)" }}>▶ {content.title || content.url}</div>
        {content.description && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{content.description}</div>}
      </a>
    );
  }
  if (block_type === "article") {
    return (
      <a href={content.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 12, padding: 14, margin: "12px 0", textDecoration: "none" }}>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>📖 FURTHER READING</div>
        <div style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>{content.title || content.url}</div>
        {content.description && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{content.description}</div>}
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
  const [gameCompleted, setGameCompleted] = useState(false);
  const [gameTokens, setGameTokens] = useState(0);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [moduleComplete, setModuleComplete] = useState(null); // {title, emoji, tokensTotal}

  const [tutorQ, setTutorQ] = useState("");
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorHistory, setTutorHistory] = useState([]); // [{q, a}]
  const [tutorDisabled, setTutorDisabled] = useState(false);

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

  const completeGame = useCallback(async () => {
    if (!classId || gameCompleted) return;
    const res = await fetch("/api/learn/lesson/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId, classId }),
    });
    const data = await res.json();
    setGameCompleted(true);
    setGameTokens(data.tokensAwarded || 0);
    if (data.newBadges?.length) setEarnedBadges(data.newBadges);
    if (data.moduleComplete) setModuleComplete(data.moduleComplete);
  }, [lessonId, classId, gameCompleted]);

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
      if (data.newBadges?.length) setEarnedBadges(data.newBadges);
      if (data.passed && data.moduleComplete) setModuleComplete(data.moduleComplete);
    } finally {
      setSubmitting(false);
    }
  }, [lessonId, classId, answers]);

  const askTutor = useCallback(async () => {
    const q = tutorQ.trim();
    if (!q || tutorLoading) return;
    setTutorLoading(true);
    setTutorQ("");
    try {
      const res = await fetch("/api/learn/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, classId, question: q }),
      });
      const data = await res.json();
      if (data.error) {
        if (data.error.includes("not enabled")) setTutorDisabled(true);
        setTutorHistory(h => [...h, { q, a: data.error, isError: true }]);
      } else {
        setTutorHistory(h => [...h, { q, a: data.answer }]);
      }
    } catch {
      setTutorHistory(h => [...h, { q, a: "Connection error. Try again.", isError: true }]);
    } finally {
      setTutorLoading(false);
    }
  }, [tutorQ, tutorLoading, lessonId, classId]);

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
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:760px;margin:0 auto;padding:24px 16px}
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
        .tutor-bubble{border-radius:14px;padding:12px 16px;margin-bottom:8px;font-size:12.5px;line-height:1.6}
        .tutor-bubble.q{background:rgba(0,229,160,.09);border:1px solid rgba(0,229,160,.2);color:var(--text);align-self:flex-end}
        .tutor-bubble.a{background:var(--surface2);border:1px solid var(--border);color:var(--text)}
        .tutor-bubble.err{border-color:rgba(244,63,94,.3);background:rgba(244,63,94,.07);color:#f87171}
        .tutor-input{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:10px 14px;color:var(--text);font-family:'DM Mono',monospace;font-size:12px;resize:none;outline:none;transition:border .2s}
        .tutor-input:focus{border-color:var(--accent)}
      `}</style>
      <div className="page">
        <Nav active="learn" />

        <div style={{ marginBottom: 20 }}>
          <Link href="/learn" style={{ fontSize: 11, color: "var(--muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
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
              {lesson?.description && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{lesson.description}</div>}
              <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
                {lesson?.tokens_reward > 0 && (
                  <span style={{ fontSize: 11, color: "var(--accent)", background: "rgba(0,229,160,.1)", padding: "3px 10px", borderRadius: 6 }}>
                    +{lesson.tokens_reward} tokens on pass
                  </span>
                )}
                <span style={{ fontSize: 11, color: "var(--muted)", background: "var(--surface2)", padding: "3px 10px", borderRadius: 6 }}>
                  Pass at {lesson?.pass_threshold || 75}%
                </span>
                {questions.length > 0 && (
                  <span style={{ fontSize: 11, color: "var(--muted)", background: "var(--surface2)", padding: "3px 10px", borderRadius: 6 }}>
                    {questions.length} question{questions.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            {/* Phase: content */}
            {phase === "content" && (() => {
              const gameBlock = blocks.find(b => b.block_type === "game_config");
              const gameType  = gameBlock?.content?.game;
              const contentBlocks = blocks.filter(b => b.block_type !== "game_config");

              const GAMES = { crossword: CryptoCrossword, wordsearch: WordSearch, matching: MatchingGame, flashcard: Flashcards, emoji_decode: EmojiDecode, true_false: TrueFalse, speed_round: SpeedRound };
              const GameComponent = gameType ? GAMES[gameType] : null;

              return (
              <>
                {/* Intro content blocks (if any) */}
                {contentBlocks.length > 0 && (
                  <div className="card" style={{ marginBottom: 16 }}>
                    {contentBlocks.map(b => <ContentBlock key={b.id} block={b} />)}
                  </div>
                )}

                {/* Game */}
                {GameComponent && (
                  <div className="card">
                    <GameComponent config={gameBlock.content} completed={gameCompleted} onComplete={completeGame} />
                    {gameCompleted && (
                      <div style={{ marginTop: 20, background: "rgba(0,229,160,.1)", border: "1px solid rgba(0,229,160,.3)", borderRadius: 14, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                        <div>
                          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: "var(--accent)" }}>🎉 Lesson complete!</div>
                          {gameTokens > 0 && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>+{gameTokens} tokens earned</div>}
                        </div>
                        <Link href="/learn" className="btn" style={{ background: "var(--accent)", color: "#000", textDecoration: "none", padding: "10px 20px", borderRadius: 10, fontSize: 12, fontWeight: 700 }}>
                          ← Back to modules
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* AI Lesson Tutor */}
                {!tutorDisabled && (
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: tutorHistory.length ? 16 : 0 }}>
                      <span style={{ fontSize: 20 }}>🤖</span>
                      <div>
                        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: "var(--text)" }}>Ask the AI Tutor</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>Questions about this lesson answered instantly</div>
                      </div>
                    </div>

                    {tutorHistory.length > 0 && (
                      <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                        {tutorHistory.map((item, i) => (
                          <div key={i}>
                            <div className="tutor-bubble q">
                              <span style={{ fontSize: 10, color: "var(--muted)", display: "block", marginBottom: 4 }}>You</span>
                              {item.q}
                            </div>
                            <div className={`tutor-bubble a${item.isError ? " err" : ""}`}>
                              <span style={{ fontSize: 10, color: "var(--muted)", display: "block", marginBottom: 4 }}>Tutor</span>
                              {item.a}
                            </div>
                          </div>
                        ))}
                        {tutorLoading && (
                          <div className="tutor-bubble a" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 10, color: "var(--muted)", display: "block", marginBottom: 4 }}>Tutor</span>
                            <span style={{ color: "var(--muted)", fontSize: 12 }}>Thinking…</span>
                            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", animation: "pulse 1s infinite" }} />
                          </div>
                        )}
                      </div>
                    )}

                    {tutorLoading && tutorHistory.length === 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, color: "var(--muted)", fontSize: 12 }}>
                        <span>Thinking…</span>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                      <textarea
                        className="tutor-input"
                        rows={2}
                        placeholder="Ask anything about this lesson…"
                        value={tutorQ}
                        onChange={e => setTutorQ(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askTutor(); } }}
                        disabled={tutorLoading}
                      />
                      <button
                        className="btn btn-primary"
                        style={{ padding: "10px 18px", fontSize: 12, flexShrink: 0, opacity: (!tutorQ.trim() || tutorLoading) ? 0.5 : 1 }}
                        onClick={askTutor}
                        disabled={!tutorQ.trim() || tutorLoading}
                      >
                        Ask
                      </button>
                    </div>
                  </div>
                )}

                {/* Regular quiz CTA (only if no game block) */}
                {!GameComponent && (
                  <div className="card" style={{ marginBottom: 0 }}>
                  {!gameBlock && blocks.length === 0 && (
                    <div style={{ color: "var(--muted)", fontSize: 13, padding: "20px 0" }}>No content yet.</div>
                  )}

                <div style={{ background: questions.length > 0 ? "linear-gradient(135deg,rgba(0,229,160,.12),rgba(59,130,246,.08))" : "var(--surface)", border: `1px solid ${questions.length > 0 ? "rgba(0,229,160,.3)" : "var(--border)"}`, borderRadius: 20, padding: "24px 28px", marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, color: "var(--text)", marginBottom: 4 }}>
                      {questions.length > 0 ? "Ready to test your knowledge?" : "No quiz for this lesson yet"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      {questions.length > 0
                        ? `${questions.length} question${questions.length !== 1 ? "s" : ""} · pass at ${lesson?.pass_threshold || 75}%${lesson?.tokens_reward > 0 ? ` · earn +${lesson.tokens_reward} tokens` : ""}`
                        : "The teacher hasn't added quiz questions yet"}
                    </div>
                  </div>
                  {questions.length > 0 && (
                    <button className="btn btn-primary" style={{ fontSize: 13, padding: "12px 28px", flexShrink: 0 }} onClick={() => setPhase("quiz")}>
                      Take Quiz →
                    </button>
                  )}
                </div>
                  </div>
                )}
              </>
              );
            })()}

            {/* Phase: quiz */}
            {phase === "quiz" && (
              <div className="card">
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Quiz</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 24 }}>
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
                        <span style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid", borderColor: answers[q.id] === opt.id ? "var(--accent)" : "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
                  <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 8 }}>
                    {results.correct}/{results.total} correct
                  </div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, marginTop: 12, color: results.passed ? "var(--accent)" : "var(--muted)" }}>
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
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6, padding: "8px 12px", background: "rgba(71,85,105,.15)", borderRadius: 8, borderLeft: "3px solid var(--accent)" }}>
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
      <BadgeToast badgeIds={earnedBadges} />

      {/* Module Complete Overlay */}
      {moduleComplete && (
        <ModuleCompleteOverlay
          module={moduleComplete}
          tokensTotal={(results?.tokensAwarded || 0) + gameTokens}
          onDismiss={() => setModuleComplete(null)}
        />
      )}
    </>
  );
}

function ModuleCompleteOverlay({ module, tokensTotal, onDismiss }) {
  const CONFETTI_COLORS = ['#f59e0b','#00e5a0','#3b82f6','#f43f5e','#8b5cf6','#fb923c','#06b6d4','#4ade80'];
  const pieces = Array.from({ length: 32 }, (_, i) => ({
    left:  ((i * 37 + 11) % 97) + '%',
    delay: ((i * 73) % 20) * 0.1 + 's',
    dur:   1.4 + ((i * 29) % 12) * 0.1 + 's',
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size:  6 + (i % 4) * 3,
    shape: i % 3,
  }));

  return (
    <>
      <style>{`
        @keyframes mc-fall{0%{opacity:1;transform:translateY(-10px) rotate(0deg)}100%{opacity:0;transform:translateY(110vh) rotate(600deg)}}
        @keyframes mc-in{0%{opacity:0;transform:scale(.85) translateY(20px)}100%{opacity:1;transform:none}}
      `}</style>
      <div style={{ position:'fixed', inset:0, zIndex:9500, background:'rgba(0,0,0,.75)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onDismiss}>
        {/* Confetti */}
        {pieces.map((p, i) => (
          <div key={i} style={{
            position:'fixed', left:p.left, top:0, width:p.size, height:p.size,
            borderRadius: p.shape===0 ? '50%' : p.shape===1 ? 2 : 0,
            background: p.color, pointerEvents:'none',
            animation: `mc-fall ${p.dur} ${p.delay} ease-in forwards`,
          }}/>
        ))}
        {/* Card */}
        <div style={{ background:'var(--surface)', border:'2px solid var(--accent)', borderRadius:24, padding:'40px 36px', maxWidth:400, width:'100%', textAlign:'center', animation:'mc-in .4s ease', position:'relative', zIndex:1 }} onClick={e => e.stopPropagation()}>
          <div style={{ fontSize:56, marginBottom:12 }}>{module.emoji || '🏅'}</div>
          <div style={{ fontSize:11, color:'var(--accent)', letterSpacing:3, textTransform:'uppercase', marginBottom:8 }}>Module Complete!</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:24, color:'var(--text)', marginBottom:8 }}>{module.title}</div>
          {module.description && <div style={{ fontSize:13, color:'var(--muted)', marginBottom:16 }}>{module.description}</div>}
          {tokensTotal > 0 && (
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(0,229,160,.12)', border:'1px solid rgba(0,229,160,.3)', borderRadius:12, padding:'8px 18px', fontSize:14, fontWeight:700, color:'var(--accent)', marginBottom:20 }}>
              +{tokensTotal} ClassReward Tokens earned
            </div>
          )}
          <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <a href="/learn" style={{ flex:1, padding:'12px 0', borderRadius:12, background:'var(--accent)', color:'#000', fontWeight:700, fontSize:13, textDecoration:'none', display:'block' }}>
              ← Back to Modules
            </a>
            <button onClick={onDismiss} style={{ flex:1, padding:'12px 0', borderRadius:12, background:'transparent', border:'1px solid var(--border)', color:'var(--muted)', fontWeight:600, fontSize:13, cursor:'pointer' }}>
              Stay Here
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

