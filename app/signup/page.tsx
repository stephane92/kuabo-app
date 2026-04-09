"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { UserPlus, Mail, Lock, User, Loader2, Eye, EyeOff } from "lucide-react";
import type { CSSProperties } from "react";

type Lang = "en" | "fr" | "es";

const T = {
  en: {
    title: "Create account",
    sub: "Join Kuabo and start your journey in the USA",
    name: "Full name",
    email: "Email address",
    pass: "Password",
    btn: "Create account",
    back: "Back",
    required: "All fields are required",
    exist: "An account already exists with this email",
    passError: "Password must be at least 6 characters",
    loading: "Creating your account...",
    verify: "Check your email to verify your account before signing in.",
    already: "Already have an account?",
    login: "Sign in",
    goLogin: "Go to login →",
    terms: "I agree to the",
    termsLink: "Terms of Service",
    and: "and",
    privacyLink: "Privacy Policy",
    termsRequired: "You must accept the terms to continue",
  },
  fr: {
    title: "Créer un compte",
    sub: "Rejoins Kuabo et commence ton parcours aux USA",
    name: "Nom complet",
    email: "Adresse email",
    pass: "Mot de passe",
    btn: "Créer mon compte",
    back: "Retour",
    required: "Tous les champs sont obligatoires",
    exist: "Un compte existe déjà avec cet email",
    passError: "Le mot de passe doit avoir au moins 6 caractères",
    loading: "Création du compte...",
    verify: "Vérifie ton email pour activer ton compte avant de te connecter.",
    already: "Déjà un compte ?",
    login: "Se connecter",
    goLogin: "Aller à la connexion →",
    terms: "J'accepte les",
    termsLink: "Conditions d'utilisation",
    and: "et la",
    privacyLink: "Politique de confidentialité",
    termsRequired: "Tu dois accepter les conditions pour continuer",
  },
  es: {
    title: "Crear cuenta",
    sub: "Únete a Kuabo y empieza tu camino en EE.UU.",
    name: "Nombre completo",
    email: "Correo electrónico",
    pass: "Contraseña",
    btn: "Crear mi cuenta",
    back: "Atrás",
    required: "Todos los campos son obligatorios",
    exist: "Ya existe una cuenta con este correo",
    passError: "La contraseña debe tener al menos 6 caracteres",
    loading: "Creando tu cuenta...",
    verify: "Revisa tu correo para verificar tu cuenta antes de iniciar sesión.",
    already: "¿Ya tienes cuenta?",
    login: "Iniciar sesión",
    goLogin: "Ir al inicio de sesión →",
    terms: "Acepto los",
    termsLink: "Términos de Servicio",
    and: "y la",
    privacyLink: "Política de Privacidad",
    termsRequired: "Debes aceptar los términos para continuar",
  },
};

export default function Signup() {
  const router = useRouter();

  const [lang, setLang]           = useState<Lang>("en");
  const [langReady, setLangReady] = useState(false);
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [mounted, setMounted]     = useState(false);
  const [done, setDone]           = useState(false);
  const [countdown, setCountdown] = useState(6);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const errorRef   = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const cardRef    = useRef<HTMLDivElement>(null);
  const text = T[lang];

  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang;
    setLang(saved || "en");
    setLangReady(true);
    setTimeout(() => setMounted(true), 50);
  }, []);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior:"smooth", block:"center" });
    }
  }, [error]);

  useEffect(() => {
    if (done) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      setTimeout(() => {
        if (successRef.current) {
          successRef.current.scrollIntoView({ behavior:"smooth", block:"start" });
        }
        window.scrollTo({ top:0, behavior:"smooth" });
      }, 150);
    }
  }, [done]);

  useEffect(() => {
    if (!done) return;
    if (countdown <= 0) { router.replace("/login"); return; }
    const t = setTimeout(() => setCountdown(c => c-1), 1000);
    return () => clearTimeout(t);
  }, [done, countdown, router]);

  const handleSignup = async () => {
    setError("");
    if (!name.trim() || !email.trim() || !password) {
      setError(text.required); return;
    }
    if (password.length < 6) {
      setError(text.passError); return;
    }
    if (!termsAccepted) {
      setError(text.termsRequired); return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = cred.user;
      await sendEmailVerification(user);
      await setDoc(doc(db, "users", user.uid), {
        name: name.trim(),
        email: email.trim(),
        lang,
        completedSteps: [],
        onboardingCompleted: false,
        termsAccepted: true,
        termsAcceptedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("userName", name.trim());
      localStorage.setItem("lang", lang);
      await signOut(auth);
      setDone(true);
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError(text.exist);
      } else {
        setError(text.required);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !done) handleSignup();
  };

  const getStrength = () => {
    if (password.length === 0) return null;
    if (password.length < 6) return "weak";
    if (password.length < 10) return "medium";
    return "strong";
  };
  const strength = getStrength();
  const strengthColor = { weak:"#ef4444", medium:"#f97316", strong:"#22c55e" }[strength||"weak"];
  const strengthLabel = { weak:{ fr:"Faible", en:"Weak", es:"Débil" }, medium:{ fr:"Moyen", en:"Medium", es:"Medio" }, strong:{ fr:"Fort", en:"Strong", es:"Fuerte" } }[strength||"weak"]?.[lang];

  if (!langReady) return <div style={loaderStyle} />;

  return (
    <div style={container}>
      <div style={bgGlow} />

      <div style={headerStyle}>
        <div style={logoStyle}><span style={{ color:"#e8b84b" }}>Ku</span><span style={{ color:"#f4f1ec" }}>abo</span></div>
        <button style={backBtn} onClick={() => router.push("/home")}>← {text.back}</button>
      </div>

      <div ref={cardRef} style={{ ...card, opacity:mounted?1:0, transform:mounted?"translateY(0)":"translateY(24px)", transition:"all 0.5s ease" }}>

        {done ? (
          <div ref={successRef}>
            <div style={{ width:72, height:72, borderRadius:"50%", background:"rgba(34,197,94,0.1)", border:"2px solid rgba(34,197,94,0.3)", display:"flex", justifyContent:"center", alignItems:"center", margin:"0 auto 20px", fontSize:36 }}>✅</div>
            <h2 style={{ ...titleStyle, color:"#22c55e" }}>
              {lang==="fr"?"Compte créé !":lang==="es"?"¡Cuenta creada!":"Account created!"}
            </h2>
            <div style={successBox}>
              <div style={{ fontSize:28, textAlign:"center", marginBottom:10 }}>📩</div>
              <div style={{ fontSize:14, textAlign:"center", lineHeight:1.7, color:"#22c55e" }}>{text.verify}</div>
            </div>
            <div style={countdownBox}>
              <div style={{ fontSize:12, color:"#aaa", marginBottom:6 }}>
                {lang==="fr"?"Redirection dans":lang==="es"?"Redirigiendo en":"Redirecting in"}
              </div>
              <div style={{ fontSize:40, fontWeight:800, color:"#e8b84b", lineHeight:1 }}>{countdown}</div>
              <div style={{ fontSize:12, color:"#aaa", marginTop:4 }}>
                {lang==="fr"?"secondes":lang==="es"?"segundos":"seconds"}
              </div>
              <div style={{ marginTop:12, height:4, background:"#1e2a3a", borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", width:(countdown/6*100)+"%", background:"linear-gradient(to right, #e8b84b, #2dd4bf)", borderRadius:4, transition:"width 1s linear" }} />
              </div>
            </div>
            <button style={loginBtn} onClick={() => router.replace("/login")}>{text.goLogin}</button>
          </div>
        ) : (
          <>
            <div style={iconCircle}><UserPlus size={26} color="#e8b84b" /></div>
            <h2 style={titleStyle}>{text.title}</h2>
            <p style={subStyle}>{text.sub}</p>

            {error && <div ref={errorRef} style={errorBox}>⚠️ {error}</div>}

            <div style={inputWrap}>
              <User size={16} color="#555" />
              <input placeholder={text.name} style={inputStyle} value={name} autoComplete="name" onChange={e => setName(e.target.value)} onKeyDown={handleKeyDown} />
            </div>

            <div style={inputWrap}>
              <Mail size={16} color="#555" />
              <input placeholder={text.email} style={inputStyle} value={email} type="email" autoComplete="email" onChange={e => setEmail(e.target.value)} onKeyDown={handleKeyDown} />
            </div>

            <div style={inputWrap}>
              <Lock size={16} color="#555" />
              <input type={showPass?"text":"password"} placeholder={text.pass} style={inputStyle} value={password} autoComplete="new-password" onChange={e => setPassword(e.target.value)} onKeyDown={handleKeyDown} />
              <div onClick={() => setShowPass(!showPass)} style={{ cursor:"pointer", color:"#555", display:"flex", padding:"4px" }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </div>
            </div>

            {password.length > 0 && (
              <div style={{ marginBottom:14, marginTop:-4 }}>
                <div style={{ display:"flex", gap:4, marginBottom:4 }}>
                  {["weak","medium","strong"].map((s,i) => (
                    <div key={s} style={{ flex:1, height:3, borderRadius:3, background:(strength==="weak"&&i===0?"#ef4444":strength==="medium"&&i<=1?"#f97316":strength==="strong"?"#22c55e":"#1e2a3a"), transition:"background 0.3s" }} />
                  ))}
                </div>
                <div style={{ fontSize:11, color:strengthColor, fontWeight:500 }}>{strengthLabel}</div>
              </div>
            )}

            {/* ✅ CHECKBOX TERMS */}
            <div
              onClick={() => setTermsAccepted(!termsAccepted)}
              style={{
                display:"flex", alignItems:"flex-start", gap:12,
                marginBottom:20, cursor:"pointer",
                padding:"12px 14px",
                background: termsAccepted ? "rgba(232,184,75,0.06)" : "#141d2e",
                border: "1px solid " + (termsAccepted ? "rgba(232,184,75,0.3)" : "#1e2a3a"),
                borderRadius:12,
                transition:"all 0.2s",
              }}
            >
              {/* Custom checkbox */}
              <div style={{
                width:20, height:20, borderRadius:6, flexShrink:0, marginTop:1,
                background: termsAccepted ? "#e8b84b" : "transparent",
                border: "2px solid " + (termsAccepted ? "#e8b84b" : "#555"),
                display:"flex", alignItems:"center", justifyContent:"center",
                transition:"all 0.2s",
              }}>
                {termsAccepted && (
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4L4 7.5L10 1" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>

              {/* Text */}
              <div style={{ fontSize:12, color:"#aaa", lineHeight:1.6 }}>
                {text.terms}{" "}
                <span
                  style={{ color:"#e8b84b", textDecoration:"underline", cursor:"pointer" }}
                  onClick={e => { e.stopPropagation(); window.open("/terms","_blank"); }}
                >
                  {text.termsLink}
                </span>
                {" "}{text.and}{" "}
                <span
                  style={{ color:"#e8b84b", textDecoration:"underline", cursor:"pointer" }}
                  onClick={e => { e.stopPropagation(); window.open("/privacy","_blank"); }}
                >
                  {text.privacyLink}
                </span>
              </div>
            </div>

            <button
              style={{ ...signupBtn, opacity: loading||!termsAccepted ? 0.6 : 1 }}
              onClick={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <><Loader2 size={16} style={{ animation:"spin 1s linear infinite", marginRight:8 }} />{text.loading}</>
              ) : text.btn}
            </button>

            <div style={bottomText}>
              <span style={{ color:"#aaa" }}>{text.already} </span>
              <span style={linkStyle} onClick={() => router.push("/login")}>{text.login}</span>
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

const container: CSSProperties    = { minHeight:"100dvh", display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", background:"#0b0f1a", color:"#f4f1ec", padding:"80px 16px 40px", position:"relative", overflow:"hidden" };
const bgGlow: CSSProperties       = { position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:600, height:400, background:"radial-gradient(ellipse, rgba(232,184,75,0.07), transparent 70%)", pointerEvents:"none" };
const headerStyle: CSSProperties  = { position:"fixed", top:0, left:0, right:0, display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 20px", background:"rgba(11,15,26,0.95)", backdropFilter:"blur(12px)", borderBottom:"1px solid #1e2a3a", zIndex:100 };
const logoStyle: CSSProperties    = { fontWeight:900, fontSize:22, fontFamily:"serif" };
const backBtn: CSSProperties      = { background:"none", border:"none", color:"#aaa", cursor:"pointer", fontSize:13, fontFamily:"inherit" };
const card: CSSProperties         = { width:"100%", maxWidth:360, background:"#0f1521", border:"1px solid #1e2a3a", borderRadius:20, padding:"32px 24px 28px", boxShadow:"0 20px 60px rgba(0,0,0,0.5)", position:"relative", zIndex:1 };
const iconCircle: CSSProperties   = { width:56, height:56, borderRadius:"50%", background:"rgba(232,184,75,0.1)", border:"1px solid rgba(232,184,75,0.25)", display:"flex", justifyContent:"center", alignItems:"center", margin:"0 auto 20px" };
const titleStyle: CSSProperties   = { textAlign:"center", margin:"0 0 20px", fontSize:22, fontWeight:700, color:"#f4f1ec" };
const subStyle: CSSProperties     = { textAlign:"center", margin:"0 0 24px", fontSize:13, color:"#aaa", lineHeight:1.5 };
const inputWrap: CSSProperties    = { display:"flex", alignItems:"center", gap:10, background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:12, padding:"0 14px", marginBottom:10 };
const inputStyle: CSSProperties   = { flex:1, height:46, background:"transparent", border:"none", color:"#f4f1ec", outline:"none", fontSize:15, fontFamily:"inherit" };
const signupBtn: CSSProperties    = { width:"100%", padding:"14px", background:"#e8b84b", color:"#000", border:"none", borderRadius:12, fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", marginTop:4 };
const loginBtn: CSSProperties     = { width:"100%", padding:"13px", background:"#1a2438", border:"1px solid #2a3448", borderRadius:12, cursor:"pointer", color:"#f4f1ec", fontSize:14, fontWeight:500, fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", marginTop:12 };
const errorBox: CSSProperties     = { background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, padding:"12px 14px", marginBottom:14, color:"#ef4444", fontSize:13, lineHeight:1.6 };
const successBox: CSSProperties   = { background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:14, padding:"20px 16px", marginBottom:16 };
const countdownBox: CSSProperties = { background:"#0b0f1a", border:"1px solid #1e2a3a", borderRadius:14, padding:"16px", marginBottom:16, textAlign:"center" };
const linkStyle: CSSProperties    = { color:"#e8b84b", cursor:"pointer", textDecoration:"underline", fontSize:13 };
const bottomText: CSSProperties   = { textAlign:"center", marginTop:20, fontSize:13 };
const loaderStyle: CSSProperties  = { minHeight:"100vh", background:"#0b0f1a" };