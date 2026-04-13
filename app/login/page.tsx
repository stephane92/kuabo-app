"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
  getRedirectResult,
} from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

type Lang = "fr" | "en" | "es";

const T: Record<Lang, Record<string, string>> = {
  fr: {
    title:"Bon retour 👋", sub:"Connecte-toi pour continuer ton parcours",
    emailPlaceholder:"Adresse email", passPlaceholder:"Mot de passe",
    btnLogin:"Se connecter", btnGoogle:"Continuer avec Google", btnLoading:"Connexion...",
    forgot:"Mot de passe oublié ?", noAccount:"Pas encore de compte ?",
    signup:"Créer un compte", back:"Retour",
    errEmpty:"Remplis tous les champs.", errInvalid:"Email ou mot de passe incorrect.",
    errEmail:"Email invalide.", errTooMany:"Trop de tentatives. Réessaie plus tard.",
    errVerify:"Vérifie ton email avant de te connecter.", errGoogle:"Erreur Google. Réessaie.",
    resend:"Renvoyer l'email de vérification", resendOk:"✅ Email renvoyé !", resendErr:"Erreur. Réessaie.",
    pwaGoogle:"Ouvrir dans Safari pour Google",
  },
  en: {
    title:"Welcome back 👋", sub:"Sign in to continue your journey",
    emailPlaceholder:"Email address", passPlaceholder:"Password",
    btnLogin:"Sign in", btnGoogle:"Continue with Google", btnLoading:"Signing in...",
    forgot:"Forgot password?", noAccount:"Don't have an account?",
    signup:"Create account", back:"Back",
    errEmpty:"Please fill in all fields.", errInvalid:"Invalid email or password.",
    errEmail:"Invalid email address.", errTooMany:"Too many attempts. Try again later.",
    errVerify:"Please verify your email before signing in.", errGoogle:"Google error. Please try again.",
    resend:"Resend verification email", resendOk:"✅ Email sent!", resendErr:"Error. Try again.",
    pwaGoogle:"Open in Safari for Google",
  },
  es: {
    title:"Bienvenido de vuelta 👋", sub:"Inicia sesión para continuar",
    emailPlaceholder:"Correo electrónico", passPlaceholder:"Contraseña",
    btnLogin:"Iniciar sesión", btnGoogle:"Continuar con Google", btnLoading:"Iniciando...",
    forgot:"¿Olvidaste tu contraseña?", noAccount:"¿No tienes cuenta?",
    signup:"Crear cuenta", back:"Atrás",
    errEmpty:"Completa todos los campos.", errInvalid:"Correo o contraseña incorrectos.",
    errEmail:"Correo electrónico inválido.", errTooMany:"Demasiados intentos. Inténtalo más tarde.",
    errVerify:"Verifica tu correo antes de iniciar sesión.", errGoogle:"Error de Google. Inténtalo de nuevo.",
    resend:"Reenviar email de verificación", resendOk:"✅ ¡Email enviado!", resendErr:"Error. Inténtalo.",
    pwaGoogle:"Abrir en Safari para Google",
  },
};

function isIOSPWA(): boolean {
  if (typeof window === "undefined") return false;
  return (window.navigator as any).standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

async function handleUserRedirect(user: any, lang: Lang): Promise<"ok" | "error"> {
  try {
    const ref  = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const name = user.displayName || user.email?.split("@")[0] || "User";
      await setDoc(ref, { name, email: user.email || "", completedSteps: [], lang, onboardingCompleted: false, createdAt: new Date().toISOString() });
      localStorage.setItem("userName", name);
      localStorage.setItem("lang", lang);
      window.location.href = "/welcome";
      return "ok";
    }
    const data = snap.data() as any;
    const name = (!data.name || data.name === "***") ? (user.displayName || user.email?.split("@")[0] || "User") : data.name;
    localStorage.setItem("userName", name);
    if (data.lang) localStorage.setItem("lang", data.lang);
    window.location.href = data.onboardingCompleted ? "/dashboard" : "/welcome";
    return "ok";
  } catch { return "error"; }
}

export default function LoginPage() {
  const router = useRouter();

  const [lang,       setLang]       = useState<Lang>("fr");
  const [email,      setEmail]      = useState("");
  const [pass,       setPass]       = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [gLoading,   setGLoading]   = useState(false);
  const [error,      setError]      = useState("");
  const [info,       setInfo]       = useState("");
  const [checking,   setChecking]   = useState(true);
  const [showVerify, setShowVerify] = useState(false);
  const [isPWA,      setIsPWA]      = useState(false);

  // ✅ Ref pour éviter double-redirect
  const redirectHandled = useRef(false);

  const t = T[lang];

  useEffect(() => {
    const saved = (localStorage.getItem("lang") as Lang) || "fr";
    if (["fr","en","es"].includes(saved)) setLang(saved);
    setIsPWA(isIOSPWA());
    setPersistence(auth, browserLocalPersistence).catch(() => {});

    let authUnsubscribed = false;

    // ✅ ÉTAPE 1 : Vérifier d'abord si on revient d'un redirect Google
    const init = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user && !redirectHandled.current) {
          redirectHandled.current = true;
          setGLoading(true);
          await handleUserRedirect(result.user, saved);
          return; // ← stop ici, pas besoin de onAuthStateChanged
        }
      } catch (err: any) {
        // auth/no-redirect-operation = pas de redirect en cours, normal
        if (err.code !== "auth/no-redirect-operation" && err.code !== "auth/null-user") {
          setError(T[saved as Lang]?.errGoogle || "Google error");
        }
      }

      // ✅ ÉTAPE 2 : Seulement si pas de redirect, écouter onAuthStateChanged
      if (authUnsubscribed) return;

      const timeout = setTimeout(() => setChecking(false), 3000);
      const unsub = onAuthStateChanged(auth, async user => {
        clearTimeout(timeout);
        if (redirectHandled.current) return; // ← éviter double traitement
        if (!user) { setChecking(false); return; }
        const isGoogle = user.providerData?.some((p: any) => p.providerId === "google.com");
        if (!user.emailVerified && !isGoogle) { setChecking(false); return; }
        if (!redirectHandled.current) {
          redirectHandled.current = true;
          setGLoading(true);
          await handleUserRedirect(user, saved);
        }
      });

      return () => { authUnsubscribed = true; clearTimeout(timeout); unsub(); };
    };

    init();
  }, []);

  const handleLogin = async () => {
    setError(""); setInfo(""); setShowVerify(false);
    if (!email.trim() || !pass) { setError(t.errEmpty); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(t.errEmail); return; }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      if (!cred.user.emailVerified) { setShowVerify(true); setError(t.errVerify); setLoading(false); return; }
      const res = await handleUserRedirect(cred.user, lang);
      if (res === "error") { setError(t.errInvalid); setLoading(false); }
    } catch (err: any) {
      setLoading(false);
      switch (err.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":    setError(t.errInvalid);  break;
        case "auth/invalid-email":     setError(t.errEmail);    break;
        case "auth/too-many-requests": setError(t.errTooMany);  break;
        default:                       setError(t.errInvalid);
      }
    }
  };

  const handleResend = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try { await sendEmailVerification(user); setInfo(t.resendOk); setError(""); }
    catch (err: any) { setError(err.code === "auth/too-many-requests" ? t.errTooMany : t.resendErr); }
  };

  const handleGoogle = async () => {
    if (gLoading || loading) return;
    setError(""); setInfo("");

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    const isIOS    = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

    if (isIOS || isSafari) {
      // ✅ iOS Safari → redirect (popup bloqué par iOS)
      try {
        const { signInWithRedirect } = await import("firebase/auth");
        await setPersistence(auth, browserLocalPersistence);
        await signInWithRedirect(auth, provider);
        // Page recharge → getRedirectResult le capte au prochain chargement
      } catch {
        setError(t.errGoogle);
      }
      return;
    }

    // ✅ Desktop/Android → popup
    setGLoading(true);
    try {
      const cred = await signInWithPopup(auth, provider);
      const res  = await handleUserRedirect(cred.user, lang);
      if (res === "error") { setError(t.errGoogle); setGLoading(false); }
    } catch (err: any) {
      setGLoading(false);
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") return;
      if (err.code === "auth/popup-blocked") {
        setError(lang === "fr" ? "Popup bloqué — utilise le bouton email" : "Popup blocked — use email instead");
        return;
      }
      setError(t.errGoogle);
    }
  };

  if (checking || gLoading) return (
    <div style={{ minHeight:"100dvh", background:"#0b0f1a", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, color:"#f4f1ec" }}>
      <div style={{ fontSize:28, fontWeight:900 }}><span style={{ color:"#e8b84b" }}>Ku</span><span style={{ color:"#f4f1ec" }}>abo</span></div>
      <svg width="40" height="40" viewBox="0 0 40 40" style={{ animation:"spin 1s linear infinite" }}>
        <circle cx="20" cy="20" r="15" fill="none" stroke="#1e2a3a" strokeWidth="4"/>
        <circle cx="20" cy="20" r="15" fill="none" stroke="#e8b84b" strokeWidth="4" strokeLinecap="round" strokeDasharray="94" strokeDashoffset="70"/>
      </svg>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight:"100dvh", background:"#0b0f1a", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"80px 16px 24px", color:"#f4f1ec" }}>

      <div style={{ position:"fixed", top:0, left:0, right:0, display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 20px", background:"rgba(11,15,26,0.95)", backdropFilter:"blur(12px)", borderBottom:"1px solid #1e2a3a", zIndex:50 }}>
        <div style={{ fontWeight:900, fontSize:20 }}><span style={{ color:"#e8b84b" }}>Ku</span><span style={{ color:"#f4f1ec" }}>abo</span></div>
        <button onClick={() => router.push("/home")} style={{ background:"none", border:"none", color:"#aaa", cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>← {t.back}</button>
      </div>

      <div style={{ width:"100%", maxWidth:380, background:"#0f1521", border:"1px solid #1e2a3a", borderRadius:20, padding:"24px 16px" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:32, marginBottom:8 }}>🔐</div>
          <h1 style={{ fontSize:22, fontWeight:700, margin:"0 0 6px", color:"#f4f1ec" }}>{t.title}</h1>
          <p style={{ fontSize:13, color:"#aaa", margin:0 }}>{t.sub}</p>
        </div>

        <button onClick={handleGoogle} disabled={loading || gLoading}
          style={{ width:"100%", padding:"13px", background:"#1a2438", border:"1px solid #2a3448", borderRadius:12, color:"#f4f1ec", fontSize:14, fontWeight:500, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:16, opacity:gLoading?0.7:1 }}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.5 2.6 13.5l7.8 6.1C12.3 13.1 17.7 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 6.9-10 6.9-17z"/>
            <path fill="#FBBC05" d="M10.4 28.4A14.6 14.6 0 0 1 9.5 24c0-1.5.2-3 .6-4.4L2.3 13.5A23.9 23.9 0 0 0 0 24c0 3.8.9 7.4 2.5 10.6l7.9-6.2z"/>
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.2 1.5-5 2.3-8.4 2.3-6.3 0-11.7-4.2-13.6-9.9l-7.9 6.1C6.5 42.5 14.6 48 24 48z"/>
          </svg>
          {isPWA ? t.pwaGoogle : t.btnGoogle}
        </button>

        {isPWA && (
          <div style={{ background:"rgba(232,184,75,.06)", border:"1px solid rgba(232,184,75,.2)", borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:12, color:"#e8b84b", lineHeight:1.6, textAlign:"center" as const }}>
            {lang==="fr"?"💡 Google ne marche pas dans l'app installée. Utilise ton email ci-dessous.":"💡 Google doesn't work in the installed app. Use your email below."}
          </div>
        )}

        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
          <div style={{ flex:1, height:1, background:"#1e2a3a" }}/><span style={{ fontSize:11, color:"#555" }}>ou</span><div style={{ flex:1, height:1, background:"#1e2a3a" }}/>
        </div>

        <input type="email" placeholder={t.emailPlaceholder} value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} autoComplete="email"
          style={{ width:"100%", padding:"13px 14px", background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:12, color:"#f4f1ec", fontSize:16, fontFamily:"inherit", outline:"none", marginBottom:10, boxSizing:"border-box" as const }}/>

        <div style={{ position:"relative", marginBottom:6 }}>
          <input type={showPass?"text":"password"} placeholder={t.passPlaceholder} value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} autoComplete="current-password"
            style={{ width:"100%", padding:"13px 44px 13px 14px", background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:12, color:"#f4f1ec", fontSize:16, fontFamily:"inherit", outline:"none", boxSizing:"border-box" as const }}/>
          <button onClick={()=>setShowPass(!showPass)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#555", fontSize:16, lineHeight:1 }}>
            {showPass?"🙈":"👁️"}
          </button>
        </div>

        <div style={{ textAlign:"right", marginBottom:16 }}>
          <span onClick={()=>router.push("/forgot")} style={{ fontSize:12, color:"#e8b84b", cursor:"pointer", textDecoration:"underline" }}>{t.forgot}</span>
        </div>

        {error && (
          <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, padding:"12px 14px", marginBottom:12, color:"#ef4444", fontSize:13, lineHeight:1.6 }}>
            ⚠️ {error}
            {showVerify && (<div style={{ marginTop:8 }}><button onClick={handleResend} style={{ background:"none", border:"none", color:"#e8b84b", cursor:"pointer", fontSize:13, fontFamily:"inherit", textDecoration:"underline", padding:0 }}>📩 {t.resend}</button></div>)}
          </div>
        )}
        {info && (<div style={{ background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:10, padding:"12px 14px", marginBottom:12, color:"#22c55e", fontSize:13 }}>{info}</div>)}

        <button onClick={handleLogin} disabled={loading||gLoading}
          style={{ width:"100%", padding:"14px", background:loading?"#c9952a":"#e8b84b", border:"none", borderRadius:12, color:"#000", fontSize:15, fontWeight:700, cursor:loading?"default":"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8, opacity:loading?0.8:1 }}>
          {loading?<>⏳ {t.btnLoading}</>:t.btnLogin}
        </button>

        <div style={{ textAlign:"center", marginTop:20, fontSize:13, color:"#aaa" }}>
          {t.noAccount}{" "}<span onClick={()=>router.push("/signup")} style={{ color:"#e8b84b", cursor:"pointer", textDecoration:"underline" }}>{t.signup}</span>
        </div>
      </div>

      <div style={{ display:"flex", gap:12, marginTop:20, fontSize:20 }}>
        {(["fr","en","es"] as Lang[]).map(l=>(
          <span key={l} onClick={()=>{ setLang(l); localStorage.setItem("lang", l); }} style={{ cursor:"pointer", opacity:lang===l?1:0.4, transition:"opacity 0.2s" }}>
            {l==="fr"?"🇫🇷":l==="en"?"🇺🇸":"🇪🇸"}
          </span>
        ))}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} input::placeholder{color:#444} input:focus{border-color:#e8b84b !important;}`}</style>
    </div>
  );
}
