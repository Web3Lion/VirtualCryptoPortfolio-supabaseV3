"use client";
import { useState, useEffect, useCallback } from "react";

export default function TrueFalse({ config, onComplete, completed }) {
  const statements = config?.statements || [];
  const [idx, setIdx]           = useState(0);
  const [timeLeft, setTimeLeft] = useState(7);
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | null
  const [score, setScore]       = useState(0);
  const [done, setDone]         = useState(false);
  const [answering, setAnswering] = useState(false);

  const advance = useCallback((wasCorrect) => {
    setAnswering(true);
    setFeedback(wasCorrect ? 'correct' : 'wrong');
    if (wasCorrect) setScore(s => s + 1);
    setTimeout(() => {
      setFeedback(null);
      setAnswering(false);
      if (idx + 1 >= statements.length) {
        setDone(true);
      } else {
        setIdx(i => i + 1);
        setTimeLeft(7);
      }
    }, 900);
  }, [idx, statements.length]);

  useEffect(() => {
    if (done || answering || !statements.length) return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { advance(false); return 7; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [idx, answering, done, advance, statements.length]);

  useEffect(() => {
    if (done && !completed) onComplete?.();
  }, [done, completed, onComplete]);

  const stmt = statements[idx];
  const pct  = (timeLeft / 7) * 100;
  const timerColor = timeLeft > 4 ? '#00e5a0' : timeLeft > 2 ? '#f59e0b' : '#ef4444';

  if (!statements.length) return (
    <div style={{ textAlign: 'center', color: '#475569', padding: 32 }}>No statements configured for this game.</div>
  );

  if (done) {
    const pct = Math.round((score / statements.length) * 100);
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>{pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '📚'}</div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 24, color: 'var(--accent)', marginBottom: 6 }}>
          {score}/{statements.length} Correct
        </div>
        <div style={{ fontSize: 13, color: '#94a3b8' }}>{pct >= 80 ? 'Excellent!' : pct >= 50 ? 'Not bad — keep studying!' : 'Review the material and try again.'}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 0' }}>
      <style>{`
        @keyframes tf-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
        @keyframes tf-pop{0%{transform:scale(1)}50%{transform:scale(1.04)}100%{transform:scale(1)}}
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#475569', letterSpacing: 1 }}>QUESTION {idx + 1} / {statements.length}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 80, height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: timerColor, borderRadius: 3, transition: 'width .9s linear, background .3s' }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: timerColor, minWidth: 16, textAlign: 'right' }}>{timeLeft}</div>
        </div>
      </div>

      {/* Statement */}
      <div style={{
        background: feedback === 'correct' ? 'rgba(0,229,160,.12)' : feedback === 'wrong' ? 'rgba(239,68,68,.1)' : 'var(--surface2)',
        border: `1px solid ${feedback === 'correct' ? 'rgba(0,229,160,.4)' : feedback === 'wrong' ? 'rgba(239,68,68,.35)' : 'var(--border)'}`,
        borderRadius: 16, padding: '28px 24px', marginBottom: 24, minHeight: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 500, lineHeight: 1.6, color: 'var(--text)', textAlign: 'center',
        animation: feedback === 'wrong' ? 'tf-shake .4s ease' : feedback === 'correct' ? 'tf-pop .3s ease' : 'none',
        transition: 'background .2s, border-color .2s',
      }}>
        {feedback === 'correct' ? '✅ ' : feedback === 'wrong' ? '❌ ' : ''}{stmt?.text}
      </div>

      {/* Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { val: true,  label: '✓  TRUE',  color: '#00e5a0', bg: 'rgba(0,229,160,.12)' },
          { val: false, label: '✗  FALSE', color: '#f43f5e', bg: 'rgba(244,63,94,.1)' },
        ].map(({ val, label, color, bg }) => (
          <button key={String(val)}
            disabled={answering}
            onClick={() => advance(stmt?.answer === val)}
            style={{
              padding: '20px 0', borderRadius: 14, border: `2px solid ${color}`,
              background: answering ? 'var(--surface2)' : bg,
              color: answering ? '#475569' : color,
              fontSize: 15, fontWeight: 800, fontFamily: "'Syne',sans-serif",
              cursor: answering ? 'not-allowed' : 'pointer',
              transition: 'all .15s', letterSpacing: 1,
            }}
          >{label}</button>
        ))}
      </div>

      {/* Score tracker */}
      <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: '#475569' }}>
        Score: {score} / {idx} correct so far
      </div>
    </div>
  );
}
