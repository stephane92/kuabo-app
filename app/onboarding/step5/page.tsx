"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type Lang = "en" | "fr" | "es";

export default function Step5() {
  const router = useRouter();

  const [lang, setLang] = useState<Lang>("en");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState({
    reason: "",
    arrival: "",
    state: "",
    priority: "",
  });

  ////////////////////////////////////////////////////
  // AUTH + LOAD
  ////////////////////////////////////////////////////

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return router.replace("/login");

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const dbData = snap.exists() ? snap.data() : {};

        const userLang = (dbData?.lang as Lang) || "en";
        setLang(userLang);
        localStorage.setItem("lang", userLang);

        setData({
          reason: localStorage.getItem("reason") || "",
          arrival: localStorage.getItem("arrival") || "",
          state: localStorage.getItem("state") || "",
          priority: localStorage.getItem("priority") || "",
        });

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
  // 🔥 VALUE TRANSLATION (FIX BUG)
  ////////////////////////////////////////////////////

  const valueMap = {
    arrival: {
      en: {
        abroad: "Abroad",
        new: "Just arrived",
        months: "Few months",
        settled: "Settled",
      },
      fr: {
        abroad: "À l’étranger",
        new: "Arrivé récemment",
        months: "Quelques mois",
        settled: "Installé",
      },
      es: {
        abroad: "En el extranjero",
        new: "Recién llegado",
        months: "Algunos meses",
        settled: "Establecido",
      },
    },
  };

  ////////////////////////////////////////////////////
  // FORMAT (fallback)
  ////////////////////////////////////////////////////

  const format = (text: string) => {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  ////////////////////////////////////////////////////
  // TEXT
  ////////////////////////////////////////////////////

  const t = {
    en: {
      title: "Review your information",
      confirm: "Continue",
      back: "Back",
      labels: {
        reason: "Reason",
        arrival: "Arrival",
        state: "State",
        priority: "Priority",
      },
    },
    fr: {
      title: "Vérifie tes informations",
      confirm: "Continuer",
      back: "Retour",
      labels: {
        reason: "Raison",
        arrival: "Situation",
        state: "État",
        priority: "Priorité",
      },
    },
    es: {
      title: "Revisa tu información",
      confirm: "Continuar",
      back: "Atrás",
      labels: {
        reason: "Motivo",
        arrival: "Situación",
        state: "Estado",
        priority: "Prioridad",
      },
    },
  };

  const current = t[lang];

  ////////////////////////////////////////////////////
  // SAVE
  ////////////////////////////////////////////////////

  const handleConfirm = async () => {
    setLoading(true);

    try {
      const user = auth.currentUser;

      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          reason: data.reason,
          arrival: data.arrival,
          state: data.state,
          priority: data.priority,
          onboardingCompleted: true,
        });
      }

      router.replace("/loading");
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
        <div style={backBtn} onClick={() => router.push("/onboarding/step4")}>
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

          <div style={card}>
            
            <div style={row}>
              <span>{current.labels.reason}</span>
              <strong>{format(data.reason)}</strong>
            </div>

            <div style={row}>
              <span>{current.labels.arrival}</span>
              <strong>
                {valueMap.arrival[lang]?.[
                  data.arrival as keyof typeof valueMap.arrival["en"]
                ] || format(data.arrival)}
              </strong>
            </div>

            <div style={row}>
              <span>{current.labels.state}</span>
              <strong>{format(data.state)}</strong>
            </div>

            <div style={row}>
              <span>{current.labels.priority}</span>
              <strong>{format(data.priority)}</strong>
            </div>

          </div>

          <button
            onClick={handleConfirm}
            disabled={loading}
            style={btn}
          >
            {loading ? "..." : current.confirm} →
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
  fontSize: 20,
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
  maxWidth: 420,
};

const card: React.CSSProperties = {
  marginTop: 20,
  background: "#0b1220",
  borderRadius: 14,
  padding: 20,
};

const row: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 12,
  color: "#ccc",
};

const btn: React.CSSProperties = {
  marginTop: 25,
  padding: 16,
  width: "100%",
  background: "#e8b84b",
  color: "#000",
  border: "none",
  borderRadius: 14,
  fontWeight: "bold",
};

const loader: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};