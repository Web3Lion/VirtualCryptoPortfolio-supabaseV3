"use client";
import { useState, useEffect, useRef } from "react";

// placed words come from JSON: { word, clue, row, col, dir:"across"|"down", number }
export default function CryptoCrossword({ config, onComplete, completed }) {
  const { placed = [], grid_size = 13 } = config;

  // Build correct answer grid
  const solution = Array.from({ length: grid_size }, () => Array(grid_size).fill(""));
  placed.forEach(({ word, row, col, dir }) => {
    for (let i = 0; i < word.length; i++) {
      const r = dir === "down" ? row + i : row;
      const c = dir === "across" ? col + i : col;
      solution[r][c] = word[i];
    }
  });

  // Number map: {r,c} -> number
  const numberMap = {};
  placed.forEach(({ row, col, number }) => { numberMap[`${row},${col}`] = number; });

  // Player input grid
  const [input, setInput] = useState(() =>
    Array.from({ length: grid_size }, () => Array(grid_size).fill(""))
  );
  const [activeCell, setActiveCell] = useState(null);
  const [activeDir, setActiveDir] = useState("across");
  const [solved, setSolved] = useState(new Set()); // solved word numbers
  const [showCongrats, setShowCongrats] = useState(false);
  const inputRefs = useRef({});

  const isBlack = (r, c) => solution[r][c] === "";

  // Check if a word is complete and correct
  function checkWords(newInput) {
    const nowSolved = new Set();
    placed.forEach(({ word, row, col, dir, number }) => {
      let ok = true;
      for (let i = 0; i < word.length; i++) {
        const r = dir === "down" ? row + i : row;
        const c = dir === "across" ? col + i : col;
        if ((newInput[r][c] || "").toUpperCase() !== word[i]) { ok = false; break; }
      }
      if (ok) nowSolved.add(number);
    });
    setSolved(nowSolved);
    if (nowSolved.size === placed.length && !completed) {
      setShowCongrats(true);
      setTimeout(() => onComplete && onComplete(), 1200);
    }
  }

  function handleCellClick(r, c) {
    if (isBlack(r, c)) return;
    if (activeCell?.r === r && activeCell?.c === c) {
      setActiveDir(d => d === "across" ? "down" : "across");
    } else {
      setActiveCell({ r, c });
    }
  }

  function handleKey(e, r, c) {
    const key = e.key.toUpperCase();
    if (key === "BACKSPACE") {
      e.preventDefault();
      const newInput = input.map(row => [...row]);
      if (input[r][c]) {
        newInput[r][c] = "";
        setInput(newInput);
        checkWords(newInput);
      } else {
        // Move back
        const pr = activeDir === "down" ? r - 1 : r;
        const pc = activeDir === "across" ? c - 1 : c;
        if (pr >= 0 && pc >= 0 && !isBlack(pr, pc)) {
          newInput[pr][pc] = "";
          setInput(newInput);
          setActiveCell({ r: pr, c: pc });
          inputRefs.current[`${pr},${pc}`]?.focus();
          checkWords(newInput);
        }
      }
      return;
    }
    if (key === "ARROWRIGHT") { const nc = c + 1; if (nc < grid_size && !isBlack(r, nc)) { setActiveCell({ r, c: nc }); setActiveDir("across"); } return; }
    if (key === "ARROWLEFT")  { const nc = c - 1; if (nc >= 0 && !isBlack(r, nc)) { setActiveCell({ r, c: nc }); setActiveDir("across"); } return; }
    if (key === "ARROWDOWN")  { const nr = r + 1; if (nr < grid_size && !isBlack(nr, c)) { setActiveCell({ r: nr, c }); setActiveDir("down"); } return; }
    if (key === "ARROWUP")    { const nr = r - 1; if (nr >= 0 && !isBlack(nr, c)) { setActiveCell({ r: nr, c }); setActiveDir("down"); } return; }
    if (!/^[A-Z]$/.test(key)) return;
    e.preventDefault();
    const newInput = input.map(row => [...row]);
    newInput[r][c] = key;
    setInput(newInput);
    checkWords(newInput);
    // Advance cursor
    const nr = activeDir === "down" ? r + 1 : r;
    const nc = activeDir === "across" ? c + 1 : c;
    if (nr < grid_size && nc < grid_size && !isBlack(nr, nc)) {
      setActiveCell({ r: nr, c: nc });
      setTimeout(() => inputRefs.current[`${nr},${nc}`]?.focus(), 0);
    }
  }

  // Active word highlighting
  const activeWord = activeCell ? placed.find(p => {
    if (p.dir !== activeDir) return false;
    if (activeDir === "across") return p.row === activeCell.r && activeCell.c >= p.col && activeCell.c < p.col + p.word.length;
    return p.col === activeCell.c && activeCell.r >= p.row && activeCell.r < p.row + p.word.length;
  }) : null;
  const activeWordCells = new Set();
  if (activeWord) {
    for (let i = 0; i < activeWord.word.length; i++) {
      const r = activeWord.dir === "down" ? activeWord.row + i : activeWord.row;
      const c = activeWord.dir === "across" ? activeWord.col + i : activeWord.col;
      activeWordCells.add(`${r},${c}`);
    }
  }

  const solvedCells = new Set();
  placed.filter(p => solved.has(p.number)).forEach(({ word, row, col, dir }) => {
    for (let i = 0; i < word.length; i++) {
      const r = dir === "down" ? row + i : row;
      const c = dir === "across" ? col + i : col;
      solvedCells.add(`${r},${c}`);
    }
  });

  const across = placed.filter(p => p.dir === "across").sort((a, b) => a.number - b.number);
  const down   = placed.filter(p => p.dir === "down").sort((a, b) => a.number - b.number);

  const CELL = 36;

  return (
    <div style={{ fontFamily: "'DM Mono',monospace" }}>
      {showCongrats && (
        <div style={{ background: "rgba(0,229,160,.15)", border: "2px solid var(--accent)", borderRadius: 16, padding: "16px 24px", textAlign: "center", marginBottom: 16, animation: "fadeIn .4s" }}>
          <div style={{ fontSize: 32 }}>🎉</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: "var(--accent)" }}>Crossword Complete!</div>
        </div>
      )}
      {completed && !showCongrats && (
        <div style={{ background: "rgba(0,229,160,.1)", border: "1px solid rgba(0,229,160,.3)", borderRadius: 12, padding: "10px 16px", fontSize: 12, color: "var(--accent)", marginBottom: 12 }}>
          ✓ Already completed — great job!
        </div>
      )}

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* Grid */}
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${grid_size}, ${CELL}px)`, gap: 2, width: "fit-content" }}>
            {Array.from({ length: grid_size }, (_, r) =>
              Array.from({ length: grid_size }, (_, c) => {
                const key = `${r},${c}`;
                const black = isBlack(r, c);
                const isActive = activeCell?.r === r && activeCell?.c === c;
                const isWordActive = activeWordCells.has(key);
                const isSolved = solvedCells.has(key);
                const num = numberMap[key];
                const val = input[r][c] || "";
                const isWrong = val && !isSolved && val.toUpperCase() !== solution[r][c];

                return (
                  <div key={key} style={{ width: CELL, height: CELL, position: "relative",
                    background: black ? "#000" : isSolved ? "rgba(0,229,160,.2)" : isActive ? "rgba(0,229,160,.4)" : isWordActive ? "rgba(0,229,160,.12)" : "var(--surface2)",
                    border: black ? "none" : `1px solid ${isActive ? "var(--accent)" : "#2d3748"}`,
                    borderRadius: 3, cursor: black ? "default" : "pointer",
                  }} onClick={() => !black && handleCellClick(r, c)}>
                    {num && !black && (
                      <span style={{ position: "absolute", top: 1, left: 2, fontSize: 8, color: "var(--muted)", lineHeight: 1, pointerEvents: "none" }}>{num}</span>
                    )}
                    {!black && (
                      <input
                        ref={el => { inputRefs.current[key] = el; }}
                        maxLength={1}
                        value={val}
                        readOnly
                        onKeyDown={e => handleKey(e, r, c)}
                        onFocus={() => handleCellClick(r, c)}
                        style={{
                          position: "absolute", inset: 0, width: "100%", height: "100%",
                          background: "transparent", border: "none", outline: "none",
                          textAlign: "center", fontSize: 14, fontWeight: 800, textTransform: "uppercase",
                          color: isSolved ? "var(--accent)" : isWrong ? "#ef4444" : "var(--text)",
                          cursor: "pointer", caretColor: "transparent",
                          paddingTop: num ? 8 : 0,
                          fontFamily: "'DM Mono',monospace",
                        }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Clues */}
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Across</div>
          {across.map(p => (
            <div key={p.number} style={{ display: "flex", gap: 6, marginBottom: 8, opacity: solved.has(p.number) ? .45 : 1 }}>
              <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, minWidth: 16 }}>{p.number}.</span>
              <span style={{ fontSize: 11, color: solved.has(p.number) ? "var(--muted)" : "var(--muted)", lineHeight: 1.5 }}>{p.clue}</span>
              {solved.has(p.number) && <span style={{ fontSize: 11, color: "var(--accent)" }}>✓</span>}
            </div>
          ))}
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", margin: "14px 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>Down</div>
          {down.map(p => (
            <div key={p.number} style={{ display: "flex", gap: 6, marginBottom: 8, opacity: solved.has(p.number) ? .45 : 1 }}>
              <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, minWidth: 16 }}>{p.number}.</span>
              <span style={{ fontSize: 11, color: solved.has(p.number) ? "var(--muted)" : "var(--muted)", lineHeight: 1.5 }}>{p.clue}</span>
              {solved.has(p.number) && <span style={{ fontSize: 11, color: "var(--accent)" }}>✓</span>}
            </div>
          ))}
          <div style={{ marginTop: 12, fontSize: 11, color: "var(--muted)" }}>{solved.size}/{placed.length} words solved</div>
        </div>
      </div>
      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 10 }}>Click a cell to select · Click again to switch direction · Type to fill</div>
    </div>
  );
}
