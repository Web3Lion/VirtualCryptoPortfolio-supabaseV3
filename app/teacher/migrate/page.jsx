"use client";
import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// ── CSV Parser ────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n').filter(Boolean);
  return lines.map(line => {
    const cols = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; }
      else if (line[i] === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
      else cur += line[i];
    }
    cols.push(cur.trim());
    return cols;
  });
}

function cleanNum(s) {
  return parseFloat(String(s||'').replace(/[$,%\s]/g,'')) || 0;
}

function cleanDate(s) {
  const str = String(s||'').trim();
  if (!str) return null;
  // Handle formats: "02/27/2026 14:11", "3/27/2026", "4/10/2026"
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch {}
  return null;
}

// ── Badge name → badge_id mapping ────────────────────────────
const BADGE_MAP = {
  'First Trade':'first_trade','Active Trader':'active_trader','Power Trader':'power_trader',
  'Whale':'whale','Doubled Up':'doubled_up','Triple Threat':'triple_threat',
  'First Profit':'first_profit','10% Club':'ten_pct','Diamond Hands':'diamond_hands',
  'To The Moon':'to_the_moon','Portfolio Doubled':'portfolio_x2','Bought The Dip':'bought_dip',
  'Diversified':'diversified','Sharpshooter':'sharpshooter','Sniper':'sniper',
  'HODLer':'hodler','Stop Loss Pro':'stop_loss_pro','Bot Copycat':'bot_copycat',
  'Analyst':'analyst','Researcher':'researcher','Due Diligence':'due_diligence',
  'First Watch':'first_watch','Serious Watchman':'serious_watch','Experienced Watchman':'veteran_watch',
  'Bull Rider':'bull_rider','Flash Deal':'flash_deal','News Trader':'news_trader',
  'Crash Survivor':'crash_survivor','Sector Pro':'sector_pro','Sector Specialist':'sector_specialist',
  'Comeback Kid':'comeback_kid','Patient Investor':'patient_investor','Eager Investor':'eager_investor',
  'FOMO Investor':'fomo_investor','Class Champion':'champion','Most Improved':'most_improved',
  'Beat The Bot':'beat_the_bot','Fee Conscious':'fee_conscious',
};

// ── Parse student sheet CSV ───────────────────────────────────
function parseStudentSheet(csv, studentName, studentEmail) {
  const rows = parseCSV(csv);
  let cash = 0, feesPaid = 0;
  const holdings = [], trades = [], intradaySnaps = [], dailySnaps = [], badges = [];

  // ── Step 1: Find cash + fees from header rows ─────────────
  rows.slice(0, 20).forEach(row => {
    const label = String(row[0]||'').toLowerCase();
    if (label.includes('cash remaining'))  cash     = cleanNum(row[1]);
    if (label.includes('total fees paid')) feesPaid = cleanNum(row[1]);
  });

  // ── Step 2: Find header rows by scanning ALL columns ──────
  let holdingsHeaderRow = -1, tradeHeaderRow = -1;
  let intradayHeaderRow = -1, dailyHeaderRow = -1;

  rows.forEach((row, i) => {
    const rowStr = row.map(c => String(c||'').toLowerCase()).join(',');
    // Holdings header: has "coin" and "quantity" in first few cols
    if (holdingsHeaderRow < 0 && row[0] && String(row[0]).toLowerCase() === 'coin'
        && row.slice(0,5).some(c => String(c||'').toLowerCase().includes('quant'))) {
      holdingsHeaderRow = i;
    }
    // Trade header: has "date" and "action" and "coin" within cols 8-18
    if (tradeHeaderRow < 0) {
      const slice = row.slice(8, 20).map(c => String(c||'').toLowerCase());
      if ((slice.includes('action') || slice.includes('date/time')) && slice.includes('coin')) {
        tradeHeaderRow = i;
      }
    }
    // Intraday header: has "timestamp" and "portfolio value" around cols 18-21
    if (intradayHeaderRow < 0) {
      const slice = row.slice(16, 24).map(c => String(c||'').toLowerCase());
      if (slice.some(c => c.includes('timestamp'))) {
        intradayHeaderRow = i;
      }
    }
    // Daily header: has "date" and "daily" around cols 20-24
    if (dailyHeaderRow < 0 && intradayHeaderRow >= 0 && i > intradayHeaderRow) {
      const slice = row.slice(20, 26).map(c => String(c||'').toLowerCase());
      if (slice.some(c => c.includes('date')) && slice.some(c => c.includes('daily') || c.includes('avg'))) {
        dailyHeaderRow = i;
      }
    }
  });

  // ── Step 3: Parse holdings ────────────────────────────────
  if (holdingsHeaderRow >= 0) {
    for (let i = holdingsHeaderRow + 1; i < Math.min(holdingsHeaderRow + 50, rows.length); i++) {
      const row = rows[i];
      const coin = String(row[0]||'').trim().toUpperCase();
      if (!coin || coin === 'COIN' || coin === '') break;
      // Stop if we hit another section header
      if (coin.includes('TRADE') || coin.includes('📋') || coin.includes('LOG')) break;
      const qty = cleanNum(row[1]);
      const avg = cleanNum(row[2]);
      if (qty > 0 && coin.length <= 10) {
        holdings.push({ coin, quantity: qty, avgBuyPrice: avg });
      }
    }
  }

  // ── Step 4: Parse trade history ───────────────────────────
  // Trades are in cols 8-17: date, action, coin, qty, price, gross, fee, cashAfter, reasoning
  if (tradeHeaderRow >= 0) {
    // Find exact column positions from header
    const hdr = rows[tradeHeaderRow].map(c => String(c||'').toLowerCase());
    let dateCol=8, actionCol=9, coinCol=10, qtyCol=11, priceCol=12,
        grossCol=13, feeCol=14, cashCol=15, reasonCol=16;
    // Try to detect from header
    hdr.forEach((h, idx) => {
      if (idx < 8 || idx > 20) return;
      if (h.includes('date') || h.includes('time')) dateCol = idx;
      else if (h === 'action') actionCol = idx;
      else if (h === 'coin') coinCol = idx;
      else if (h.includes('quant')) qtyCol = idx;
      else if (h.includes('price') && !h.includes('current')) priceCol = idx;
      else if (h.includes('trade value') || h.includes('gross')) grossCol = idx;
      else if (h.includes('fee')) feeCol = idx;
      else if (h.includes('cash after')) cashCol = idx;
      else if (h.includes('reason')) reasonCol = idx;
    });

    for (let i = tradeHeaderRow + 1; i < rows.length; i++) {
      const row = rows[i];
      const dateStr = String(row[dateCol]||'').trim();
      const action  = String(row[actionCol]||'').trim().toUpperCase();
      const coin    = String(row[coinCol]||'').trim().toUpperCase();
      if (!dateStr || !['BUY','SELL'].includes(action) || !coin) continue;
      const dt = cleanDate(dateStr);
      if (!dt && !dateStr.match(/\d+\/\d+/)) continue;
      trades.push({
        date:       dt || new Date(dateStr).toISOString(),
        action,
        coin,
        quantity:   Math.abs(cleanNum(row[qtyCol])),
        price:      cleanNum(row[priceCol]),
        grossValue: Math.abs(cleanNum(row[grossCol])),
        fee:        Math.abs(cleanNum(row[feeCol])),
        cashAfter:  cleanNum(row[cashCol]),
        reasoning:  String(row[reasonCol]||'').trim(),
      });
    }
  }

  // ── Step 5: Parse snapshots ───────────────────────────────
  // Intraday: cols 18-19 (timestamp, value)
  // Daily: cols 20-21 (date, value)
  const intradayStart = intradayHeaderRow >= 0 ? intradayHeaderRow + 1 : 5;
  const dailyStart    = dailyHeaderRow    >= 0 ? dailyHeaderRow    + 1 : 5;

  rows.forEach((row, i) => {
    if (i < 5) return;
    if (intradayHeaderRow >= 0 && i <= intradayHeaderRow) return;
    // Intraday (cols 18-19)
    const ts  = String(row[18]||'').trim();
    const tv  = String(row[19]||'').trim();
    if (ts && tv && !ts.toLowerCase().includes('timestamp') && !ts.toLowerCase().includes('intraday') && !ts.toLowerCase().includes('portfolio')) {
      const val = cleanNum(tv);
      const dt  = cleanDate(ts);
      if (val > 0 && dt) intradaySnaps.push({ timestamp: dt, value: val, type: 'intraday' });
    }
    // Daily (cols 20-21)
    const ds = String(row[20]||'').trim();
    const dv = String(row[21]||'').trim();
    if (ds && dv && !ds.toLowerCase().includes('date') && !ds.toLowerCase().includes('daily')) {
      const val = cleanNum(dv);
      const dt  = cleanDate(ds);
      if (val > 0 && dt) dailySnaps.push({ timestamp: dt, value: val, type: 'daily' });
    }
  });

  // ── Step 6: Parse badges ──────────────────────────────────
  // Scan ALL columns for cells containing ✅ — badges can be anywhere
  const earnedBadgeSet = new Set();
  const badgeList = [];

  rows.forEach(row => {
    row.forEach((rawCell) => {
      const cell = String(rawCell||'').replace(/"/g,'').replace(/\t/g,' ').trim();
      // Check for ✅ BEFORE any emoji stripping (✅ is U+2705, inside emoji range)
      if (!cell.includes('\u2705') && !cell.includes('✅')) return;

      // Extract date - look for ✅ followed by date
      const dateMatch = cell.match(/[\u2705✅]\s*(\d+\/\d+(?:\/\d+)?)/);
      let earnedAt = null;
      if (dateMatch) {
        let d = dateMatch[1];
        if (d.split('/').length === 2) d += '/2026';
        try { earnedAt = new Date(d).toISOString(); } catch {}
      }
      if (!earnedAt) earnedAt = new Date().toISOString();

      // Extract badge name: first remove ✅ and date, then strip other emojis
      let name = cell
        .replace(/[\u2705✅].*$/m, '')  // remove ✅ and everything after on same line
        .replace(/[\u{1F000}-\u{1FFFF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+/gu, '')
        .split('\n')[0]
        .replace(/[""]/g, '')
        .trim();

      if (!name || name.length < 3) return;
      const badgeId = BADGE_MAP[name];
      if (!badgeId) return;
      if (earnedBadgeSet.has(badgeId)) return;
      earnedBadgeSet.add(badgeId);
      badgeList.push({ name, badgeId, earnedAt });
    });
  });

  return {
    name:      studentName,
    email:     studentEmail,
    cash,
    feesPaid,
    holdings,
    trades,
    snapshots: [...intradaySnaps, ...dailySnaps],
    badges:    badgeList,
  };
}

// ── Parse student list CSV ────────────────────────────────────
function parseStudentList(csv) {
  const rows = parseCSV(csv);
  const students = [];
  rows.forEach((row, i) => {
    if (i === 0) return;
    const name  = String(row[0]||'').trim();
    const email = String(row[1]||'').trim().toLowerCase();
    if (name && email && email.includes('@')) students.push({ name, email });
  });
  return students;
}

// ── Main Component ────────────────────────────────────────────
export default function MigratePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep]             = useState(1);
  const [classId, setClassId]       = useState(null);
  const [studentList, setStudentList] = useState([]);
  const [studentData, setStudentData] = useState({});
  const [currentStudent, setCurrentStudent] = useState(null);
  const [results, setResults]       = useState([]);
  const [migrating, setMigrating]   = useState(false);
  const [log, setLog]               = useState([]);
  const currentStudentRef           = useRef(null);
  currentStudentRef.current         = currentStudent;

  const addLog = (msg, type='info') => setLog(prev => [...prev, { msg, type, ts: new Date().toLocaleTimeString() }]);

  const createClass = async () => {
    setMigrating(true);
    addLog('Creating class "Pd 4_S2_2025-2026"...');
    const res  = await fetch('/api/migrate', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'create_class'}) });
    const data = await res.json();
    if (res.ok) { setClassId(data.classId); addLog(`✅ ${data.message}`, 'success'); setStep(2); }
    else addLog(`❌ ${data.error}`, 'error');
    setMigrating(false);
  };

  const handleStudentList = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const students = parseStudentList(ev.target.result);
      setStudentList(students);
      addLog(`✅ Loaded ${students.length} students: ${students.map(s=>s.name).join(', ')}`, 'success');
    };
    reader.readAsText(file);
  };

  const handleStudentSheet = (e) => {
    const file = e.target.files?.[0];
    const cs   = currentStudentRef.current;
    if (!file || !cs) { addLog('❌ No student selected', 'error'); return; }
    addLog(`Reading file for ${cs.name}...`);
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = parseStudentSheet(ev.target.result, cs.name, cs.email);
        setStudentData(prev => ({ ...prev, [cs.email]: parsed }));
        addLog(
          `✅ ${cs.name}: ${parsed.holdings.length} holdings · ${parsed.trades.length} trades · ` +
          `${parsed.snapshots.filter(s=>s.type==='intraday').length} intraday · ` +
          `${parsed.snapshots.filter(s=>s.type==='daily').length} daily · ` +
          `${parsed.badges.length} badges · Cash: $${parsed.cash?.toFixed(2)}`,
          'success'
        );
      } catch(err) { addLog(`❌ Parse error for ${cs.name}: ${err.message}`, 'error'); }
    };
    reader.onerror = () => addLog(`❌ Failed to read file`, 'error');
    reader.readAsText(file);
    e.target.value = '';
  };

  const migrateAll = async () => {
    if (!classId) return;
    setMigrating(true);
    const newResults = [];
    for (const student of studentList) {
      const data = studentData[student.email];
      if (!data) { addLog(`⚠️ Skipping ${student.name} — no sheet uploaded`, 'warn'); continue; }
      addLog(`Migrating ${student.name}...`);
      const res  = await fetch('/api/migrate', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'migrate_student', classId, student:data}) });
      const resp = await res.json();
      if (res.ok) { addLog(`✅ ${resp.message}`, 'success'); newResults.push({name:student.name,success:true}); }
      else        { addLog(`❌ ${student.name}: ${resp.error}`, 'error'); newResults.push({name:student.name,success:false,error:resp.error}); }
    }
    setResults(newResults);
    setMigrating(false);
    setStep(4);
  };

  if (status === 'loading') return <div style={{background:'var(--bg,#080c14)',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#475569'}}>Loading...</div>;

  const STEPS = ['1. Create Class','2. Student List','3. Upload Sheets','4. Done!'];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#080c14;--surface:#0f172a;--surface2:#1a2235;--border:#1e293b;--accent:#00e5a0;--text:#e2e8f0;--muted:#475569;--gold:#f59e0b;--down:#f43f5e}
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:860px;margin:0 auto;padding:24px 16px}
        .nav{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;margin-bottom:28px;background:var(--surface);border:1px solid var(--border);border-radius:16px}
        .logo{font-family:'Syne',sans-serif;font-weight:800;font-size:16px}.logo span{color:var(--accent)}
        .steps{display:flex;gap:8px;margin-bottom:28px;flex-wrap:wrap}
        .step{flex:1;min-width:100px;padding:10px;border-radius:12px;border:1px solid var(--border);text-align:center;font-size:11px;color:var(--muted)}
        .step.active{background:rgba(0,229,160,.1);color:var(--accent);border-color:rgba(0,229,160,.3)}
        .step.done{background:rgba(0,229,160,.05);color:var(--accent);border-color:rgba(0,229,160,.2)}
        .card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:24px;margin-bottom:20px}
        .card-title{font-family:'Syne',sans-serif;font-weight:700;font-size:17px;margin-bottom:16px;color:var(--text)}
        .upload-area{border:2px dashed var(--border);border-radius:12px;padding:28px;text-align:center;cursor:pointer;transition:all .2s;margin-bottom:14px}
        .upload-area:hover{border-color:var(--accent);background:rgba(0,229,160,.03)}
        .btn{padding:10px 20px;border-radius:12px;border:none;font-family:'DM Mono',monospace;font-size:12px;font-weight:500;cursor:pointer;transition:all .2s}
        .btn-primary{background:var(--accent);color:#000}.btn-primary:hover{background:#00ffb0}.btn-primary:disabled{opacity:.5;cursor:not-allowed}
        .btn-secondary{background:var(--surface2);color:var(--text);border:1px solid var(--border)}.btn-secondary:hover{border-color:var(--accent);color:var(--accent)}
        .student-pills{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
        .student-pill{padding:7px 14px;border-radius:20px;border:1px solid var(--border);background:var(--surface2);font-size:11px;color:var(--muted);cursor:pointer;transition:all .2s}
        .student-pill.active{background:rgba(0,229,160,.1);color:var(--accent);border-color:rgba(0,229,160,.3)}
        .student-pill.done{background:rgba(0,229,160,.05);color:var(--accent);border-color:rgba(0,229,160,.15)}
        .log{background:#0a0f1a;border:1px solid var(--border);border-radius:12px;padding:14px;max-height:280px;overflow-y:auto;font-size:11px;line-height:1.8;margin-top:16px}
        .log-info{color:var(--muted)}.log-success{color:var(--accent)}.log-error{color:var(--down)}.log-warn{color:var(--gold)}
        .result-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);color:var(--text)}
      `}</style>

      <div className="page">
        <nav className="nav">
          <div className="logo">CRYPTO<span>CLASS</span></div>
          <button onClick={()=>router.push('/teacher')} style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'6px 14px',color:'var(--text)',fontFamily:"'DM Mono',monospace",fontSize:11,cursor:'pointer'}}>
            ← Back to Teacher
          </button>
        </nav>

        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:28,letterSpacing:-1,marginBottom:4,color:'var(--text)'}}>
          📦 Migrate from <span style={{color:'var(--accent)'}}>Google Sheets</span>
        </div>
        <div style={{fontSize:11,color:'var(--muted)',marginBottom:24}}>Import existing class data into CryptoClassroom</div>

        <div className="steps">
          {STEPS.map((s,i)=><div key={i} className={`step ${step===i+1?'active':step>i+1?'done':''}`}>{step>i+1?'✓ ':''}{s}</div>)}
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="card">
            <div className="card-title">🎓 Create Migration Class</div>
            <div style={{background:'rgba(0,229,160,.06)',border:'1px solid rgba(0,229,160,.2)',borderRadius:12,padding:16,marginBottom:20}}>
              <div style={{fontSize:12,fontFamily:"'Syne',sans-serif",fontWeight:700,marginBottom:8,color:'var(--text)'}}>Pd 4_S2_2025-2026</div>
              <div style={{fontSize:11,color:'var(--muted)',lineHeight:1.8}}>Semester: S2 2025-2026 · Starting Cash: $10,000 · Trade Fee: 0.5%</div>
            </div>
            <button className="btn btn-primary" onClick={createClass} disabled={migrating}>
              {migrating ? 'Creating...' : 'Create Class & Continue →'}
            </button>
            {log.length > 0 && <div className="log">{log.map((l,i)=><div key={i} className={`log-${l.type}`}>[{l.ts}] {l.msg}</div>)}</div>}
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="card">
            <div className="card-title">👥 Upload Student List</div>
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:16,lineHeight:1.7}}>
              Export the student list tab as CSV. Format: <code style={{background:'var(--surface2)',padding:'1px 6px',borderRadius:4}}>Name, Email</code> with a header row.
            </div>
            <label className="upload-area">
              <div style={{fontSize:28,marginBottom:8}}>📋</div>
              <div style={{fontSize:13,fontWeight:600,marginBottom:4,color:'var(--text)'}}>Click to upload student list CSV</div>
              <div style={{fontSize:11,color:'var(--muted)'}}>name, email columns</div>
              <input type="file" accept=".csv" style={{display:'none'}} onChange={handleStudentList}/>
            </label>
            {studentList.length > 0 && (
              <>
                <div style={{fontSize:12,color:'var(--accent)',marginBottom:12}}>✅ {studentList.length} students loaded:</div>
                {studentList.map((s,i)=>(
                  <div key={i} style={{fontSize:12,padding:'6px 0',borderBottom:'1px solid var(--border)',color:'var(--text)'}}>
                    <span style={{fontWeight:600}}>{s.name}</span> <span style={{color:'var(--muted)'}}>{s.email}</span>
                  </div>
                ))}
                <div style={{height:16}}/>
                <button className="btn btn-primary" onClick={()=>setStep(3)}>Next: Upload Sheets →</button>
              </>
            )}
            {log.length > 0 && <div className="log">{log.map((l,i)=><div key={i} className={`log-${l.type}`}>[{l.ts}] {l.msg}</div>)}</div>}
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="card">
            <div className="card-title">📊 Upload Student Sheets</div>
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:16,lineHeight:1.7}}>
              Select a student then upload their individual tab as CSV.<br/>
              <strong style={{color:'var(--text)'}}>File → Download → CSV from current sheet</strong> in Google Sheets.
            </div>

            <div className="student-pills">
              {studentList.map(s=>(
                <div key={s.email}
                  className={`student-pill${currentStudent?.email===s.email?' active':''}${studentData[s.email]?' done':''}`}
                  onClick={()=>setCurrentStudent(s)}>
                  {studentData[s.email]?'✓ ':''}{s.name.split(' ')[0]}
                </div>
              ))}
            </div>

            {currentStudent && (
              <div style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:12,padding:16,marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:600,marginBottom:12,color:'var(--text)'}}>
                  Uploading sheet for: <span style={{color:'var(--accent)'}}>{currentStudent.name}</span>
                </div>
                <div className="upload-area" style={{marginBottom:0}} onClick={()=>document.getElementById('sheetInput').click()}>
                  <div style={{fontSize:24,marginBottom:6}}>📄</div>
                  <div style={{fontSize:12,fontWeight:600,marginBottom:2,color:'var(--text)'}}>Click to upload {currentStudent.name}'s CSV</div>
                  <div style={{fontSize:10,color:'var(--muted)'}}>Export their tab → File → Download → CSV</div>
                </div>
                <input id="sheetInput" type="file" accept=".csv" style={{display:'none'}} onChange={handleStudentSheet}/>
                {studentData[currentStudent.email] && (
                  <div style={{marginTop:10,fontSize:11,color:'var(--accent)'}}>
                    ✅ {studentData[currentStudent.email].trades.length} trades ·
                    {studentData[currentStudent.email].snapshots.filter(s=>s.type==='intraday').length} intraday ·
                    {studentData[currentStudent.email].snapshots.filter(s=>s.type==='daily').length} daily ·
                    {studentData[currentStudent.email].badges.length} badges ·
                    Cash: ${studentData[currentStudent.email].cash?.toFixed(2)}
                  </div>
                )}
              </div>
            )}

            <div style={{fontSize:11,color:'var(--muted)',marginBottom:16}}>
              {Object.keys(studentData).length} of {studentList.length} sheets uploaded
            </div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-secondary" onClick={()=>setStep(2)}>← Back</button>
              <button className="btn btn-primary" onClick={migrateAll} disabled={migrating||Object.keys(studentData).length===0}>
                {migrating?'Migrating...':`🚀 Migrate ${Object.keys(studentData).length} Students`}
              </button>
            </div>
            {log.length > 0 && <div className="log">{log.map((l,i)=><div key={i} className={`log-${l.type}`}>[{l.ts}] {l.msg}</div>)}</div>}
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <div className="card" style={{textAlign:'center',padding:'48px 28px'}}>
            <div style={{fontSize:64,marginBottom:16}}>🎉</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:28,marginBottom:16,color:'var(--text)'}}>Migration Complete!</div>
            {results.map((r,i)=>(
              <div key={i} className="result-row">
                <span style={{fontSize:18}}>{r.success?'✅':'❌'}</span>
                <span style={{fontSize:13,fontWeight:600}}>{r.name}</span>
                {r.error&&<span style={{fontSize:11,color:'var(--down)'}}>{r.error}</span>}
              </div>
            ))}
            {log.length > 0 && <div className="log" style={{textAlign:'left',marginTop:20}}>{log.map((l,i)=><div key={i} className={`log-${l.type}`}>[{l.ts}] {l.msg}</div>)}</div>}
            <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap',marginTop:24}}>
              <button className="btn btn-primary" onClick={()=>router.push('/teacher')} style={{fontSize:13,padding:'12px 24px'}}>
                Go to Teacher Dashboard →
              </button>
              <button className="btn btn-secondary" onClick={()=>router.push('/leaderboard')}>🏆 Leaderboard</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}