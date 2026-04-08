"use client";

import { useRouter } from "next/navigation";

export default function LanguagePage() {
  const router = useRouter();

  const selectLang = (lang: string) => {
    localStorage.setItem("lang", lang);
    router.push("/home"); // 🔥 IMPORTANT
  };

  return (
    <div style={container}>
      <div style={logo}>
        <span style={{ color: "#e8b84b" }}>Ku</span>
        <span style={{ color: "#fff" }}>abo</span>
      </div>

      <div style={content}>
        <h1 style={title}>Choose your language</h1>

        <button style={btn} onClick={() => selectLang("en")}>
          🇺🇸 English
        </button>

        <button style={btn} onClick={() => selectLang("fr")}>
          🇫🇷 Français
        </button>

        <button style={btn} onClick={() => selectLang("es")}>
          🇪🇸 Español
        </button>
      </div>
    </div>
  );
}

const container: any = {
  height: "100vh",
  width: "100%",
  maxWidth: "100vw",
  overflowX: "hidden",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "radial-gradient(circle at top, #0b1220, #06080a)",
  color: "white",
};

const logo: any = {
  position: "absolute",
  top: 20,
  left: 20,
  fontSize: 22,
  fontWeight: "bold",
};

const content: any = {
  width: "100%",
  maxWidth: 320,
  textAlign: "center",
};

const title: any = {
  marginBottom: 30,
};

const btn: any = {
  width: "100%",
  padding: 16,
  marginBottom: 12,
  borderRadius: 14,
  border: "1px solid #333",
  background: "transparent",
  color: "white",
  fontSize: 16,
};