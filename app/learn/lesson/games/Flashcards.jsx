"use client";
import { useState, useMemo } from "react";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Flashcards({ config, onComplete, completed }) {
  const { cards = [] } = config;
  const deck = useMemo(() => shuffle(cards), []);

  const [index, setIndex]   = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown]   = useState(new Set());
  const [review, setReview] = useState(new Set());
  const [done, setDone]     = useState(false);

  const card = deck[index];
  const progress = Math.round(((known.size + review.size) / deck.length) * 100);

  function next(correct) {
    const newKnown  = new Set(known);
    const newReview = new Set(review);
    if (correct) newKnown.add(index);
    else newReview.add(index);

    setKnown(newKnown);
    setReview(newReview);
    setFlipped(false);

    if (index + 1 >= deck.length) {
      setDone(true);
      if (!completed) setTimeout(() => onComplete && onComplete(), 600);
    } else {
      setTimeout(() => setIndex(i => i + 1), 200);
    }
  }

  function restart() {
    setIndex(0);
    setFlipped(false);
    setKnown(new Set());
    setReview(new Set());
    setDone(false);
  }

  if (done || completed) {
    return (
      <div style={{ textAlign: "center", fontFamily: "'DM Mono',monospace" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🃏</div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, marginBottom: 8, color: "var(--accent)" }}>
          {completed && !done ? "Already completed!" : "Deck complete!"}
        </div>
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>
          {known.size} known · {review.size} still learning
        </div>
        {(review.size > 0 || done) && (
          <button onClick={restart} style={{ padding: "10px 24px", background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", borderRadius: 12, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 12 }}>
            Review again ↺
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Mono',monospace" }}>
      {/* Progress */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: "#475569" }}>{index + 1} of {deck.length}</span>
        <span style={{ fontSize: 11, color: "var(--accent)" }}>{known.size} known ✓</span>
      </div>
      <div style={{ height: 4, background: "var(--surface2)", borderRadius: 2, marginBottom: 20, overflow: "hidden" }}>
        <div style={{ height: "100%", background: "var(--accent)", borderRadius: 2, width: `${progress}%`, transition: "width .3s" }} />
      </div>

      {/* Card */}
      <div
        onClick={() => setFlipped(f => !f)}
        style={{
          width: "100%", minHeight: 180, borderRadius: 20, cursor: "pointer",
          background: flipped ? "rgba(0,229,160,.08)" : "var(--surface2)",
          border: `2px solid ${flipped ? "rgba(0,229,160,.4)" : "var(--border)"}`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "28px 32px", textAlign: "center", transition: "all .25s", userSelect: "none",
        }}>
        <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
          {flipped ? "Definition" : "Term — tap to reveal"}
        </div>
        {flipped ? (
          <div style={{ fontSize: 15, color: "#cbd5e1", lineHeight: 1.7 }}>{card.definition}</div>
        ) : (
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, color: "var(--accent)", letterSpacing: 1 }}>
            {card.term}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {flipped && (
        <div style={{ display: "flex", gap: 12, marginTop: 16, justifyContent: "center" }}>
          <button onClick={() => next(false)} style={{
            flex: 1, maxWidth: 160, padding: "12px 0", borderRadius: 12, cursor: "pointer", fontFamily: "'DM Mono',monospace",
            fontSize: 12, fontWeight: 700, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", color: "#ef4444",
          }}>
            Still learning ↻
          </button>
          <button onClick={() => next(true)} style={{
            flex: 1, maxWidth: 160, padding: "12px 0", borderRadius: 12, cursor: "pointer", fontFamily: "'DM Mono',monospace",
            fontSize: 12, fontWeight: 700, background: "rgba(0,229,160,.12)", border: "1px solid rgba(0,229,160,.3)", color: "var(--accent)",
          }}>
            Got it ✓
          </button>
        </div>
      )}
      {!flipped && (
        <div style={{ textAlign: "center", fontSize: 11, color: "#475569", marginTop: 12 }}>
          Tap the card to see the definition
        </div>
      )}
    </div>
  );
}
