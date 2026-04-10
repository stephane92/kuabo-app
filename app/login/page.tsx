"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Mail, Lock, Loader2, LogIn, Eye, EyeOff } from "lucide-react";
import type { CSSProperties } from "react";

type Lang = "en" | "fr" | "es";

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const T = {
  en: {
    title: "Welcome back",
    sub: "Sign in to continue your journey",
    email: "Email address",
    pass: "Password",
    btn: "Sign in",
    loading: "Signing in...",
    google: "Continue with Google",
    or: "or",
    required: "All fields are required",
    invalid: "Invalid email or password",
    invalidEmail: "Please enter a valid email address",
    verifyText: "Please verify your email — ",
    resend: "resend email",
    sent: "✅ Verification email sent",
    resendError: "Error sending email. Try again.",
    noAccount: "Don't have an account?",
    signup: "Create account",
    forgot: "Forgot password?",
    back: "Back",
    successMsg: "Login successful! Redirecting...",
    tooMany: "Too many attempts. Try again later.",
    popupBlocked: "Popup blocked. Please allow popups.",
    googleError: "Google error. Please try again.",
    terms: "By signing in, you agree to our",
    termsLink: "Terms of Service",
    and: "and",
    privacyLink: "Privacy Policy",
  },
  fr: {
    title: "Bon retour",
    sub: "Connecte-toi pour continuer ton parcours",
    email: "Adresse email",
    pass: "Mot de passe",
    btn: "Se connecter",
    loading: "Connexion...",
    google: "Continuer avec Google",
    or: "ou",
    required: "Tous les champs sont obligatoires",
    invalid: "Email ou mot de passe incorrect",
    invalidEmail: "Écris une adresse email valide",
    verifyText: "Vérifie ton email — ",
    resend: "renvoyer l'email",
    sent: "✅ Email de vérification envoyé",
    resendError: "Erreur lors de l'envoi. Réessaie.",
    noAccount: "Pas encore de compte ?",
    signup: "Créer un compte",
    forgot: "Mot de passe oublié ?",
    back: "Retour",
    successMsg: "Connexion réussie ! Redirection...",
    tooMany: "Trop de tentatives. Réessaie plus tard.",
    popupBlocked: "Popup bloqué. Autorise les popups.",
    googleError: "Erreur Google. Réessaie.",
    terms: "En te connectant, tu acceptes nos",
    termsLink: "Conditions d'utilisation",
    and: "et notre",
    privacyLink: "Politique de confidentialité",
  },
  es: {
    title: "Bienvenido de vuelta",
    sub: "Inicia sesión para continuar",
    email: "Correo electrónico",
    pass: "Contraseña",
    btn: "Iniciar sesión",
    loading: "Iniciando sesión...",
    google: "Continuar con Google",
    or: "o",
    required: "Todos los campos son obligatorios",
    invalid: "Correo o contraseña incorrectos",
    invalidEmail: "Escribe una dirección de correo válida",
    verifyText: "Verifica tu correo — ",
    resend: "reenviar email",
    sent: "✅ Email de verificación enviado",
    resendError: "Error al enviar. Inténtalo de nuevo.",
    noAccount: "¿No tienes cuenta?",
    signup: "Crear cuenta",
    forgot: "¿Olvidaste tu contraseña?",
    back: "Atrás",
    successMsg: "¡Sesión iniciada! Redirigiendo...",
    tooMany: "Demasiados intentos. Inténtalo más tarde.",
    popupBlocked: "Popup bloqueado. Permite los popups.",
    googleError: "Error de Google. Inténtalo de nuevo.",
    terms: "Al iniciar sesión, aceptas nuestros",
    termsLink: "Términos de Servicio",
    and: "y nuestra",
    privacyLink: "Política de Privacidad",
  },
};

function LoadingScreen({ lang }: { lang: Lang }) {
  const msgs = {
    en: ["Verifying your account...", "Loading your data...", "Almost there..."],
    fr: ["Vérification du compte...", "Chargement des données...", "Presque prêt..."],
    es: ["Verificando tu cuenta...", "Cargando tus datos...", "Casi listo..."],
  };
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setIdx(i => (i + 1) % 3), 600);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{ position:"fixed", inset:0, background:"#0b0f1a", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:24, zIndex:9999 }}>
      <div style={{ fontSize:36, fontWeight:900, fontFamily:"serif" }}>
        <span style={{ color:"#e8b84b" }}>Ku</span>
        <span style={{ color:"#f4f1ec" }}>abo</span>
      </div>
      <svg width="52" height="52" viewBox="0 0 52 52" style={{ animation:"spin 1s linear infinite" }}>
        <circle cx="26" cy="26" r="20" fill="none" stroke="#1e2a3a" strokeWidth="4" />
        <circle cx="26" cy="26" r="20" fill="none" stroke="#e8b84b" strokeWidth="4" strokeLinecap="round" strokeDasharray="126" strokeDashoffset="96" />
      </svg>
      <div style={{ fontSize:14, color:"#aaa", textAlign:"center", padding:"0 40px" }}>{msgs[lang][idx]}</div>
      <div style={{ display:"flex", gap:6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:i===idx%3?"#e8b84b":"#1e2a3a", transition:"background 0.3s" }} />
        ))}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function Login() {
  const router = useRouter();

  const [lang, setLang]                   = useState<Lang>("en");
  const [checkingAuth, setCheckingAuth]   = useState(true);
  const [email, setEmail]                 = useState("");
  const [password, setPassword]           = useState("");
  const [showPass, setShowPass]           = useState(false);
  const [error, setError]                 = useState("");
  const [success, setSuccess]             = useState("");
  const [loading, setLoading]             = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [mounted, setMounted]             = useState(false);
  const [showLoader, setShowLoader]       = useState(false);
  const [emailTouched, setEmailTouched]   = useState(false);

  const emailValid = !emailTouched || email === "" || isValidEmail(email);
  const errorRef   = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const googleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const text = T[lang];

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior:"smooth", block:"center" });
    }
  }, [error]);

  useEffect(() => {
    if (success && successRef.current) {
      successRef.current.scrollIntoView({ behavior:"smooth", block:"center" });
    }
  }, [success]);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  useEffect(() => {
    return () => {
      if (googleTimeoutRef.current) clearTimeout(googleTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const savedLang = localStorage.getItem("lang") as Lang;
      setLang(savedLang || "en");
      setCheckingAuth(false);
    }, 3000);

    const unsub = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeout);
      if (user && user.emailVerified) {
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) {
            const data = snap.data() as any;
            localStorage.setItem("userName", data.name || "User");
            if (data.lang) localStorage.setItem("lang", data.lang);
            setShowLoader(true);
            setTimeout(() => {
              window.location.href = data.onboardingCompleted ? "/dashboard" : "/welcome";
            }, 1200);
            return;
          }
        } catch { /* continue */ }
      }
      const savedLang = localStorage.getItem("lang") as Lang;
      setLang(savedLang || "en");
      setCheckingAuth(false);
    });

    return () => { clearTimeout(timeout); unsub(); };
  }, []);

  const redirectWithLoader = (destination: string) => {
    setShowLoader(true);
    setTimeout(() => { window.location.href = destination; }, 1200);
  };

  const redirectUser = async (uid: string) => {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        const data = snap.data() as any;
        if (data.lang) localStorage.setItem("lang", data.lang);
        localStorage.setItem("userName", data.name || "User");
        redirectWithLoader(data.onboardingCompleted ? "/dashboard" : "/welcome");
      } else {
        redirectWithLoader("/welcome");
      }
    } catch {
      redirectWithLoader("/dashboard");
    }
  };

  const handleLogin = async () => {
    setError(""); setSuccess("");
    if (!email || !password) { setError(text.required); return; }
    if (!isValidEmail(email)) { setError(text.invalidEmail); return; }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!cred.user.emailVerified) {
        setError("verify");
        setLoading(false);
        return;
      }
      setSuccess(text.successMsg);
      await redirectUser(cred.user.uid);
    } catch (err: any) {
      switch (err.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
          setError(text.invalid); break;
        case "auth/invalid-email":
          setError(text.invalidEmail); break;
        case "auth/too-many-requests":
          setError(text.tooMany); break;
        default:
          setError(text.invalid);
      }
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(""); setSuccess("");
    if (googleLoading) { setGoogleLoading(false); return; }
    setGoogleLoading(true);
    googleTimeoutRef.current = setTimeout(() => { setGoogleLoading(false); }, 30000);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const cred = await signInWithPopup(auth, provider);
      if (googleTimeoutRef.current) clearTimeout(googleTimeoutRef.current);
      const user = cred.user;
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          name: user.displayName || "",
          email: user.email || "",
          completedSteps: [],
          lang,
          onboardingCompleted: false,
          createdAt: new Date().toISOString(),
        });
        redirectWithLoader("/welcome");
        return;
      }
      const data = snap.data() as any;
      if (data.lang) localStorage.setItem("lang", data.lang);
      localStorage.setItem("userName", data.name || user.displayName || "User");
      redirectWithLoader(data.onboardingCompleted ? "/dashboard" : "/welcome");
    } catch (err: any) {
      if (googleTimeoutRef.current) clearTimeout(googleTimeoutRef.current);
      if (
        err.code === "auth/popup-closed-by-user" ||
        err.code === "auth/cancelled-popup-request"
      ) { setGoogleLoading(false); return; }
      if (err.code === "auth/popup-blocked") { setError(text.popupBlocked); setGoogleLoading(false); return; }
      if (err.code === "auth/too-many-requests") { setError(text.tooMany); setGoogleLoading(false); return; }
      setError(text.googleError);
      setGoogleLoading(false);
    }
  };

  const resendEmail = async () => {
    try {
      const user = auth.currentUser;
      if (!user) { setError(text.invalid); return; }
      await sendEmailVerification(user);
      setSuccess(text.sent);
      setError("");
    } catch (err: any) {
      setError(err.code === "auth/too-many-requests" ? text.tooMany : text.resendError);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  if (showLoader) return <LoadingScreen lang={lang} />;
  if (checkingAuth) return <div style={{ minHeight:"100dvh", background:"#0b0f1a" }} />;

  return (
    <div style={container}>
      <div style={bgGlow} />

      <div style={headerStyle}>
        <div style={logoStyle}>
          <span style={{ color:"#e8b84b" }}>Ku</span>
          <span style={{ color:"#f4f1ec" }}>abo</span>
        </div>
        <button style={backBtn} onClick={() => router.push("/home")}>
          ← {text.back}
        </button>
      </div>

      <div style={{ ...card, opacity:mounted?1:0, transform:mounted?"translateY(0)":"translateY(24px)", transition:"all 0.5s ease" }}>
        <div style={iconCircle}>
          <LogIn size={26} color="#e8b84b" />
        </div>

        <h2 style={titleStyle}>{text.title}</h2>
        <p style={subStyle}>{text.sub}</p>

        {/* Google */}
        <button
          style={{ ...googleBtn, opacity:googleLoading?0.7:1 }}
          onClick={handleGoogle}
          disabled={loading}
        >
          {googleLoading ? (
            <Loader2 size={18} style={{ animation:"spin 1s linear infinite" }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.5 2.6 13.5l7.8 6.1C12.3 13.1 17.7 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 6.9-10 6.9-17z"/>
              <path fill="#FBBC05" d="M10.4 28.4A14.6 14.6 0 0 1 9.5 24c0-1.5.2-3 .6-4.4L2.3 13.5A23.9 23.9 0 0 0 0 24c0 3.8.9 7.4 2.5 10.6l7.9-6.2z"/>
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.2 1.5-5 2.3-8.4 2.3-6.3 0-11.7-4.2-13.6-9.9l-7.9 6.1C6.5 42.5 14.6 48 24 48z"/>
            </svg>
          )}
          {googleLoading
            ? (lang==="fr"?"Connexion...":lang==="es"?"Conectando...":"Signing in...")
            : text.google
          }
        </button>

        <div style={separator}>
          <div style={sepLine} />
          <span style={sepText}>{text.or}</span>
          <div style={sepLine} />
        </div>

        {/* Email */}
        <div style={{ ...inputWrap, borderColor:!emailValid?"#ef4444":"#1e2a3a" }}>
          <Mail size={16} color={!emailValid?"#ef4444":"#555"} />
          <input
            placeholder={text.email}
            style={inputStyle}
            value={email}
            type="email"
            autoComplete="email"
            onChange={e => setEmail(e.target.value)}
            onBlur={() => setEmailTouched(true)}
            onKeyDown={handleKeyDown}
          />
          {emailTouched && email && (
            <span style={{ fontSize:14, flexShrink:0 }}>
              {isValidEmail(email) ? "✅" : "❌"}
            </span>
          )}
        </div>

        {!emailValid && (
          <div style={{ fontSize:11, color:"#ef4444", marginTop:-6, marginBottom:8, paddingLeft:4 }}>
            ⚠️ {text.invalidEmail}
          </div>
        )}

        {/* Password */}
        <div style={inputWrap}>
          <Lock size={16} color="#555" />
          <input
            type={showPass?"text":"password"}
            placeholder={text.pass}
            style={inputStyle}
            value={password}
            autoComplete="current-password"
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div onClick={() => setShowPass(!showPass)} style={{ cursor:"pointer", color:"#555", display:"flex", padding:"4px" }}>
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </div>
        </div>

        {/* Forgot */}
        <div style={{ textAlign:"right", marginBottom:16, marginTop:-4 }}>
          <span style={linkStyle} onClick={() => router.push("/forgot")}>{text.forgot}</span>
        </div>

        {/* Errors */}
        {error === "verify" && (
          <div ref={errorRef} style={errorBox}>
            ⚠️ {text.verifyText}
            <span style={linkStyle} onClick={resendEmail}>{text.resend}</span>
          </div>
        )}
        {error && error !== "verify" && (
          <div ref={errorRef} style={errorBox}>⚠️ {error}</div>
        )}
        {success && (
          <div ref={successRef} style={successBox}>{success}</div>
        )}

        {/* Login button */}
        <button
          style={{ ...loginBtn, opacity:loading?0.8:1 }}
          onClick={handleLogin}
          disabled={loading || googleLoading}
        >
          {loading ? (
            <>
              <Loader2 size={16} style={{ animation:"spin 1s linear infinite", marginRight:8 }} />
              {text.loading}
            </>
          ) : text.btn}
        </button>

        {/* ✅ FIX — Terms et Privacy avec router.push au lieu de window.open */}
        <div style={{ textAlign:"center", marginTop:16, fontSize:11, color:"#555", lineHeight:1.6 }}>
          {text.terms}{" "}
          <span
            style={{ color:"#e8b84b", cursor:"pointer", textDecoration:"underline" }}
            onClick={() => router.push("/terms")}
          >
            {text.termsLink}
          </span>
          {" "}{text.and}{" "}
          <span
            style={{ color:"#e8b84b", cursor:"pointer", textDecoration:"underline" }}
            onClick={() => router.push("/privacy")}
          >
            {text.privacyLink}
          </span>
        </div>

        {/* Sign up */}
        <div style={bottomText}>
          <span style={{ color:"#aaa" }}>{text.noAccount} </span>
          <span style={linkStyle} onClick={() => router.push("/signup")}>{text.signup}</span>
        </div>
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

const container: CSSProperties     = { minHeight:"100dvh", display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", background:"#0b0f1a", color:"#f4f1ec", padding:"80px 16px 40px", position:"relative", overflow:"hidden" };
const bgGlow: CSSProperties        = { position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:600, height:400, background:"radial-gradient(ellipse, rgba(232,184,75,0.07), transparent 70%)", pointerEvents:"none" };
const headerStyle: CSSProperties   = { position:"fixed", top:0, left:0, right:0, display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 20px", background:"rgba(11,15,26,0.95)", backdropFilter:"blur(12px)", borderBottom:"1px solid #1e2a3a", zIndex:100 };
const logoStyle: CSSProperties     = { fontWeight:900, fontSize:22, fontFamily:"serif" };
const backBtn: CSSProperties       = { background:"none", border:"none", color:"#aaa", cursor:"pointer", fontSize:13, fontFamily:"inherit" };
const card: CSSProperties          = { width:"100%", maxWidth:360, background:"#0f1521", border:"1px solid #1e2a3a", borderRadius:20, padding:"32px 24px 28px", boxShadow:"0 20px 60px rgba(0,0,0,0.5)", position:"relative", zIndex:1 };
const iconCircle: CSSProperties    = { width:56, height:56, borderRadius:"50%", background:"rgba(232,184,75,0.1)", border:"1px solid rgba(232,184,75,0.25)", display:"flex", justifyContent:"center", alignItems:"center", margin:"0 auto 20px" };
const titleStyle: CSSProperties    = { textAlign:"center", margin:"0 0 6px", fontSize:22, fontWeight:700, color:"#f4f1ec" };
const subStyle: CSSProperties      = { textAlign:"center", margin:"0 0 24px", fontSize:13, color:"#aaa", lineHeight:1.5 };
const googleBtn: CSSProperties     = { width:"100%", padding:"13px", background:"#1a2438", border:"1px solid #2a3448", borderRadius:12, cursor:"pointer", color:"#f4f1ec", fontSize:14, fontWeight:500, display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:16, fontFamily:"inherit" };
const separator: CSSProperties     = { display:"flex", alignItems:"center", gap:12, marginBottom:16 };
const sepLine: CSSProperties       = { flex:1, height:1, background:"#1e2a3a" };
const sepText: CSSProperties       = { fontSize:11, color:"#555", letterSpacing:"0.05em" };
const inputWrap: CSSProperties     = { display:"flex", alignItems:"center", gap:10, background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:12, padding:"0 14px", marginBottom:10, transition:"border-color 0.2s" };
const inputStyle: CSSProperties    = { flex:1, height:46, background:"transparent", border:"none", color:"#f4f1ec", outline:"none", fontSize:15, fontFamily:"inherit" };
const loginBtn: CSSProperties      = { width:"100%", padding:"14px", background:"#e8b84b", color:"#000", border:"none", borderRadius:12, fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", marginTop:4 };
const errorBox: CSSProperties      = { background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, padding:"12px 14px", marginBottom:12, color:"#ef4444", fontSize:13, lineHeight:1.6 };
const successBox: CSSProperties    = { background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:10, padding:"12px 14px", marginBottom:12, color:"#22c55e", fontSize:13 };
const linkStyle: CSSProperties     = { color:"#e8b84b", cursor:"pointer", textDecoration:"underline", fontSize:13 };
const bottomText: CSSProperties    = { textAlign:"center", marginTop:16, fontSize:13 };
