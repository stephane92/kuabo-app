"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";

type Lang = "en" | "fr" | "es";

//////////////////////////////////////////////////
// DATA
//////////////////////////////////////////////////

const guides = {
  ssn: {
    en: {
      title: "Social Security Number",
      description: "Get your SSN to work legally in the US.",
      steps: [
        "Find nearest SSA office",
        "Bring passport + visa",
        "Fill SS-5 form",
        "Wait 2–3 weeks",
      ],
      documents: ["Passport", "Visa", "I-94"],
      time: "2–3 weeks",
    },
    fr: {
      title: "Numéro de sécurité sociale",
      description: "Obtiens ton SSN pour travailler légalement.",
      steps: [
        "Trouve un bureau SSA proche",
        "Apporte passeport + visa",
        "Remplis SS-5",
        "Attends 2–3 semaines",
      ],
      documents: ["Passeport", "Visa", "I-94"],
      time: "2–3 semaines",
    },
    es: {
      title: "Número de Seguro Social",
      description: "Obtén tu SSN para trabajar legalmente.",
      steps: [
        "Encuentra oficina SSA cercana",
        "Lleva pasaporte y visa",
        "Llena SS-5",
        "Espera 2–3 semanas",
      ],
      documents: ["Pasaporte", "Visa", "I-94"],
      time: "2–3 semanas",
    },
  },

  job: {
    en: {
      title: "Find a Job",
      description: "Start earning money quickly.",
      steps: [
        "Create a resume",
        "Apply online",
        "Walk into stores",
        "Follow up",
      ],
      documents: ["Resume"],
      time: "1–2 weeks",
    },
    fr: {
      title: "Trouver un travail",
      description: "Commence à gagner de l'argent rapidement.",
      steps: [
        "Crée un CV",
        "Postule en ligne",
        "Va en magasin",
        "Relance",
      ],
      documents: ["CV"],
      time: "1–2 semaines",
    },
    es: {
      title: "Encontrar trabajo",
      description: "Empieza a ganar dinero rápidamente.",
      steps: [
        "Crea un CV",
        "Aplica en línea",
        "Ve a tiendas",
        "Haz seguimiento",
      ],
      documents: ["CV"],
      time: "1–2 semanas",
    },
  },
};

//////////////////////////////////////////////////
// COMPONENT
//////////////////////////////////////////////////

export default function GuidePage({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const { step } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<Lang>("en");

  ////////////////////////////////////////////////////
  // AUTH
  ////////////////////////////////////////////////////

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return router.replace("/login");
      if (!user.emailVerified) return router.replace("/verify");
      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  ////////////////////////////////////////////////////
  // LANG
  ////////////////////////////////////////////////////

  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang;
    if (saved) setLang(saved);
  }, []);

  if (loading) return <div style={loader}>Loading...</div>;

  const guide = guides[step as keyof typeof guides];
  if (!guide) return <div style={container}>Guide not found</div>;

  const content = guide[lang];

  ////////////////////////////////////////////////////
  // GOOGLE MAPS (LANGUAGE BASED)
  ////////////////////////////////////////////////////

  const getMapQuery = () => {
    if (lang === "fr") return "bureau SSA près de moi";
    if (lang === "es") return "oficina SSA cerca de mí";
    return "SSA office near me";
  };

  const mapLink = `https://www.google.com/maps/search/${encodeURIComponent(getMapQuery())}`;

  ////////////////////////////////////////////////////
  // DONE
  ////////////////////////////////////////////////////

  const markDone = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const data = snap.data();

    const current = data?.completedSteps || [];

    if (!current.includes(step)) {
      await updateDoc(ref, {
        completedSteps: [...current, step],
      });
    }

    router.push("/dashboard");
  };

  ////////////////////////////////////////////////////
  // UI
  ////////////////////////////////////////////////////

  return (
    <div style={container}>
      
      <button style={backBtn} onClick={() => router.back()}>
        ← {lang === "fr" ? "Retour" : lang === "es" ? "Volver" : "Back"}
      </button>

      <h1 style={title}>{content.title}</h1>
      <p style={desc}>{content.description}</p>

      <a href={mapLink} target="_blank" style={mapBtn}>
        📍 {lang === "fr"
          ? "Trouver un bureau SSA"
          : lang === "es"
          ? "Buscar oficina SSA"
          : "Find SSA Office"}
      </a>

      <div style={stepsContainer}>
        {content.steps.map((s, i) => (
          <div key={i} style={stepCard}>
            <div style={stepNumber}>{i + 1}</div>
            <div>{s}</div>
          </div>
        ))}
      </div>

      <div style={box}>
        <h3>📄 Documents</h3>
        {content.documents.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      <div style={box}>
        <h3>⏱ Time</h3>
        <p>{content.time}</p>
      </div>

      <button style={doneBtn} onClick={markDone}>
        ✅ {lang === "fr"
          ? "Marquer comme fait"
          : lang === "es"
          ? "Marcar como hecho"
          : "Mark as done"}
      </button>

      <button style={aiBtn}>🤖 Ask AI</button>
    </div>
  );
}

//////////////////////////////////////////////////
// STYLES (SOFT PREMIUM)
//////////////////////////////////////////////////

const container: React.CSSProperties = {
  background: "#0b0f1a",
  minHeight: "100vh",
  padding: 20,
  color: "#fff",
};

const backBtn: React.CSSProperties = {
  marginBottom: 20,
  padding: 10,
  borderRadius: 8,
  background: "transparent",
  border: "1px solid #333",
  color: "#ccc",
  cursor: "pointer",
};

const title: React.CSSProperties = {
  fontSize: 24,
  fontWeight: "bold",
};

const desc: React.CSSProperties = {
  color: "#aaa",
  marginBottom: 20,
};

const mapBtn: React.CSSProperties = {
  display: "block",
  marginBottom: 20,
  padding: 12,
  background: "#1e293b",
  color: "#e2e8f0",
  borderRadius: 10,
  textAlign: "center",
  textDecoration: "none",
  border: "1px solid #334155",
};

const stepsContainer: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const stepCard: React.CSSProperties = {
  display: "flex",
  gap: 10,
  background: "#141d2e",
  padding: 12,
  borderRadius: 10,
};

const stepNumber: React.CSSProperties = {
  background: "#e8b84b",
  borderRadius: "50%",
  width: 25,
  height: 25,
  textAlign: "center",
};

const box: React.CSSProperties = {
  marginTop: 20,
  padding: 15,
  background: "#141d2e",
  borderRadius: 10,
};

const doneBtn: React.CSSProperties = {
  marginTop: 20,
  padding: 14,
  background: "#e8b84b",
  color: "#000",
  borderRadius: 10,
  width: "100%",
  fontWeight: "bold",
  cursor: "pointer",
};

const aiBtn: React.CSSProperties = {
  marginTop: 10,
  padding: 14,
  background: "#111827",
  color: "#9ca3af",
  borderRadius: 10,
  width: "100%",
  border: "1px solid #374151",
  cursor: "pointer",
};

const loader: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  color: "white",
};