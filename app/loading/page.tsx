"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Loader2 } from "lucide-react";

type Lang = "en" | "fr" | "es";

export default function LoadingPage() {
  const router = useRouter();

  const [text, setText] = useState("");
  const [lang, setLang] = useState<Lang | null>(null);
  const [progress, setProgress] = useState(10);

  ////////////////////////////////////////////////////
  // TEXT
  ////////////////////////////////////////////////////

  const t = {
    en: {
      step1: "Analyzing your profile...",
      step2: "Preparing your journey...",
      ssn: "We will help you get your SSN step by step.",
      redirect: "Redirecting...",
    },
    fr: {
      step1: "Analyse de ton profil...",
      step2: "Préparation de ton parcours...",
      ssn: "On va t’aider à obtenir ton SSN étape par étape.",
      redirect: "Redirection...",
    },
    es: {
      step1: "Analizando tu perfil...",
      step2: "Preparando tu camino...",
      ssn: "Te ayudaremos a obtener tu SSN paso a paso.",
      redirect: "Redirigiendo...",
    },
  };

  ////////////////////////////////////////////////////
  // LOGIC
  ////////////////////////////////////////////////////

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return router.replace("/login");

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) return router.replace("/login");

        const data = snap.data();

        const userLang = (data?.lang as Lang) || "en";
        const priority = data?.priority;

        setLang(userLang);

        ////////////////////////////////////////////////////
        // SEQUENCE (🔥 SMOOTH UX)
        ////////////////////////////////////////////////////

        setText(t[userLang].step1);
        setProgress(30);

        setTimeout(() => {
          setText(priority === "ssn" ? t[userLang].ssn : t[userLang].step2);
          setProgress(70);
        }, 1400);

        setTimeout(() => {
          setText(t[userLang].redirect);
          setProgress(100);
        }, 2800);

        setTimeout(() => {
          router.replace("/dashboard");
        }, 3800);

      } catch {
        router.replace("/login");
      }
    });

    return () => unsub();
  }, [router]);

  ////////////////////////////////////////////////////
  // LOADING FIRST
  ////////////////////////////////////////////////////

  if (!lang) {
    return (
      <div style={container}>
        <Loader2 className="spin" size={28} color="#e8b84b" />
      </div>
    );
  }

  ////////////////////////////////////////////////////
  // UI
  ////////////////////////////////////////////////////

  return (
    <div style={container}>
      <div style={box}>

        {/* LOGO */}
        <h2 style={logo}>
          <span style={{ color: "#e8b84b" }}>Ku</span>abo
        </h2>

        {/* LOADER GLOW */}
        <div style={loaderWrapper}>
          <Loader2 className="spin glow" size={28} />
        </div>

        {/* TEXT */}
        <p key={text} className="fadeText">
          {text}
        </p>

        {/* PROGRESS BAR */}
        <div style={progressBar}>
          <div
            style={{
              ...progressFill,
              width: `${progress}%`,
            }}
          />
        </div>

      </div>

      <style>
        {`
        .spin {
          animation: spin 1s linear infinite;
        }

        .glow {
          filter: drop-shadow(0 0 6px #e8b84b);
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .fadeText {
          animation: fadeIn 0.4s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        `}
      </style>
    </div>
  );
}

////////////////////////////////////////////////////
// STYLE
////////////////////////////////////////////////////

const container: React.CSSProperties = {
  minHeight: "100vh",
  background: "radial-gradient(circle at top, #0b1220, #05070a)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  color: "white",
};

const box: React.CSSProperties = {
  textAlign: "center",
  width: "90%",
  maxWidth: 300,
};

const logo: React.CSSProperties = {
  marginBottom: 25,
  fontWeight: "bold",
};

const loaderWrapper: React.CSSProperties = {
  marginBottom: 20,
};

const progressBar: React.CSSProperties = {
  marginTop: 20,
  height: 4,
  width: "100%",
  background: "#1a2438",
  borderRadius: 10,
  overflow: "hidden",
};

const progressFill: React.CSSProperties = {
  height: "100%",
  background: "#e8b84b",
  transition: "width 0.5s ease",
};