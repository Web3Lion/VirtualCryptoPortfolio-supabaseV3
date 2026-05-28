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

export default function MatchingGame({ config, onComplete, completed }) {
  const { pairs = [] } = config;

  const shuffledDefs = useMemo(() => shuffle(pairs.map((p, i) => ({ ...p, id: i }))), []);
  const terms = pairs.map((p, i) => ({ ...p, id: i }));

  const [selectedTerm, setSelectedTerm] = useState(null);
  const [selectedDef,  setSelectedDef]  = useState(null);
  const [matched, setMatched] = useState(new Set()); // matched ids
  const [wrongPair, setWrongPair] = useState(null);

  function handleTerm(id) {
    if (matched.has(id)) return;
    setSelectedTerm(id);
    setWrongPair(null);
    if (selectedDef !== null) checkMatch(id, selectedDef);
  }

  function handleDef(id) {
    if (matched.has(id)) return;
    setSelectedDef(id);
    setWrongPair(null);
    if (selectedTerm !== null) checkMatch(selectedTerm, id);
  }

  function checkMatch(termId, defId) {
    if (termId === defId) {
      const newMatched = new Set(matched);
      newMatched.add(termId);
      setMatched(newMatched);
      setSelectedTerm(null);
      setSelectedDef(null);
      if (newMatched.size === pairs.length && !completed) {
        setTimeout(() => onComplete && onComplete(), 800);
      }
    } else {
      setWrongPair({ termId, defId });
      setTimeout(() => {
        setSelectedTerm(null);
        setSelectedDef(null);
        setWrongPair(null);
      }, 700);
    }
  }

  const allDone = matched.size === pairs.length;

  return (
    <div style={{ fontFamily: "'DM Mono',monospace" }}>
      {allDone && !completed && (
        <div style={{ background: "rgba(0,229,160,.15)", border: "2px solid var(--accent)", borderRadius: 16, padding: "16px 24px", textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 32 }}>🎉</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: "var(--accent)" }}>All matched!</div>
        </div>
      )}
      {completed && (
        <div style={{ background: "rgba(0,229,160,.1)", border: "1px solid rgba(0,229,160,.3)", borderRadius: 12, padding: "10px 16px", fontSize: 12, color: "var(--accent)", marginBottom: 12 }}>
          ✓ Already completed!
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {/* Terms */}
        <div>
          <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Terms</div>
          {terms.map(({ id, term }) => {
            const isMatched = matched.has(id);
            const isSel = selectedTerm === id;
            const isWrong = wrongPair?.termId === id;
            return (
              <div key={id} onClick={() => !isMatched && handleTerm(id)}
                style={{
                  padding: "12px 16px", marginBottom: 8, borderRadius: 12, cursor: isMatched ? "default" : "pointer",
                  background: isMatched ? "rgba(0,229,160,.1)" : isWrong ? "rgba(239,68,68,.1)" : isSel ? "rgba(0,229,160,.2)" : "var(--surface2)",
                  border: `2px solid ${isMatched ? "rgba(0,229,160,.4)" : isWrong ? "#ef4444" : isSel ? "var(--accent)" : "var(--border)"}`,
                  fontSize: 13, fontWeight: 700,
                  color: isMatched ? "var(--accent)" : isWrong ? "#ef4444" : "var(--text)",
                  transition: "all .15s", opacity: isMatched ? .6 : 1,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                {term}
                {isMatched && <span style={{ fontSize: 14 }}>✓</span>}
              </div>
            );
          })}
        </div>

        {/* Definitions */}
        <div>
          <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Definitions</div>
          {shuffledDefs.map(({ id, definition }) => {
            const isMatched = matched.has(id);
            const isSel = selectedDef === id;
            const isWrong = wrongPair?.defId === id;
            return (
              <div key={id} onClick={() => !isMatched && handleDef(id)}
                style={{
                  padding: "12px 16px", marginBottom: 8, borderRadius: 12, cursor: isMatched ? "default" : "pointer",
                  background: isMatched ? "rgba(0,229,160,.1)" : isWrong ? "rgba(239,68,68,.1)" : isSel ? "rgba(0,229,160,.2)" : "var(--surface2)",
                  border: `2px solid ${isMatched ? "rgba(0,229,160,.4)" : isWrong ? "#ef4444" : isSel ? "var(--accent)" : "var(--border)"}`,
                  fontSize: 11, lineHeight: 1.5,
                  color: isMatched ? "var(--accent)" : isWrong ? "#ef4444" : "#cbd5e1",
                  transition: "all .15s", opacity: isMatched ? .6 : 1,
                }}>
                {definition}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: "#475569" }}>
        {matched.size}/{pairs.length} matched · Click a term, then its definition
      </div>
    </div>
  );
}
