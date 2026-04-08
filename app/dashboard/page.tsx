"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

type Lang = "en" | "fr" | "es";

export default function Dashboard() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [userName, setUserName] = useState("User");
  const [lang, setLang] = useState<Lang>("en");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  ////////////////////////////////////////////////////
  // TEXT
  ////////////////////////////////////////////////////

  const t = {
    en: {
      done: "DONE",
      todo: "TO DO",
      logout: "Logout",
      next: "Next priority step",
      guide: "View guide →",
      mark: "Mark as done",
      completed: "Completed",
      integration: "Integration",
      deadline: "Days left",
      undo: "Undo",
    },
    fr: {
      done: "FAIT",
      todo: "À FAIRE",
      logout: "Déconnexion",
      next: "Prochaine étape prioritaire",
      guide: "Voir le guide →",
      mark: "Marquer comme fait",
      completed: "Complétées",
      integration: "Intégration",
      deadline: "Jours restants",
      undo: "Annuler",
    },
    es: {
      done: "HECHO",
      todo: "PENDIENTE",
      logout: "Cerrar sesión",
      next: "Próximo paso prioritario",
      guide: "Ver guía →",
      mark: "Marcar como hecho",
      completed: "Completadas",
      integration: "Integración",
      deadline: "Días restantes",
      undo: "Deshacer",
    },
  };

  const text = t[lang];

  ////////////////////////////////////////////////////
  // STEPS
  ////////////////////////////////////////////////////

  const stepsByLang = {
    en: [
      { id: "ssn", label: "Social Security Number", time: 23, weight: 25 },
      { id: "phone", label: "US Phone Number", time: 7, weight: 10 },
      { id: "bank", label: "Bank Account", time: 10, weight: 15 },
      { id: "housing", label: "Housing", time: 30, weight: 20 },
      { id: "job", label: "Find a Job", time: 20, weight: 20 },
      { id: "license", label: "Driver License", time: 40, weight: 10 },
    ],
    fr: [
      { id: "ssn", label: "Numéro de sécurité sociale", time: 23, weight: 25 },
      { id: "phone", label: "Numéro US", time: 7, weight: 10 },
      { id: "bank", label: "Compte bancaire", time: 10, weight: 15 },
      { id: "housing", label: "Logement", time: 30, weight: 20 },
      { id: "job", label: "Trouver un travail", time: 20, weight: 20 },
      { id: "license", label: "Permis de conduire", time: 40, weight: 10 },
    ],
    es: [
      { id: "ssn", label: "Número de seguro social", time: 23, weight: 25 },
      { id: "phone", label: "Número telefónico", time: 7, weight: 10 },
      { id: "bank", label: "Cuenta bancaria", time: 10, weight: 15 },
      { id: "housing", label: "Vivienda", time: 30, weight: 20 },
      { id: "job", label: "Encontrar trabajo", time: 20, weight: 20 },
      { id: "license", label: "Licencia de conducir", time: 40, weight: 10 },
    ],
  };

  const steps = stepsByLang[lang as keyof typeof stepsByLang];

  ////////////////////////////////////////////////////
  // AUTH
  ////////////////////////////////////////////////////

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return router.replace("/login");

      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.exists() ? snap.data() : {};

      setUserName((data as any)?.name || "User");
      setLang(((data as any)?.lang as Lang) || "en");
      setCompletedSteps((data as any)?.completedSteps || []);

      setReady(true);
    });

    return () => unsub();
  }, [router]);

  ////////////////////////////////////////////////////
  // MENU CLOSE
  ////////////////////////////////////////////////////

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  ////////////////////////////////////////////////////
  // TOGGLE STEP
  ////////////////////////////////////////////////////

  const toggleStep = async (stepId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    let updated: string[];

    if (completedSteps.includes(stepId)) {
      updated = completedSteps.filter((s) => s !== stepId);
      setToast("Step undone");
    } else {
      updated = [...completedSteps, stepId];
      setToast("Step completed 🎉");
    }

    setLastAction(stepId);
    setCompletedSteps(updated);

    await updateDoc(doc(db, "users", user.uid), {
      completedSteps: updated,
    });

    setTimeout(() => setToast(null), 3000);
  };

  ////////////////////////////////////////////////////
  // UNDO
  ////////////////////////////////////////////////////

  const undoLast = async () => {
    if (!lastAction) return;

    const user = auth.currentUser;
    if (!user) return;

    const updated = completedSteps.filter((s) => s !== lastAction);

    setCompletedSteps(updated);

    await updateDoc(doc(db, "users", user.uid), {
      completedSteps: updated,
    });

    setToast("Action undone");
    setLastAction(null);

    setTimeout(() => setToast(null), 3000);
  };

  ////////////////////////////////////////////////////
  // PROGRESS
  ////////////////////////////////////////////////////

  const progress = Math.round(
    steps.reduce((acc, step) => {
      return completedSteps.includes(step.id)
        ? acc + step.weight
        : acc;
    }, 0)
  );

  const completedCount = completedSteps.length;

  const nextStep = steps.find(
    (s) => !completedSteps.includes(s.id)
  );

  ////////////////////////////////////////////////////
  // PHASE SYSTEM (SMART)
  ////////////////////////////////////////////////////

  const phaseText = {
    en: {
      install: "🚀 Installation",
      middle: "⚡ Stabilization",
      end: "🔥 Independence",
      start: "Start with your SSN",
      progress: "You're doing great, keep going!",
      done: "Almost done, finish strong!",
    },
    fr: {
      install: "🚀 Installation",
      middle: "⚡ Stabilisation",
      end: "🔥 Indépendance",
      start: "Commence par ton SSN",
      progress: "Tu avances bien, continue !",
      done: "Presque fini, continue !",
    },
    es: {
      install: "🚀 Instalación",
      middle: "⚡ Estabilización",
      end: "🔥 Independencia",
      start: "Empieza con tu SSN",
      progress: "Vas muy bien, sigue así!",
      done: "Casi terminado, sigue!",
    },
  };

  const p = phaseText[lang as keyof typeof phaseText];

  const hasSSN = completedSteps.includes("ssn");

  let phase = "";
  let message = "";

  if (!hasSSN) {
    phase = p.install;
    message = p.start;
  } else if (progress < 70) {
    phase = p.middle;
    message = p.progress;
  } else {
    phase = p.end;
    message = p.done;
  }

  ////////////////////////////////////////////////////
  // CIRCLE
  ////////////////////////////////////////////////////

  const radius = 50;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  const strokeDashoffset =
    circumference - (progress / 100) * circumference;

  ////////////////////////////////////////////////////
  // ACTIONS
  ////////////////////////////////////////////////////

  const changeLang = async (l: Lang) => {
    setLang(l);
    localStorage.setItem("lang", l);

    const user = auth.currentUser;
    if (user) {
      await updateDoc(doc(db, "users", user.uid), { lang: l });
    }

    setMenuOpen(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  ////////////////////////////////////////////////////
  // UI
  ////////////////////////////////////////////////////

  if (!ready) return <div style={loader}>Kuabo...</div>;

  return (
    <div style={container}>

      {/* HEADER */}
      <div style={topBar}>
        <div style={logo}>
          <span style={{ color: "#e8b84b" }}>Ku</span>abo
        </div>

        <div ref={menuRef} style={{ position: "relative" }}>
          <div style={userBtn} onClick={() => setMenuOpen(!menuOpen)}>
            {userName} ☰
          </div>

          {menuOpen && (
            <div style={menu}>
              <div style={menuItem} onClick={() => changeLang("en")}>🇺🇸 English</div>
              <div style={menuItem} onClick={() => changeLang("fr")}>🇫🇷 Français</div>
              <div style={menuItem} onClick={() => changeLang("es")}>🇪🇸 Español</div>
              <hr style={{ borderColor: "#333" }} />
              <div style={menuItem} onClick={handleLogout}>{text.logout}</div>
            </div>
          )}
        </div>
      </div>

      {/* PHASE */}
      <div style={{ marginTop: 20 }}>
        <div style={{ color: "#aaa" }}>{phase}</div>
        <div style={{ fontSize: 18 }}>{message}</div>
      </div>

      {/* STATS */}
      <div style={statsRow}>
        <div style={statCard}>
          <div style={statNumber}>{completedCount}</div>
          <div style={statLabel}>{text.completed}</div>
        </div>

        <div style={statCard}>
          <div style={statNumber}>{progress}%</div>
          <div style={statLabel}>{text.integration}</div>
        </div>

        <div style={statCard}>
          <div style={statNumber}>
            {nextStep ? nextStep.time : "-"}
          </div>
          <div style={statLabel}>{text.deadline}</div>
        </div>
      </div>

      {/* MOTIVATION */}
      <div style={{ marginTop: 10, color: "#aaa" }}>
        {completedCount}/{steps.length} steps completed 🔥
      </div>

      {/* PRIORITY */}
      {nextStep && (
        <div style={priorityCard}>
          <div style={priorityTitle}>{text.next}</div>
          <div style={priorityMain}>{nextStep.label}</div>
          
          <button
  style={primaryBtn}
  onClick={() => router.push(`/guide/${nextStep?.id}`)}
>
  {text.guide}
</button>

          <button
            style={secondaryBtn}
            onClick={() => toggleStep(nextStep.id)}
          >
            ✓ {text.mark}
          </button>
        </div>
      )}

      {/* PROGRESS */}
      <div style={progressCard}>
        <svg height={120} width={120}>
          <circle stroke="#2a344a" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={60} cy={60} />
          <circle
            stroke="#e8b84b"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={60}
            cy={60}
          />
          <text x="50%" y="50%" textAnchor="middle" dy=".3em" fill="#e8b84b">
            {progress}%
          </text>
        </svg>
      </div>

      {/* TASKS */}
      {steps.map((step) => {
        const done = completedSteps.includes(step.id);

        return (
          <div key={step.id} style={taskCard}>
            <div
              style={{
                ...check,
                borderColor: done ? "#22c55e" : "#555",
              }}
              onClick={() => toggleStep(step.id)}
            >
              {done && "✓"}
            </div>

            <div style={{ flex: 1 }}>
              <div>{step.label}</div>
              <div style={{ color: "#aaa", fontSize: 12 }}>
                {step.time} {text.deadline}
              </div>
            </div>

            <div
              style={{
                ...badge,
                background: done ? "#22c55e20" : "#e8b84b20",
                color: done ? "#22c55e" : "#e8b84b",
              }}
            >
              {done ? text.done : text.todo}
            </div>
          </div>
        );
      })}

      {/* TOAST */}
      {toast && (
        <div style={toastStyle}>
          {toast}
          {lastAction && (
            <span
              onClick={undoLast}
              style={{ marginLeft: 10, cursor: "pointer", color: "#e8b84b" }}
            >
              {text.undo}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

////////////////////////////////////////////////////
const toastStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 20,
  left: "50%",
  transform: "translateX(-50%)",
  background: "#1a2438",
  padding: "10px 20px",
  borderRadius: 10,
};

const container: React.CSSProperties = {
  background: "#0b0f1a",
  color: "#f4f1ec",
  minHeight: "100vh",
  padding: 20,
};

const topBar: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
};

const logo: React.CSSProperties = { fontWeight: "bold" };
const userBtn: React.CSSProperties = { cursor: "pointer" };

const menu: React.CSSProperties = {
  position: "absolute",
  right: 0,
  background: "#1a2438",
  padding: 10,
  borderRadius: 10,
};

const menuItem: React.CSSProperties = {
  padding: 8,
  cursor: "pointer",
};

const statsRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 20,
};

const statCard: React.CSSProperties = {
  flex: 1,
  background: "#1a2438",
  padding: 15,
  borderRadius: 12,
  textAlign: "center",
};

const statNumber: React.CSSProperties = {
  fontSize: 22,
  color: "#e8b84b",
};

const statLabel: React.CSSProperties = {
  fontSize: 12,
  color: "#aaa",
};

const priorityCard: React.CSSProperties = {
  marginTop: 20,
  padding: 20,
  borderRadius: 14,
  background: "#1a2438",
};

const priorityTitle: React.CSSProperties = {
  color: "#aaa",
  marginBottom: 10,
};

const priorityMain: React.CSSProperties = {
  fontSize: 20,
  marginBottom: 10,
};

const primaryBtn: React.CSSProperties = {
  width: "100%",
  padding: 12,
  background: "#e8b84b",
  border: "none",
  borderRadius: 10,
  marginBottom: 10,
};

const secondaryBtn: React.CSSProperties = {
  width: "100%",
  padding: 12,
  background: "transparent",
  border: "1px solid #555",
  borderRadius: 10,
};

const progressCard: React.CSSProperties = {
  marginTop: 30,
  textAlign: "center",
};

const taskCard: React.CSSProperties = {
  marginTop: 15,
  background: "#141d2e",
  padding: 16,
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const check: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: "50%",
  border: "2px solid",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const badge: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: 8,
  fontSize: 12,
};

const loader: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};