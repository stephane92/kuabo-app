"use client";

import type { Lang } from "./data";

export default function JobsTab({ lang, userId }: { lang: Lang; userId: string | undefined }) {
  const T = {
    fr: { title:"Emplois & Carrière 💼", sub:"Trouve des emplois recommandés par la communauté Kuabo", soon:"Bientôt disponible", soonDesc:"Les offres d'emploi compatibles avec ton visa arrivent très bientôt !", notify:"Me notifier" },
    en: { title:"Jobs & Career 💼", sub:"Find jobs recommended by the Kuabo community", soon:"Coming soon", soonDesc:"Visa-friendly job listings are coming very soon!", notify:"Notify me" },
    es: { title:"Empleos & Carrera 💼", sub:"Encuentra empleos recomendados por la comunidad Kuabo", soon:"Próximamente", soonDesc:"¡Las ofertas de trabajo compatibles con tu visa llegan muy pronto!", notify:"Notificarme" },
  }[lang];

  return (
    <div style={{ paddingTop:8 }}>
      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontSize:20, fontWeight:800, color:"#f4f1ec", marginBottom:6 }}>{T.title}</h2>
        <p style={{ fontSize:13, color:"#aaa", lineHeight:1.6 }}>{T.sub}</p>
      </div>

      {/* Coming soon card */}
      <div style={{ background:"linear-gradient(135deg,rgba(232,184,75,.08),rgba(45,212,191,.05))", border:"1px solid rgba(232,184,75,.2)", borderRadius:18, padding:"32px 24px", textAlign:"center" as const, marginBottom:16 }}>
        <div style={{ fontSize:52, marginBottom:16 }}>💼</div>
        <div style={{ fontSize:18, fontWeight:800, color:"#e8b84b", marginBottom:8 }}>{T.soon}</div>
        <div style={{ fontSize:13, color:"#aaa", lineHeight:1.7, marginBottom:20 }}>{T.soonDesc}</div>

        {/* Features à venir */}
        <div style={{ display:"flex", flexDirection:"column" as const, gap:10, textAlign:"left" as const }}>
          {[
            { icon:"⭐", label:{ fr:"Recommander un employeur", en:"Recommend an employer",    es:"Recomendar un empleador" }[lang] },
            { icon:"🔍", label:{ fr:"Offres compatibles avec ton visa", en:"Visa-compatible job offers", es:"Ofertas compatibles con tu visa" }[lang] },
            { icon:"🤖", label:{ fr:"Matching intelligent selon ton profil", en:"Smart matching based on your profile", es:"Matching inteligente según tu perfil" }[lang] },
            { icon:"🏆", label:{ fr:"Rating employeurs par la communauté", en:"Employer ratings from the community", es:"Calificaciones de empleadores" }[lang] },
          ].map((item, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:11 }}>
              <span style={{ fontSize:18 }}>{item.icon}</span>
              <span style={{ fontSize:13, color:"#f4f1ec" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
