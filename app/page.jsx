"use client";
import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        body { background: var(--bg); display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: 'DM Mono', monospace; }
        .card { background: var(--surface); border: 1px solid var(--border); border-radius: 24px; padding: 48px 40px; text-align: center; max-width: 400px; width: 90%; }
        .logo { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 28px; letter-spacing: -1px; color: var(--text); margin-bottom: 8px; }
        .logo span { color: var(--accent); }
        .sub { font-size: 12px; color: var(--muted); margin-bottom: 32px; letter-spacing: 2px; text-transform: uppercase; }
        .btn { width: 100%; padding: 14px; border-radius: 12px; border: none; background: var(--accent); color: #000; font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .2s; letter-spacing: .5px; }
        .btn:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 4px 20px rgba(0,229,160,.3); }
        .disclaimer { font-size: 10px; color: var(--muted); margin-top: 20px; line-height: 1.6; }
      `}</style>
      <div className="card">
        <div className="logo">CRYPTO<span>CLASS</span></div>
        <div className="sub">Virtual Trading Simulator</div>
        <button className="btn" onClick={() => signIn("google")}>
          Sign in with Google
        </button>
        <div className="disclaimer">
          Educational simulator only. No real money involved.<br />
          Not financial advice.
        </div>
      </div>
    </>
  );
}
