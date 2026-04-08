"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export default function Signup() {
  const router = useRouter();

  const [lang, setLang] = useState("en");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  ////////////////////////////////////////////////////
  // LOAD LANG
  ////////////////////////////////////////////////////

  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved) setLang(saved);
  }, []);

  ////////////////////////////////////////////////////
  // TEXT
  ////////////////////////////////////////////////////

  const t: any = {
    en: {
      title: "Create account",
      name: "Your name",
      email: "Email",
      pass: "Password",
      btn: "Continue",
      back: "Back",
      required: "All fields are required",
      exist: "Account already exists",
      passError: "Minimum 6 characters",
      loading: "Creating...",
      verify: "📩 Check your email to verify your account",
      already: "Already have an account?",
      login: "Login",
    },
    fr: {
      title: "Créer un compte",
      name: "Nom complet",
      email: "Email",
      pass: "Mot de passe",
      btn: "Continuer",
      back: "Retour",
      required: "Tous les champs sont obligatoires",
      exist: "Compte déjà existant",
      passError: "Minimum 6 caractères",
      loading: "Création...",
      verify: "📩 Vérifie ton email avant de te connecter",
      already: "Déjà un compte ?",
      login: "Connecte-toi",
    },
    es: {
      title: "Crear cuenta",
      name: "Nombre",
      email: "Correo",
      pass: "Contraseña",
      btn: "Continuar",
      back: "Atrás",
      required: "Todos los campos son obligatorios",
      exist: "Cuenta ya existe",
      passError: "Mínimo 6 caracteres",
      loading: "Creando...",
      verify: "📩 Verifica tu correo antes de iniciar sesión",
      already: "¿Ya tienes cuenta?",
      login: "Inicia sesión",
    },
  };

  const current = t[lang] || t.en;

  ////////////////////////////////////////////////////
  // SIGNUP
  ////////////////////////////////////////////////////

  const handleSignup = async () => {
    setError("");
    setMessage("");

    if (!name || !email || !password) {
      setError(current.required);
      return;
    }

    if (password.length < 6) {
      setError(current.passError);
      return;
    }

    try {
      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      ////////////////////////////////////////////////////
      // EMAIL VERIFICATION
      ////////////////////////////////////////////////////
      await sendEmailVerification(user);

      ////////////////////////////////////////////////////
      // FIRESTORE
      ////////////////////////////////////////////////////
      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        lang,
        onboardingCompleted: false,
        createdAt: new Date(),
      });

      ////////////////////////////////////////////////////
      // LOCAL
      ////////////////////////////////////////////////////
      localStorage.setItem("userName", name);
      localStorage.setItem("lang", lang);

      ////////////////////////////////////////////////////
      // MESSAGE
      ////////////////////////////////////////////////////
      setMessage(current.verify);

      ////////////////////////////////////////////////////
      // LOGOUT
      ////////////////////////////////////////////////////
      await signOut(auth);

      ////////////////////////////////////////////////////
      // REDIRECT
      ////////////////////////////////////////////////////
      setTimeout(() => {
        router.replace("/login");
      }, 2000);

    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError(current.exist);
      } else {
        setError("Error");
      }
    } finally {
      setLoading(false);
    }
  };

  ////////////////////////////////////////////////////
  // UI
  ////////////////////////////////////////////////////

  return (
    <div style={container}>
      {/* BACK */}
      <button style={back} onClick={() => router.push("/home")}>
        ← {current.back}
      </button>

      {/* LOGO */}
      <div style={logo}>
        <span style={{ color: "#e8b84b" }}>Ku</span>abo
      </div>

      <div style={box}>
        <h2>{current.title}</h2>

        {error && <div style={errorStyle}>{error}</div>}
        {message && <div style={successStyle}>{message}</div>}

        <input
          placeholder={current.name}
          style={input}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder={current.email}
          style={input}
          value={email}
          inputMode="email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder={current.pass}
          style={input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button style={btn} onClick={handleSignup} disabled={loading}>
          {loading ? current.loading : current.btn}
        </button>

        {/* LOGIN */}
        <div style={loginText}>
          {current.already}{" "}
          <span style={loginLink} onClick={() => router.push("/login")}>
            {current.login}
          </span>
        </div>
      </div>
    </div>
  );
}

////////////////////////////////////////////////////
// STYLE (FIX RESPONSIVE 🔥)
////////////////////////////////////////////////////

const container: any = {
  minHeight: "100dvh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "#06080a",
  color: "white",
  padding: 20,
  boxSizing: "border-box",
  overflowX: "hidden",
};

const logo: any = {
  position: "absolute",
  top: 20,
  left: 20,
  fontWeight: "bold",
};

const back: any = {
  position: "absolute",
  top: 20,
  right: 20,
  background: "none",
  border: "none",
  color: "white",
};

const box: any = {
  width: "100%",
  maxWidth: 340,
  display: "flex",
  flexDirection: "column",
};

const input: any = {
  width: "100%",
  padding: 14,
  marginBottom: 10,
  borderRadius: 10,
  border: "1px solid #333",
  background: "#0b1220",
  color: "white",
  fontSize: 16, // 🔥 IMPORTANT (fix zoom)
  outline: "none",
  WebkitAppearance: "none",
};

const btn: any = {
  padding: 14,
  background: "#e8b84b",
  color: "#000",
  borderRadius: 10,
  border: "none",
  fontWeight: "bold",
};

const errorStyle: any = {
  background: "#ff4d4d",
  padding: 10,
  borderRadius: 8,
  marginBottom: 10,
};

const successStyle: any = {
  background: "#0f766e",
  padding: 10,
  borderRadius: 8,
  marginBottom: 10,
};

const loginText: any = {
  marginTop: 15,
  textAlign: "center",
};

const loginLink: any = {
  color: "#e8b84b",
  cursor: "pointer",
};