"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  GraduationCap,
  Briefcase,
  Users,
  Ticket,
  Plane,
  Trophy,
  Loader2,
} from "lucide-react";

type Lang = "en" | "fr" | "es";

export default function Step1() {
  const router = useRouter();

  const [selected, setSelected] = useState<string>("");
  const [lang, setLang] = useState<Lang>("en");
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

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
        { label: "DV Lottery Winner", value: "dv", icon: <Ticket size={18}/> },
        { label: "Student", value: "student", icon: <GraduationCap size={18}/> },
        { label: "Work", value: "work", icon: <Briefcase size={18}/> },
        { label: "Family", value: "family", icon: <Users size={18}/> },
        { label: "Tourist", value: "tourist", icon: <Plane size={18}/> },
        { label: "World Cup", value: "worldcup", icon: <Trophy size={18}/> },
      ],
    },
    fr: {
      title: "Pourquoi viens-tu aux USA ?",
      subtitle: "Choisis ta situation",
      next: "Continuer",
      back: "Retour",
      options: [
        { label: "DV Lottery", value: "dv", icon: <Ticket size={18}/> },
        { label: "Étudiant", value: "student", icon: <GraduationCap size={18}/> },
        { label: "Travail", value: "work", icon: <Briefcase size={18}/> },
        { label: "Famille", value: "family", icon: <Users size={18}/> },
        { label: "Touriste", value: "tourist", icon: <Plane size={18}/> },
        { label: "Coupe du monde", value: "worldcup", icon: <Trophy size={18}/> },
      ],
    },
    es: {
      title: "¿Por qué vienes a EE.UU.?",
      subtitle: "Elige tu situación",
      next: "Continuar",
      back: "Atrás",
      options: [
        { label: "Lotería DV", value: "dv", icon: <Ticket size={18}/> },
        { label: "Estudiante", value: "student", icon: <GraduationCap size={18}/> },
        { label: "Trabajo", value: "work", icon: <Briefcase size={18}/> },
        { label: "Familia", value: "family", icon: <Users size={18}/> },
        { label: "Turista", value: "tourist", icon: <Plane size={18}/> },
        { label: "Copa del mundo", value: "worldcup", icon: <Trophy size={18}/> },
      ],
    },
  };

  const current = t[lang];

  ////////////////////////////////////////////////////
  // NEXT
  ////////////////////////////////////////////////////

  const handleNext = async () => {
    if (!selected) return;

    setRedirecting(true);

    try {
      localStorage.setItem("reason", selected);

      const user = auth.currentUser;

      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          reason: selected,
        });
      }

      setTimeout(() => {
        router.push("/onboarding/step2");
      }, 1200);

    } catch (e) {
      console.log(e);
    }
  };

  ////////////////////////////////////////////////////
  // LOADING
  ////////////////////////////////////////////////////

  if (loading) {
    return <div style={loader}>Kuabo...</div>;
  }

  ////////////////////////////////////////////////////
  // UI
  ////////////////////////////////////////////////////

  return (
    <div style={container}>
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

      <div style={center}>
        <div style={box}>
          <h2>{current.title}</h2>
          <p style={subtitle}>{current.subtitle}</p>

          {current.options.map((opt: any) => {
            const active = selected === opt.value;

            return (
              <div
                key={opt.value}
                onClick={() => setSelected(opt.value)}
                style={{
                  ...item,
                  ...(active ? activeItem : {}),
                }}
              >
                <div style={iconBox}>{opt.icon}</div>
                {opt.label}
              </div>
            );
          })}

          <button
            onClick={handleNext}
            disabled={!selected || redirecting}
            style={{
              ...btn,
              opacity: selected ? 1 : 0.5,
            }}
          >
            {redirecting ? (
              <Loader2 className="spin" size={18} />
            ) : (
              current.next
            )}
          </button>
        </div>
      </div>

      <style>
        {`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}
      </style>
    </div>
  );
}

////////////////////////////////////////////////////
// STYLE
////////////////////////////////////////////////////

const loader: any = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  color: "#e8b84b",
};

const container: any = {
  minHeight: "100vh",
  background: "radial-gradient(circle at top, #0b1220, #05070a)",
  color: "white",
  display: "flex",
  flexDirection: "column",
};

const topBar: any = {
  display: "flex",
  justifyContent: "space-between",
  padding: 20,
};

const backBtn: any = { cursor: "pointer" };
const logo: any = { fontWeight: "bold" };
const langBox: any = { display: "flex", gap: 10, cursor: "pointer" };

const center: any = {
  flex: 1,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const box: any = {
  width: "90%",
  maxWidth: 400,
};

const subtitle: any = {
  color: "#888",
};

const item: any = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 16,
  marginTop: 10,
  borderRadius: 14,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  cursor: "pointer",
  transition: "all 0.25s ease",
};

const activeItem: any = {
  border: "1px solid #e8b84b",
  background: "rgba(232,184,75,0.1)",
  transform: "scale(1.02)",
};

const iconBox: any = {
  width: 30,
  height: 30,
  borderRadius: 8,
  background: "#1a2438",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const btn: any = {
  marginTop: 20,
  padding: 15,
  width: "100%",
  background: "#e8b84b",
  color: "#000", // ✅ FIX TEXT BLACK
  border: "none",
  borderRadius: 12,
  fontWeight: "bold",
};