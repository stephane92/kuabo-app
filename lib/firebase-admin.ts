import * as admin from "firebase-admin";

// ✅ Ne pas initialiser au build si les variables manquent
if (!admin.apps.length && process.env.FIREBASE_PROJECT_ID) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export const adminDb  = admin.apps.length ? admin.firestore()  : null as any;
export const adminMsg = admin.apps.length ? admin.messaging()  : null as any;
export default admin;
