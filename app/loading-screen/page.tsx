"use client";

import { useEffect, useState, useRef } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import type { CSSProperties } from "react";

export default function LoadingScreen() {

  const [scale, setScale]       = useState(0.7);
  const [opacity, setOpacity]   = useState(0);
  const [glow, setGlow]         = useState(false);
  const [tagline, setTagline]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut]   = useState(false);

  const destRef       = useRef<string>("/language");
  const redirectedRef = useRef(false);

  const doRedirect = (dest: string) => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    setFadeOut(true);
    setTimeout(() => {
      // Si pas connecté — efface la langue pour toujours voir /language
      if (dest === "/language") {
        localStorage.removeItem("lang");
      }
      window.location.href = dest;
    }, 500);
  };

  useEffect(() => {

    // ── Firebase check immédiat
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();

      if (!user) {
        destRef.current = "/language";
        return;
      }

      if (!user.emailVerified) {
        destRef.current = "/login";
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) {
          destRef.current = "/language";
          return;
        }
        const data = snap.data() as any;
        if (data.lang) localStorage.setItem("lang", data.lang);
        destRef.current = data.onboardingCompleted ? "/dashboard" : "/welcome";
      } catch {
        destRef.current = "/language";
      }
    });

    // ── Animations
    setTimeout(() => { setScale(1.05); setOpacity(1); }, 100);
    setTimeout(() => setScale(1),       400);
    setTimeout(() => setGlow(true),     500);
    setTimeout(() => setTagline(true),  700);
    setTimeout(() => setProgress(30),   400);
    setTimeout(() => setProgress(60),  1000);
    setTimeout(() => setProgress(85),  1700);
    setTimeout(() => setProgress(100), 2300);

    // ── Redirect à 2.8s
    setTimeout(() => {
      doRedirect(destRef.current);
    }, 2800);

    return () => unsubscribe();
  }, []);

  return (
    <div style={{
      ...container,
      opacity: fadeOut ? 0 : 1,
      transition: fadeOut ? "opacity 0.5s ease" : "none",
    }}>

      {/* Glow */}
      <div style={{
        position: "absolute",
        top: "-10%", left: "50%",
        transform: "translateX(-50%)",
        width: 500, height: 500,
        borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(232,184,75,0.1), transparent 65%)",
        pointerEvents: "none",
        opacity: glow ? 1 : 0,
        transition: "opacity 0.8s ease",
      }} />

      {/* Grid */}
      <div style={bgGrid} />

      {/* Particules */}
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: 4 + (i % 2) * 2,
          height: 4 + (i % 2) * 2,
          borderRadius: "50%",
          background: "#e8b84b",
          opacity: glow ? 0.12 + i * 0.04 : 0,
          left: `${10 + i * 18}%`,
          top: `${25 + (i % 3) * 18}%`,
          transition: "opacity 0.6s ease",
          animation: glow
            ? `float${i % 3} ${3 + i * 0.5}s ease-in-out infinite`
            : "none",
          pointerEvents: "none",
        }} />
      ))}

      {/* Contenu */}
      <div style={{ textAlign: "center", position: "relative", zIndex: 2 }}>

        {/* Ring + Logo */}
        <div style={{
          opacity,
          transform: `scale(${scale})`,
          transition: "all 0.4s cubic-bezier(.34,1.56,.64,1)",
          marginBottom: 16,
        }}>
          <div style={{
            width: 120, height: 120,
            borderRadius: "50%",
            border: `1.5px solid rgba(232,184,75,${glow ? 0.3 : 0})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto",
            background: `rgba(232,184,75,${glow ? 0.05 : 0})`,
            boxShadow: glow ? "0 0 60px rgba(232,184,75,0.1)" : "none",
            transition: "all 0.6s ease",
          }}>
            <div>
              <span style={{ color: "#e8b84b", fontSize: 44, fontWeight: 900, fontFamily: "serif" }}>Ku</span>
              <span style={{ color: "#f4f1ec", fontSize: 44, fontWeight: 900, fontFamily: "serif" }}>abo</span>
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div style={{
          opacity: tagline ? 1 : 0,
          transform: tagline ? "translateY(0)" : "translateY(8px)",
          transition: "all 0.5s ease",
          fontSize: 11,
          color: "#444",
          letterSpacing: "0.25em",
          textTransform: "uppercase" as const,
          fontStyle: "italic",
          marginBottom: 52,
        }}>
          welcome home
        </div>

        {/* Spinner */}
        <div style={{
          opacity: tagline ? 1 : 0,
          transition: "opacity 0.4s ease",
          marginBottom: 20,
          display: "flex",
          justifyContent: "center",
        }}>
          <svg width="36" height="36" viewBox="0 0 36 36"
            style={{ animation: "spin 1.2s linear infinite" }}>
            <circle cx="18" cy="18" r="14"
              fill="none" stroke="#1e2a3a" strokeWidth="3" />
            <circle cx="18" cy="18" r="14"
              fill="none" stroke="#e8b84b" strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="88" strokeDashoffset="66"
              style={{ filter: "drop-shadow(0 0 3px rgba(232,184,75,0.5))" }}
            />
          </svg>
        </div>

        {/* Progress bar */}
        <div style={{
          opacity: tagline ? 1 : 0,
          transition: "opacity 0.4s ease",
          width: 160,
          margin: "0 auto",
        }}>
          <div style={{
            height: 2,
            background: "#1e2a3a",
            borderRadius: 2,
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: progress + "%",
              background: "linear-gradient(to right, #e8b84b, #2dd4bf)",
              borderRadius: 2,
              transition: "width 0.7s ease",
              boxShadow: "0 0 6px rgba(232,184,75,0.4)",
            }} />
          </div>
          <div style={{
            fontSize: 10, color: "#333",
            marginTop: 8, letterSpacing: "0.05em",
          }}>
            {progress}%
          </div>
        </div>

        {/* Dots */}
        <div style={{
          display: "flex", gap: 5,
          justifyContent: "center",
          marginTop: 20,
          opacity: tagline ? 1 : 0,
          transition: "opacity 0.4s 0.2s ease",
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: "50%",
              background: progress > i * 33 ? "#e8b84b" : "#1e2a3a",
              transition: "background 0.4s ease",
              boxShadow: progress > i * 33
                ? "0 0 6px rgba(232,184,75,0.5)"
                : "none",
            }} />
          ))}
        </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes float0 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes float1 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-18px); } }
        @keyframes float2 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      `}</style>
    </div>
  );
}

const container: CSSProperties = {
  minHeight: "100dvh",
  background: "#0b0f1a",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  color: "#f4f1ec",
  position: "relative",
  overflow: "hidden",
};
const bgGrid: CSSProperties = {
  position: "absolute", inset: 0,
  backgroundImage: "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)",
  backgroundSize: "40px 40px",
  pointerEvents: "none",
};