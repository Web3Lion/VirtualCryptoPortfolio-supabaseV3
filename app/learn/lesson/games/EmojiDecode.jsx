"use client";
import { useState } from "react";

export default function EmojiDecode({ config, onComplete, completed }) {
  const { items = [] } = config;

  const [inputs, setInputs]   = useState(Array(items.length).fill(""));
  const [revealed, setRevealed] = useState(Array(items.length).fill(false));
  const [checked, setChecked] = useState(Array(items.length).fill(false));
  const [correct, setCorrect] = useState(Array(items.length).fill(false));
  const [done, setDone]       = useState(false);

  function check(i) {
    const val = inputs[i].trim().toUpperCase().replace(/\s+/g, " ");
    const ans = items[i].term.toUpperCase().trim();
    const isCorrect = val === ans;
    const newCorrect  = [...correct];  newCorrect[i] = isCorrect;
    const newChecked  = [...checked];  newChecked[i] = true;
    setCorrect(newCorrect);
    setChecked(newChecked);
    if (newCorrect.filter(Boolean).length === items.length && !done && !completed) {
      setDone(true);
      setTimeout(() => onComplete && onComplete(), 800);
    }
  }

  function reveal(i) {
    const newRevealed = [...revealed]; newRevealed[i] = true;
    setRevealed(newRevealed);
    const newInputs = [...inputs]; newInputs[i] = items[i].term;
    setInputs(newInputs);
    const newCorrect = [...correct]; newCorrect[i] = true;
    const newChecked = [...checked]; newChecked[i] = true;
    setCorrect(newCorrect);
    setChecked(newChecked);
  }

  function handleKey(e, i) {
    if (e.key === "Enter") check(i);
  }

  const solvedCount = correct.filter(Boolean).length;

  return (
    <div style={{ fontFamily: "'DM Mono',monospace" }}>
      {(done || (completed && solvedCount === 0)) && (
        <div style={{ background: "rgba(0,229,160,.15)", border: "2px solid var(--accent)", borderRadius: 16, padding: "16px 24px", textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 32 }}>🎉</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: "var(--accent)" }}>
            {completed ? "Already completed!" : "All decoded!"}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 12, fontSize: 11, color: "#94a3b8" }}>
        Each emoji combo represents a crypto term. Type what you think it means!
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        {items.map(({ emoji, hint }, i) => {
          const isDone = checked[i] && correct[i];
          const isWrong = checked[i] && !correct[i];
          return (
            <div key={i} style={{
              background: isDone ? "rgba(0,229,160,.08)" : "var(--surface2)",
              border: `1px solid ${isDone ? "rgba(0,229,160,.35)" : isWrong ? "rgba(239,68,68,.3)" : "var(--border)"}`,
              borderRadius: 16, padding: "16px 20px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ fontSize: 36, minWidth: 60 }}>{emoji}</div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input
                      value={inputs[i]}
                      disabled={isDone}
                      onChange={e => {
                        const newInputs = [...inputs]; newInputs[i] = e.target.value; setInputs(newInputs);
                        const newChecked = [...checked]; newChecked[i] = false; setChecked(newChecked);
                      }}
                      onKeyDown={e => handleKey(e, i)}
                      placeholder="Type the crypto term…"
                      style={{
                        flex: 1, background: "var(--bg)", border: `1px solid ${isDone ? "rgba(0,229,160,.4)" : "var(--border)"}`,
                        borderRadius: 8, padding: "8px 12px", color: isDone ? "var(--accent)" : "var(--text)",
                        fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: isDone ? 700 : 400,
                        outline: "none",
                      }}
                    />
                    {!isDone && (
                      <button onClick={() => check(i)} style={{
                        padding: "8px 14px", borderRadius: 8, border: "none", background: "var(--accent)",
                        color: "#000", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Mono',monospace",
                      }}>Check</button>
                    )}
                    {isDone && <span style={{ fontSize: 20, color: "var(--accent)", alignSelf: "center" }}>✓</span>}
                  </div>

                  {isWrong && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "#ef4444" }}>Not quite — try again!</span>
                      <button onClick={() => reveal(i)} style={{
                        fontSize: 10, padding: "4px 10px", border: "1px solid #475569", borderRadius: 6,
                        background: "transparent", color: "#475569", cursor: "pointer", fontFamily: "'DM Mono',monospace",
                      }}>Reveal answer</button>
                    </div>
                  )}
                  {!checked[i] && hint && (
                    <div style={{ fontSize: 10, color: "#475569" }}>Hint: {hint}</div>
                  )}
                  {isDone && (
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{items[i].definition}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 14, fontSize: 11, color: "#475569" }}>
        {solvedCount}/{items.length} decoded · Press Enter or click Check to submit each answer
      </div>
    </div>
  );
}
