import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminMsg } from "@/lib/firebase-admin";

// ── Types ──────────────────────────────────────────────
type NotifType = "ssn" | "admin_message" | "inactive";

type NotifPayload = {
  type:    NotifType;
  userId?: string;   // cibler 1 user
  target?: string;   // cibler "all" ou "state:MD" etc.
  lang?:   string;
};

// ── Textes multilingues ────────────────────────────────
const TEXTS: Record<NotifType, Record<string, { title: string; body: string }>> = {
  ssn: {
    fr: { title: "⏱ SSN urgent !", body: "Il te reste peu de temps pour obtenir ton SSN. Agis maintenant !" },
    en: { title: "⏱ SSN urgent!", body: "You have little time left to get your SSN. Act now!" },
    es: { title: "⏱ ¡SSN urgente!", body: "Te queda poco tiempo para obtener tu SSN. ¡Actúa ahora!" },
  },
  admin_message: {
    fr: { title: "📢 Nouveau message Kuabo", body: "Tu as un nouveau message de l'équipe Kuabo. Ouvre l'app !" },
    en: { title: "📢 New Kuabo message", body: "You have a new message from the Kuabo team. Open the app!" },
    es: { title: "📢 Nuevo mensaje Kuabo", body: "Tienes un nuevo mensaje del equipo Kuabo. ¡Abre la app!" },
  },
  inactive: {
    fr: { title: "👋 Kuabo a besoin de toi !", body: "Tu ne t'es pas connecté depuis 5 jours. Des deadlines t'attendent !" },
    en: { title: "👋 Kuabo misses you!", body: "You haven't logged in for 5 days. Deadlines are waiting for you!" },
    es: { title: "👋 ¡Kuabo te extraña!", body: "No has iniciado sesión en 5 días. ¡Hay fechas límite esperándote!" },
  },
};

// ── Envoyer une notification à 1 token ────────────────
async function sendToToken(token: string, type: NotifType, lang: string, url = "/dashboard") {
  const t = TEXTS[type][lang] || TEXTS[type]["en"];
  try {
    await adminMsg.send({
      token,
      notification: { title: t.title, body: t.body },
      webpush: {
        notification: {
          title: t.title,
          body:  t.body,
          icon:  "/icons/icon-192.png",
          badge: "/icons/icon-96.png",
          data:  { url },
        },
        fcmOptions: { link: url },
      },
    });
    return true;
  } catch (err: any) {
    // Token invalide → on le supprime
    if (err.code === "messaging/registration-token-not-registered") {
      return "invalid";
    }
    return false;
  }
}

// ── POST /api/notify ───────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // Vérif clé admin (sécurité basique)
    const auth = req.headers.get("x-kuabo-admin");
    if (auth !== process.env.ANTHROPIC_API_KEY?.slice(-8)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: NotifPayload = await req.json();
    const { type, userId, target } = body;

    if (!type) return NextResponse.json({ error: "Missing type" }, { status: 400 });

    // ── Cas 1 : 1 user spécifique ──
    if (userId) {
      const userSnap = await adminDb.doc(`users/${userId}`).get();
      if (!userSnap.exists) return NextResponse.json({ error: "User not found" }, { status: 404 });
      const data = userSnap.data() as any;
      if (!data?.fcmToken) return NextResponse.json({ error: "No FCM token" }, { status: 400 });

      const result = await sendToToken(data.fcmToken, type, data.lang || "en");
      if (result === "invalid") {
        await adminDb.doc(`users/${userId}`).update({ fcmToken: null });
      }
      return NextResponse.json({ sent: result === true ? 1 : 0 });
    }

    // ── Cas 2 : Broadcast (tous ou par cible) ──
    const usersSnap = await adminDb.collection("users").get();
    let sent = 0, failed = 0, invalid = 0;

    const promises = usersSnap.docs.map(async (docSnap: any) => {
      const data = docSnap.data() as any;
      if (data.deleted || !data.fcmToken) return;

      // Filtre par target
      if (target && target !== "all") {
        if (target.startsWith("state:")) {
          const state = target.split(":")[1];
          if (data.state !== state) return;
        } else if (target === "dv" && data.reason !== "dv") return;
        else if (target === "army" && !data.isArmy) return;
      }

      // Filtre SSN — seulement si deadline dans 7 jours ou moins
      if (type === "ssn") {
        if (!data.deadlines?.ssn) return;
        const daysLeft = Math.ceil(
          (new Date(data.deadlines.ssn).getTime() - Date.now()) / 86400000
        );
        if (daysLeft > 7 || daysLeft < 0) return;
      }

      // Filtre inactif — seulement si pas connecté depuis 5 jours
      if (type === "inactive") {
        if (!data.lastSeen) return;
        const daysSince = Math.ceil(
          (Date.now() - new Date(data.lastSeen).getTime()) / 86400000
        );
        if (daysSince < 5) return;
      }

      const result = await sendToToken(
        data.fcmToken, type, data.lang || "en"
      );
      if (result === true) sent++;
      else if (result === "invalid") {
        invalid++;
        await adminDb.doc(`users/${docSnap.id}`).update({ fcmToken: null });
      } else failed++;
    });

    await Promise.all(promises);

    return NextResponse.json({ sent, failed, invalid });

  } catch (err: any) {
    console.error("Notify error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── GET /api/notify/ssn — Déclencher rappels SSN ──────
export async function GET(req: NextRequest) {
  // Appelable via cron ou manuellement
  const auth = req.headers.get("x-kuabo-admin");
  if (auth !== process.env.ANTHROPIC_API_KEY?.slice(-8)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const usersSnap = await adminDb.collection("users").get();
  let sent = 0;

  for (const docSnap of usersSnap.docs) {
    const data = docSnap.data() as any;
    if (data.deleted || !data.fcmToken || !data.deadlines?.ssn) continue;

    const daysLeft = Math.ceil(
      (new Date(data.deadlines.ssn).getTime() - Date.now()) / 86400000
    );

    // Envoyer si 7, 3, ou 1 jour restant
    if ([7, 3, 1].includes(daysLeft)) {
      const texts = TEXTS.ssn[data.lang || "en"];
      await adminMsg.send({
        token: data.fcmToken,
        notification: {
          title: texts.title,
          body: `${texts.body} (${daysLeft}j restants)`,
        },
        webpush: {
          fcmOptions: { link: "/dashboard" },
        },
      });
      sent++;
    }
  }

  return NextResponse.json({ sent });
}
