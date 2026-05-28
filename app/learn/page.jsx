"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { applyTheme, getTheme } from "@/lib/theme";

export default function Learn() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notReady, setNotReady] = useState(false);

  useEffect(() => { applyTheme(getTheme()); }, []);
  useEffect(() => { if (status === "unauthenticated") router.replace("/"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/learn")
      .then(r => r.json())
      .then(d => {
        if (d.notReady) { setNotReady(true); setLoading(false); return; }
        setModules(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status]);

  if (status === "loading" || status === "unauthenticated") {
    return <div style={{ background: "var(--bg,#080c14)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>Loading...</div>;
  }

  const totalLessons = modules.reduce((s, m) => s + (m.lessons || []).length, 0);
  const passedLessons = modules.reduce((s, m) => s + (m.lessons || []).filter(l => l.progress?.passed).length, 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#080c14;--surface:#0f172a;--surface2:#1a2235;--border:#1e293b;--accent:#00e5a0;--text:#e2e8f0;--muted:#475569}
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:900px;margin:0 auto;padding:24px 16px}
        .nav{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;margin-bottom:28px;background:var(--surface);border:1px solid var(--border);border-radius:16px;flex-wrap:wrap;gap:10px}
        .logo{font-family:'Syne',sans-serif;font-weight:800;font-size:16px}.logo span{color:var(--accent)}
        .nav-links{display:flex;gap:8px;flex-wrap:wrap}
        .nav-link{padding:6px 14px;border-radius:8px;font-size:11px;text-decoration:none;color:var(--muted);letter-spacing:1px;transition:all .2s;text-transform:uppercase}
        .nav-link:hover{color:var(--accent)}.nav-link.active{background:rgba(0,229,160,.12);color:var(--accent);border:1px solid rgba(0,229,160,.2)}
        .progress-bar-wrap{flex:1;background:var(--surface2);border-radius:8px;height:10px;overflow:hidden}
        .progress-bar-fill{height:100%;border-radius:8px;background:linear-gradient(90deg,var(--accent),#3b82f6);transition:width .8s ease}
        .module-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:24px;margin-bottom:16px}
        .lesson-row{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:12px;background:var(--surface2);margin-top:10px;cursor:pointer;text-decoration:none;transition:all .2s;border:1px solid transparent}
        .lesson-row:hover{border-color:var(--accent);background:rgba(0,229,160,.06)}
        .lesson-row.passed{border-color:rgba(0,229,160,.3);background:rgba(0,229,160,.05)}
        .lesson-row.failed{border-color:rgba(239,68,68,.2)}
        .status-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
        .skeleton{background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:12px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>
      <div className="page">
        <nav className="nav">
          <div className="logo">CRYPTO<span>CLASS</span></div>
          <div className="nav-links">
            <Link href="/dashboard" className="nav-link">Wallet</Link>
            <Link href="/leaderboard" className="nav-link">Leaderboard</Link>
            <Link href="/market" className="nav-link">Market</Link>
            <Link href="/news" className="nav-link">News</Link>
            <Link href="/badges" className="nav-link">Badges</Link>
            <a href="/learn" className="nav-link active">Learn</a>
            <Link href="/games/crypto-crush" className="nav-link">Crush</Link>
          </div>
          <ThemeToggle />
        </nav>

        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 32, letterSpacing: -1, marginBottom: 4 }}>
          🎓 <span style={{ color: "var(--accent)" }}>Learn</span>
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 24 }}>Complete lessons to earn tokens and level up your crypto knowledge</div>

        {loading ? (
          <>
            <div className="skeleton" style={{ height: 80, marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 180, marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 180 }} />
          </>
        ) : notReady ? (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 32, textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🚧</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 8, color: "var(--text)" }}>Learning modules not set up yet</div>
            <div style={{ fontSize: 12 }}>Ask your teacher to enable this feature.</div>
          </div>
        ) : modules.length === 0 ? (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 32, textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 8, color: "var(--text)" }}>No modules yet</div>
            <div style={{ fontSize: 12 }}>Check back soon — your teacher is building content.</div>
          </div>
        ) : (
          <>
            {totalLessons > 0 && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 24, display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 40, color: "var(--accent)", lineHeight: 1 }}>{passedLessons}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>of {totalLessons} lessons passed</div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{ width: `${totalLessons > 0 ? (passedLessons / totalLessons) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            )}

            {modules.map(mod => (
              <div key={mod.id} className="module-card">
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                  <span style={{ fontSize: 28 }}>{mod.emoji || "📚"}</span>
                  <div>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18 }}>{mod.title}</div>
                    {mod.description && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{mod.description}</div>}
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8" }}>
                    {(mod.lessons || []).filter(l => l.progress?.passed).length}/{(mod.lessons || []).length} done
                  </div>
                </div>

                {(mod.lessons || []).length === 0 ? (
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 12 }}>No lessons yet</div>
                ) : (mod.lessons || []).map(lesson => {
                  const prog = lesson.progress;
                  const passed = prog?.passed;
                  const attempted = !!prog;
                  const dotColor = passed ? "#00e5a0" : attempted ? "#ef4444" : "#475569";
                  return (
                    <Link
                      key={lesson.id}
                      href={`/learn/lesson?lessonId=${lesson.id}`}
                      className={`lesson-row ${passed ? "passed" : attempted ? "failed" : ""}`}
                    >
                      <div className="status-dot" style={{ background: dotColor }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{lesson.title}</div>
                        {lesson.description && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{lesson.description}</div>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        {lesson.tokens_reward > 0 && (
                          <span style={{ fontSize: 11, color: passed ? "#94a3b8" : "var(--accent)", background: passed ? "rgba(71,85,105,.2)" : "rgba(0,229,160,.1)", padding: "2px 8px", borderRadius: 6 }}>
                            {passed ? "✓" : "+"}{lesson.tokens_reward} tokens
                          </span>
                        )}
                        {prog && (
                          <span style={{ fontSize: 11, color: passed ? "#00e5a0" : "#ef4444" }}>
                            {prog.score}%
                          </span>
                        )}
                        <span style={{ fontSize: 16, color: "#475569" }}>→</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
