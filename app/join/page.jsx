"use client";
import { useState, useEffect, Suspense } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function JoinContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState(null);
  const [joining, setJoining] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No invitation token found.");
      return;
    }
    fetch(`/api/join?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setInvite(d);
      })
      .catch(() => setError("Failed to load invitation."));
  }, [token]);

  useEffect(() => {
    if (status === "authenticated" && invite && !done) {
      setJoining(true);
      fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email: session.user.email }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.success || d.alreadyAccepted) {
            setDone(true);
            setTimeout(() => router.replace("/dashboard"), 2000);
          } else {
            setError(d.error || "Failed to join class.");
            setJoining(false);
          }
        })
        .catch(() => {
          setError("Network error.");
          setJoining(false);
        });
    }
  }, [status, invite, done, token, session, router]);

  return (
    <div
      style={{
        background: "#080c14",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "'DM Mono', monospace",
      }}
    >
      <div
        style={{
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: 24,
          padding: "40px 36px",
          maxWidth: 1200,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: -1,
            marginBottom: 6,
            color: "#e2e8f0",
          }}
        >
          CRYPTO<span style={{ color: "#00e5a0" }}>CLASS</span>
        </div>

        {!invite && !error && (
          <div style={{ marginTop: 24, color: "#475569", fontSize: 12 }}>
            Loading invitation...
          </div>
        )}

        {error && (
          <>
            <div
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: 22,
                margin: "24px 0 8px",
                color: "#e2e8f0",
              }}
            >
              ⚠️ Oops
            </div>
            <div
              style={{
                background: "rgba(244,63,94,.1)",
                border: "1px solid rgba(244,63,94,.3)",
                color: "#f43f5e",
                borderRadius: 10,
                padding: 12,
                fontSize: 12,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
            <div style={{ fontSize: 11, color: "#475569" }}>
              Contact your teacher if you think this is a mistake.
            </div>
          </>
        )}

        {done && (
          <>
            <div style={{ fontSize: 48, margin: "20px 0" }}>🎉</div>
            <div
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: 22,
                marginBottom: 8,
                color: "#e2e8f0",
              }}
            >
              You're in!
            </div>
            <div
              style={{
                background: "rgba(0,229,160,.1)",
                border: "1px solid rgba(0,229,160,.3)",
                color: "#00e5a0",
                borderRadius: 10,
                padding: 12,
                fontSize: 12,
              }}
            >
              Successfully joined {invite?.className}! Redirecting...
            </div>
          </>
        )}

        {invite && !error && !done && (
          <>
            <div style={{ fontSize: 48, margin: "16px 0" }}>👋</div>
            <div
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: 22,
                marginBottom: 8,
                color: "#e2e8f0",
              }}
            >
              You're Invited!
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#475569",
                marginBottom: 24,
                lineHeight: 1.6,
              }}
            >
              Join your class and start trading with virtual crypto.
            </div>

            <div
              style={{
                background: "rgba(0,229,160,.06)",
                border: "1px solid rgba(0,229,160,.2)",
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
                textAlign: "left",
              }}
            >
              {[
                ["Student", invite.name],
                ["Class", invite.className],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ color: "#475569" }}>{label}</span>
                  <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {status === "unauthenticated" && (
              <>
                <button
                  onClick={() => signIn("google")}
                  style={{
                    width: "100%",
                    padding: 14,
                    borderRadius: 12,
                    border: "none",
                    background: "#00e5a0",
                    color: "#000",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    marginBottom: 10,
                  }}
                >
                  Sign in with Google to Join
                </button>
                <div
                  style={{ fontSize: 10, color: "#334155", lineHeight: 1.6 }}
                >
                  Use your school account: {invite.email}
                </div>
              </>
            )}

            {(status === "loading" || joining) && (
              <div style={{ color: "#475569", fontSize: 12 }}>
                {joining ? `Joining ${invite.className}...` : "Signing in..."}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
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
      }
    >
      <JoinContent />
    </Suspense>
  );
}
