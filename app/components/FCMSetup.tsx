"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_KEY || "";

const firebaseConfig = {
  apiKey:            "AIzaSyAfyqpqdUBixIz1_TmXzZsuoiatXfGLStQ",
  authDomain:        "kuabo-42d9c.firebaseapp.com",
  projectId:         "kuabo-42d9c",
  storageBucket:     "kuabo-42d9c.firebasestorage.app",
  messagingSenderId: "774805697",
  appId:             "1:774805697:web:1fa1a94076fd8e7c8f5c40",
};

type Props = {
  userId: string;
  lang:   "fr" | "en" | "es";
};

export default function FCMSetup({ userId, lang }: Props) {
  const [asked, setAsked] = useState(false);

  const T = {
    fr: { title:"🔔 Activer les notifications ?", body:"Reçois des rappels pour ton SSN, Green Card et les messages Kuabo.", allow:"Activer", skip:"Plus tard" },
    en: { title:"🔔 Enable notifications?", body:"Get reminders for your SSN, Green Card and Kuabo messages.", allow:"Enable", skip:"Later" },
    es: { title:"🔔 ¿Activar notificaciones?", body:"Recibe recordatorios para tu SSN, Green Card y mensajes Kuabo.", allow:"Activar", skip:"Más tarde" },
  }[lang];

  useEffect(() => {
    // Ne pas demander si déjà accepté ou refusé
    if (!userId) return;
    if (Notification.permission === "granted") {
      setupFCM();
      return;
    }
    if (Notification.permission === "denied") return;

    // Afficher notre prompt custom après 3 secondes
    const timer = setTimeout(() => setAsked(true), 3000);
    return () => clearTimeout(timer);
  }, [userId]);

  const setupFCM = async () => {
    try {
      if (!("serviceWorker" in navigator)) return;

      // Enregistrer le service worker
      const registration = await navigator.serviceWorker.register("/sw.js");

      // Init Firebase Messaging
      const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
      const messaging = getMessaging(app);

      // Obtenir le token FCM
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (token) {
        // Sauvegarder dans Firestore
        await updateDoc(doc(db, "users", userId), {
          fcmToken: token,
          notifEnabled: true,
          lastSeen: new Date().toISOString(),
        });

        // Écouter les messages en premier plan
        onMessage(messaging, (payload) => {
          const { title = "Kuabo", body = "" } = payload.notification || {};
          if (Notification.permission === "granted") {
            new Notification(title, {
              body,
              icon: "/icons/icon-192.png",
              badge: "/icons/icon-96.png",
            });
          }
        });
      }
    } catch (err) {
      console.error("FCM setup error:", err);
    }
  };

  const handleAllow = async () => {
    setAsked(false);
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      await setupFCM();
    }
  };

  const handleSkip = () => {
    setAsked(false);
    // Mettre à jour lastSeen quand même
    updateDoc(doc(db, "users", userId), {
      lastSeen: new Date().toISOString(),
    }).catch(() => {});
  };

  if (!asked) return null;

  return (
    <div style={{
      position: "fixed", bottom: 80, left: 16, right: 16,
      zIndex: 600, animation: "slideUp .4s cubic-bezier(.34,1.56,.64,1)",
    }}>
      <div style={{
        background: "#0f1521",
        border: "1.5px solid rgba(232,184,75,.3)",
        borderRadius: 18,
        padding: "18px 16px",
        boxShadow: "0 16px 48px rgba(0,0,0,.6)",
        maxWidth: 420,
        margin: "0 auto",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <span style={{ fontSize: 28, flexShrink: 0 }}>🔔</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f4f1ec", marginBottom: 4 }}>
              {T.title}
            </div>
            <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>
              {T.body}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleSkip}
            style={{ flex: 1, padding: "11px", background: "#141d2e", border: "1px solid #1e2a3a", borderRadius: 11, color: "#aaa", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            {T.skip}
          </button>
          <button onClick={handleAllow}
            style={{ flex: 2, padding: "11px", background: "#e8b84b", border: "none", borderRadius: 11, color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {T.allow}
          </button>
        </div>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}
