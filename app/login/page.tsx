"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  sendEmailVerification,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { Mail, Lock, Loader2, LogIn, Eye, EyeOff } from "lucide-react";
import type { CSSProperties } from "react";

type Lang = "en" | "fr" | "es";

const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// ✅ Détecte iOS/Safari — doit utiliser redirect au lieu de popup
const isMobileSafari = () => {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua) || (
    /Safari/i.test(ua) && !/Chrome/i.test(ua) && !/CriOS/i.test(ua)
  );
};

const T = {
  fr: {
    title:"Bon retour", sub:"Connecte-toi pour continuer ton parcours",
    email:"Adresse email", pass:"Mot de passe", btn:"Se connecter", loading:"Connexion...",
    google:"Continuer avec Google", googleLoading:"Connexion Google...", or:"ou",
    required:"Tous les champs sont obligatoires", invalid:"Email ou mot de passe incorrect",
    invalidEmail:"Écris une adresse email valide",
    verifyText:"Vérifie ton email — ", resend:"renvoyer l'email",
    sent:"✅ Email de vérification envoyé", resendError:"Erreur. Réessaie.",
    noAccount:"Pas encore de compte ?", signup:"Créer un compte",
    forgot:"Mot de passe oublié ?", back:"Retour",
    successMsg:"Connexion réussie !",
    tooMany:"Trop de tentatives. Réessaie plus tard.",
    googleError:"Erreur Google. Réessaie.",
    terms:"En te connectant, tu acceptes nos", termsLink:"Conditions d'utilisation",
    and:"et notre", privacyLink:"Politique de confidentialité",
  },
  en: {
    title:"Welcome back", sub:"Sign in to continue your journey",
    email:"Email address", pass:"Password", btn:"Sign in", loading:"Signing in...",
    google:"Continue with Google", googleLoading:"Google sign in...", or:"or",
    required:"All fields are required", invalid:"Invalid email or password",
    invalidEmail:"Please enter a valid email address",
    verifyText:"Please verify your email — ", resend:"resend email",
    sent:"✅ Verification email sent", resendError:"Error sending email. Try again.",
    noAccount:"Don't have an account?", signup:"Create account",
    forgot:"Forgot password?", back:"Back",
    successMsg:"Login successful!",
    tooMany:"Too many attempts. Try again later.",
    googleError:"Google error. Please try again.",
    terms:"By signing in, you agree to our", termsLink:"Terms of Service",
    and:"and", privacyLink:"Privacy Policy",
  },
  es: {
    title:"Bienvenido de vuelta", sub:"Inicia sesión para continuar",
    email:"Correo electrónico", pass:"Contraseña", btn:"Iniciar sesión", loading:"Iniciando...",
    google:"Continuar con Google", googleLoading:"Conexión Google...", or:"o",
    required:"Todos los campos son obligatorios", invalid:"Correo o contraseña incorrectos",
    invalidEmail:"Escribe una dirección de correo válida",
    verifyText:"Verifica tu correo — ", resend:"reenviar email",
    sent:"✅ Email de verificación enviado", resendError:"Error al enviar.",
    noAccount:"¿No tienes cuenta?", signup:"Crear cuenta",
    forgot:"¿Olvidaste tu contraseña?", back:"Atrás",
    successMsg:"¡Sesión iniciada!",
    tooMany:"Demasiados intentos.",
    googleError:"Error de Google. Inténtalo.",
    terms:"Al iniciar sesión, aceptas nuestros", termsLink:"Términos de Servicio",
    and:"y nuestra", privacyLink:"Política de Privacidad",
  },
};

// ── Loading screen ──────────────────────────────────────
function LoadingScreen({ lang }: { lang: Lang }) {
  const msgs = {
    fr: ["Vérification...", "Chargement...", "Presque prêt..."],
    en: ["Verifying...", "Loading...", "Almost there..."],
    es: ["Verificando...", "Cargando...", "Casi listo..."],
  };
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setIdx(i => (i + 1) % 3), 700);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{ position:"fixed", inset:0, background:"#0b0f1a", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20, zIndex:9999 }}>
      <div style={{ fontSize:32, fontWeight:900, fontFamily:"serif" }}>
        <span style={{ color:"#e8b84b" }}>Ku</span><span style={{ color:"#f4f1ec" }}>abo</span>
      </div>
      <svg width="44" height="44" viewBox="0 0 44 44" style={{ animation:"spin 1s linear infinite" }}>
        <circle cx="22" cy="22" r="17" fill="none" stroke="#1e2a3a" strokeWidth="4"/>
        <circle cx="22" cy="22" r="17" fill="none" stroke="#e8b84b" strokeWidth="4" strokeLinecap="round" strokeDasharray="107" strokeDashoffset="80"/>
      </svg>
      <p style={{ fontSize:13, color:"#aaa" }}>{msgs[lang][idx]}</p>
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  );
}

// ── Résoudre le user et retourner la destination ────────
// ✅ Ne redirige JAMAIS si Firestore échoue — retourne null
async function resolveUser(user: any, lang: Lang): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, "users", user.uid));

    if (!snap.exists()) {
      // Nouveau user Google — créer le doc
      const name = user.displayName || user.email?.split("@")[0] || "User";
      await setDoc(doc(db, "users", user.uid), {
        name,
        email:               user.email || "",
        completedSteps:      [],
        lang,
        onboardingCompleted: false,
        createdAt:           new Date().toISOString(),
      });
      localStorage.setItem("userName", name);
      return "/welcome";
    }

    const data = snap.data() as any;

    // ✅ Réparer le nom "***" si nécessaire
    const rawName = data?.name;
    const name = (!rawName || rawName === "***")
      ? (user.displayName || user.email?.split("@")[0] || "User")
      : rawName;

    if (!rawName || rawName === "***") {
      updateDoc(doc(db, "users", user.uid), { name, deleted: false }).catch(() => {});
    }

    if (data?.lang) localStorage.setItem("lang", data.lang);
    localStorage.setItem("userName", name);

    return data?.onboardingCompleted ? "/dashboard" : "/welcome";

  } catch (err) {
    // ✅ Ne pas rediriger en cas d'erreur Firestore — afficher une erreur
    console.error("Firestore resolveUser error:", err);
    return null; // null = erreur, pas de redirection
  }
}

// ══════════════════════════════════════════════
// LOGIN PAGE
// ══════════════════════════════════════════════
export default function Login() {
  const router = useRouter();

  const [lang,          setLang]          = useState<Lang>("fr");
  const [checkingAuth,  setCheckingAuth]  = useState(true);
  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [showPass,      setShowPass]      = useState(false);
  const [error,         setError]         = useState("");
  const [success,       setSuccess]       = useState("");
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [mounted,       setMounted]       = useState(false);
  const [showLoader,    setShowLoader]    = useState(false);
  const [emailTouched,  setEmailTouched]  = useState(false);

  const emailValid = !emailTouched || email === "" || isValidEmail(email);
  const errorRef   = useRef<HTMLDivElement>(null);
  const text       = T[lang];

  useEffect(() => {
    if (error && errorRef.current)
      errorRef.current.scrollIntoView({ behavior:"smooth", block:"center" });
  }, [error]);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  // ── Vérifier si déjà connecté + résultat redirect Google ──
  useEffect(() => {
    const savedLang = (localStorage.getItem("lang") as Lang) || "fr";
    if (["fr","en","es"].includes(savedLang)) setLang(savedLang);

    const timeout = setTimeout(() => setCheckingAuth(false), 2000);

    const init = async () => {
      // ✅ Vérifier d'abord si on revient d'un redirect Google (Safari/mobile)
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          clearTimeout(timeout);
          setShowLoader(true);
          const dest = await resolveUser(result.user, savedLang);
          if (dest) {
            window.location.href = dest;
          } else {
            setShowLoader(false);
            setCheckingAuth(false);
            setError(T[savedLang].googleError);
          }
          return;
        }
      } catch (err: any) {
        // Pas de redirect result — normal
      }

      // Vérifier si déjà connecté
      const unsub = onAuthStateChanged(auth, async user => {
        clearTimeout(timeout);
        if (!user) { setCheckingAuth(false); return; }

        const isGoogle = user.providerData?.some(p => p.providerId === "google.com");
        if (!user.emailVerified && !isGoogle) { setCheckingAuth(false); return; }

        setShowLoader(true);
        const dest = await resolveUser(user, savedLang);
        if (dest) {
          window.location.href = dest;
        } else {
          setShowLoader(false);
          setCheckingAuth(false);
          setError(T[savedLang].googleError);
        }
      });

      return () => { clearTimeout(timeout); unsub(); };
    };

    init();
    return () => clearTimeout(timeout);
  }, []);

  // ── Login email/password ────────────────────────────────
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
      setShowLoader(true);
      const dest = await resolveUser(cred.user, lang);
      if (dest) {
        window.location.href = dest;
      } else {
        setShowLoader(false);
        setLoading(false);
        setError(text.invalid);
      }
    } catch (err: any) {
      switch (err.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":    setError(text.invalid);      break;
        case "auth/invalid-email":     setError(text.invalidEmail); break;
        case "auth/too-many-requests": setError(text.tooMany);      break;
        default:                       setError(text.invalid);
      }
      setLoading(false);
    }
  };

  // ── Login Google ───────────────────────────────────────
  const handleGoogle = async () => {
    if (googleLoading || loading) return;
    setError("");
    setGoogleLoading(true);

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    // ✅ Sur iPhone/Safari → redirect (popup bloqué)
    // Sur desktop/Chrome → popup (plus rapide)
    if (isMobileSafari()) {
      try {
        await signInWithRedirect(auth, provider);
        // La page va se recharger — getRedirectResult s'en occupe
      } catch {
        setError(text.googleError);
        setGoogleLoading(false);
      }
      return;
    }

    // Desktop → popup
    try {
      const cred = await signInWithPopup(auth, provider);
      setShowLoader(true);
      const dest = await resolveUser(cred.user, lang);
      if (dest) {
        window.location.href = dest;
      } else {
        setShowLoader(false);
        setGoogleLoading(false);
        setError(text.googleError);
      }
    } catch (err: any) {
      if (
        err.code === "auth/popup-closed-by-user" ||
        err.code === "auth/cancelled-popup-request"
      ) {
        setGoogleLoading(false);
        return;
      }
      setError(text.googleError);
      setGoogleLoading(false);
    }
  };

  const resendEmail = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      await sendEmailVerification(user);
      setSuccess(text.sent);
      setError("");
    } catch (err: any) {
      setError(err.code === "auth/too-many-requests" ? text.tooMany : text.resendError);
    }
  };

  if (showLoader)   return <LoadingScreen lang={lang} />;
  if (checkingAuth) return <div style={{ minHeight:"100dvh", background:"#0b0f1a" }} />;

  return (
    <div style={s.container}>
      <div style={s.bgGlow} />

      <div style={s.header}>
        <div style={s.logo}><span style={{ color:"#e8b84b" }}>Ku</span><span style={{ color:"#f4f1ec" }}>abo</span></div>
        <button style={s.backBtn} onClick={() => router.push("/home")}>← {text.back}</button>
      </div>

      <div style={{ ...s.card, opacity:mounted?1:0, transform:mounted?"translateY(0)":"translateY(24px)", transition:"all 0.5s ease" }}>

        <div style={s.iconCircle}><LogIn size={26} color="#e8b84b" /></div>
        <h2 style={s.title}>{text.title}</h2>
        <p  style={s.sub}>{text.sub}</p>

        {/* ── Google ── */}
        <button
          style={{ ...s.googleBtn, opacity:googleLoading?0.7:1 }}
          onClick={handleGoogle}
          disabled={loading || googleLoading}
        >
          {googleLoading ? (
            <><Loader2 size={18} style={{ animation:"spin 1s linear infinite" }} /> {text.googleLoading}</>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.5 2.6 13.5l7.8 6.1C12.3 13.1 17.7 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 6.9-10 6.9-17z"/>
                <path fill="#FBBC05" d="M10.4 28.4A14.6 14.6 0 0 1 9.5 24c0-1.5.2-3 .6-4.4L2.3 13.5A23.9 23.9 0 0 0 0 24c0 3.8.9 7.4 2.5 10.6l7.9-6.2z"/>
                <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.2 1.5-5 2.3-8.4 2.3-6.3 0-11.7-4.2-13.6-9.9l-7.9 6.1C6.5 42.5 14.6 48 24 48z"/>
              </svg>
              {text.google}
            </>
          )}
        </button>

        <div style={s.separator}><div style={s.sepLine}/><span style={s.sepText}>{text.or}</span><div style={s.sepLine}/></div>

        {/* ── Email ── */}
        <div style={{ ...s.inputWrap, borderColor:!emailValid?"#ef4444":"#1e2a3a" }}>
          <Mail size={16} color={!emailValid?"#ef4444":"#555"} />
          <input
            placeholder={text.email} value={email} type="email" autoComplete="email"
            onChange={e => setEmail(e.target.value)}
            onBlur={() => setEmailTouched(true)}
            onKeyDown={e => e.key==="Enter" && handleLogin()}
            style={s.input}
          />
          {emailTouched && email && <span style={{ fontSize:14 }}>{isValidEmail(email)?"✅":"❌"}</span>}
        </div>
        {!emailValid && <div style={{ fontSize:11, color:"#ef4444", marginTop:-6, marginBottom:8, paddingLeft:4 }}>⚠️ {text.invalidEmail}</div>}

        {/* ── Password ── */}
        <div style={s.inputWrap}>
          <Lock size={16} color="#555" />
          <input
            type={showPass?"text":"password"} placeholder={text.pass} value={password}
            autoComplete="current-password"
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key==="Enter" && handleLogin()}
            style={s.input}
          />
          <div onClick={() => setShowPass(!showPass)} style={{ cursor:"pointer", color:"#555", display:"flex", padding:4 }}>
            {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
          </div>
        </div>

        <div style={{ textAlign:"right", marginBottom:16, marginTop:-4 }}>
          <span style={s.link} onClick={() => router.push("/forgot")}>{text.forgot}</span>
        </div>

        {/* ── Erreurs ── */}
        {error === "verify" && (
          <div ref={errorRef} style={s.errorBox}>
            ⚠️ {text.verifyText}
            <span style={s.link} onClick={resendEmail}>{text.resend}</span>
          </div>
        )}
        {error && error !== "verify" && <div ref={errorRef} style={s.errorBox}>⚠️ {error}</div>}
        {success && <div style={s.successBox}>{success}</div>}

        {/* ── Bouton connexion ── */}
        <button
          style={{ ...s.loginBtn, opacity:loading?0.8:1 }}
          onClick={handleLogin}
          disabled={loading || googleLoading}
        >
          {loading
            ? <><Loader2 size={16} style={{ animation:"spin 1s linear infinite", marginRight:8 }}/>{text.loading}</>
            : text.btn
          }
        </button>

        {/* Terms */}
        <div style={{ textAlign:"center", marginTop:16, fontSize:11, color:"#555", lineHeight:1.7 }}>
          {text.terms}{" "}
          <span style={s.link} onClick={() => router.push("/terms")}>{text.termsLink}</span>
          {" "}{text.and}{" "}
          <span style={s.link} onClick={() => router.push("/privacy")}>{text.privacyLink}</span>
        </div>

        <div style={s.bottomText}>
          <span style={{ color:"#aaa" }}>{text.noAccount} </span>
          <span style={s.link} onClick={() => router.push("/signup")}>{text.signup}</span>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }
        input::placeholder { color:#444 }
        input { font-size:16px !important }
        button:active { transform:scale(0.98) }
      `}</style>
    </div>
  );
}

const s: Record<string, CSSProperties> = {
  container:  { minHeight:"100dvh", display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", background:"#0b0f1a", color:"#f4f1ec", padding:"80px 16px 40px", position:"relative", overflow:"hidden" },
  bgGlow:     { position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:600, height:400, background:"radial-gradient(ellipse, rgba(232,184,75,0.07), transparent 70%)", pointerEvents:"none" },
  header:     { position:"fixed", top:0, left:0, right:0, display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 20px", background:"rgba(11,15,26,0.95)", backdropFilter:"blur(12px)", borderBottom:"1px solid #1e2a3a", zIndex:100 },
  logo:       { fontWeight:900, fontSize:22, fontFamily:"serif" },
  backBtn:    { background:"none", border:"none", color:"#aaa", cursor:"pointer", fontSize:13, fontFamily:"inherit" },
  card:       { width:"100%", maxWidth:360, background:"#0f1521", border:"1px solid #1e2a3a", borderRadius:20, padding:"32px 24px 28px", boxShadow:"0 20px 60px rgba(0,0,0,0.5)", position:"relative", zIndex:1 },
  iconCircle: { width:56, height:56, borderRadius:"50%", background:"rgba(232,184,75,0.1)", border:"1px solid rgba(232,184,75,0.25)", display:"flex", justifyContent:"center", alignItems:"center", margin:"0 auto 20px" },
  title:      { textAlign:"center", margin:"0 0 6px", fontSize:22, fontWeight:700, color:"#f4f1ec" },
  sub:        { textAlign:"center", margin:"0 0 24px", fontSize:13, color:"#aaa", lineHeight:1.5 },
  googleBtn:  { width:"100%", padding:"13px", background:"#1a2438", border:"1px solid #2a3448", borderRadius:12, cursor:"pointer", color:"#f4f1ec", fontSize:14, fontWeight:500, display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:16, fontFamily:"inherit" },
  separator:  { display:"flex", alignItems:"center", gap:12, marginBottom:16 },
  sepLine:    { flex:1, height:1, background:"#1e2a3a" },
  sepText:    { fontSize:11, color:"#555" },
  inputWrap:  { display:"flex", alignItems:"center", gap:10, background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:12, padding:"0 14px", marginBottom:10 },
  input:      { flex:1, height:46, background:"transparent", border:"none", color:"#f4f1ec", outline:"none", fontSize:16, fontFamily:"inherit" },
  loginBtn:   { width:"100%", padding:"14px", background:"#e8b84b", color:"#000", border:"none", borderRadius:12, fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", marginTop:4 },
  errorBox:   { background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, padding:"12px 14px", marginBottom:12, color:"#ef4444", fontSize:13, lineHeight:1.6 },
  successBox: { background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:10, padding:"12px 14px", marginBottom:12, color:"#22c55e", fontSize:13 },
  link:       { color:"#e8b84b", cursor:"pointer", textDecoration:"underline", fontSize:13 },
  bottomText: { textAlign:"center", marginTop:16, fontSize:13 },
};
