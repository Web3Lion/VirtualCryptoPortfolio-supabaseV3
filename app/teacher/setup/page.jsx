"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const SECTORS = [
  "All",
  "Layer 1",
  "Layer 2",
  "DeFi",
  "AI / Data",
  "Gaming/NFT",
  "Memecoin",
  "Stablecoin",
  "Exchange",
  "Other",
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#080c14;--surface:#0f172a;--surface2:#1a2235;--border:#1e293b;--accent:#00e5a0;--up:#00e5a0;--down:#f43f5e;--text:#e2e8f0;--muted:#475569;--gold:#f59e0b}
body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace;min-height:100vh}
.page{max-width:900px;margin:0 auto;padding:24px 16px}
.nav{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;margin-bottom:28px;background:rgba(15,23,42,.8);border:1px solid var(--border);border-radius:16px;backdrop-filter:blur(12px)}
.logo{font-family:'Syne',sans-serif;font-weight:800;font-size:16px}.logo span{color:var(--accent)}
.page-title{font-family:'Syne',sans-serif;font-weight:800;font-size:28px;letter-spacing:-1px;margin-bottom:4px}
.page-title span{color:var(--accent)}
.steps{display:flex;gap:8px;margin-bottom:32px;flex-wrap:wrap}
.step{flex:1;min-width:120px;padding:10px;border-radius:12px;border:1px solid var(--border);text-align:center;font-size:11px;color:var(--muted);transition:all .2s}
.step.active{background:rgba(0,229,160,.1);color:var(--accent);border-color:rgba(0,229,160,.3)}
.step.done{background:rgba(0,229,160,.05);color:var(--accent);border-color:rgba(0,229,160,.2)}
.card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:28px;margin-bottom:20px}
.card-title{font-family:'Syne',sans-serif;font-weight:700;font-size:18px;margin-bottom:20px}
.form-group{margin-bottom:16px}
.form-label{font-size:10px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;display:block;margin-bottom:6px}
.form-input,.form-select{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:11px 14px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none;transition:border-color .2s}
.form-input:focus,.form-select:focus{border-color:var(--accent)}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.btn{padding:11px 20px;border-radius:12px;border:none;font-family:'DM Mono',monospace;font-size:12px;font-weight:500;cursor:pointer;transition:all .2s}
.btn-primary{background:var(--accent);color:#000}.btn-primary:hover{background:#00ffb0}.btn-primary:disabled{opacity:.5;cursor:not-allowed}
.btn-secondary{background:var(--surface2);color:var(--text);border:1px solid var(--border)}.btn-secondary:hover{border-color:var(--accent);color:var(--accent)}
.btn-danger{background:rgba(244,63,94,.1);color:var(--down);border:1px solid rgba(244,63,94,.3)}
.btn-row{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}
.coin-filters{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
.filter-btn{padding:5px 12px;border-radius:20px;border:1px solid var(--border);background:transparent;font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);cursor:pointer;transition:all .2s}
.filter-btn.active{background:rgba(0,229,160,.1);color:var(--accent);border-color:rgba(0,229,160,.3)}
.coin-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;max-height:400px;overflow-y:auto;padding-right:4px}
.coin-card{background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:12px;cursor:pointer;transition:all .2s;position:relative}
.coin-card:hover{border-color:rgba(0,229,160,.3)}
.coin-card.selected{background:rgba(0,229,160,.08);border-color:var(--accent)}
.coin-symbol{font-family:'Syne',sans-serif;font-weight:700;font-size:14px}
.coin-name{font-size:10px;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.coin-sector{font-size:9px;color:var(--muted);margin-top:4px;padding:2px 6px;background:var(--border);border-radius:4px;display:inline-block}
.coin-check{position:absolute;top:8px;right:8px;width:18px;height:18px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:10px;color:#000;font-weight:700}
.selected-count{font-size:12px;color:var(--accent);margin-bottom:12px}
.student-list{display:flex;flex-direction:column;gap:8px;margin-bottom:16px;max-height:300px;overflow-y:auto}
.student-row{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:center;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 14px}
.add-row{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end}
.status-msg{padding:12px 16px;border-radius:10px;font-size:12px;margin-top:12px}
.status-msg.success{background:rgba(0,229,160,.1);color:var(--accent);border:1px solid rgba(0,229,160,.2)}
.status-msg.error{background:rgba(244,63,94,.1);color:var(--down);border:1px solid rgba(244,63,94,.2)}
.status-msg.pending{background:rgba(59,130,246,.1);color:#60a5fa;border:1px solid rgba(59,130,246,.2)}
.upload-area{border:2px dashed var(--border);border-radius:12px;padding:24px;text-align:center;cursor:pointer;transition:all .2s;margin-bottom:16px}
.upload-area:hover{border-color:var(--accent);background:rgba(0,229,160,.03)}
.progress{background:var(--surface2);border-radius:8px;height:8px;overflow:hidden;margin-top:8px}
.progress-fill{height:100%;background:var(--accent);border-radius:8px;transition:width .3s}
.skeleton{background:linear-gradient(90deg,var(--surface) 25%,var(--surface2) 50%,var(--surface) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@media(max-width:640px){.form-row{grid-template-columns:1fr}.coin-grid{grid-template-columns:repeat(auto-fill,minmax(130px,1fr))}.add-row{grid-template-columns:1fr}}
`;

export default function ClassSetup() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [classData, setClassData] = useState({
    name: "",
    semester: "",
    seedMoney: 10000,
    tradeFee: 0.5,
  });
  const [createdClass, setCreatedClass] = useState(null);
  const [coins, setCoins] = useState([]);
  const [selectedCoins, setSelectedCoins] = useState([]);
  const [sectorFilter, setSectorFilter] = useState("All");
  const [coinSearch, setCoinSearch] = useState("");
  const [loadingCoins, setLoadingCoins] = useState(false);
  const [students, setStudents] = useState([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [status2, setStatus2] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  const fetchCoins = async () => {
    setLoadingCoins(true);
    try {
      const res = await fetch("/api/coins?source=coingecko");
      if (res.ok) setCoins(await res.json());
    } catch {}
    setLoadingCoins(false);
  };

  const createClass = async () => {
    if (!classData.name) {
      setStatus2({ type: "error", msg: "Class name is required" });
      return;
    }
    setStatus2({ type: "pending", msg: "Creating class..." });
    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...classData,
        tradeFee: classData.tradeFee / 100,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setCreatedClass(data);
      setStatus2(null);
      setStep(2);
      fetchCoins();
    } else {
      setStatus2({
        type: "error",
        msg: data.error || "Failed to create class",
      });
    }
  };

  const saveCoins = async () => {
    if (selectedCoins.length < 3) {
      setStatus2({ type: "error", msg: "Select at least 3 coins" });
      return;
    }
    setStatus2({ type: "pending", msg: "Saving coins..." });
    const res = await fetch("/api/coins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: createdClass.id,
        coins: selectedCoins.map((c) => ({
          symbol: c.symbol,
          geckoId: c.geckoId,
          name: c.name,
          sector: c.sector,
        })),
      }),
    });
    if (res.ok) {
      setStatus2(null);
      setStep(3);
    } else setStatus2({ type: "error", msg: "Failed to save coins" });
  };

  const addStudent = () => {
    if (!newName || !newEmail) return;
    if (
      students.find((s) => s.email.toLowerCase() === newEmail.toLowerCase())
    ) {
      setStatus2({ type: "error", msg: "Email already added" });
      return;
    }
    setStudents((prev) => [
      ...prev,
      { name: newName.trim(), email: newEmail.trim().toLowerCase() },
    ]);
    setNewName("");
    setNewEmail("");
    setStatus2(null);
  };

  const handleCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split("\n").filter(Boolean);
      const parsed = [];
      lines.forEach((line, i) => {
        if (i === 0 && line.toLowerCase().includes("name")) return; // skip header
        const parts = line.split(",").map((p) => p.trim().replace(/"/g, ""));
        if (parts.length >= 2 && parts[0] && parts[1]) {
          parsed.push({ name: parts[0], email: parts[1].toLowerCase() });
        }
      });
      setStudents((prev) => {
        const existing = new Set(prev.map((s) => s.email));
        return [...prev, ...parsed.filter((p) => !existing.has(p.email))];
      });
      setStatus2({
        type: "success",
        msg: `${parsed.length} students imported from CSV`,
      });
    };
    reader.readAsText(file);
  };

  const sendInvitations = async () => {
    if (!students.length) {
      setStatus2({ type: "error", msg: "Add students first" });
      return;
    }
    setSending(true);
    setSendProgress(0);
    setStatus2({
      type: "pending",
      msg: `Sending ${students.length} invitations...`,
    });
    const res = await fetch("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: createdClass.id, students }),
    });
    const data = await res.json();
    setSending(false);
    setSendProgress(100);
    if (res.ok) {
      setStatus2({
        type: "success",
        msg: `✅ ${data.sent?.length || 0} invitations sent! ${
          data.failed?.length ? `${data.failed.length} failed.` : ""
        }`,
      });
      setTimeout(() => setStep(4), 1500);
    } else {
      setStatus2({
        type: "error",
        msg: data.error || "Failed to send invitations",
      });
    }
  };

  const filteredCoins = coins.filter((c) => {
    const matchSector = sectorFilter === "All" || c.sector === sectorFilter;
    const matchSearch =
      !coinSearch ||
      c.symbol.toLowerCase().includes(coinSearch.toLowerCase()) ||
      c.name.toLowerCase().includes(coinSearch.toLowerCase());
    return matchSector && matchSearch;
  });

  const toggleCoin = (coin) => {
    setSelectedCoins((prev) =>
      prev.find((c) => c.symbol === coin.symbol)
        ? prev.filter((c) => c.symbol !== coin.symbol)
        : [...prev, coin]
    );
  };

  const STEPS = [
    "1. Class Info",
    "2. Select Coins",
    "3. Add Students",
    "4. Launch!",
  ];

  if (status === "loading")
    return (
      <div
        style={{
          background: "#080c14",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#475569",
        }}
      >
        Loading...
      </div>
    );

  return (
    <>
      <style>{CSS}</style>
      <div className="page">
        <nav className="nav">
          <div className="logo">
            CRYPTO<span>CLASS</span>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => router.push("/teacher")}
            style={{ fontSize: 11 }}
          >
            ← Back to Dashboard
          </button>
        </nav>

        <div className="page-title">
          🎓 New <span>Class Setup</span>
        </div>
        <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 24 }}>
          Set up your simulation in 4 easy steps
        </p>

        <div className="steps">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className={`step ${
                step === i + 1 ? "active" : step > i + 1 ? "done" : ""
              }`}
            >
              {step > i + 1 ? "✓ " : ""}
              {s}
            </div>
          ))}
        </div>

        {/* STEP 1: Class Info */}
        {step === 1 && (
          <div className="card">
            <div className="card-title">📋 Class Information</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Class Name *</label>
                <input
                  className="form-input"
                  placeholder="Period 3 Crypto Class"
                  value={classData.name}
                  onChange={(e) =>
                    setClassData((d) => ({ ...d, name: e.target.value }))
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Semester</label>
                <input
                  className="form-input"
                  placeholder="Spring 2025"
                  value={classData.semester}
                  onChange={(e) =>
                    setClassData((d) => ({ ...d, semester: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Starting Cash ($)</label>
                <input
                  className="form-input"
                  type="number"
                  value={classData.seedMoney}
                  onChange={(e) =>
                    setClassData((d) => ({
                      ...d,
                      seedMoney: parseFloat(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Trade Fee (%)</label>
                <input
                  className="form-input"
                  type="number"
                  step="0.1"
                  value={classData.tradeFee}
                  onChange={(e) =>
                    setClassData((d) => ({
                      ...d,
                      tradeFee: parseFloat(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            {status2 && (
              <div className={`status-msg ${status2.type}`}>{status2.msg}</div>
            )}
            <div className="btn-row">
              <button className="btn btn-primary" onClick={createClass}>
                Next: Select Coins →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Coin Selection */}
        {step === 2 && (
          <div className="card">
            <div className="card-title">🪙 Select Coins for Trading</div>
            <p
              style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16 }}
            >
              Choose which coins students can trade. Prices update every 30
              minutes automatically.
            </p>
            <div className="selected-count">
              {selectedCoins.length} coins selected
            </div>
            <input
              className="form-input"
              placeholder="Search coins..."
              value={coinSearch}
              onChange={(e) => setCoinSearch(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            <div className="coin-filters">
              {SECTORS.map((s) => (
                <button
                  key={s}
                  className={`filter-btn${sectorFilter === s ? " active" : ""}`}
                  onClick={() => setSectorFilter(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            {loadingCoins ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
                  gap: 8,
                }}
              >
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 70 }} />
                ))}
              </div>
            ) : (
              <div className="coin-grid">
                {filteredCoins.map((coin) => {
                  const isSelected = selectedCoins.find(
                    (c) => c.symbol === coin.symbol
                  );
                  return (
                    <div
                      key={coin.symbol}
                      className={`coin-card${isSelected ? " selected" : ""}`}
                      onClick={() => toggleCoin(coin)}
                    >
                      {isSelected && <div className="coin-check">✓</div>}
                      <div className="coin-symbol">{coin.symbol}</div>
                      <div className="coin-name">{coin.name}</div>
                      <div className="coin-sector">{coin.sector}</div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--muted)",
                          marginTop: 4,
                        }}
                      >
                        ${parseFloat(coin.price || 0).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {status2 && (
              <div className={`status-msg ${status2.type}`}>{status2.msg}</div>
            )}
            <div className="btn-row">
              <button className="btn btn-secondary" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button
                className="btn btn-primary"
                onClick={saveCoins}
                disabled={selectedCoins.length < 3}
              >
                Save {selectedCoins.length} Coins →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Add Students */}
        {step === 3 && (
          <div className="card">
            <div className="card-title">👥 Add Students</div>

            {/* CSV Upload */}
            <label className="upload-area" htmlFor="csvUpload">
              <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                Upload CSV File
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                CSV format: name, email (one per row)
              </div>
              <input
                id="csvUpload"
                type="file"
                accept=".csv"
                style={{ display: "none" }}
                onChange={handleCSV}
              />
            </label>

            <div
              style={{
                textAlign: "center",
                fontSize: 11,
                color: "var(--muted)",
                marginBottom: 16,
              }}
            >
              — or add manually —
            </div>

            <div className="add-row">
              <div>
                <label className="form-label">Name</label>
                <input
                  className="form-input"
                  placeholder="Jane Smith"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addStudent()}
                />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  placeholder="jsmith@southfayette.org"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addStudent()}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={addStudent}
                style={{ alignSelf: "flex-end" }}
              >
                Add
              </button>
            </div>

            {students.length > 0 && (
              <>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--accent)",
                    margin: "16px 0 8px",
                  }}
                >
                  {students.length} students added
                </div>
                <div className="student-list">
                  {students.map((s, i) => (
                    <div className="student-row" key={i}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>
                        {s.email}
                      </div>
                      <button
                        className="btn btn-danger"
                        style={{ padding: "4px 10px", fontSize: 10 }}
                        onClick={() =>
                          setStudents((prev) => prev.filter((_, j) => j !== i))
                        }
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {sending && (
              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    marginBottom: 6,
                  }}
                >
                  Sending invitations...
                </div>
                <div className="progress">
                  <div
                    className="progress-fill"
                    style={{ width: `${sendProgress}%` }}
                  />
                </div>
              </div>
            )}

            {status2 && (
              <div className={`status-msg ${status2.type}`}>{status2.msg}</div>
            )}

            <div className="btn-row">
              <button className="btn btn-secondary" onClick={() => setStep(2)}>
                ← Back
              </button>
              <button className="btn btn-secondary" onClick={() => setStep(4)}>
                Skip for now
              </button>
              <button
                className="btn btn-primary"
                onClick={sendInvitations}
                disabled={sending || !students.length}
              >
                {sending
                  ? "Sending..."
                  : `📧 Send ${students.length} Invitations →`}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Launch */}
        {step === 4 && (
          <div
            className="card"
            style={{ textAlign: "center", padding: "48px 28px" }}
          >
            <div style={{ fontSize: 64, marginBottom: 16 }}>🚀</div>
            <div
              style={{
                fontFamily: "'Syne',sans-serif",
                fontWeight: 800,
                fontSize: 28,
                marginBottom: 8,
              }}
            >
              {createdClass?.name} is Live!
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--muted)",
                marginBottom: 32,
                lineHeight: 1.6,
              }}
            >
              {selectedCoins.length} coins selected · {students.length} students
              invited
              <br />
              Prices update automatically every 30 minutes
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                className="btn btn-primary"
                onClick={() => router.push("/teacher")}
                style={{ fontSize: 13, padding: "12px 24px" }}
              >
                Go to Teacher Dashboard →
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setStep(1);
                  setCreatedClass(null);
                  setSelectedCoins([]);
                  setStudents([]);
                  setClassData({
                    name: "",
                    semester: "",
                    seedMoney: 10000,
                    tradeFee: 0.5,
                  });
                }}
              >
                + Create Another Class
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
