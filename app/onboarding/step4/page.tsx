"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type Lang = "en" | "fr" | "es";

export default function Step4() {
  const router = useRouter();

  const [step, setStep] = useState<"question" | "priority">("question");
  const [selected, setSelected] = useState<string>("");
  const [lang, setLang] = useState<Lang>("en");
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

        setReady(true);
      } catch (e) {
        console.log(e);
        router.replace("/login");
      }
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
      try {
        await updateDoc(doc(db, "users", user.uid), {
          lang: l,
        });
      } catch (e) {
        console.log(e);
      }
    }
  };

  ////////////////////////////////////////////////////
  // TEXT
  ////////////////////////////////////////////////////

  const t = {
    en: {
      question: "Do you already have your SSN?",
      desc: "The SSN (Social Security Number) is required to work, open a bank account, and build your life in the US.",
      yes: "Yes",
      no: "No",
      title: "What is your priority?",
      back: "Back",
      next: "Continue",
      options: [
        { label: "💼 Find a job", value: "job" },
        { label: "🏠 Find housing", value: "housing" },
        { label: "🏦 Open a bank account", value: "bank" },
      ],
    },
    fr: {
      question: "As-tu déjà ton SSN ?",
      desc: "Le SSN est un numéro essentiel pour travailler, ouvrir un compte bancaire et vivre aux États-Unis.",
      yes: "Oui",
      no: "Non",
      title: "Quelle est ta priorité ?",
      back: "Retour",
      next: "Continuer",
      options: [
        { label: "💼 Trouver un emploi", value: "job" },
        { label: "🏠 Trouver un logement", value: "housing" },
        { label: "🏦 Ouvrir un compte bancaire", value: "bank" },
      ],
    },
    es: {
      question: "¿Ya tienes tu SSN?",
      desc: "El SSN es necesario para trabajar, abrir una cuenta bancaria y vivir en Estados Unidos.",
      yes: "Sí",
      no: "No",
      title: "¿Cuál es tu prioridad?",
      back: "Atrás",
      next: "Continuar",
      options: [
        { label: "💼 Encontrar trabajo", value: "job" },
        { label: "🏠 Encontrar vivienda", value: "housing" },
        { label: "🏦 Abrir cuenta bancaria", value: "bank" },
      ],
    },
  };

  const current = t[lang];

  ////////////////////////////////////////////////////
  // LOGIC (UPDATED)
  ////////////////////////////////////////////////////

  const handleNoSSN = () => {
    localStorage.setItem("priority", "ssn");
    router.push("/onboarding/step5");
  };

  const handleFinish = () => {
    if (!selected) return;

    localStorage.setItem("priority", selected);
    router.push("/onboarding/step5");
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
        <div
          style={backBtn}
          onClick={() =>
            step === "priority"
              ? setStep("question")
              : router.push("/onboarding/step3")
          }
        >
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
          
          {/* QUESTION */}
          {step === "question" && (
            <>
              <h2>{current.question}</h2>
              <p style={descText}>{current.desc}</p>

              <button style={btn} onClick={() => setStep("priority")}>
                {current.yes}
              </button>

              <button style={btnSecondary} onClick={handleNoSSN}>
                {current.no}
              </button>
            </>
          )}

          {/* PRIORITY */}
          {step === "priority" && (
            <>
              <h2>{current.title}</h2>

              {current.options.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => setSelected(opt.value)}
                  style={{
                    ...item,
                    border:
                      selected === opt.value
                        ? "2px solid #e8b84b"
                        : "none",
                  }}
                >
                  {opt.label}
                </div>
              ))}

              <button
                onClick={handleFinish}
                disabled={!selected}
                style={{
                  ...btn,
                  opacity: selected ? 1 : 0.5,
                }}
              >
                {current.next}
              </button>
            </>
          )}

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

const btn: React.CSSProperties = {
  marginTop: 15,
  padding: 15,
  width: "100%",
  background: "#e8b84b",
  border: "none",
  borderRadius: 10,
};

const btnSecondary: React.CSSProperties = {
  marginTop: 10,
  padding: 15,
  width: "100%",
  background: "#111",
  border: "1px solid #333",
  borderRadius: 10,
  color: "white",
};

const descText: React.CSSProperties = {
  marginTop: 10,
  marginBottom: 20,
  color: "#aaa",
  fontSize: 14,
};

const loader: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};