"use client";
import { useState, useMemo } from "react";

const DIRS = [[0,1],[1,0],[0,-1],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
const SIZE = 14;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function buildGrid(words) {
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(""));
  const placed = [];

  for (const { word } of words) {
    const w = word.replace(/\s/g, "").toUpperCase();
    let attempts = 0;
    while (attempts < 200) {
      attempts++;
      const [dr, dc] = DIRS[Math.floor(Math.random() * 4)]; // horizontal/vertical only for readability
      const r0 = Math.floor(Math.random() * SIZE);
      const c0 = Math.floor(Math.random() * SIZE);
      const r1 = r0 + dr * (w.length - 1);
      const c1 = c0 + dc * (w.length - 1);
      if (r1 < 0 || r1 >= SIZE || c1 < 0 || c1 >= SIZE) continue;
      let ok = true;
      for (let i = 0; i < w.length; i++) {
        const cell = grid[r0 + dr * i][c0 + dc * i];
        if (cell && cell !== w[i]) { ok = false; break; }
      }
      if (!ok) continue;
      for (let i = 0; i < w.length; i++) grid[r0 + dr * i][c0 + dc * i] = w[i];
      placed.push({ word: w, r0, c0, dr, dc });
      break;
    }
  }

  // Fill empty cells with random letters
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (!grid[r][c]) grid[r][c] = ALPHABET[Math.floor(Math.random() * 26)];

  return { grid, placed };
}

function cellsForWord({ word, r0, c0, dr, dc }) {
  return Array.from({ length: word.length }, (_, i) => `${r0 + dr * i},${c0 + dc * i}`);
}

export default function WordSearch({ config, onComplete, completed }) {
  const { words = [] } = config;
  const { grid, placed } = useMemo(() => buildGrid(words), []);

  const [start, setStart] = useState(null);
  const [hover, setHover] = useState(null);
  const [found, setFound] = useState(new Set()); // found word strings
  const [foundCells, setFoundCells] = useState(new Set());
  const [wrongFlash, setWrongFlash] = useState(false);

  function getCellsBetween(a, b) {
    if (!a || !b) return [];
    const dr = Math.sign(b.r - a.r);
    const dc = Math.sign(b.c - a.c);
    const len = Math.max(Math.abs(b.r - a.r), Math.abs(b.c - a.c)) + 1;
    return Array.from({ length: len }, (_, i) => ({ r: a.r + dr * i, c: a.c + dc * i }));
  }

  function handleClick(r, c) {
    if (!start) { setStart({ r, c }); return; }
    if (start.r === r && start.c === c) { setStart(null); setHover(null); return; }

    const selection = getCellsBetween(start, { r, c });
    const selWord = selection.map(({ r, c }) => grid[r][c]).join("");
    const selKey = selection.map(({ r, c }) => `${r},${c}`).join("|");

    // Check forward and backward
    let match = placed.find(p => {
      const pcells = cellsForWord(p);
      const pkey = pcells.join("|");
      const pkeyRev = [...pcells].reverse().join("|");
      return pkey === selKey || pkeyRev === selKey;
    });

    if (match) {
      const newFound = new Set(found);
      newFound.add(match.word);
      const newFoundCells = new Set(foundCells);
      cellsForWord(match).forEach(k => newFoundCells.add(k));
      setFound(newFound);
      setFoundCells(newFoundCells);
      if (newFound.size === placed.length && !completed) {
        setTimeout(() => onComplete && onComplete(), 800);
      }
    } else {
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 400);
    }
    setStart(null);
    setHover(null);
  }

  const previewCells = new Set(
    start && hover ? getCellsBetween(start, hover).map(({ r, c }) => `${r},${c}`) : []
  );
  const startKey = start ? `${start.r},${start.c}` : null;

  const CELL = 28;

  return (
    <div style={{ fontFamily: "'DM Mono',monospace" }}>
      {completed && (
        <div style={{ background: "rgba(0,229,160,.1)", border: "1px solid rgba(0,229,160,.3)", borderRadius: 12, padding: "10px 16px", fontSize: 12, color: "var(--accent)", marginBottom: 12 }}>
          ✓ Already completed — you found them all!
        </div>
      )}
      {found.size === placed.length && !completed && (
        <div style={{ background: "rgba(0,229,160,.15)", border: "2px solid var(--accent)", borderRadius: 16, padding: "16px 24px", textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 32 }}>🎉</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: "var(--accent)" }}>All words found!</div>
        </div>
      )}

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* Grid */}
        <div style={{ overflowX: "auto" }}>
          <div style={{
            display: "grid", gridTemplateColumns: `repeat(${SIZE}, ${CELL}px)`,
            gap: 2, width: "fit-content",
            outline: wrongFlash ? "2px solid #ef4444" : "none", borderRadius: 8, transition: "outline .2s"
          }}>
            {Array.from({ length: SIZE }, (_, r) =>
              Array.from({ length: SIZE }, (_, c) => {
                const key = `${r},${c}`;
                const isFound = foundCells.has(key);
                const isPreview = previewCells.has(key);
                const isStart = startKey === key;
                return (
                  <div key={key}
                    style={{
                      width: CELL, height: CELL, display: "flex", alignItems: "center", justifyContent: "center",
                      borderRadius: 5, cursor: "pointer", fontSize: 13, fontWeight: 700, userSelect: "none",
                      background: isFound ? "rgba(0,229,160,.25)" : isStart ? "rgba(0,229,160,.5)" : isPreview ? "rgba(0,229,160,.15)" : "var(--surface2)",
                      color: isFound ? "var(--accent)" : "var(--text)",
                      border: `1px solid ${isFound ? "rgba(0,229,160,.4)" : isStart || isPreview ? "var(--accent)" : "#2d3748"}`,
                      transition: "background .1s",
                    }}
                    onClick={() => handleClick(r, c)}
                    onMouseEnter={() => start && setHover({ r, c })}
                    onMouseLeave={() => setHover(null)}
                  >
                    {grid[r][c]}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Word list */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Find these words</div>
          {words.map(({ word, definition }) => {
            const w = word.replace(/\s/g, "").toUpperCase();
            const isFound = found.has(w);
            return (
              <div key={word} style={{ display: "flex", flexDirection: "column", marginBottom: 10, opacity: isFound ? .5 : 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: isFound ? "var(--accent)" : "var(--text)", textDecoration: isFound ? "line-through" : "none" }}>
                    {word}
                  </span>
                  {isFound && <span style={{ color: "var(--accent)", fontSize: 14 }}>✓</span>}
                </div>
                <span style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.4, maxWidth: 180 }}>{definition}</span>
              </div>
            );
          })}
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)" }}>{found.size}/{placed.length} found</div>
        </div>
      </div>
      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 10 }}>Click a letter to start · Click another to select the word</div>
    </div>
  );
}
