"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  sendEmailVerification,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

type Lang = "en" | "fr" | "es";

export default function Login() {
  const router = useRouter();

  const [lang, setLang] = useState<Lang>("en");
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendUser, setResendUser] = useState<any>(null);

  ////////////////////////////////////////////////////
  // AUTO LOGIN
  ////////////////////////////////////////////////////

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.emailVerified) {
        try {
          const snap = await getDoc(doc(db, "users", user.uid));

          if (snap.exists()) {
            const data: any = snap.data();

            localStorage.setItem("userName", data.name || "User");
            localStorage.setItem("lang", data.lang || "en");

            setLang(data.lang || "en");

            if (!data.onboardingCompleted) {
              router.replace("/welcome");
            } else {
              router.replace("/dashboard");
            }

            return;
          }
        } catch (e) {
          console.log(e);
        }
      }

      const savedLang = localStorage.getItem("lang") as Lang;
      setLang(savedLang || "en");

      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [router]);

  ////////////////////////////////////////////////////
  // TEXT
  ////////////////////////////////////////////////////

  const t = {
    en: {
      title: "Login",
      email: "Email",
      pass: "Password",
      btn: "Continue",
      loading: "Checking...",
      required: "All fields are required",
      invalid: "Invalid email or password",
      verifyText: "📩 Verify your email — ",
      resend: "resend",
      sent: "✅ Email sent",
      noAccount: "Don’t have an account?",
      signup: "Sign up",
      forgot: "Forgot password?",
      back: "Back",
    },
    fr: {
      title: "Connexion",
      email: "Email",
      pass: "Mot de passe",
      btn: "Continuer",
      loading: "Vérification...",
      required: "Tous les champs sont obligatoires",
      invalid: "Email ou mot de passe incorrect",
      verifyText: "📩 Vérifie ton email — ",
      resend: "renvoyer",
      sent: "✅ Email envoyé",
      noAccount: "Pas de compte ?",
      signup: "Créer un compte",
      forgot: "Mot de passe oublié ?",
      back: "Retour",
    },
    es: {
      title: "Entrar",
      email: "Correo",
      pass: "Contraseña",
      btn: "Continuar",
      loading: "Verificando...",
      required: "Todos los campos son obligatorios",
      invalid: "Correo o contraseña incorrectos",
      verifyText: "📩 Verifica tu correo — ",
      resend: "reenviar",
      sent: "✅ Email enviado",
      noAccount: "¿No tienes cuenta?",
      signup: "Crear cuenta",
      forgot: "¿Olvidaste tu contraseña?",
      back: "Atrás",
    },
  };

  const current = t[lang];

  ////////////////////////////////////////////////////
  // LOGIN
  ////////////////////////////////////////////////////

  const handleLogin = async () => {
    setError("");
    setSuccess("");

    if (!email || !password) {
      setError(current.required);
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const user = userCredential.user;

      ////////////////////////////////////////////////////
      // 🔥 REFRESH USER
      ////////////////////////////////////////////////////
      await user.reload();

      ////////////////////////////////////////////////////
      // 🔒 BLOCK NON VERIFIED
      ////////////////////////////////////////////////////
      if (!user.emailVerified) {
        setResendUser(user);
        setError("verify");
        setLoading(false);
        return;
      }

      ////////////////////////////////////////////////////
      // FIRESTORE
      ////////////////////////////////////////////////////
      const snap = await getDoc(doc(db, "users", user.uid));

      if (!snap.exists()) {
        setError("Error");
        setLoading(false);
        return;
      }

      const data: any = snap.data();

      ////////////////////////////////////////////////////
      // 🔥 UPDATE VERIFIED FLAG
      ////////////////////////////////////////////////////
      if (!data.emailVerified) {
        await updateDoc(doc(db, "users", user.uid), {
          emailVerified: true,
        });
      }

      ////////////////////////////////////////////////////
      // SAVE LOCAL
      ////////////////////////////////////////////////////
      localStorage.setItem("userName", data.name || "User");
      localStorage.setItem("lang", data.lang || "en");

      ////////////////////////////////////////////////////
      // REDIRECT
      ////////////////////////////////////////////////////
      if (!data.onboardingCompleted) {
        router.replace("/welcome");
      } else {
        router.replace("/dashboard");
      }

    } catch {
      setError(current.invalid);
    } finally {
      setLoading(false);
    }
  };

  ////////////////////////////////////////////////////
  // RESEND EMAIL
  ////////////////////////////////////////////////////

  const resendEmail = async () => {
    if (!resendUser) return;

    try {
      await sendEmailVerification(resendUser);
      setError("");
      setSuccess(current.sent);
    } catch {
      setError("Error");
    }
  };

  ////////////////////////////////////////////////////
  // LOADING
  ////////////////////////////////////////////////////

  if (checkingAuth) {
    return <div style={loader}>Kuabo...</div>;
  }

  ////////////////////////////////////////////////////
  // UI
  ////////////////////////////////////////////////////

  return (
    <div style={container}>
      <button style={back} onClick={() => router.push("/home")}>
        ← {current.back}
      </button>

      <div style={logo}>
        <span style={{ color: "#e8b84b" }}>Ku</span>abo
      </div>

      <div style={box}>
        <h2>{current.title}</h2>

        {/* VERIFY */}
        {error === "verify" && (
          <div style={errorStyle}>
            {current.verifyText}
            <span style={resendLink} onClick={resendEmail}>
              {current.resend}
            </span>
          </div>
        )}

        {/* ERROR */}
        {error && error !== "verify" && (
          <div style={errorStyle}>{error}</div>
        )}

        {/* SUCCESS */}
        {success && <div style={successStyle}>{success}</div>}

        <input
          placeholder={current.email}
          style={input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder={current.pass}
          style={input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button style={btn} onClick={handleLogin} disabled={loading}>
          {loading ? current.loading : current.btn}
        </button>

        <div style={forgotText}>
          <span style={forgotLink} onClick={() => router.push("/forgot")}>
            {current.forgot}
          </span>
        </div>

        <div style={signupText}>
          {current.noAccount}{" "}
          <span style={signupLink} onClick={() => router.push("/signup")}>
            {current.signup}
          </span>
        </div>
      </div>
    </div>
  );
}

////////////////////////////////////////////////////
// STYLE
////////////////////////////////////////////////////

const container: React.CSSProperties = {
  minHeight: "100dvh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "#06080a",
  color: "white",
  padding: 20,
};

const logo: React.CSSProperties = {
  position: "absolute",
  top: 20,
  left: 20,
  fontWeight: "bold",
};

const back: React.CSSProperties = {
  position: "absolute",
  top: 20,
  right: 20,
  background: "none",
  border: "none",
  color: "white",
  cursor: "pointer",
};

const box: React.CSSProperties = {
  width: "100%",
  maxWidth: 340,
  display: "flex",
  flexDirection: "column",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  marginBottom: 12,
  borderRadius: 12,
  border: "1px solid #333",
  background: "#0b1220",
  color: "white",
  fontSize: 16,
  outline: "none",
};

const btn: React.CSSProperties = {
  width: "100%",
  padding: 14,
  background: "#e8b84b",
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  background: "#ff4d4d",
  padding: 10,
  borderRadius: 8,
  marginBottom: 10,
};

const successStyle: React.CSSProperties = {
  background: "#0f766e",
  padding: 10,
  borderRadius: 8,
  marginBottom: 10,
};

const resendLink: React.CSSProperties = {
  color: "#fff",
  textDecoration: "underline",
  cursor: "pointer",
  fontWeight: "bold",
};

const forgotText: React.CSSProperties = {
  marginTop: 10,
  textAlign: "center",
};

const forgotLink: React.CSSProperties = {
  color: "#e8b84b",
  cursor: "pointer",
};

const signupText: React.CSSProperties = {
  marginTop: 15,
  textAlign: "center",
};

const signupLink: React.CSSProperties = {
  color: "#e8b84b",
  cursor: "pointer",
};

const loader: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "#06080a",
  color: "#e8b84b",
  fontWeight: "bold",
};