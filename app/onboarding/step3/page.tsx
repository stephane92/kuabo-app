"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type Lang = "en" | "fr" | "es";

export default function Step3() {
  const router = useRouter();

  const [selected, setSelected] = useState<string>("");
  const [dropdownState, setDropdownState] = useState<string>("");
  const [lang, setLang] = useState<Lang>("en");
  const [loading, setLoading] = useState<boolean>(false);
  const [ready, setReady] = useState<boolean>(false);

  ////////////////////////////////////////////////////
  // AUTH
  ////////////////////////////////////////////////////

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return router.replace("/login");

      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) return router.replace("/login");

      const data = snap.data();
      const userLang = (data?.lang as Lang) || "en";

      setLang(userLang);
      localStorage.setItem("lang", userLang);

      setReady(true);
    });

    return () => unsub();
  }, [router]);

  ////////////////////////////////////////////////////
  // CHANGE LANG
  ////////////////////////////////////////////////////

  const changeLang = async (l: Lang) => {
    setLang(l);
    localStorage.setItem("lang", l);

    const user = auth.currentUser;
    if (user) {
      await updateDoc(doc(db, "users", user.uid), {
        lang: l,
      });
    }
  };

  ////////////////////////////////////////////////////
  // TEXT
  ////////////////////////////////////////////////////

  const t = {
    en: {
      title: "Which state will you live in?",
      back: "Back",
      next: "Continue",
      other: "Other",
      select: "Select your state",
    },
    fr: {
      title: "Dans quel État vas-tu vivre ?",
      back: "Retour",
      next: "Continuer",
      other: "Autre",
      select: "Choisir ton État",
    },
    es: {
      title: "¿En qué estado vivirás?",
      back: "Atrás",
      next: "Continuar",
      other: "Otro",
      select: "Seleccionar estado",
    },
  };

  const current = t[lang];

  ////////////////////////////////////////////////////
  // STATES
  ////////////////////////////////////////////////////

  const popular = ["Maryland", "Texas", "Florida", "New York", "California"];

  const allStates = [
    "Alabama","Alaska","Arizona","Arkansas","California","Colorado",
    "Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho",
    "Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana",
    "Maine","Maryland","Massachusetts","Michigan","Minnesota",
    "Mississippi","Missouri","Montana","Nebraska","Nevada",
    "New Hampshire","New Jersey","New Mexico","New York",
    "North Carolina","North Dakota","Ohio","Oklahoma","Oregon",
    "Pennsylvania","Rhode Island","South Carolina","South Dakota",
    "Tennessee","Texas","Utah","Vermont","Virginia","Washington",
    "West Virginia","Wisconsin","Wyoming"
  ];

  ////////////////////////////////////////////////////
  // NEXT
  ////////////////////////////////////////////////////

  const handleNext = async () => {
    let final = selected;

    if (selected === "other") {
      if (!dropdownState) return;
      final = dropdownState;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;

      localStorage.setItem("state", final);

      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          state: final,
        });
      }

      router.push("/onboarding/step4");
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  ////////////////////////////////////////////////////
  // LOADING
  ////////////////////////////////////////////////////

  if (!ready) return <div style={loader}>Loading...</div>;

  ////////////////////////////////////////////////////
  // UI
  ////////////////////////////////////////////////////

  return (
    <div style={container}>
      
      {/* TOP BAR */}
      <div style={topBar}>
        <div style={backBtn} onClick={() => router.push("/onboarding/step2")}>
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

          {/* POPULAR */}
          {popular.map((s) => (
            <div
              key={s}
              onClick={() => setSelected(s)}
              style={{
                ...item,
                border:
                  selected === s ? "2px solid #e8b84b" : "none",
              }}
            >
              {s}
            </div>
          ))}

          {/* OTHER */}
          <div
            onClick={() => setSelected("other")}
            style={{
              ...item,
              border:
                selected === "other" ? "2px solid #e8b84b" : "none",
            }}
          >
            📍 {current.other}
          </div>

          {/* DROPDOWN */}
          {selected === "other" && (
            <select
              style={select}
              value={dropdownState}
              onChange={(e) => setDropdownState(e.target.value)}
            >
              <option value="">{current.select}</option>
              {allStates.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleNext}
            style={{
              ...btn,
              opacity:
                selected &&
                (selected !== "other" || dropdownState)
                  ? 1
                  : 0.5,
            }}
            disabled={
              !selected ||
              (selected === "other" && !dropdownState) ||
              loading
            }
          >
            {loading ? "..." : current.next}
          </button>

        </div>
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

const select: React.CSSProperties = {
  marginTop: 10,
  padding: 12,
  width: "100%",
  borderRadius: 8,
  border: "1px solid #333",
  background: "#0b1220",
  color: "white",
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