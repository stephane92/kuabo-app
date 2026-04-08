import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // 🔥 AJOUT

const firebaseConfig = {
  apiKey: "AIzaSyAfyqpqdUBixIz1_TmXzZsuoiatXfGLStQ",
  authDomain: "kuabo-42d9c.firebaseapp.com",
  projectId: "kuabo-42d9c",
  storageBucket: "kuabo-42d9c.firebasestorage.app",
  messagingSenderId: "774805697",
  appId: "1:774805697:web:1fa1a94076fd8e7c8f5c40",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app); // 🔥 AJOUT