"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoadingScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/"); // 🔥 IMPORTANT (pas replace)
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={container}>
      <h1 style={logo}>
        <span style={{ color: "#e8b84b" }}>Ku</span>
        <span style={{ color: "#fff" }}>abo</span>
      </h1>
    </div>
  );
}

const container: any = {
  height: "100dvh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "radial-gradient(circle at top, #0b1220, #06080a)",
};

const logo: any = {
  fontSize: 36,
  fontWeight: "bold",
};