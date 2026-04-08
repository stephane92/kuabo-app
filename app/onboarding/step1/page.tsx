"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type Lang = "en" | "fr" | "es";

export default function Step1() {
  const router = useRouter();

  const [selected, setSelected] = useState<string>("");
  const [lang, setLang] = useState<Lang>("en");
  const [loading, setLoading] = useState(true);

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
        setLoading(false);
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

  const t: Record<Lang, any> = {
    en: {
      title: "Why are you coming to the USA?",
      subtitle: "Choose your situation",
      next: "Continue",
      back: "Back",
      options: [
        { label: "🎰 DV Lottery Winner", value: "dv" },
        { label: "🎓 Student", value: "student" },
        { label: "💼 Work", value: "work" },
        { label: "👨‍👩‍👧 Family", value: "family" },
      ],
    },
    fr: {
      title: "Pourquoi viens-tu aux USA ?",
      subtitle: "Choisis ta situation",
      next: "Continuer",
      back: "Retour",
      options: [
        { label: "🎰 DV Lottery", value: "dv" },
        { label: "🎓 Étudiant", value: "student" },
        { label: "💼 Travail", value: "work" },
        { label: "👨‍👩‍👧 Famille", value: "family" },
      ],
    },
    es: {
      title: "¿Por qué vienes a EE.UU.?",
      subtitle: "Elige tu situación",
      next: "Continuar",
      back: "Atrás",
      options: [
        { label: "🎰 Lotería DV", value: "dv" },
        { label: "🎓 Estudiante", value: "student" },
        { label: "💼 Trabajo", value: "work" },
        { label: "👨‍👩‍👧 Familia", value: "family" },
      ],
    },
  };

  const current = t[lang];

  ////////////////////////////////////////////////////
  // NEXT
  ////////////////////////////////////////////////////

  const handleNext = async () => {
    if (!selected) return;

    try {
      localStorage.setItem("reason", selected);

      const user = auth.currentUser;

      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          reason: selected,
        });
      }

      router.push("/onboarding/step2");
    } catch (e) {
      console.log(e);
    }
  };

  ////////////////////////////////////////////////////
  // LOADING
  ////////////////////////////////////////////////////

  if (loading) {
    return (
      <div style={loader}>
        Loading...
      </div>
    );
  }

  ////////////////////////////////////////////////////
  // UI
  ////////////////////////////////////////////////////

  return (
    <div style={container}>
      {/* TOP */}
      <div style={topBar}>
        <div style={backBtn} onClick={() => router.push("/welcome")}>
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
          <p style={subtitle}>{current.subtitle}</p>

          {current.options.map((opt: any) => (
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
            disabled={!selected}
            style={{
              ...btn,
              opacity: selected ? 1 : 0.5,
            }}
          >
            {current.next}
          </button>
        </div>
      </div>
    </div>
  );
}

////////////////////////////////////////////////////
// STYLE
////////////////////////////////////////////////////

const loader: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

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

const subtitle: React.CSSProperties = {
  color: "#888",
};

const item: React.CSSProperties = {
  padding: 15,
  marginTop: 10,
  borderRadius: 10,
  background: "#0b1220",
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