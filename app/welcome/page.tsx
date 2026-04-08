"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function Welcome() {
  const router = useRouter();

  const [name, setName] = useState("User");
  const [lang, setLang] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  ////////////////////////////////////////////////////
  // AUTH + LOAD USER
  ////////////////////////////////////////////////////

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
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

        const data: any = snap.data();

        const userLang = data.lang || "en";

        setLang(userLang);
        setName(data.name || "User");

        localStorage.setItem("lang", userLang);
        localStorage.setItem("userName", data.name || "User");

        if (data.onboardingCompleted) {
          router.replace("/dashboard");
          return;
        }

      } catch (e) {
        console.log("Welcome error:", e);
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  ////////////////////////////////////////////////////
  // CHANGE LANG
  ////////////////////////////////////////////////////

  const changeLang = async (newLang: string) => {
    setLang(newLang);
    localStorage.setItem("lang", newLang);

    const user = auth.currentUser;

    if (user) {
      try {
        await updateDoc(doc(db, "users", user.uid), {
          lang: newLang,
        });
      } catch (e) {
        console.log("Lang update error:", e);
      }
    }
  };

  ////////////////////////////////////////////////////
  // TEXT
  ////////////////////////////////////////////////////

  const t: any = {
    fr: {
      welcome: "Bienvenue",
      desc: "Kuabo va maintenant personnaliser ton parcours.",
      sub: "Ça prend environ 60 secondes.",
      btn: "Commencer mon parcours",
    },
    en: {
      welcome: "Welcome",
      desc: "Kuabo will now personalize your journey.",
      sub: "It takes about 60 seconds.",
      btn: "Start my journey",
    },
    es: {
      welcome: "Bienvenido",
      desc: "Kuabo personalizará tu camino.",
      sub: "Toma unos 60 segundos.",
      btn: "Comenzar mi camino",
    },
  };

  const current = lang ? t[lang] || t.en : t.en;

  ////////////////////////////////////////////////////
  // LOADING
  ////////////////////////////////////////////////////

  if (loading || !lang) {
    return (
      <div style={loader}>
        Kuabo...
      </div>
    );
  }

  ////////////////////////////////////////////////////
  // UI
  ////////////////////////////////////////////////////

  return (
    <div style={container}>
      
      {/* 🔥 TOP BAR */}
      <div style={topBar}>
        <div style={logo}>
          <span style={{ color: "#e8b84b" }}>Ku</span>abo
        </div>

        <div style={langBox}>
          <span onClick={() => changeLang("fr")}>🇫🇷</span>
          <span onClick={() => changeLang("en")}>🇺🇸</span>
          <span onClick={() => changeLang("es")}>🇪🇸</span>
        </div>
      </div>

      {/* 🔥 CENTER CONTENT */}
      <div style={center}>
        <div style={box}>
          <h1 style={title}>
            {current.welcome}{" "}
            <span style={highlight}>{name}</span> 🎉
          </h1>

          <p style={desc}>{current.desc}</p>
          <p style={sub}>{current.sub}</p>

          <button
            style={btn}
            onClick={() => router.push("/onboarding/step1")}
          >
            {current.btn} →
          </button>
        </div>
      </div>
    </div>
  );
}

////////////////////////////////////////////////////
// STYLE
////////////////////////////////////////////////////

const loader: any = {
  minHeight: "100dvh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "#06080a",
  color: "#e8b84b",
  fontWeight: "bold",
};

const container: any = {
  minHeight: "100dvh",
  background: "#05070a",
  color: "white",
  display: "flex",
  flexDirection: "column",
};

const topBar: any = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 20,
};

const logo: any = {
  fontWeight: "bold",
};

const langBox: any = {
  display: "flex",
  gap: 10,
  fontSize: 20,
  cursor: "pointer",
};

const center: any = {
  flex: 1,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 20,
};

const box: any = {
  maxWidth: 380,
  width: "100%",
  textAlign: "center",
};

const title: any = {
  fontSize: 26,
  fontWeight: "bold",
};

const highlight: any = {
  color: "#e8b84b",
};

const desc: any = {
  color: "#ccc",
  marginTop: 10,
};

const sub: any = {
  color: "#888",
  fontSize: 14,
  marginBottom: 25,
};

const btn: any = {
  width: "100%",
  padding: 16,
  background: "#e8b84b",
  color: "#000",
  borderRadius: 14,
  border: "none",
  fontWeight: "bold",
  cursor: "pointer",
};