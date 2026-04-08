"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [lang, setLang] = useState("en");

  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (!saved) {
      router.push("/language");
    } else {
      setLang(saved);
    }
  }, []);

  const t: any = {
    en: {
      title: "Your new home, step by step.",
      start: "Start →",
      login: "Login",
      change: "Change language",
    },
    fr: {
      title: "Ton nouveau chez-toi, étape par étape.",
      start: "Commencer →",
      login: "Se connecter",
      change: "Changer langue",
    },
    es: {
      title: "Tu nuevo hogar, paso a paso.",
      start: "Comenzar →",
      login: "Entrar",
      change: "Cambiar idioma",
    },
  };

  const current = t[lang] || t.en;

  return (
    <div style={container}>
      {/* LOGO */}
      <div style={logo}>
        <span style={{ color: "#e8b84b" }}>Ku</span>
        <span style={{ color: "#fff" }}>abo</span>
      </div>

      {/* CHANGE LANG */}
      <button
        style={topBtn}
        onClick={() => {
          localStorage.removeItem("lang");
          router.push("/language");
        }}
      >
        🌐 {current.change}
      </button>

      <div style={content}>
        <h1>{current.title}</h1>

        <button style={mainBtn} onClick={() => router.push("/signup")}>
          {current.start}
        </button>

        <button style={outlineBtn} onClick={() => router.push("/login")}>
          {current.login}
        </button>
      </div>
    </div>
  );
}

/* STYLE */

const container: any = {
  height: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 20,
  background: "radial-gradient(circle at top, #0b1220, #06080a)",
  color: "white",
};

const logo: any = {
  position: "absolute",
  top: 20,
  left: 20,
  fontWeight: "bold",
};

const topBtn: any = {
  position: "absolute",
  top: 20,
  right: 20,
  background: "none",
  color: "white",
  border: "none",
  fontSize: 12,
  opacity: 0.7,
};

const content: any = {
  width: "100%",
  maxWidth: 340,
  textAlign: "center",
};

const mainBtn: any = {
  width: "100%",
  padding: 14,
  background: "#e8b84b",
  borderRadius: 14,
  border: "none",
  color: "#000", // ✅ FIX
  fontWeight: "bold",
  marginTop: 20,
};

const outlineBtn: any = {
  width: "100%",
  padding: 14,
  marginTop: 10,
  border: "1px solid #333",
  color: "white",
  borderRadius: 14,
  background: "transparent",
};