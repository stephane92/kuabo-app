"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type Lang = "en" | "fr" | "es";

export default function LoadingPage() {
  const router = useRouter();

  const [text, setText] = useState("Loading...");
  const [lang, setLang] = useState<Lang>("en");

  ////////////////////////////////////////////////////
  // TEXT
  ////////////////////////////////////////////////////

  const t = {
    en: {
      loading: "Preparing your journey...",
      ssn: "We will help you get your SSN step by step.",
      redirect: "Redirecting...",
    },
    fr: {
      loading: "Préparation de ton parcours...",
      ssn: "On va t’aider à obtenir ton SSN étape par étape.",
      redirect: "Redirection...",
    },
    es: {
      loading: "Preparando tu camino...",
      ssn: "Te ayudaremos a obtener tu SSN paso a paso.",
      redirect: "Redirigiendo...",
    },
  };

  ////////////////////////////////////////////////////
  // LOGIC
  ////////////////////////////////////////////////////

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));

        if (!snap.exists()) {
          router.replace("/login");
          return;
        }

        const data = snap.data();

        const userLang = (data?.lang as Lang) || "en";
        const priority = data?.priority;

        setLang(userLang);

        ////////////////////////////////////////////////////
        // STEP 1 → LOADING TEXT
        ////////////////////////////////////////////////////
        setText(t[userLang].loading);

        ////////////////////////////////////////////////////
        // STEP 2 → SSN CASE
        ////////////////////////////////////////////////////
        setTimeout(() => {
          if (priority === "ssn") {
            setText(t[userLang].ssn);
          } else {
            setText(t[userLang].loading);
          }
        }, 1500);

        ////////////////////////////////////////////////////
        // STEP 3 → REDIRECT
        ////////////////////////////////////////////////////
        setTimeout(() => {
          setText(t[userLang].redirect);

          setTimeout(() => {
            router.replace("/dashboard");
          }, 1000);

        }, 3000);

      } catch (e) {
        console.log(e);
        router.replace("/login");
      }
    });

    return () => unsub();
  }, [router]);

  ////////////////////////////////////////////////////
  // UI
  ////////////////////////////////////////////////////

  return (
    <div style={container}>
      <div style={box}>
        <h2 style={logo}>
          <span style={{ color: "#e8b84b" }}>Ku</span>abo
        </h2>

        <p style={textStyle}>{text}</p>
      </div>
    </div>
  );
}

////////////////////////////////////////////////////
// STYLE
////////////////////////////////////////////////////

const container: React.CSSProperties = {
  minHeight: "100vh",
  background: "#05070a",
  color: "white",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const box: React.CSSProperties = {
  textAlign: "center",
};

const logo: React.CSSProperties = {
  marginBottom: 20,
};

const textStyle: React.CSSProperties = {
  color: "#aaa",
};