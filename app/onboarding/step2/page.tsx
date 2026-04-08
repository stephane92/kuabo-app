"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type Lang = "en" | "fr" | "es";

export default function Step2() {
  const router = useRouter();

  const [selected, setSelected] = useState<string>("");
  const [lang, setLang] = useState<Lang>("en");
  const [loading, setLoading] = useState<boolean>(false);
  const [ready, setReady] = useState<boolean>(false);

  ////////////////////////////////////////////////////
  // AUTH
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

        setLang(userLang);
        localStorage.setItem("lang", userLang);
      } catch (e) {
        console.log(e);
        router.replace("/login");
      } finally {
        setReady(true);
      }
    });

    return () => unsub();
  }, [router]);

  ////////////////////////////////////////////////////
  // CHANGE LANG
  ////////////////////////////////////////////////////

  const changeLang = async (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem("lang", newLang);

    const user = auth.currentUser;

    if (user) {
      await updateDoc(doc(db, "users", user.uid), {
        lang: newLang,
      });
    }
  };

  ////////////////////////////////////////////////////
  // TEXT
  ////////////////////////////////////////////////////

  const t = {
    en: {
      title: "Where are you now?",
      back: "Back",
      next: "Continue",
      options: [
        { label: "🌍 Abroad", value: "abroad" },
        { label: "✈️ Just arrived", value: "new" },
        { label: "📅 Few months", value: "months" },
        { label: "🏠 Settled", value: "settled" },
      ],
    },
    fr: {
      title: "Où es-tu actuellement ?",
      back: "Retour",
      next: "Continuer",
      options: [
        { label: "🌍 À l’étranger", value: "abroad" },
        { label: "✈️ Arrivé récemment", value: "new" },
        { label: "📅 Quelques mois", value: "months" },
        { label: "🏠 Installé", value: "settled" },
      ],
    },
    es: {
      title: "¿Dónde estás ahora?",
      back: "Atrás",
      next: "Continuar",
      options: [
        { label: "🌍 En el extranjero", value: "abroad" },
        { label: "✈️ Recién llegado", value: "new" },
        { label: "📅 Algunos meses", value: "months" },
        { label: "🏠 Establecido", value: "settled" },
      ],
    },
  };

  const current = t[lang];

  ////////////////////////////////////////////////////
  // NEXT
  ////////////////////////////////////////////////////

  const handleNext = async () => {
    if (!selected) return;

    setLoading(true);

    try {
      const user = auth.currentUser;

      localStorage.setItem("arrival", selected);

      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          arrival: selected,
        });
      }

      router.push("/onboarding/step3");
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  ////////////////////////////////////////////////////
  // LOADING
  ////////////////////////////////////////////////////

  if (!ready) {
    return <div style={loader}>Loading...</div>;
  }

  ////////////////////////////////////////////////////
  // UI
  ////////////////////////////////////////////////////

  return (
    <div style={container}>
      {/* TOP BAR */}
      <div style={topBar}>
        <div style={backBtn} onClick={() => router.push("/onboarding/step1")}>
          ← {current.back}
        </div>

        <div style={logo}>
          <span style={{ color: "#e8b84b" }}>Ku</span>abo
        </div>

        <div style={langBox}>
          <span onClick={() => changeLang("fr")}>🇫🇷</span>
          <span onClick={() => changeLang("en")}>🇺🇸</span>
          <span onClick={() => changeLang("es")}>🇪🇸</span>
        </div>
      </div>

      {/* CENTER */}
      <div style={center}>
        <div style={box}>
          <h2>{current.title}</h2>

          {current.options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              style={{
                ...item,
                border:
                  selected === opt.value ? "2px solid #e8b84b" : "none",
              }}
            >
              {opt.label}
            </div>
          ))}

          <button
            onClick={handleNext}
            disabled={!selected || loading}
            style={{
              ...btn,
              opacity: selected ? 1 : 0.5,
            }}
          >
            {loading ? "..." : current.next}
          </button>
        </div>
      </div>
    </div>
  );
}

////////////////////////////////////////////////////
// STYLE (🔥 FIX TYPESCRIPT)
////////////////////////////////////////////////////

const container: React.CSSProperties = {
  minHeight: "100vh",
  background: "#05070a",
  color: "white",
  display: "flex",
  flexDirection: "column",
};

const topBar: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: 20,
};

const backBtn: React.CSSProperties = {
  cursor: "pointer",
};

const logo: React.CSSProperties = {
  fontWeight: "bold",
};

const langBox: React.CSSProperties = {
  display: "flex",
  gap: 10,
  cursor: "pointer",
  fontSize: 20,
};

const center: React.CSSProperties = {
  flex: 1,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const box: React.CSSProperties = {
  width: "90%",
  maxWidth: 400,
};

const item: React.CSSProperties = {
  padding: 15,
  background: "#0b1220",
  marginTop: 10,
  borderRadius: 10,
  cursor: "pointer",
};

const btn: React.CSSProperties = {
  marginTop: 20,
  padding: 15,
  width: "100%",
  background: "#e8b84b",
  border: "none",
  borderRadius: 10,
};

const loader: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};