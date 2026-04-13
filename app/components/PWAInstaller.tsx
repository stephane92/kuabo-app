"use client";
import { useEffect } from "react";

export default function PWAInstaller() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("✅ Kuabo PWA ready"))
        .catch(() => {});
    }
  }, []);
  return null;
}
