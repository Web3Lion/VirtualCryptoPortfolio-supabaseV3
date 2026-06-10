"use client";
import { useState, useEffect, useCallback } from "react";

const COLORS = ['#00e5a0','#3b82f6','#f59e0b','#f43f5e','#8b5cf6','#fb923c'];

export default function SpeedRound({ config, onComplete, completed }) {
  const questions = config?.questions || [];
  const TIME_LIMIT = config?.timePerQuestion || 10;

  const [idx, setIdx]           = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [chosen, setChosen]     = useState(null);
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | null
  const [points, setPoints]     = useState(0);
  const [done, setDone]         = useState(false);
  const [waiting, setWaiting]   = useState(false);

  const MAX_POINTS = questions.length * 3;

  const advance = useCallback((pickedIdx) => {
    setWaiting(true);
    const q = questions[idx];
    const correct = pickedIdx === q.correct;
    const speedBonus = Math.ceil(timeLeft / TIME_LIMIT * 2);
    const earned = correct ? 1 + speedBonus : 0;
    setChosen(pickedIdx);
    setFeedback(correct ? 'correct' : 'wrong');
    if (correct) setPoints(p => p + earned);

    setTimeout(() => {
      setFeedback(null);
      setChosen(null);
      setWaiting(false);
      if (idx + 1 >= questions.length) {
        setDone(true);
      } else {
        setIdx(i => i + 1);
        setTimeLeft(TIME_LIMIT);
      }
    }, 1000);
  }, [idx, questions, timeLeft, TIME_LIMIT]);

  useEffect(() => {
    if (done || waiting || !questions.length) return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { advance(-1); return TIME_LIMIT; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [idx, waiting, done, advance, questions.length, TIME_LIMIT]);

  useEffect(() => {
    if (done && !completed) onComplete?.();
  }, [done, completed, onComplete]);

  if (!questions.length) return (
    <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No questions configured for this Speed Round.</div>
  );

  if (done) {
    const pct = Math.round((points / Math.max(MAX_POINTS, 1)) * 100);
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>{pct >= 70 ? '⚡' : pct >= 40 ? '💨' : '🐢'}</div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, color: 'var(--accent)', marginBottom: 4 }}>{points} pts</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>out of {MAX_POINTS} possible</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Speed bonus included — faster answers = more points</div>
      </div>
    );
  }

  const q = questions[idx];
  const timerPct = (timeLeft / TIME_LIMIT) * 100;
  const timerColor = timerPct > 50 ? '#00e5a0' : timerPct > 25 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ padding: '8px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 1 }}>{idx + 1} / {questions.length}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>⚡ {points} pts</div>
          <div style={{ width: 100, height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${timerPct}%`, height: '100%', background: timerColor, borderRadius: 3, transition: `width 1s linear, background .3s` }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: timerColor, minWidth: 20, textAlign: 'right' }}>{timeLeft}</div>
        </div>
      </div>

      {/* Question */}
      <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 20px', marginBottom: 16, fontSize: 15, fontWeight: 500, color: 'var(--text)', lineHeight: 1.6, textAlign: 'center', minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {q.q}
      </div>

      {/* Options */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {(q.options || []).map((opt, i) => {
          const isChosen  = chosen === i;
          const isCorrect = i === q.correct;
          const showResult = feedback !== null;
          const bg = showResult
            ? isCorrect ? 'rgba(0,229,160,.2)' : isChosen ? 'rgba(239,68,68,.15)' : 'var(--surface2)'
            : 'var(--surface2)';
          const borderColor = showResult
            ? isCorrect ? '#00e5a0' : isChosen ? '#ef4444' : 'var(--border)'
            : 'var(--border)';
          const accent = COLORS[i % COLORS.length];

          return (
            <button key={i}
              disabled={waiting}
              onClick={() => advance(i)}
              style={{
                padding: '14px 12px', borderRadius: 12, border: `1px solid ${borderColor}`,
                background: bg, color: showResult && isCorrect ? '#00e5a0' : 'var(--text)',
                fontSize: 13, fontWeight: 500, cursor: waiting ? 'not-allowed' : 'pointer',
                transition: 'all .15s', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <span style={{ width: 22, height: 22, borderRadius: 6, background: accent + '22', border: `1px solid ${accent}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: accent, flexShrink: 0 }}>
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      <div style={{ textAlign: 'center', marginTop: 12, fontSize: 10, color: 'var(--border)' }}>
        Faster answers earn bonus points — max {MAX_POINTS} total
      </div>
    </div>
  );
}
