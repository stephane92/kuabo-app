// À ajouter dans HomeTab.tsx — remplacer l'ancienne fonction BottomNav

import type { Lang } from "./data";

// ══════════════════════════════════════════════
// BOTTOM NAV — 4 ONGLETS FIXES
// 🏠 Accueil | 🌍 Explorer | 💼 Jobs | 👤 Profil
// Documents est fusionné dans Explorer
// ══════════════════════════════════════════════
export function BottomNav({ activeTab, setActiveTab, lang, onHomePress }: {
  activeTab: string;
  setActiveTab: (t: string) => void;
  lang: Lang;
  onHomePress: () => void;
}) {
  const L = {
    fr: { home:"Accueil", explorer:"Explorer", jobs:"Emplois", profile:"Profil" },
    en: { home:"Home",    explorer:"Explore",  jobs:"Jobs",    profile:"Profile" },
    es: { home:"Inicio",  explorer:"Explorar", jobs:"Empleo",  profile:"Perfil"  },
  }[lang];

  const tabs = [
    { id:"home",     icon:"🏠", label:L.home     },
    { id:"explorer", icon:"🌍", label:L.explorer  },
    { id:"jobs",     icon:"💼", label:L.jobs      },
    { id:"profile",  icon:"👤", label:L.profile   },
  ];

  return (
    <div style={{
      position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
      width:"100%", maxWidth:480, height:68,
      background:"#0f1521", borderTop:"1px solid #1e2a3a",
      display:"flex", alignItems:"center", zIndex:200,
    }}>
      {tabs.map(({ id, icon, label }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => id==="home" && activeTab==="home" ? onHomePress() : setActiveTab(id)}
            style={{
              flex:1, display:"flex", flexDirection:"column",
              alignItems:"center", justifyContent:"center",
              gap:3, padding:"8px 0",
              background:"transparent", border:"none",
              cursor:"pointer", position:"relative",
              fontFamily:"inherit",
              WebkitTapHighlightColor:"transparent",
            }}
          >
            {/* Indicateur actif en haut */}
            {active && (
              <div style={{
                position:"absolute", top:0, left:"50%",
                transform:"translateX(-50%)",
                width:30, height:2,
                borderRadius:"0 0 3px 3px",
                background:"#e8b84b",
              }}/>
            )}
            <span style={{
              fontSize:22,
              filter: active ? "none" : "grayscale(1) opacity(.45)",
              transition:"filter .15s",
            }}>
              {icon}
            </span>
            <span style={{
              fontSize:10,
              fontWeight: active ? 600 : 400,
              color: active ? "#e8b84b" : "#4a5568",
              transition:"color .15s",
            }}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
