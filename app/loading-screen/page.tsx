"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const WORDS = [
  { text: "Ton guide d'installation",  lang: "FR", flag: "🇫🇷", color: "#e8b84b" },
  { text: "Your settlement guide",     lang: "EN", flag: "🇺🇸", color: "#2dd4bf" },
  { text: "Tu guía de instalación",    lang: "ES", flag: "🇪🇸", color: "#a78bfa" },
];

const HOUSE_PARTS = [
  { id: "foundation", delay: 0   },
  { id: "wall_left",  delay: 180 },
  { id: "wall_right", delay: 360 },
  { id: "door",       delay: 540 },
  { id: "window_l",   delay: 620 },
  { id: "window_r",   delay: 700 },
  { id: "roof",       delay: 880 },
  { id: "chimney",    delay: 1060 },
  { id: "star",       delay: 1200 },
];

export default function LoadingScreen() {
  const router = useRouter();

  const [phase, setPhase]             = useState(0);
  const [progress, setProgress]       = useState(0);
  const [builtParts, setBuiltParts]   = useState<string[]>([]);
  const [wordIndex, setWordIndex]     = useState(0);
  const [wordVisible, setWordVisible] = useState(true);
  const [bounce, setBounce]           = useState(false);

  const has = (id: string) => builtParts.includes(id);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100);
    const t2 = setTimeout(() => setPhase(2), 1400);
    const t3 = setTimeout(() => setBounce(true), 1450);
    const t4 = setTimeout(() => setPhase(3), 2000);

    // Build house parts
    HOUSE_PARTS.forEach(({ id, delay }) => {
      setTimeout(() => setBuiltParts(p => [...p, id]), 200 + delay);
    });

    // Word cycling
    const cycleWord = setInterval(() => {
      setWordVisible(false);
      setTimeout(() => {
        setWordIndex(i => (i + 1) % WORDS.length);
        setWordVisible(true);
      }, 300);
    }, 2200);

    // Progress bar
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 4 + 1.5;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        // Redirect after loading complete
        setTimeout(() => router.replace("/home"), 400);
      }
      setProgress(Math.min(p, 100));
    }, 55);

    return () => {
      [t1, t2, t3, t4].forEach(clearTimeout);
      clearInterval(cycleWord);
      clearInterval(interval);
    };
  }, [router]);

  const gold  = "#e8b84b";
  const teal  = "#2dd4bf";
  const dark  = "#0f1521";
  const wall  = "#141d2e";
  const wallB = "rgba(232,184,75,0.18)";
  const word  = WORDS[wordIndex];

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#060a12",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif",
      overflow: "hidden",
      position: "relative",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,700;0,900;1,700&display=swap');

        @keyframes part-pop {
          0%   { opacity:0; transform:translateY(12px) scale(0.85); }
          55%  { opacity:1; transform:translateY(-3px) scale(1.04); }
          100% { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes roof-slide {
          0%   { opacity:0; transform:translateY(-20px) scale(0.9); }
          60%  { opacity:1; transform:translateY(3px) scale(1.02); }
          100% { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes star-spin {
          0%   { opacity:0; transform:scale(0) rotate(-90deg); }
          60%  { opacity:1; transform:scale(1.3) rotate(10deg); }
          100% { opacity:1; transform:scale(1) rotate(0deg); }
        }
        @keyframes logo-in {
          0%   { opacity:0; transform:translateY(16px) scale(0.92); }
          60%  { opacity:1; transform:translateY(-3px) scale(1.02); }
          100% { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes char-bounce {
          0%,100% { transform:translateY(0); }
          40%     { transform:translateY(-9px); }
          65%     { transform:translateY(-3px); }
        }
        @keyframes word-in {
          from { opacity:0; transform:translateY(7px) scale(0.95); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes word-out {
          from { opacity:1; transform:translateY(0) scale(1); }
          to   { opacity:0; transform:translateY(-7px) scale(0.95); }
        }
        @keyframes dot-bounce {
          0%,80%,100% { transform:scale(0.5); opacity:0.25; }
          40%         { transform:scale(1); opacity:1; }
        }
        @keyframes shimmer {
          0%   { background-position:-200% center; }
          100% { background-position:200% center; }
        }
        @keyframes glow-orb {
          0%,100% { opacity:0.06; }
          50%     { opacity:0.14; }
        }
        @keyframes smoke {
          0%   { opacity:0.5; transform:translateY(0) scaleX(1); }
          100% { opacity:0;   transform:translateY(-18px) scaleX(1.5); }
        }
        @keyframes ground-line {
          from { opacity:0; }
          to   { opacity:1; }
        }
        @keyframes door-shine {
          0%,100% { opacity:0; }
          50%     { opacity:0.6; }
        }
      `}</style>

      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: "28%", left: "50%",
        transform: "translateX(-50%)",
        width: 360, height: 360, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(232,184,75,0.05) 0%, transparent 65%)",
        animation: "glow-orb 5s ease-in-out infinite",
        pointerEvents: "none",
      }}/>

      {/* ── HOUSE ── */}
      <div style={{
        position: "relative",
        marginBottom: 16,
        opacity: phase >= 1 ? 1 : 0,
        transition: "opacity 0.3s ease",
      }}>
        <svg width="200" height="190" viewBox="0 0 200 190">

          {has("foundation") && (
            <line x1="10" y1="175" x2="190" y2="175"
              stroke="rgba(232,184,75,0.2)" strokeWidth="1.5" strokeLinecap="round"
              style={{ animation: "ground-line 0.4s ease forwards" }}
            />
          )}
          {has("foundation") && (
            <rect x="40" y="160" width="120" height="15" rx="3"
              fill={wall} stroke={gold} strokeWidth="1.2" opacity="0.8"
              style={{ animation: "part-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
            />
          )}
          {has("wall_left") && (
            <rect x="40" y="110" width="55" height="50"
              fill={wall} stroke={wallB} strokeWidth="1"
              style={{ animation: "part-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
            />
          )}
          {has("wall_right") && (
            <rect x="105" y="110" width="55" height="50"
              fill={wall} stroke={wallB} strokeWidth="1"
              style={{ animation: "part-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
            />
          )}
          {has("wall_right") && (
            <rect x="40" y="108" width="120" height="4" rx="1"
              fill="rgba(232,184,75,0.15)"
              style={{ animation: "part-pop 0.3s ease forwards" }}
            />
          )}
          {has("door") && (
            <>
              <rect x="82" y="130" width="36" height="30" rx="3"
                fill={dark} stroke={gold} strokeWidth="1.5"
                style={{ animation: "part-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
              />
              <path d="M 82 135 Q 100 118 118 135"
                fill="none" stroke={gold} strokeWidth="1.5"
                style={{ animation: "part-pop 0.5s ease forwards" }}
              />
              <circle cx="113" cy="147" r="2.5" fill={gold} opacity="0.8"/>
              <rect x="88" y="135" width="4" height="16" rx="2"
                fill="rgba(232,184,75,0.2)"
                style={{ animation: "door-shine 2s ease-in-out infinite" }}
              />
            </>
          )}
          {has("window_l") && (
            <>
              <rect x="50" y="122" width="24" height="20" rx="3"
                fill={dark} stroke={teal} strokeWidth="1.2"
                style={{ animation: "part-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
              />
              <line x1="62" y1="122" x2="62" y2="142" stroke={teal} strokeWidth="0.8" opacity="0.5"/>
              <line x1="50" y1="132" x2="74" y2="132" stroke={teal} strokeWidth="0.8" opacity="0.5"/>
              <rect x="52" y="124" width="9" height="7" rx="1"
                fill="rgba(45,212,191,0.1)"
                style={{ animation: "door-shine 2.5s 0.5s ease-in-out infinite" }}
              />
            </>
          )}
          {has("window_r") && (
            <>
              <rect x="126" y="122" width="24" height="20" rx="3"
                fill={dark} stroke={teal} strokeWidth="1.2"
                style={{ animation: "part-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
              />
              <line x1="138" y1="122" x2="138" y2="142" stroke={teal} strokeWidth="0.8" opacity="0.5"/>
              <line x1="126" y1="132" x2="150" y2="132" stroke={teal} strokeWidth="0.8" opacity="0.5"/>
              <rect x="128" y="124" width="9" height="7" rx="1"
                fill="rgba(45,212,191,0.1)"
                style={{ animation: "door-shine 2.5s 0.9s ease-in-out infinite" }}
              />
            </>
          )}
          {has("roof") && (
            <polygon points="30,112 100,55 170,112"
              fill={dark} stroke={gold} strokeWidth="1.8"
              style={{ animation: "roof-slide 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
            />
          )}
          {has("chimney") && (
            <rect x="128" y="62" width="14" height="28" rx="2"
              fill={wall} stroke={gold} strokeWidth="1"
              style={{ animation: "part-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
            />
          )}
          {has("chimney") && [0,1,2].map(i => (
            <circle key={i} cx={135 + i*2} cy={55 - i*10} r={4 + i*2}
              fill="none" stroke="rgba(232,184,75,0.15)" strokeWidth="1"
              style={{ animation: `smoke ${1.5 + i*0.4}s ${i*0.3}s ease-out infinite` }}
            />
          ))}
          {has("star") && (
            <text x="96" y="50" textAnchor="middle" fontSize="16"
              style={{
                animation: "star-spin 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards",
                filter: "drop-shadow(0 0 6px rgba(232,184,75,0.8))",
              }}
            >✨</text>
          )}
          {has("door") && (
            <>
              <rect x="86" y="160" width="28" height="5" rx="1"
                fill={wall} stroke="rgba(232,184,75,0.2)" strokeWidth="0.8"
                style={{ animation: "part-pop 0.3s ease forwards" }}
              />
              <rect x="90" y="165" width="20" height="4" rx="1"
                fill={wall} stroke="rgba(232,184,75,0.15)" strokeWidth="0.8"
                style={{ animation: "part-pop 0.3s ease forwards" }}
              />
            </>
          )}
        </svg>
      </div>

      {/* ── LOGO ── */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        opacity: phase >= 2 ? 1 : 0,
        animation: phase >= 2 ? "logo-in 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards" : "none",
        marginBottom: 12,
      }}>
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 42, fontWeight: 900, lineHeight: 1,
          display: "flex", alignItems: "baseline",
          marginBottom: 10,
        }}>
          {["K","u","a","b","o"].map((char, i) => (
            <span key={i} style={{
              display: "inline-block",
              background: i < 2 ? "linear-gradient(135deg, #e8b84b, #f4d78a)" : "none",
              WebkitBackgroundClip: i < 2 ? "text" : "unset",
              WebkitTextFillColor: i < 2 ? "transparent" : "#f4f1ec",
              color: i < 2 ? "transparent" : "#f4f1ec",
              animation: bounce
                ? `char-bounce 0.6s ${i * 0.08}s cubic-bezier(0.34,1.56,0.64,1) both`
                : "none",
            }}>{char}</span>
          ))}
        </div>

        {/* Tagline cycling */}
        <div style={{ height: 38, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            animation: wordVisible
              ? "word-in 0.3s ease forwards"
              : "word-out 0.3s ease forwards",
          }}>
            <span style={{ fontSize: 18 }}>{word.flag}</span>
            <span style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 17, fontWeight: 700, fontStyle: "italic",
              color: word.color,
              filter: `drop-shadow(0 0 6px ${word.color}50)`,
            }}>{word.text}</span>
            <span style={{
              fontSize: 8, fontWeight: 700, letterSpacing: "0.14em",
              color: word.color,
              background: `${word.color}12`,
              border: `1px solid ${word.color}28`,
              borderRadius: 5, padding: "2px 6px",
            }}>{word.lang}</span>
          </div>
        </div>
      </div>

      {/* ── PROGRESS ── */}
      <div style={{
        width: 160, marginTop: 8,
        opacity: phase >= 3 ? 1 : 0,
        transition: "opacity 0.5s ease",
      }}>
        <div style={{
          width: "100%", height: 2,
          background: "rgba(255,255,255,0.05)",
          borderRadius: 2, overflow: "hidden", marginBottom: 12,
        }}>
          <div style={{
            height: "100%", width: `${progress}%`,
            background: "linear-gradient(90deg, #e8b84b, #2dd4bf, #e8b84b)",
            backgroundSize: "200% auto",
            animation: "shimmer 2s linear infinite",
            borderRadius: 2, transition: "width 0.08s linear",
            boxShadow: "0 0 10px rgba(232,184,75,0.5)",
          }}/>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 4, height: 4, borderRadius: "50%",
              background: i === 1 ? "#2dd4bf" : "#e8b84b",
              animation: `dot-bounce 1.2s ${i * 0.2}s ease-in-out infinite`,
            }}/>
          ))}
        </div>
      </div>

      {/* Bottom */}
      <div style={{
        position: "absolute", bottom: 34,
        fontSize: 9, color: "rgba(244,241,236,0.1)",
        letterSpacing: "0.18em", textTransform: "uppercase",
        opacity: phase >= 3 ? 1 : 0,
        transition: "opacity 0.5s 0.4s ease",
      }}>kuabo.co</div>
    </div>
  );
}
