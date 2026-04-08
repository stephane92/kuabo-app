"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../lib/firebase";

type Lang = "en" | "fr" | "es";

export default function Forgot() {
  const router = useRouter();

  const [lang, setLang] = useState<Lang>("en");
  const [email, setEmail] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  ////////////////////////////////////////////////////
  // LOAD LANG
  ////////////////////////////////////////////////////

  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang;
    setLang(saved || "en");
  }, []);

  ////////////////////////////////////////////////////
  // TEXT
  ////////////////////////////////////////////////////

  const t = {
    en: {
      title: "Forgot password",
      email: "Email",
      btn: "Send",
      loading: "Sending...",
      success: "📩 Email sent (check spam)",
      redirect: "Redirecting to login...",
      errorEmpty: "Please enter your email",
      errorNotFound: "No account found with this email",
      errorGeneral: "Something went wrong, try again",
      back: "Back",
    },
    fr: {
      title: "Mot de passe oublié",
      email: "Email",
      btn: "Envoyer",
      loading: "Envoi...",
      success: "📩 Email envoyé (vérifie tes spams)",
      redirect: "Redirection vers connexion...",
      errorEmpty: "Entre ton email",
      errorNotFound: "Aucun compte trouvé avec cet email",
      errorGeneral: "Une erreur est survenue",
      back: "Retour",
    },
    es: {
      title: "Olvidé mi contraseña",
      email: "Correo",
      btn: "Enviar",
      loading: "Enviando...",
      success: "📩 Email enviado (revisa spam)",
      redirect: "Redirigiendo al login...",
      errorEmpty: "Introduce tu correo",
      errorNotFound: "No existe una cuenta con este correo",
      errorGeneral: "Algo salió mal",
      back: "Atrás",
    },
  };

  const current = t[lang];

  ////////////////////////////////////////////////////
  // RESET PASSWORD
  ////////////////////////////////////////////////////

  const handleReset = async () => {
    setError("");
    setMessage("");

    if (!email) {
      setError(current.errorEmpty);
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());

      setMessage(current.success);

      setTimeout(() => {
        router.replace("/login");
      }, 8000);

    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        setError(current.errorNotFound);
      } else {
        setError(current.errorGeneral);
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
      <button style={back} onClick={() => router.push("/login")}>
        ← {current.back}
      </button>

      {/* LOGO */}
      <div style={logo}>
        <span style={{ color: "#e8b84b" }}>Ku</span>abo
      </div>

      {/* BOX */}
      <div style={box}>
        <h2>{current.title}</h2>

        {/* ERROR */}
        {error && <div style={errorStyle}>{error}</div>}

        {/* SUCCESS */}
        {message && (
          <div style={successStyle}>
            {message}
            <div style={{ marginTop: 5, fontSize: 12 }}>
              {current.redirect}
            </div>
          </div>
        )}

        <input
          type="email"
          placeholder={current.email}
          style={input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button style={btn} onClick={handleReset} disabled={loading}>
          {loading ? current.loading : current.btn}
        </button>
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
  maxWidth: 320,
  display: "flex",
  flexDirection: "column",
};

const input: React.CSSProperties = {
  padding: 14,
  marginBottom: 10,
  borderRadius: 10,
  border: "1px solid #333",
  background: "#0b1220",
  color: "white",
  fontSize: 16,
};

const btn: React.CSSProperties = {
  padding: 14,
  background: "#e8b84b",
  color: "#000",
  border: "none",
  borderRadius: 10,
  fontWeight: "bold",
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  background: "#7f1d1d",
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