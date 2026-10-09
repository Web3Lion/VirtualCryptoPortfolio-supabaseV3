"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";

// Shown to a signed-in student who isn't in any class yet: they type the
// code their teacher shared and get enrolled on the spot.
export default function JoinClassCard({ email, onJoined }) {
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);

  const join = async (e) => {
    e.preventDefault();
    if (!code.trim() || joining) return;
    setJoining(true);
    setError(null);
    try {
      const res = await fetch("/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) onJoined?.(data);
      else setError(data.error || "Could not join that class.");
    } catch {
      setError("Network error. Try again.");
    }
    setJoining(false);
  };

  return (
    <div style={{ background: "var(--bg,#080c14)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'DM Mono', monospace" }}>
      <form onSubmit={join} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 24, padding: "40px 32px", maxWidth: 420, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: -1, marginBottom: 20, color: "#e2e8f0" }}>
          CRYPTO<span style={{ color: "#00e5a0" }}>CLASS</span>
        </div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, marginBottom: 8, color: "#e2e8f0" }}>Join your class</div>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 24, lineHeight: 1.6 }}>
          Enter the class code your teacher gave you.
        </div>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC234"
          maxLength={12}
          autoFocus
          autoComplete="off"
          aria-label="Class code"
          style={{ width: "100%", padding: 14, borderRadius: 12, border: "1px solid #334155", background: "#020617", color: "#e2e8f0", fontFamily: "'DM Mono', monospace", fontSize: 22, letterSpacing: 6, textAlign: "center", marginBottom: 12, boxSizing: "border-box" }}
        />
        {error && (
          <div style={{ background: "rgba(244,63,94,.1)", border: "1px solid rgba(244,63,94,.3)", color: "#f43f5e", borderRadius: 10, padding: 10, fontSize: 12, marginBottom: 12 }}>{error}</div>
        )}
        <button type="submit" disabled={joining || !code.trim()} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: "#00e5a0", color: "#000", fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 600, cursor: joining ? "wait" : "pointer", opacity: joining || !code.trim() ? 0.6 : 1 }}>
          {joining ? "Joining..." : "Join Class"}
        </button>
        <div style={{ fontSize: 10, color: "#475569", marginTop: 16, lineHeight: 1.6 }}>
          Signed in as {email}.{" "}
          <button type="button" onClick={() => signOut({ callbackUrl: "/" })} style={{ background: "none", border: "none", color: "#64748b", textDecoration: "underline", cursor: "pointer", fontFamily: "inherit", fontSize: 10, padding: 0 }}>
            Not you?
          </button>
        </div>
      </form>
    </div>
  );
}
