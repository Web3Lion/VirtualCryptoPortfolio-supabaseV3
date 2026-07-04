"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { applyTheme, getTheme } from "@/lib/theme";
import CoinPicker from "@/components/CoinPicker";

export default function ClassSetup() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep]             = useState(1);
  const [classData, setClassData]   = useState({ name: "", semester: "", seedMoney: 10000, tradeFee: 0.5 });
  const [createdClass, setCreatedClass] = useState(null);
  const [coins, setCoins]           = useState([]);
  const [selectedCoins, setSelectedCoins] = useState([]);
  const [loadingCoins, setLoadingCoins] = useState(false);
  const [students, setStudents]     = useState([]);
  const [newName, setNewName]       = useState("");
  const [newEmail, setNewEmail]     = useState("");
  const [statusMsg, setStatusMsg]   = useState(null);
  const [saving, setSaving]         = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);

  useEffect(() => { applyTheme(getTheme()); }, []);
  useEffect(() => { if (status === "unauthenticated") router.replace("/"); }, [status, router]);

  const fetchCoins = async () => {
    setLoadingCoins(true);
    try {
      const res = await fetch("/api/coins?source=coingecko");
      if (res.ok) setCoins(await res.json());
    } catch {}
    setLoadingCoins(false);
  };

  const createClass = async () => {
    if (!classData.name) { setStatusMsg({ type: "error", msg: "Class name is required" }); return; }
    setSaving(true);
    setStatusMsg({ type: "pending", msg: "Creating class..." });
    const res = await fetch("/api/classes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...classData, tradeFee: classData.tradeFee / 100 }),
    });
    const data = await res.json();
    if (res.ok) { setCreatedClass(data); setStatusMsg(null); setStep(2); fetchCoins(); }
    else setStatusMsg({ type: "error", msg: data.error || "Failed to create class" });
    setSaving(false);
  };

  const saveCoins = async () => {
    if (selectedCoins.length < 3) { setStatusMsg({ type: "error", msg: "Select at least 3 coins" }); return; }
    setSaving(true);
    setStatusMsg({ type: "pending", msg: "Saving coins..." });
    const res = await fetch("/api/coins", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: createdClass.id, coins: selectedCoins.map(c => ({ symbol: c.symbol, geckoId: c.geckoId, name: c.name, sector: c.sector })) }),
    });
    if (res.ok) { setStatusMsg(null); setStep(3); }
    else setStatusMsg({ type: "error", msg: "Failed to save coins" });
    setSaving(false);
  };

  const addStudent = async () => {
    if (!newName || !newEmail) { setStatusMsg({ type: "error", msg: "Name and Google email required" }); return; }
    if (!newEmail.includes("@")) { setStatusMsg({ type: "error", msg: "Enter a valid email address" }); return; }
    if (students.find(s => s.email === newEmail.toLowerCase())) { setStatusMsg({ type: "error", msg: "Already added" }); return; }
    setAddingStudent(true);
    setStatusMsg({ type: "pending", msg: `Registering ${newName}...` });
    const res = await fetch("/api/teacher/add-student", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), email: newEmail.trim().toLowerCase(), classId: createdClass.id }),
    });
    const data = await res.json();
    if (res.ok) {
      setStudents(prev => [...prev, { name: newName.trim(), email: newEmail.trim().toLowerCase(), id: data.studentId }]);
      setNewName(""); setNewEmail("");
      setStatusMsg({ type: "success", msg: `✅ ${newName} registered — can sign in now!` });
      setTimeout(() => setStatusMsg(null), 3000);
    } else setStatusMsg({ type: "error", msg: data.error || "Failed" });
    setAddingStudent(false);
  };

  const handleCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const lines = ev.target.result.split("\n").filter(Boolean);
      const toAdd = [];
      lines.forEach((line, i) => {
        if (i === 0 && line.toLowerCase().includes("name")) return;
        const parts = line.split(",").map(p => p.trim().replace(/"/g, ""));
        if (parts.length >= 2 && parts[0] && parts[1]?.includes("@")) {
          if (!students.find(s => s.email === parts[1].toLowerCase()))
            toAdd.push({ name: parts[0], email: parts[1].toLowerCase() });
        }
      });
      if (!toAdd.length) { setStatusMsg({ type: "error", msg: "No new students found in CSV" }); return; }
      setStatusMsg({ type: "pending", msg: `Registering ${toAdd.length} students...` });
      let added = 0, failed = 0;
      for (const s of toAdd) {
        const res = await fetch("/api/teacher/add-student", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: s.name, email: s.email, classId: createdClass.id }),
        });
        if (res.ok) { const d = await res.json(); setStudents(prev => [...prev, { ...s, id: d.studentId }]); added++; }
        else failed++;
      }
      setStatusMsg({ type: "success", msg: `✅ ${added} students registered${failed ? `, ${failed} failed` : ""}!` });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const toggleCoin = (coin) => setSelectedCoins(prev => prev.some(c => c.symbol === coin.symbol) ? prev.filter(c => c.symbol !== coin.symbol) : [...prev, coin]);

  const STEPS = ["1. Class Info", "2. Select Coins", "3. Add Students", "4. Launch!"];
  if (status === "loading") return <div style={{ background: "var(--bg,#080c14)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>Loading...</div>;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
        .page{max-width:1200px;margin:0 auto;padding:24px 16px}
        .nav{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;margin-bottom:28px;background:var(--surface);border:1px solid var(--border);border-radius:16px}
        .logo{font-family:'Syne',sans-serif;font-weight:800;font-size:16px}.logo span{color:var(--accent)}
        .steps{display:flex;gap:8px;margin-bottom:32px;flex-wrap:wrap}
        .step{flex:1;min-width:120px;padding:10px;border-radius:12px;border:1px solid var(--border);text-align:center;font-size:11px;color:var(--muted)}
        .step.active{background:rgba(0,229,160,.1);color:var(--accent);border-color:rgba(0,229,160,.3)}
        .step.done{background:rgba(0,229,160,.05);color:var(--accent);border-color:rgba(0,229,160,.2)}
        .card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:28px;margin-bottom:20px}
        .card-title{font-family:'Syne',sans-serif;font-weight:700;font-size:18px;margin-bottom:20px;color:var(--text)}
        .form-group{margin-bottom:16px}
        .form-label{font-size:10px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;display:block;margin-bottom:6px}
        .form-input{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:11px 14px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none;transition:border-color .2s}
        .form-input:focus{border-color:var(--accent)}
        .form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .btn{padding:11px 20px;border-radius:12px;border:none;font-family:'DM Mono',monospace;font-size:12px;font-weight:500;cursor:pointer;transition:all .2s}
        .btn-primary{background:var(--accent);color:#000}.btn-primary:hover{background:#00ffb0}.btn-primary:disabled{opacity:.5;cursor:not-allowed}
        .btn-secondary{background:var(--surface2);color:var(--text);border:1px solid var(--border)}.btn-secondary:hover{border-color:var(--accent);color:var(--accent)}
        .btn-danger{background:rgba(244,63,94,.1);color:var(--down);border:1px solid rgba(244,63,94,.3)}
        .btn-row{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}
        .student-list{display:flex;flex-direction:column;gap:8px;margin-bottom:16px;max-height:320px;overflow-y:auto}
        .student-row{display:grid;grid-template-columns:1fr 1.5fr auto;gap:10px;align-items:center;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 14px}
        .add-row{display:grid;grid-template-columns:1fr 1.5fr auto;gap:10px;align-items:end;margin-bottom:12px}
        .status-msg{padding:12px 16px;border-radius:10px;font-size:12px;margin-top:12px}
        .status-msg.success{background:rgba(0,229,160,.1);color:var(--up);border:1px solid rgba(0,229,160,.2)}
        .status-msg.error{background:rgba(244,63,94,.1);color:var(--down);border:1px solid rgba(244,63,94,.2)}
        .status-msg.pending{background:rgba(59,130,246,.1);color:#60a5fa;border:1px solid rgba(59,130,246,.2)}
        .upload-area{border:2px dashed var(--border);border-radius:12px;padding:20px;text-align:center;cursor:pointer;transition:all .2s;margin-bottom:16px}
        .upload-area:hover{border-color:var(--accent);background:rgba(0,229,160,.03)}
        .info-box{background:rgba(0,229,160,.06);border:1px solid rgba(0,229,160,.15);border-radius:12px;padding:14px 16px;font-size:11px;color:var(--muted);line-height:1.8;margin-bottom:20px}
        .skeleton{background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @media(max-width:640px){.form-row{grid-template-columns:1fr}.add-row{grid-template-columns:1fr}.student-row{grid-template-columns:1fr auto}}
      ` }} />

      <div className="page">
        <nav className="nav">
          <div className="logo">CRYPTO<span>CLASS</span></div>
          <button className="btn btn-secondary" onClick={() => router.push("/teacher")} style={{ fontSize: 11 }}>← Back</button>
        </nav>

        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: -1, marginBottom: 4, color: "var(--text)" }}>
          🎓 New <span style={{ color: "var(--accent)" }}>Class Setup</span>
        </div>
        <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 24 }}>Set up your simulation in 4 easy steps</p>

        <div className="steps">
          {STEPS.map((s, i) => (
            <div key={i} className={`step ${step === i + 1 ? "active" : step > i + 1 ? "done" : ""}`}>
              {step > i + 1 ? "✓ " : ""}{s}
            </div>
          ))}
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="card">
            <div className="card-title">📋 Class Information</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Class Name *</label>
                <input className="form-input" placeholder="Period 3 Crypto Class" value={classData.name} onChange={e => setClassData(d => ({ ...d, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Semester</label>
                <input className="form-input" placeholder="Spring 2025" value={classData.semester} onChange={e => setClassData(d => ({ ...d, semester: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Starting Cash ($)</label>
                <input className="form-input" type="number" value={classData.seedMoney} onChange={e => setClassData(d => ({ ...d, seedMoney: parseFloat(e.target.value) }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Trade Fee (%)</label>
                <input className="form-input" type="number" step="0.1" value={classData.tradeFee} onChange={e => setClassData(d => ({ ...d, tradeFee: parseFloat(e.target.value) }))} />
              </div>
            </div>
            {statusMsg && <div className={`status-msg ${statusMsg.type}`}>{statusMsg.msg}</div>}
            <div className="btn-row">
              <button className="btn btn-primary" onClick={createClass} disabled={saving}>
                {saving ? "Creating..." : "Next: Select Coins →"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="card">
            <div className="card-title">🪙 Select Coins for Trading</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16 }}>
              Choose which coins students can trade. Filter by sector and consensus mechanism. Prices update every 30 minutes.
            </div>
            {loadingCoins ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(148px,1fr))", gap: 8 }}>
                {[...Array(12)].map((_, i) => <div key={i} className="skeleton" style={{ height: 90 }} />)}
              </div>
            ) : (
              <CoinPicker coins={coins} selected={selectedCoins} onToggle={toggleCoin} activeSymbols={[]} />
            )}
            {statusMsg && <div className={`status-msg ${statusMsg.type}`}>{statusMsg.msg}</div>}
            <div className="btn-row">
              <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary" onClick={saveCoins} disabled={selectedCoins.length < 3 || saving}>
                {saving ? "Saving..." : `Save ${selectedCoins.length} Coins →`}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="card">
            <div className="card-title">👥 Add Students</div>

            <div className="info-box">
              <strong>Students are registered instantly</strong> — no invitation email needed!<br/>
              Enter each student's <strong>Google login email</strong> (Gmail or school Google account).<br/>
              They just go to the app URL and click <strong>Sign in with Google</strong>.
            </div>

            {/* CSV Upload */}
            <label className="upload-area">
              <div style={{ fontSize: 24, marginBottom: 6 }}>📄</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, color: "var(--text)" }}>Upload CSV Roster</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Format: <code style={{ background: "var(--surface2)", padding: "1px 6px", borderRadius: 4 }}>Name, GoogleEmail</code> — one per row</div>
              <input type="file" accept=".csv" style={{ display: "none" }} onChange={handleCSV} />
            </label>

            <div style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", marginBottom: 16 }}>— or add manually —</div>

            {/* Manual Add */}
            <div className="add-row">
              <div>
                <label className="form-label">Student Name</label>
                <input className="form-input" placeholder="Jane Smith" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && addStudent()} />
              </div>
              <div>
                <label className="form-label">Google Login Email</label>
                <input className="form-input" placeholder="jane@gmail.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && addStudent()} />
              </div>
              <button className="btn btn-primary" onClick={addStudent} disabled={addingStudent} style={{ alignSelf: "flex-end" }}>
                {addingStudent ? "..." : "+ Add"}
              </button>
            </div>

            {students.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: "var(--accent)", marginBottom: 10 }}>
                  ✅ {students.length} student{students.length !== 1 ? "s" : ""} registered — all can sign in now
                </div>
                <div className="student-list">
                  {students.map((s, i) => (
                    <div className="student-row" key={i}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.email}</div>
                      <div style={{ fontSize: 10, color: "var(--accent)" }}>✓ registered</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {statusMsg && <div className={`status-msg ${statusMsg.type}`}>{statusMsg.msg}</div>}

            <div className="btn-row">
              <button className="btn btn-secondary" onClick={() => setStep(2)}>← Back</button>
              <button className="btn btn-secondary" onClick={() => setStep(4)}>Skip for now</button>
              <button className="btn btn-primary" onClick={() => setStep(4)} disabled={students.length === 0}>
                Launch Class 🚀
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <div className="card" style={{ textAlign: "center", padding: "48px 28px" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🚀</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, marginBottom: 8, color: "var(--text)" }}>
              {createdClass?.name} is Live!
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12, lineHeight: 1.6 }}>
              {selectedCoins.length} coins · {students.length} students registered
            </div>
            <div style={{ background: "rgba(0,229,160,.08)", border: "1px solid rgba(0,229,160,.2)", borderRadius: 12, padding: "14px 20px", marginBottom: 28, fontSize: 12, color: "var(--text)" }}>
              📋 Share this URL with your students:<br/>
              <strong style={{ color: "var(--accent)", fontSize: 14 }}>virtualcryptoportfolio-supabasev3.vercel.app</strong><br/>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>They click "Sign in with Google" using the email you registered</span>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={() => router.push("/teacher")} style={{ fontSize: 13, padding: "12px 24px" }}>
                Go to Teacher Dashboard →
              </button>
              <button className="btn btn-secondary" onClick={() => { setStep(1); setCreatedClass(null); setSelectedCoins([]); setStudents([]); setClassData({ name: "", semester: "", seedMoney: 10000, tradeFee: 0.5 }); }}>
                + Create Another Class
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
