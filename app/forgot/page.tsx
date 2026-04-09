"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { LockOpen, Mail, Loader2 } from "lucide-react";
import type { CSSProperties } from "react";

type Lang = "en" | "fr" | "es";

const T = {
  en: {
    title: "Forgot password?",
    sub: "Enter your email and we'll send you a reset link",
    email: "Email address",
    btn: "Send reset link",
    loading: "Sending...",
    success: "📩 Email sent! Check your inbox and spam folder.",
    redirect: "Redirecting to login in a few seconds...",
    errorEmpty: "Please enter your email address",
    errorNotFound: "No account found with this email",
    errorGeneral: "Something went wrong. Try again.",
    back: "Back to login",
    remember: "Remembered your password?",
    login: "Sign in",
  },
  fr: {
    title: "Mot de passe oublié ?",
    sub: "Entre ton email et on t'envoie un lien de réinitialisation",
    email: "Adresse email",
    btn: "Envoyer le lien",
    loading: "Envoi en cours...",
    success: "📩 Email envoyé ! Vérifie ta boîte et tes spams.",
    redirect: "Redirection vers la connexion dans quelques secondes...",
    errorEmpty: "Entre ton adresse email",
    errorNotFound: "Aucun compte trouvé avec cet email",
    errorGeneral: "Une erreur est survenue. Réessaie.",
    back: "Retour à la connexion",
    remember: "Tu te souviens de ton mot de passe ?",
    login: "Se connecter",
  },
  es: {
    title: "¿Olvidaste tu contraseña?",
    sub: "Ingresa tu correo y te enviaremos un enlace de recuperación",
    email: "Correo electrónico",
    btn: "Enviar enlace",
    loading: "Enviando...",
    success: "📩 ¡Email enviado! Revisa tu bandeja y spam.",
    redirect: "Redirigiendo al inicio de sesión en unos segundos...",
    errorEmpty: "Ingresa tu dirección de correo",
    errorNotFound: "No existe una cuenta con este correo",
    errorGeneral: "Algo salió mal. Inténtalo de nuevo.",
    back: "Volver al inicio de sesión",
    remember: "¿Recuerdas tu contraseña?",
    login: "Iniciar sesión",
  },
};

export default function Forgot() {
  const router = useRouter();

  const [lang, setLang]         = useState<Lang>("en");
  const [langReady, setLangReady] = useState(false);
  const [email, setEmail]       = useState("");
  const [message, setMessage]   = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [mounted, setMounted]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [countdown, setCountdown] = useState(8);

  const errorRef   = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  const text = T[lang];

  // ── Lang
  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang;
    setLang(saved || "en");
    setLangReady(true);
    setTimeout(() => setMounted(true), 50);
  }, []);

  // ── Scroll vers erreur
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [error]);

  useEffect(() => {
    if (message && successRef.current) {
      successRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [message]);

  // ── Countdown après envoi
  useEffect(() => {
    if (!sent) return;
    if (countdown <= 0) {
      router.replace("/login");
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [sent, countdown, router]);

  // ── Reset password
  const handleReset = async () => {
    setError(""); setMessage("");
    if (!email) { setError(text.errorEmpty); return; }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage(text.success);
      setSent(true);
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        setError(text.errorNotFound);
      } else if (err.code === "auth/invalid-email") {
        setError(text.errorEmpty);
      } else {
        setError(text.errorGeneral);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleReset();
  };

  if (!langReady) return <div style={loaderStyle} />;

  return (
    <div style={container}>

      {/* Background glow */}
      <div style={bgGlow} />

      {/* Header fixe */}
      <div style={headerStyle}>
        <div style={logoStyle}>
          <span style={{ color: "#e8b84b" }}>Ku</span>
          <span style={{ color: "#f4f1ec" }}>abo</span>
        </div>
        <button style={backBtn} onClick={() => router.push("/login")}>
          ← {text.back}
        </button>
      </div>

      {/* Card */}
      <div style={{
        ...card,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(24px)",
        transition: "all 0.5s ease",
      }}>

        {/* Icon */}
        <div style={iconCircle}>
          <LockOpen size={26} color="#e8b84b" />
        </div>

        {/* Title */}
        <h2 style={titleStyle}>{text.title}</h2>
        <p style={subStyle}>{text.sub}</p>

        {/* Si email envoyé — affiche le succès */}
        {sent ? (
          <>
            <div ref={successRef} style={successBox}>
              <div style={{ fontSize: 32, marginBottom: 12, textAlign: "center" }}>📩</div>
              <div style={{ fontWeight: 600, marginBottom: 6, textAlign: "center" }}>
                {lang === "fr" ? "Email envoyé !" : lang === "es" ? "¡Email enviado!" : "Email sent!"}
              </div>
              <div style={{ fontSize: 13, color: "rgba(34,197,94,0.8)", textAlign: "center", lineHeight: 1.6 }}>
                {lang === "fr"
                  ? "Vérifie ta boîte de réception et tes spams."
                  : lang === "es"
                  ? "Revisa tu bandeja de entrada y spam."
                  : "Check your inbox and spam folder."
                }
              </div>
            </div>

            {/* Countdown */}
            <div style={countdownBox}>
              <div style={{ fontSize: 12, color: "#aaa", marginBottom: 8 }}>
                {lang === "fr" ? "Redirection dans" : lang === "es" ? "Redirigiendo en" : "Redirecting in"}
              </div>
              <div style={{
                fontSize: 36, fontWeight: 800,
                color: "#e8b84b", lineHeight: 1,
              }}>
                {countdown}
              </div>
              <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>
                {lang === "fr" ? "secondes" : lang === "es" ? "segundos" : "seconds"}
              </div>
              {/* Barre de progression */}
              <div style={{ marginTop: 12, height: 4, background: "#1e2a3a", borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: (countdown / 8 * 100) + "%",
                  background: "linear-gradient(to right, #e8b84b, #2dd4bf)",
                  borderRadius: 4,
                  transition: "width 1s linear",
                }} />
              </div>
            </div>

            <button style={loginBtn} onClick={() => router.replace("/login")}>
              {lang === "fr" ? "Aller à la connexion →" : lang === "es" ? "Ir al inicio de sesión →" : "Go to login →"}
            </button>
          </>
        ) : (
          <>
            {/* Error */}
            {error && (
              <div ref={errorRef} style={errorBox}>
                ⚠️ {error}
              </div>
            )}

            {/* Email input */}
            <div style={inputWrap}>
              <Mail size={16} color="#555" />
              <input
                type="email"
                placeholder={text.email}
                style={inputStyle}
                value={email}
                autoComplete="email"
                onChange={e => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>

            {/* Send button */}
            <button
              style={{ ...sendBtn, opacity: loading ? 0.8 : 1 }}
              onClick={handleReset}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite", marginRight: 8 }} />
                  {text.loading}
                </>
              ) : (
                text.btn
              )}
            </button>

            {/* Back to login */}
            <div style={bottomText}>
              <span style={{ color: "#aaa" }}>{text.remember} </span>
              <span style={linkStyle} onClick={() => router.push("/login")}>
                {text.login}
              </span>
            </div>
          </>
        )}

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #444; }
        input { font-size: 16px !important; }
        button:active { transform: scale(0.98); }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════
const container: CSSProperties = {
  minHeight: "100dvh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  background: "#0b0f1a",
  color: "#f4f1ec",
  padding: "80px 16px 40px",
  position: "relative",
  overflow: "hidden",
};
const bgGlow: CSSProperties = {
  position: "absolute",
  top: 0, left: "50%",
  transform: "translateX(-50%)",
  width: 600, height: 400,
  background: "radial-gradient(ellipse, rgba(232,184,75,0.07), transparent 70%)",
  pointerEvents: "none",
};
const headerStyle: CSSProperties = {
  position: "fixed",
  top: 0, left: 0, right: 0,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 20px",
  background: "rgba(11,15,26,0.95)",
  backdropFilter: "blur(12px)",
  borderBottom: "1px solid #1e2a3a",
  zIndex: 100,
};
const logoStyle: CSSProperties = {
  fontWeight: 900, fontSize: 22,
  fontFamily: "serif",
};
const backBtn: CSSProperties = {
  background: "none", border: "none",
  color: "#aaa", cursor: "pointer",
  fontSize: 13, fontFamily: "inherit",
};
const card: CSSProperties = {
  width: "100%", maxWidth: 360,
  background: "#0f1521",
  border: "1px solid #1e2a3a",
  borderRadius: 20,
  padding: "32px 24px 28px",
  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
  position: "relative",
  zIndex: 1,
};
const iconCircle: CSSProperties = {
  width: 56, height: 56, borderRadius: "50%",
  background: "rgba(232,184,75,0.1)",
  border: "1px solid rgba(232,184,75,0.25)",
  display: "flex", justifyContent: "center", alignItems: "center",
  margin: "0 auto 20px",
};
const titleStyle: CSSProperties = {
  textAlign: "center", margin: "0 0 6px",
  fontSize: 22, fontWeight: 700, color: "#f4f1ec",
};
const subStyle: CSSProperties = {
  textAlign: "center", margin: "0 0 24px",
  fontSize: 13, color: "#aaa", lineHeight: 1.5,
};
const inputWrap: CSSProperties = {
  display: "flex", alignItems: "center", gap: 10,
  background: "#141d2e",
  border: "1px solid #1e2a3a",
  borderRadius: 12, padding: "0 14px", marginBottom: 14,
};
const inputStyle: CSSProperties = {
  flex: 1, height: 46,
  background: "transparent", border: "none",
  color: "#f4f1ec", outline: "none", fontSize: 15,
  fontFamily: "inherit",
};
const sendBtn: CSSProperties = {
  width: "100%", padding: "14px",
  background: "#e8b84b", color: "#000",
  border: "none", borderRadius: 12,
  fontWeight: 700, fontSize: 15, cursor: "pointer",
  fontFamily: "inherit",
  display: "flex", alignItems: "center", justifyContent: "center",
};
const loginBtn: CSSProperties = {
  width: "100%", padding: "13px",
  background: "#1a2438",
  border: "1px solid #2a3448",
  borderRadius: 12, cursor: "pointer",
  color: "#f4f1ec", fontSize: 14, fontWeight: 500,
  fontFamily: "inherit",
  display: "flex", alignItems: "center", justifyContent: "center",
  marginTop: 12,
};
const errorBox: CSSProperties = {
  background: "rgba(239,68,68,0.08)",
  border: "1px solid rgba(239,68,68,0.25)",
  borderRadius: 10, padding: "12px 14px",
  marginBottom: 14, color: "#ef4444",
  fontSize: 13, lineHeight: 1.6,
};
const successBox: CSSProperties = {
  background: "rgba(34,197,94,0.08)",
  border: "1px solid rgba(34,197,94,0.25)",
  borderRadius: 14, padding: "20px 16px",
  marginBottom: 16, color: "#22c55e",
};
const countdownBox: CSSProperties = {
  background: "#0b0f1a",
  border: "1px solid #1e2a3a",
  borderRadius: 14, padding: "16px",
  marginBottom: 16, textAlign: "center",
};
const linkStyle: CSSProperties = {
  color: "#e8b84b", cursor: "pointer",
  textDecoration: "underline", fontSize: 13,
};
const bottomText: CSSProperties = {
  textAlign: "center", marginTop: 20, fontSize: 13,
};
const loaderStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#0b0f1a",
};