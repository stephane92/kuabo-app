"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import type { CSSProperties } from "react";

type Lang = "en" | "fr" | "es";

// ══════════════════════════════════════════════
// RÉGIONS PAR PAYS
// ══════════════════════════════════════════════
const REGIONS: Record<string, { label: Record<Lang, string>; options: string[] }> = {
  us: {
    label: { en: "Which state?", fr: "Quel État ?", es: "¿Qué estado?" },
    options: [
      "Alabama","Alaska","Arizona","Arkansas","California","Colorado",
      "Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho",
      "Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana",
      "Maine","Maryland","Massachusetts","Michigan","Minnesota",
      "Mississippi","Missouri","Montana","Nebraska","Nevada",
      "New Hampshire","New Jersey","New Mexico","New York",
      "North Carolina","North Dakota","Ohio","Oklahoma","Oregon",
      "Pennsylvania","Rhode Island","South Carolina","South Dakota",
      "Tennessee","Texas","Utah","Vermont","Virginia","Washington",
      "West Virginia","Wisconsin","Wyoming",
    ],
  },
  fr: {
    label: { en: "Which region?", fr: "Quelle région ?", es: "¿Qué región?" },
    options: [
      "Île-de-France","Auvergne-Rhône-Alpes","Provence-Alpes-Côte d'Azur",
      "Nouvelle-Aquitaine","Occitanie","Hauts-de-France","Grand Est",
      "Bretagne","Normandie","Pays de la Loire","Bourgogne-Franche-Comté",
      "Centre-Val de Loire","Corse","Guadeloupe","Martinique",
      "Guyane","La Réunion","Mayotte",
    ],
  },
  ca: {
    label: { en: "Which province?", fr: "Quelle province ?", es: "¿Qué provincia?" },
    options: [
      "Ontario","Québec","British Columbia","Alberta","Manitoba",
      "Saskatchewan","Nova Scotia","New Brunswick","Newfoundland and Labrador",
      "Prince Edward Island","Northwest Territories","Yukon","Nunavut",
    ],
  },
  be: {
    label: { en: "Which region?", fr: "Quelle région ?", es: "¿Qué región?" },
    options: [
      "Bruxelles-Capitale","Wallonie","Flandre",
    ],
  },
  ch: {
    label: { en: "Which canton?", fr: "Quel canton ?", es: "¿Qué cantón?" },
    options: [
      "Genève","Vaud","Zurich","Berne","Valais","Fribourg",
      "Neuchâtel","Jura","Soleure","Argovie","Bâle","Tessin",
      "Saint-Gall","Lucerne","Grisons","Uri","Schwyz","Obwald",
      "Nidwald","Glaris","Zoug","Appenzell","Thurgovie","Schaffhouse",
    ],
  },
  uk: {
    label: { en: "Which region?", fr: "Quelle région ?", es: "¿Qué región?" },
    options: [
      "London","South East","South West","East of England",
      "East Midlands","West Midlands","Yorkshire and the Humber",
      "North West","North East","Scotland","Wales","Northern Ireland",
    ],
  },
  other: {
    label: { en: "Your city", fr: "Ta ville", es: "Tu ciudad" },
    options: [],
  },
};

const T: Record<Lang, any> = {
  en: {
    title: "Where are you going?",
    sub: "Choose your destination country",
    step: "Step 3 of 4",
    back: "Back",
    next: "Continue",
    selectPlaceholder: "Select...",
    cityPlaceholder: "e.g. Paris, Toronto, London...",
    motivation: {
      us:    { emoji: "🇺🇸", title: "USA — The American Dream!", msg: "Kuabo will guide you — SSN, Green Card, housing, work and more." },
      fr:    { emoji: "🇫🇷", title: "France — Bienvenue!", msg: "Kuabo will help you — titre de séjour, CAF, CPAM and more." },
      ca:    { emoji: "🇨🇦", title: "Canada — Great choice!", msg: "Kuabo will guide you — SIN, healthcare, housing and more." },
      be:    { emoji: "🇧🇪", title: "Belgium — Welcome!", msg: "Kuabo will help you — residence permit, CPAS, work and more." },
      ch:    { emoji: "🇨🇭", title: "Switzerland — Let's go!", msg: "Kuabo will help you — permit B, AVS, housing and more." },
      uk:    { emoji: "🇬🇧", title: "UK — Welcome!", msg: "Kuabo will guide you — BRP, NHS, National Insurance and more." },
      other: { emoji: "🌍", title: "Wherever you go!", msg: "Kuabo will guide you every step of the way." },
    },
    countries: [
      { label: "United States",  value: "us",    flag: "🇺🇸" },
      { label: "France",         value: "fr",    flag: "🇫🇷" },
      { label: "Canada",         value: "ca",    flag: "🇨🇦" },
      { label: "Belgium",        value: "be",    flag: "🇧🇪" },
      { label: "Switzerland",    value: "ch",    flag: "🇨🇭" },
      { label: "United Kingdom", value: "uk",    flag: "🇬🇧" },
      { label: "Other country",  value: "other", flag: "🌍" },
    ],
  },
  fr: {
    title: "Où vas-tu t'installer ?",
    sub: "Choisis ton pays de destination",
    step: "Étape 3 sur 4",
    back: "Retour",
    next: "Continuer",
    selectPlaceholder: "Sélectionner...",
    cityPlaceholder: "Ex: Lyon, Montréal, Bruxelles...",
    motivation: {
      us:    { emoji: "🇺🇸", title: "USA — Le rêve américain !", msg: "Kuabo va te guider — SSN, Green Card, logement, emploi et bien plus." },
      fr:    { emoji: "🇫🇷", title: "France — Bienvenue !", msg: "Kuabo va t'aider — titre de séjour, CAF, CPAM et plus." },
      ca:    { emoji: "🇨🇦", title: "Canada — Excellent choix !", msg: "Kuabo va te guider — NAS, santé, logement et plus." },
      be:    { emoji: "🇧🇪", title: "Belgique — Bienvenue !", msg: "Kuabo va t'aider — titre de séjour, CPAS, emploi et plus." },
      ch:    { emoji: "🇨🇭", title: "Suisse — C'est parti !", msg: "Kuabo va t'aider — permis B, AVS, logement et plus." },
      uk:    { emoji: "🇬🇧", title: "Royaume-Uni — Bienvenue !", msg: "Kuabo va te guider — BRP, NHS, National Insurance et plus." },
      other: { emoji: "🌍", title: "Où que tu ailles !", msg: "Kuabo va te guider à chaque étape de ton parcours." },
    },
    countries: [
      { label: "États-Unis",   value: "us",    flag: "🇺🇸" },
      { label: "France",       value: "fr",    flag: "🇫🇷" },
      { label: "Canada",       value: "ca",    flag: "🇨🇦" },
      { label: "Belgique",     value: "be",    flag: "🇧🇪" },
      { label: "Suisse",       value: "ch",    flag: "🇨🇭" },
      { label: "Royaume-Uni",  value: "uk",    flag: "🇬🇧" },
      { label: "Autre pays",   value: "other", flag: "🌍" },
    ],
  },
  es: {
    title: "¿A dónde vas a instalarte?",
    sub: "Elige tu país de destino",
    step: "Paso 3 de 4",
    back: "Atrás",
    next: "Continuar",
    selectPlaceholder: "Seleccionar...",
    cityPlaceholder: "Ej: Madrid, Montreal, Londres...",
    motivation: {
      us:    { emoji: "🇺🇸", title: "¡EE.UU. — El sueño americano!", msg: "Kuabo te guiará — SSN, Green Card, vivienda, trabajo y más." },
      fr:    { emoji: "🇫🇷", title: "¡Francia — Bienvenido!", msg: "Kuabo te ayudará — titre de séjour, CAF, CPAM y más." },
      ca:    { emoji: "🇨🇦", title: "¡Canadá — Excelente elección!", msg: "Kuabo te guiará — SIN, salud, vivienda y más." },
      be:    { emoji: "🇧🇪", title: "¡Bélgica — Bienvenido!", msg: "Kuabo te ayudará — permiso de residencia, CPAS, trabajo y más." },
      ch:    { emoji: "🇨🇭", title: "¡Suiza — Vamos!", msg: "Kuabo te ayudará — permiso B, AVS, vivienda y más." },
      uk:    { emoji: "🇬🇧", title: "¡Reino Unido — Bienvenido!", msg: "Kuabo te guiará — BRP, NHS, National Insurance y más." },
      other: { emoji: "🌍", title: "¡Donde vayas!", msg: "Kuabo te guiará en cada paso de tu camino." },
    },
    countries: [
      { label: "Estados Unidos", value: "us",    flag: "🇺🇸" },
      { label: "Francia",        value: "fr",    flag: "🇫🇷" },
      { label: "Canadá",         value: "ca",    flag: "🇨🇦" },
      { label: "Bélgica",        value: "be",    flag: "🇧🇪" },
      { label: "Suiza",          value: "ch",    flag: "🇨🇭" },
      { label: "Reino Unido",    value: "uk",    flag: "🇬🇧" },
      { label: "Otro país",      value: "other", flag: "🌍" },
    ],
  },
};

// ══════════════════════════════════════════════
// MOTIVATION OVERLAY
// ══════════════════════════════════════════════
function MotivationOverlay({ lang, value, onDone }: {
  lang: Lang; value: string; onDone: () => void;
}) {
  const mot = T[lang].motivation[value] || T[lang].motivation.other;
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 100);
    const t2 = setTimeout(() => setStep(2), 500);
    const t3 = setTimeout(() => setStep(3), 1200);
    const t4 = setTimeout(onDone, 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onDone]);

  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.4,
    dur: 1.2 + Math.random() * 0.8,
    color: ["#e8b84b","#22c55e","#2dd4bf","#f97316","#a78bfa"][i % 5],
    size: 6 + Math.random() * 8,
  }));

  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cardPop {
          0%   { transform: translate(-50%,-50%) scale(0.5); opacity: 0; }
          60%  { transform: translate(-50%,-50%) scale(1.05); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
        }
        @keyframes emojiPop {
          0%   { transform: scale(0); }
          60%  { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes slideUp {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes barFill {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>

      <div onClick={onDone} style={{
        position: "fixed", inset: 0,
        background: "rgba(11,15,26,0.92)",
        backdropFilter: "blur(6px)",
        zIndex: 9998, cursor: "pointer",
        animation: "overlayIn 0.3s ease forwards",
      }} />

      {step >= 1 && particles.map(p => (
        <div key={p.id} style={{
          position: "fixed",
          left: p.x + "%", top: "-20px",
          width: p.size, height: p.size,
          borderRadius: "50%", background: p.color,
          zIndex: 9999, pointerEvents: "none",
          animation: `confettiFall ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}

      <div style={{
        position: "fixed", top: "50%", left: "50%",
        zIndex: 10000, width: 300,
        animation: "cardPop 0.5s cubic-bezier(.34,1.56,.64,1) forwards",
        pointerEvents: "none",
      }}>
        <div style={{
          background: "linear-gradient(135deg, #0f1521, #1a2438)",
          border: "1.5px solid rgba(232,184,75,0.4)",
          borderRadius: 24, padding: "32px 24px 28px",
          textAlign: "center",
          boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
        }}>
          {step >= 1 && (
            <div style={{
              fontSize: 64, marginBottom: 16,
              display: "inline-block",
              animation: "emojiPop 0.4s cubic-bezier(.34,1.56,.64,1) forwards",
            }}>
              {mot.emoji}
            </div>
          )}
          {step >= 2 && (
            <div style={{
              fontSize: 20, fontWeight: 800, color: "#e8b84b",
              marginBottom: 10, animation: "slideUp 0.4s ease forwards",
            }}>
              {mot.title}
            </div>
          )}
          {step >= 3 && (
            <div style={{
              fontSize: 13, color: "rgba(244,241,236,0.7)",
              lineHeight: 1.6, marginBottom: 20,
              animation: "slideUp 0.4s ease forwards",
            }}>
              {mot.msg}
            </div>
          )}
          <div style={{ height: 3, background: "#1e2a3a", borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              background: "linear-gradient(to right, #e8b84b, #2dd4bf)",
              borderRadius: 3, animation: "barFill 2.8s linear forwards",
            }} />
          </div>
          <div style={{ fontSize: 10, color: "#333", marginTop: 8 }}>
            {lang === "fr" ? "Tape pour continuer" : lang === "es" ? "Toca para continuar" : "Tap to continue"}
          </div>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════
// STEP 3
// ══════════════════════════════════════════════
export default function Step3() {
  const router = useRouter();

  const [lang, setLang]                     = useState<Lang>("en");
  const [ready, setReady]                   = useState(false);
  const [mounted, setMounted]               = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [showMotivation, setShowMotivation] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedRegion, setSelectedRegion]   = useState("");
  const [cityInput, setCityInput]             = useState("");

  useEffect(() => {
    const savedLang = localStorage.getItem("lang") as Lang;
    if (savedLang && ["en","fr","es"].includes(savedLang)) setLang(savedLang);

    const timeout = setTimeout(() => {
      setReady(true);
      setTimeout(() => setMounted(true), 50);
    }, 5000);

    const unsub = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeout);
      if (!user) { window.location.href = "/login"; return; }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data() as any;
          const userLang = (data?.lang as Lang) || savedLang || "en";
          setLang(userLang);
          localStorage.setItem("lang", userLang);
        }
      } catch { /* continue */ }
      setReady(true);
      setTimeout(() => setMounted(true), 50);
    });

    return () => { clearTimeout(timeout); unsub(); };
  }, []);

  // ── Reset région quand on change de pays
  const handleSelectCountry = (value: string) => {
    setSelectedCountry(value);
    setSelectedRegion("");
    setCityInput("");
  };

  const changeLang = async (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem("lang", newLang);
    const user = auth.currentUser;
    if (user) {
      try { await updateDoc(doc(db, "users", user.uid), { lang: newLang }); }
      catch { /* continue */ }
    }
  };

  const handleNext = async () => {
    if (!selectedCountry || saving) return;
    const regionValue = selectedCountry === "other" ? cityInput : selectedRegion;
    if (!regionValue) return;

    setSaving(true);
    try {
      localStorage.setItem("country", selectedCountry);
      localStorage.setItem("region", regionValue);
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          country: selectedCountry,
          region: regionValue,
        });
      }
    } catch { /* continue */ }
    setShowMotivation(true);
  };

  const handleMotivationDone = () => {
    setShowMotivation(false);
    window.location.href = "/onboarding/step4";
  };

  const text = T[lang];
  const regionData = selectedCountry ? REGIONS[selectedCountry] : null;

  const canContinue = selectedCountry &&
    (selectedCountry === "other" ? cityInput.trim().length > 0 : selectedRegion !== "");

  if (!ready) return <div style={{ minHeight: "100dvh", background: "#0b0f1a" }} />;

  return (
    <div style={container}>

      {showMotivation && (
        <MotivationOverlay lang={lang} value={selectedCountry} onDone={handleMotivationDone} />
      )}

      <div style={bgGlow} />

      {/* Header */}
      <div style={headerStyle}>
        <button style={backBtn} onClick={() => window.location.href = "/onboarding/step2"}>
          ← {text.back}
        </button>
        <div style={logoStyle}>
          <span style={{ color: "#e8b84b" }}>Ku</span>
          <span style={{ color: "#f4f1ec" }}>abo</span>
        </div>
        <div style={{ display: "flex", gap: 10, fontSize: 20, cursor: "pointer" }}>
          <span onClick={() => changeLang("fr")}>🇫🇷</span>
          <span onClick={() => changeLang("en")}>🇺🇸</span>
          <span onClick={() => changeLang("es")}>🇪🇸</span>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1, display: "flex",
        justifyContent: "center", alignItems: "center",
        padding: "88px 20px 40px",
      }}>
        <div style={{
          width: "100%", maxWidth: 420,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.5s ease",
        }}>

          {/* Progress */}
          <div style={{ marginBottom: 24 }}>
            <div style={progressTrack}>
              <div style={{ ...progressFill, width: "75%" }} />
            </div>
            <span style={progressLabel}>{text.step}</span>
          </div>

          <h2 style={titleStyle}>{text.title}</h2>
          <p style={subStyle}>{text.sub}</p>

          {/* Pays */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {text.countries.map((c: any) => {
              const active = selectedCountry === c.value;
              return (
                <div key={c.value}>
                  <button
                    onClick={() => handleSelectCountry(c.value)}
                    style={{
                      ...optionBtn,
                      background: active ? "rgba(232,184,75,0.1)" : "#0f1521",
                      border: "1.5px solid " + (active ? "#e8b84b" : "#1e2a3a"),
                      transform: active ? "scale(1.01)" : "scale(1)",
                    }}
                  >
                    <div style={optionIcon}>{c.flag}</div>
                    <span style={{
                      fontSize: 15, fontWeight: active ? 600 : 400,
                      color: active ? "#e8b84b" : "#f4f1ec",
                      flex: 1, textAlign: "left",
                      transition: "color 0.2s",
                    }}>
                      {c.label}
                    </span>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%",
                      border: "2px solid " + (active ? "#e8b84b" : "#2a3448"),
                      background: active ? "#e8b84b" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, transition: "all 0.2s",
                    }}>
                      {active && <span style={{ fontSize: 11, color: "#000", fontWeight: 800 }}>✓</span>}
                    </div>
                  </button>

                  {/* ── Sous-menu qui apparaît en dessous du pays sélectionné ── */}
                  {active && regionData && (
                    <div style={{
                      marginTop: 8,
                      padding: "16px",
                      background: "#0b0f1a",
                      border: "1.5px solid rgba(232,184,75,0.25)",
                      borderRadius: 14,
                      animation: "slideDown 0.3s ease forwards",
                    }}>
                      <div style={{
                        fontSize: 12, color: "#e8b84b",
                        fontWeight: 600, marginBottom: 10,
                        letterSpacing: "0.05em",
                      }}>
                        📍 {regionData.label[lang]}
                      </div>

                      {/* Champ texte pour "Autre" */}
                      {c.value === "other" ? (
                        <input
                          placeholder={text.cityPlaceholder}
                          value={cityInput}
                          onChange={e => setCityInput(e.target.value)}
                          style={inputStyle}
                        />
                      ) : (
                        /* Dropdown pour les pays avec liste */
                        <select
                          value={selectedRegion}
                          onChange={e => setSelectedRegion(e.target.value)}
                          style={selectStyle}
                        >
                          <option value="">{text.selectPlaceholder}</option>
                          {regionData.options.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bouton */}
          <button
            onClick={handleNext}
            disabled={!canContinue || saving}
            style={{
              ...nextBtn,
              opacity: canContinue && !saving ? 1 : 0.4,
              marginTop: 24,
            }}
          >
            {saving && !showMotivation ? (
              <svg width="20" height="20" viewBox="0 0 20 20"
                style={{ animation: "spin 1s linear infinite" }}>
                <circle cx="10" cy="10" r="8" fill="none"
                  stroke="#000" strokeWidth="2.5" strokeOpacity="0.3" />
                <circle cx="10" cy="10" r="8" fill="none"
                  stroke="#000" strokeWidth="2.5"
                  strokeLinecap="round" strokeDasharray="50" strokeDashoffset="38" />
              </svg>
            ) : text.next + " →"}
          </button>

        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        button:active { transform: scale(0.98) !important; }
        select option { background: #141d2e; color: #f4f1ec; }
        input::placeholder { color: #444; }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════
const container: CSSProperties = {
  minHeight: "100dvh",
  background: "#0b0f1a", color: "#f4f1ec",
  display: "flex", flexDirection: "column",
  position: "relative", overflow: "hidden",
};
const bgGlow: CSSProperties = {
  position: "absolute", top: "-10%", left: "50%",
  transform: "translateX(-50%)",
  width: 500, height: 400,
  background: "radial-gradient(ellipse, rgba(232,184,75,0.06), transparent 65%)",
  pointerEvents: "none",
};
const headerStyle: CSSProperties = {
  position: "fixed", top: 0, left: 0, right: 0,
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "14px 20px",
  background: "rgba(11,15,26,0.95)",
  backdropFilter: "blur(12px)",
  borderBottom: "1px solid #1e2a3a",
  zIndex: 100,
};
const backBtn: CSSProperties = {
  background: "none", border: "none",
  color: "#aaa", cursor: "pointer",
  fontSize: 14, fontFamily: "inherit",
};
const logoStyle: CSSProperties = {
  fontWeight: 900, fontSize: 20, fontFamily: "serif",
};
const progressTrack: CSSProperties = {
  height: 3, background: "#1e2a3a",
  borderRadius: 3, overflow: "hidden", marginBottom: 8,
};
const progressFill: CSSProperties = {
  height: "100%",
  background: "linear-gradient(to right, #e8b84b, #2dd4bf)",
  borderRadius: 3, transition: "width 0.5s ease",
};
const progressLabel: CSSProperties = {
  fontSize: 11, color: "#555",
  letterSpacing: "0.08em", textTransform: "uppercase",
};
const titleStyle: CSSProperties = {
  fontSize: 22, fontWeight: 700,
  margin: "0 0 8px", color: "#f4f1ec",
};
const subStyle: CSSProperties = {
  fontSize: 13, color: "#aaa",
  margin: "0 0 20px", lineHeight: 1.5,
};
const optionBtn: CSSProperties = {
  display: "flex", alignItems: "center",
  gap: 14, padding: "14px 16px",
  borderRadius: 14, cursor: "pointer",
  fontFamily: "inherit", textAlign: "left",
  width: "100%", transition: "all 0.2s ease",
};
const optionIcon: CSSProperties = {
  width: 44, height: 44, borderRadius: 12,
  background: "#141d2e", border: "1px solid #1e2a3a",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 24, flexShrink: 0,
};
const selectStyle: CSSProperties = {
  width: "100%", padding: "12px 14px",
  background: "#141d2e", border: "1px solid #2a3448",
  borderRadius: 10, color: "#f4f1ec",
  fontSize: 14, fontFamily: "inherit",
};
const inputStyle: CSSProperties = {
  width: "100%", padding: "12px 14px",
  background: "#141d2e", border: "1px solid #2a3448",
  borderRadius: 10, color: "#f4f1ec",
  fontSize: 14, fontFamily: "inherit",
  outline: "none", boxSizing: "border-box",
};
const nextBtn: CSSProperties = {
  width: "100%", padding: "15px",
  background: "#e8b84b", color: "#000",
  border: "none", borderRadius: 14,
  fontWeight: 700, fontSize: 15,
  cursor: "pointer", fontFamily: "inherit",
  display: "flex", alignItems: "center", justifyContent: "center",
  transition: "opacity 0.2s",
  boxShadow: "0 8px 24px rgba(232,184,75,0.15)",
};