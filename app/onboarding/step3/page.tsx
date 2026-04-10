"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import type { CSSProperties } from "react";

type Lang = "en" | "fr" | "es";

// ══════════════════════════════════════════════
// ÉTATS USA avec faits motivants
// ══════════════════════════════════════════════
const US_STATES: { value: string; label: string; emoji: string; fact: Record<Lang, string> }[] = [
  { value: "California",    label: "California",    emoji: "🌴", fact: { fr: "Plus grande économie des USA — Hollywood, Silicon Valley, plages infinies.", en: "Largest US economy — Hollywood, Silicon Valley, endless beaches.", es: "La mayor economía de EE.UU. — Hollywood, Silicon Valley, playas infinitas." } },
  { value: "Texas",         label: "Texas",         emoji: "🤠", fact: { fr: "Zéro impôt sur le revenu — économie en pleine croissance, tout est grand ici !", en: "No state income tax — booming economy, everything is bigger here!", es: "Sin impuesto estatal — economía en auge, ¡todo es más grande aquí!" } },
  { value: "Florida",       label: "Florida",       emoji: "🌞", fact: { fr: "Soleil toute l'année, zéro impôt sur le revenu et une grande communauté immigrante.", en: "Sun all year, no income tax, and a large immigrant community.", es: "Sol todo el año, sin impuesto y una gran comunidad inmigrante." } },
  { value: "New York",      label: "New York",      emoji: "🗽", fact: { fr: "La ville qui ne dort jamais — diversité incroyable, opportunités infinies.", en: "The city that never sleeps — incredible diversity, infinite opportunities.", es: "La ciudad que nunca duerme — diversidad increíble, oportunidades infinitas." } },
  { value: "Maryland",      label: "Maryland",      emoji: "🦀", fact: { fr: "Proche de Washington D.C. — excellentes opportunités fédérales et militaires.", en: "Close to Washington D.C. — excellent federal and military opportunities.", es: "Cerca de Washington D.C. — excelentes oportunidades federales y militares." } },
  { value: "Virginia",      label: "Virginia",      emoji: "⭐", fact: { fr: "Proche de D.C., bases militaires nombreuses — idéal pour les détenteurs de DV.", en: "Close to D.C., many military bases — ideal for DV holders.", es: "Cerca de D.C., muchas bases militares — ideal para titulares de DV." } },
  { value: "Georgia",       label: "Georgia",       emoji: "🍑", fact: { fr: "Atlanta — hub international, coût de la vie abordable, communauté africaine forte.", en: "Atlanta — international hub, affordable cost of living, strong African community.", es: "Atlanta — hub internacional, costo de vida asequible, fuerte comunidad africana." } },
  { value: "Illinois",      label: "Illinois",      emoji: "🌆", fact: { fr: "Chicago — 3ème plus grande ville, excellent marché de l'emploi.", en: "Chicago — 3rd largest city, excellent job market.", es: "Chicago — 3ª ciudad más grande, excelente mercado laboral." } },
  { value: "Washington",    label: "Washington",    emoji: "🌲", fact: { fr: "Seattle — Amazon, Boeing, Microsoft — hub tech de la côte ouest.", en: "Seattle — Amazon, Boeing, Microsoft — west coast tech hub.", es: "Seattle — Amazon, Boeing, Microsoft — hub tecnológico de la costa oeste." } },
  { value: "Massachusetts", label: "Massachusetts", emoji: "🎓", fact: { fr: "Harvard, MIT — capitale mondiale de l'éducation et de la recherche.", en: "Harvard, MIT — world capital of education and research.", es: "Harvard, MIT — capital mundial de la educación e investigación." } },
  { value: "Pennsylvania",  label: "Pennsylvania",  emoji: "🔔", fact: { fr: "Philadelphia et Pittsburgh — histoire riche, coût de la vie modéré.", en: "Philadelphia and Pittsburgh — rich history, moderate cost of living.", es: "Filadelfia y Pittsburgh — rica historia, costo de vida moderado." } },
  { value: "Ohio",          label: "Ohio",          emoji: "🌽", fact: { fr: "Coût de la vie très abordable — Columbus et Cleveland en plein essor.", en: "Very affordable cost of living — Columbus and Cleveland are booming.", es: "Costo de vida muy asequible — Columbus y Cleveland en auge." } },
  { value: "North Carolina",label: "North Carolina",emoji: "🌳", fact: { fr: "Research Triangle — tech, pharma, éducation — une des villes les plus en croissance.", en: "Research Triangle — tech, pharma, education — one of the fastest growing areas.", es: "Research Triangle — tecnología, farmacia, educación — una de las zonas de mayor crecimiento." } },
  { value: "Michigan",      label: "Michigan",      emoji: "🚗", fact: { fr: "Detroit — industrie automobile en renaissance, coût de la vie très bas.", en: "Detroit — automobile industry renaissance, very low cost of living.", es: "Detroit — renacimiento de la industria automotriz, costo de vida muy bajo." } },
  { value: "Arizona",       label: "Arizona",       emoji: "🌵", fact: { fr: "Phoenix — soleil 300 jours/an, croissance économique rapide, immobilier abordable.", en: "Phoenix — 300 days of sun/year, rapid economic growth, affordable real estate.", es: "Phoenix — 300 días de sol/año, rápido crecimiento económico, inmuebles asequibles." } },
  { value: "Colorado",      label: "Colorado",      emoji: "⛰️", fact: { fr: "Denver — qualité de vie exceptionnelle, tech en plein boom, nature à couper le souffle.", en: "Denver — exceptional quality of life, booming tech, breathtaking nature.", es: "Denver — calidad de vida excepcional, tecnología en auge, naturaleza impresionante." } },
  { value: "Nevada",        label: "Nevada",        emoji: "🎲", fact: { fr: "Las Vegas et Reno — zéro impôt sur le revenu, économie du tourisme en plein essor.", en: "Las Vegas and Reno — no income tax, booming tourism economy.", es: "Las Vegas y Reno — sin impuesto, economía turística en auge." } },
  { value: "Minnesota",     label: "Minnesota",     emoji: "🏔️", fact: { fr: "Minneapolis — grande communauté africaine, excellentes écoles, économie diversifiée.", en: "Minneapolis — large African community, excellent schools, diverse economy.", es: "Minneapolis — gran comunidad africana, excelentes escuelas, economía diversificada." } },
  { value: "Tennessee",     label: "Tennessee",     emoji: "🎵", fact: { fr: "Nashville — zéro impôt sur le revenu, musique, santé, tech — en pleine explosion.", en: "Nashville — no income tax, music, health, tech — exploding growth.", es: "Nashville — sin impuesto, música, salud, tecnología — crecimiento explosivo." } },
  { value: "Alabama",       label: "Alabama",       emoji: "🌸", fact: { fr: "Coût de la vie parmi les plus bas des USA — idéal pour démarrer.", en: "One of the lowest costs of living in the USA — ideal to start.", es: "Uno de los costos de vida más bajos de EE.UU. — ideal para empezar." } },
  { value: "Alaska",        label: "Alaska",        emoji: "🐻", fact: { fr: "L'état le plus grand — l'état te donne même de l'argent chaque année !", en: "The largest state — the state even gives you money every year!", es: "El estado más grande — ¡el estado incluso te da dinero cada año!" } },
  { value: "Arkansas",      label: "Arkansas",      emoji: "💎", fact: { fr: "Coût de la vie très bas, nature magnifique — idéal pour une vie tranquille.", en: "Very low cost of living, beautiful nature — ideal for a peaceful life.", es: "Costo de vida muy bajo, naturaleza hermosa — ideal para una vida tranquila." } },
  { value: "Connecticut",   label: "Connecticut",   emoji: "🏛️", fact: { fr: "Proche de New York et Boston — salaires élevés, qualité de vie excellente.", en: "Close to New York and Boston — high salaries, excellent quality of life.", es: "Cerca de Nueva York y Boston — salarios altos, excelente calidad de vida." } },
  { value: "Delaware",      label: "Delaware",      emoji: "🦅", fact: { fr: "Zéro taxe de vente — beaucoup d'entreprises s'y enregistrent.", en: "No sales tax — many companies are incorporated here.", es: "Sin impuesto sobre ventas — muchas empresas se registran aquí." } },
  { value: "Hawaii",        label: "Hawaii",        emoji: "🌺", fact: { fr: "Le paradis sur terre — diversité culturelle incroyable, mais coût de la vie élevé.", en: "Paradise on earth — incredible cultural diversity, but high cost of living.", es: "El paraíso en la tierra — increíble diversidad cultural, pero alto costo de vida." } },
  { value: "Idaho",         label: "Idaho",         emoji: "🥔", fact: { fr: "Boise — une des villes à la croissance la plus rapide des USA.", en: "Boise — one of the fastest growing cities in the USA.", es: "Boise — una de las ciudades de más rápido crecimiento en EE.UU." } },
  { value: "Indiana",       label: "Indiana",       emoji: "🏎️", fact: { fr: "Indianapolis — coût de la vie abordable, marché de l'emploi solide.", en: "Indianapolis — affordable cost of living, solid job market.", es: "Indianápolis — costo de vida asequible, sólido mercado laboral." } },
  { value: "Iowa",          label: "Iowa",          emoji: "🌾", fact: { fr: "Taux de chômage parmi les plus bas — excellent endroit pour travailler.", en: "One of the lowest unemployment rates — great place to work.", es: "Una de las tasas de desempleo más bajas — excelente lugar para trabajar." } },
  { value: "Kansas",        label: "Kansas",        emoji: "🌻", fact: { fr: "Coût de la vie très abordable au cœur des USA.", en: "Very affordable cost of living in the heart of the USA.", es: "Costo de vida muy asequible en el corazón de EE.UU." } },
  { value: "Kentucky",      label: "Kentucky",      emoji: "🐎", fact: { fr: "Louisville et Lexington — coût de la vie bas, forte croissance économique.", en: "Louisville and Lexington — low cost of living, strong economic growth.", es: "Louisville y Lexington — bajo costo de vida, fuerte crecimiento económico." } },
  { value: "Louisiana",     label: "Louisiana",     emoji: "🎷", fact: { fr: "La Nouvelle-Orléans — culture unique, gastronomie, tourisme — très grande communauté africaine.", en: "New Orleans — unique culture, gastronomy, tourism — very large African community.", es: "Nueva Orleans — cultura única, gastronomía, turismo — gran comunidad africana." } },
  { value: "Maine",         label: "Maine",         emoji: "🦞", fact: { fr: "Nature préservée, qualité de vie excellente, communauté soudée.", en: "Preserved nature, excellent quality of life, tight-knit community.", es: "Naturaleza preservada, excelente calidad de vida, comunidad unida." } },
  { value: "Mississippi",   label: "Mississippi",   emoji: "🌊", fact: { fr: "Coût de la vie le plus bas des USA — idéal pour économiser.", en: "Lowest cost of living in the USA — ideal to save money.", es: "El costo de vida más bajo de EE.UU. — ideal para ahorrar." } },
  { value: "Missouri",      label: "Missouri",      emoji: "🌉", fact: { fr: "Kansas City et St Louis — au carrefour des USA, economie diversifiée.", en: "Kansas City and St. Louis — at the crossroads of the USA, diverse economy.", es: "Kansas City y St. Louis — en el cruce de EE.UU., economía diversificada." } },
  { value: "Montana",       label: "Montana",       emoji: "🦌", fact: { fr: "Nature spectaculaire, pas d'impôt sur les ventes, immobilier encore abordable.", en: "Spectacular nature, no sales tax, still affordable real estate.", es: "Naturaleza espectacular, sin impuesto sobre ventas, inmuebles aún asequibles." } },
  { value: "Nebraska",      label: "Nebraska",      emoji: "🌽", fact: { fr: "Omaha — marché de l'emploi solide, coût de la vie bas.", en: "Omaha — solid job market, low cost of living.", es: "Omaha — sólido mercado laboral, bajo costo de vida." } },
  { value: "New Hampshire", label: "New Hampshire", emoji: "🍂", fact: { fr: "Zéro impôt sur le revenu ET sur les ventes — l'un des meilleurs états fiscalement.", en: "No income tax AND no sales tax — one of the best states fiscally.", es: "Sin impuesto sobre renta NI sobre ventas — uno de los mejores estados fiscalmente." } },
  { value: "New Jersey",    label: "New Jersey",    emoji: "🌇", fact: { fr: "Proche de NYC — densité d'opportunités incroyable, excellentes écoles.", en: "Close to NYC — incredible density of opportunities, excellent schools.", es: "Cerca de NYC — increíble densidad de oportunidades, excelentes escuelas." } },
  { value: "New Mexico",    label: "New Mexico",    emoji: "🌶️", fact: { fr: "Albuquerque — coût de la vie bas, culture riche, soleil toute l'année.", en: "Albuquerque — low cost of living, rich culture, sun all year.", es: "Albuquerque — bajo costo de vida, cultura rica, sol todo el año." } },
  { value: "North Dakota",  label: "North Dakota",  emoji: "⚡", fact: { fr: "L'un des taux de chômage les plus bas — boom de l'énergie.", en: "One of the lowest unemployment rates — energy boom.", es: "Una de las tasas de desempleo más bajas — auge energético." } },
  { value: "Oklahoma",      label: "Oklahoma",      emoji: "🌪️", fact: { fr: "Oklahoma City — coût de la vie bas, pas de trafic, croissance économique forte.", en: "Oklahoma City — low cost of living, no traffic, strong economic growth.", es: "Oklahoma City — bajo costo de vida, sin tráfico, fuerte crecimiento económico." } },
  { value: "Oregon",        label: "Oregon",        emoji: "🌲", fact: { fr: "Portland — culture artiste, tech en croissance, pas de taxe sur les ventes.", en: "Portland — arts culture, growing tech scene, no sales tax.", es: "Portland — cultura artística, tecnología en crecimiento, sin impuesto sobre ventas." } },
  { value: "Rhode Island",  label: "Rhode Island",  emoji: "⚓", fact: { fr: "Le plus petit état mais proche de Boston et NYC — opportunités infinies.", en: "Smallest state but close to Boston and NYC — infinite opportunities.", es: "El estado más pequeño pero cerca de Boston y NYC — oportunidades infinitas." } },
  { value: "South Carolina",label: "South Carolina",emoji: "🌴", fact: { fr: "Charleston — beauté historique, coût de la vie modéré, économie en croissance.", en: "Charleston — historic beauty, moderate cost of living, growing economy.", es: "Charleston — belleza histórica, costo de vida moderado, economía en crecimiento." } },
  { value: "South Dakota",  label: "South Dakota",  emoji: "🦅", fact: { fr: "Zéro impôt sur le revenu — économie stable, coût de la vie bas.", en: "No income tax — stable economy, low cost of living.", es: "Sin impuesto sobre renta — economía estable, bajo costo de vida." } },
  { value: "Utah",          label: "Utah",          emoji: "🏜️", fact: { fr: "Salt Lake City — Silicon Slopes, une des économies les plus dynamiques des USA.", en: "Salt Lake City — Silicon Slopes, one of the most dynamic economies in the USA.", es: "Salt Lake City — Silicon Slopes, una de las economías más dinámicas de EE.UU." } },
  { value: "Vermont",       label: "Vermont",       emoji: "🍁", fact: { fr: "Nature magnifique, qualité de vie parmi les meilleures — communauté chaleureuse.", en: "Beautiful nature, one of the best quality of life — warm community.", es: "Naturaleza hermosa, una de las mejores calidades de vida — comunidad cálida." } },
  { value: "West Virginia", label: "West Virginia", emoji: "🏞️", fact: { fr: "Coût de la vie très bas, nature sauvage magnifique.", en: "Very low cost of living, beautiful wild nature.", es: "Costo de vida muy bajo, hermosa naturaleza salvaje." } },
  { value: "Wisconsin",     label: "Wisconsin",     emoji: "🧀", fact: { fr: "Milwaukee et Madison — qualité de vie excellente, économie diversifiée.", en: "Milwaukee and Madison — excellent quality of life, diverse economy.", es: "Milwaukee y Madison — excelente calidad de vida, economía diversificada." } },
  { value: "Wyoming",       label: "Wyoming",       emoji: "🦬", fact: { fr: "Zéro impôt sur le revenu, vastes espaces, nature préservée.", en: "No income tax, vast open spaces, preserved nature.", es: "Sin impuesto sobre renta, vastos espacios abiertos, naturaleza preservada." } },
];

const UI: Record<Lang, any> = {
  fr:{
    title:"Où vas-tu t'installer ?",
    sub:"Choisis ton état — on va tout préparer pour toi 🗺️",
    step:"Étape 3 sur 5",
    back:"Retour",
    next:"Confirmer mon état →",
    searchPlaceholder:"Rechercher un état... (ex: Texas, Florida...)",
    factTitle:"✨ Le saviez-vous ?",
    confirmTitle:"Tu t'installes en",
    confirmMsg:"C'est parti ! Kuabo va personnaliser ton parcours pour cet état.",
    confirmBtn:"Oui, c'est bien ici ! ✅",
    changeBtn:"Changer d'état",
    motivation:{
      emoji:"🇺🇸",
      title:"Bienvenue aux États-Unis !",
      msg:"Kuabo va personnaliser ton parcours pour ton état. SSN, Green Card, emploi — on est là pour toi.",
    },
    comingSoon:"🌍 Autres pays bientôt disponibles — Kuabo arrive au Canada, France, Belgique prochainement !",
  },
  en:{
    title:"Where are you settling?",
    sub:"Choose your state — we'll prepare everything for you 🗺️",
    step:"Step 3 of 5",
    back:"Back",
    next:"Confirm my state →",
    searchPlaceholder:"Search a state... (e.g. Texas, Florida...)",
    factTitle:"✨ Did you know?",
    confirmTitle:"You're settling in",
    confirmMsg:"Let's go! Kuabo will personalize your journey for this state.",
    confirmBtn:"Yes, that's right! ✅",
    changeBtn:"Change state",
    motivation:{
      emoji:"🇺🇸",
      title:"Welcome to the United States!",
      msg:"Kuabo will personalize your journey for your state. SSN, Green Card, job — we're here for you.",
    },
    comingSoon:"🌍 Other countries coming soon — Kuabo is launching in Canada, France, Belgium soon!",
  },
  es:{
    title:"¿Dónde vas a instalarte?",
    sub:"Elige tu estado — prepararemos todo para ti 🗺️",
    step:"Paso 3 de 5",
    back:"Atrás",
    next:"Confirmar mi estado →",
    searchPlaceholder:"Buscar un estado... (ej: Texas, Florida...)",
    factTitle:"✨ ¿Sabías que?",
    confirmTitle:"Te instalarás en",
    confirmMsg:"¡Vamos! Kuabo personalizará tu camino para este estado.",
    confirmBtn:"¡Sí, es aquí! ✅",
    changeBtn:"Cambiar estado",
    motivation:{
      emoji:"🇺🇸",
      title:"¡Bienvenido a Estados Unidos!",
      msg:"Kuabo personalizará tu camino para tu estado. SSN, Green Card, trabajo — estamos aquí para ti.",
    },
    comingSoon:"🌍 Otros países próximamente — Kuabo llega a Canadá, Francia, Bélgica pronto.",
  },
};

// ══════════════════════════════════════════════
// MOTIVATION OVERLAY
// ══════════════════════════════════════════════
function MotivationOverlay({ lang, stateName, onDone }: { lang: Lang; stateName: string; onDone: () => void }) {
  const text = UI[lang];
  const mot  = text.motivation;
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 100);
    const t2 = setTimeout(() => setStep(2), 500);
    const t3 = setTimeout(() => setStep(3), 1200);
    const t4 = setTimeout(onDone, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onDone]);

  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i, x: Math.random() * 100, delay: Math.random() * 0.5,
    dur: 1.4 + Math.random() * 1,
    color: ["#e8b84b","#22c55e","#2dd4bf","#f97316","#a78bfa","#f472b6"][i % 6],
    size: 6 + Math.random() * 10,
  }));

  return (
    <>
      <style>{`
        @keyframes confettiFall { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0} }
        @keyframes overlayIn    { from{opacity:0} to{opacity:1} }
        @keyframes cardPop      { 0%{transform:translate(-50%,-50%) scale(0.4);opacity:0} 65%{transform:translate(-50%,-50%) scale(1.06);opacity:1} 100%{transform:translate(-50%,-50%) scale(1);opacity:1} }
        @keyframes emojiPop     { 0%{transform:scale(0) rotate(-20deg)} 60%{transform:scale(1.25) rotate(5deg)} 100%{transform:scale(1) rotate(0)} }
        @keyframes slideUp      { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes barFill      { from{width:0%} to{width:100%} }
        @keyframes flagWave     { 0%,100%{transform:rotate(-3deg)} 50%{transform:rotate(3deg)} }
      `}</style>
      <div onClick={onDone} style={{ position:"fixed", inset:0, background:"rgba(11,15,26,0.93)", backdropFilter:"blur(8px)", zIndex:9998, cursor:"pointer", animation:"overlayIn 0.3s ease forwards" }} />
      {step >= 1 && particles.map(p => (
        <div key={p.id} style={{ position:"fixed", left:p.x+"%", top:"-20px", width:p.size, height:p.size, borderRadius:"50%", background:p.color, zIndex:9999, pointerEvents:"none", animation:`confettiFall ${p.dur}s ${p.delay}s ease-in forwards` }} />
      ))}
      <div style={{ position:"fixed", top:"50%", left:"50%", zIndex:10000, width:320, animation:"cardPop 0.55s cubic-bezier(.34,1.56,.64,1) forwards", pointerEvents:"none" }}>
        <div style={{ background:"linear-gradient(135deg,#0f1521,#1a2438)", border:"2px solid rgba(232,184,75,0.45)", borderRadius:26, padding:"36px 28px 28px", textAlign:"center", boxShadow:"0 32px 80px rgba(0,0,0,0.8), 0 0 60px rgba(232,184,75,0.1)" }}>
          {step >= 1 && <div style={{ fontSize:72, marginBottom:12, display:"inline-block", animation:"emojiPop 0.5s cubic-bezier(.34,1.56,.64,1) forwards" }}>{mot.emoji}</div>}
          {step >= 2 && <div style={{ fontSize:22, fontWeight:900, color:"#e8b84b", marginBottom:8, lineHeight:1.2, animation:"slideUp 0.4s ease forwards" }}>{mot.title}</div>}
          {step >= 2 && <div style={{ fontSize:15, fontWeight:700, color:"#2dd4bf", marginBottom:8, animation:"slideUp 0.4s ease forwards" }}>📍 {stateName}</div>}
          {step >= 3 && <div style={{ fontSize:13, color:"rgba(244,241,236,0.7)", lineHeight:1.7, marginBottom:20, animation:"slideUp 0.4s ease forwards" }}>{mot.msg}</div>}
          <div style={{ height:3, background:"#1e2a3a", borderRadius:3, overflow:"hidden" }}>
            <div style={{ height:"100%", background:"linear-gradient(to right,#e8b84b,#2dd4bf)", borderRadius:3, animation:"barFill 3s linear forwards" }} />
          </div>
          <div style={{ fontSize:10, color:"#333", marginTop:8 }}>
            {lang==="fr"?"Tap pour continuer":lang==="es"?"Toca para continuar":"Tap to continue"}
          </div>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════
// STEP 3
// ══════════════════════════════════════════════
export default function Step3() {
  const [lang,           setLang]           = useState<Lang>("fr");
  const [ready,          setReady]          = useState(false);
  const [mounted,        setMounted]        = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [showMotivation, setShowMotivation] = useState(false);
  const [selectedState,  setSelectedState]  = useState("");
  const [searchQuery,    setSearchQuery]    = useState("");
  const [showConfirm,    setShowConfirm]    = useState(false); // ✅ étape confirmation
  const [animState,      setAnimState]      = useState("");   // pour l'animation de sélection

  useEffect(() => {
    const savedLang = localStorage.getItem("lang") as Lang;
    if (savedLang && ["en","fr","es"].includes(savedLang)) setLang(savedLang);
    const timeout = setTimeout(() => { setReady(true); setTimeout(() => setMounted(true), 50); }, 5000);
    const unsub = onAuthStateChanged(auth, async user => {
      clearTimeout(timeout);
      if (!user) { window.location.href = "/login"; return; }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data     = snap.data() as any;
          const userLang = (data?.lang as Lang) || savedLang || "fr";
          setLang(userLang);
          localStorage.setItem("lang", userLang);
        }
      } catch {}
      setReady(true);
      setTimeout(() => setMounted(true), 50);
    });
    return () => { clearTimeout(timeout); unsub(); };
  }, []);

  const changeLang = async (l: Lang) => {
    setLang(l);
    localStorage.setItem("lang", l);
    const user = auth.currentUser;
    if (user) try { await updateDoc(doc(db, "users", user.uid), { lang: l }); } catch {}
  };

  // Filtrer les états selon la recherche
  const filteredStates = searchQuery.trim().length === 0
    ? US_STATES
    : US_STATES.filter(s =>
        s.label.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const selectedStateData = US_STATES.find(s => s.value === selectedState);

  const handleSelectState = (value: string) => {
    setSelectedState(value);
    setAnimState(value);
    setShowConfirm(false);
    setTimeout(() => setAnimState(""), 600);
    // Scroll vers le bas pour voir le bouton confirmer
    setTimeout(() => {
      document.getElementById("confirm-btn")?.scrollIntoView({ behavior:"smooth", block:"center" });
    }, 300);
  };

  const handleConfirm = () => {
    if (!selectedState) return;
    setShowConfirm(true);
  };

  const handleFinalConfirm = async () => {
    if (!selectedState || saving) return;
    setSaving(true);
    try {
      localStorage.setItem("country", "us");
      localStorage.setItem("region", selectedState);
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          country:  "us",
          location: { state: selectedState, city: "" },
          region:   selectedState,
        });
      }
    } catch {}
    setShowMotivation(true);
  };

  const text = UI[lang];

  if (!ready) return <div style={{ minHeight:"100dvh", background:"#0b0f1a" }} />;

  return (
    <div style={container}>

      {showMotivation && (
        <MotivationOverlay
          lang={lang}
          stateName={selectedState}
          onDone={() => { setShowMotivation(false); window.location.href = "/onboarding/step3b"; }}
        />
      )}

      <div style={bgGlow} />

      {/* Header */}
      <div style={headerStyle}>
        <button style={backBtn} onClick={() => window.location.href="/onboarding/step2"}>← {text.back}</button>
        <div style={logoStyle}><span style={{ color:"#e8b84b" }}>Ku</span><span style={{ color:"#f4f1ec" }}>abo</span></div>
        <div style={{ display:"flex", gap:10, fontSize:20, cursor:"pointer" }}>
          <span onClick={() => changeLang("fr")}>🇫🇷</span>
          <span onClick={() => changeLang("en")}>🇺🇸</span>
          <span onClick={() => changeLang("es")}>🇪🇸</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, display:"flex", justifyContent:"center", padding:"88px 20px 40px" }}>
        <div style={{ width:"100%", maxWidth:420, opacity:mounted?1:0, transform:mounted?"translateY(0)":"translateY(20px)", transition:"all 0.5s ease" }}>

          {/* Progress */}
          <div style={{ marginBottom:24 }}>
            <div style={progressTrack}><div style={{ ...progressFill, width:"60%" }} /></div>
            <span style={progressLabel}>{text.step}</span>
          </div>

          <h2 style={titleStyle}>{text.title}</h2>
          <p style={subStyle}>{text.sub}</p>

          {/* Carte USA animée */}
          <div style={{ background:"linear-gradient(135deg,rgba(232,184,75,0.06),rgba(45,212,191,0.04))", border:"1px solid rgba(232,184,75,0.2)", borderRadius:16, padding:"16px", marginBottom:20, display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ fontSize:48, animation: selectedState ? "flagWave 1s ease infinite" : "none" }}>🇺🇸</div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:"#f4f1ec", marginBottom:4 }}>
                {selectedState
                  ? `${selectedStateData?.emoji} ${selectedState}`
                  : (lang==="fr"?"Choisis ton état ci-dessous":lang==="es"?"Elige tu estado abajo":"Choose your state below")}
              </div>
              {selectedStateData && (
                <div style={{ fontSize:12, color:"#e8b84b", lineHeight:1.5 }}>
                  {text.factTitle} {selectedStateData.fact[lang]}
                </div>
              )}
              {!selectedState && (
                <div style={{ fontSize:11, color:"#555" }}>
                  {lang==="fr"?"50 états disponibles":lang==="es"?"50 estados disponibles":"50 states available"}
                </div>
              )}
            </div>
          </div>

          {/* Recherche */}
          <div style={{ display:"flex", alignItems:"center", gap:10, background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:12, padding:"10px 14px", marginBottom:14 }}>
            <span style={{ fontSize:16 }}>🔍</span>
            <input
              placeholder={text.searchPlaceholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              inputMode="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              style={{
                flex:1, background:"none", border:"none", outline:"none",
                color:"#f4f1ec",
                fontSize:"16px", // ✅ 16px minimum — empêche le zoom sur iOS/Safari
                fontFamily:"inherit",
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{ background:"none", border:"none", color:"#555", cursor:"pointer", fontSize:16, fontFamily:"inherit" }}>✕</button>
            )}
          </div>

          {/* Liste des états */}
          <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:340, overflowY:"auto", paddingRight:4 }}>
            {filteredStates.length === 0 && (
              <div style={{ textAlign:"center", padding:"30px 0", color:"#555", fontSize:13 }}>
                {lang==="fr"?"Aucun état trouvé":lang==="es"?"Ningún estado encontrado":"No state found"}
              </div>
            )}
            {filteredStates.map(s => {
              const active = selectedState === s.value;
              const isAnim = animState === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => handleSelectState(s.value)}
                  style={{
                    display:"flex", alignItems:"center", gap:12,
                    padding:"12px 14px", borderRadius:12,
                    background: active ? "rgba(232,184,75,0.1)" : "#0f1521",
                    border: `1.5px solid ${active ? "#e8b84b" : "#1e2a3a"}`,
                    cursor:"pointer", fontFamily:"inherit",
                    width:"100%", textAlign:"left" as const,
                    transition:"all 0.2s",
                    transform: isAnim ? "scale(1.02)" : "scale(1)",
                  }}
                >
                  <span style={{ fontSize:20, flexShrink:0 }}>{s.emoji}</span>
                  <span style={{ flex:1, fontSize:14, fontWeight:active?600:400, color:active?"#e8b84b":"#f4f1ec", transition:"color 0.2s" }}>
                    {s.label}
                  </span>
                  {active && <span style={{ color:"#e8b84b", fontSize:16 }}>✓</span>}
                </button>
              );
            })}
          </div>

          {/* Note autres pays */}
          <div style={{ marginTop:16, padding:"10px 14px", background:"rgba(45,212,191,0.04)", border:"1px solid rgba(45,212,191,0.12)", borderRadius:10, fontSize:11, color:"#2dd4bf", lineHeight:1.6 }}>
            {text.comingSoon}
          </div>

          {/* ✅ Bouton confirmer — grisé si pas d'état sélectionné */}
          {!showConfirm && (
            <button
              id="confirm-btn"
              onClick={handleConfirm}
              disabled={!selectedState}
              style={{ ...nextBtn, opacity:selectedState?1:0.4, marginTop:20 }}
            >
              {text.next}
            </button>
          )}

          {/* ✅ Modal de confirmation au centre */}
          {showConfirm && selectedStateData && (
            <div style={{ marginTop:20, background:"rgba(232,184,75,0.06)", border:"2px solid rgba(232,184,75,0.35)", borderRadius:16, padding:"20px", animation:"confirmPop 0.35s cubic-bezier(.34,1.56,.64,1)" }}>
              <div style={{ textAlign:"center", marginBottom:14 }}>
                <div style={{ fontSize:40, marginBottom:8 }}>{selectedStateData.emoji}</div>
                <div style={{ fontSize:16, fontWeight:700, color:"#f4f1ec", marginBottom:4 }}>
                  {text.confirmTitle}
                </div>
                <div style={{ fontSize:22, fontWeight:900, color:"#e8b84b", marginBottom:8 }}>
                  {selectedState}
                </div>
                <div style={{ fontSize:12, color:"#aaa", lineHeight:1.6, marginBottom:16 }}>
                  {text.confirmMsg}
                </div>
                {/* Fait sur l'état */}
                <div style={{ background:"rgba(45,212,191,0.06)", border:"1px solid rgba(45,212,191,0.15)", borderRadius:10, padding:"10px 12px", marginBottom:16, textAlign:"left" as const }}>
                  <div style={{ fontSize:10, color:"#2dd4bf", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase" as const, marginBottom:4 }}>{text.factTitle}</div>
                  <div style={{ fontSize:12, color:"#f4f1ec", lineHeight:1.6 }}>{selectedStateData.fact[lang]}</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button
                  onClick={() => setShowConfirm(false)}
                  style={{ flex:1, padding:"12px", background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:12, color:"#aaa", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}
                >
                  ← {text.changeBtn}
                </button>
                <button
                  onClick={handleFinalConfirm}
                  disabled={saving}
                  style={{ flex:2, padding:"12px", background:"#e8b84b", border:"none", borderRadius:12, color:"#000", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", opacity:saving?0.7:1 }}
                >
                  {saving ? "..." : text.confirmBtn}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes spin         { to { transform: rotate(360deg) } }
        @keyframes flagWave     { 0%,100%{transform:rotate(-4deg)} 50%{transform:rotate(4deg)} }
        @keyframes confirmPop   { 0%{transform:scale(0.9);opacity:0} 100%{transform:scale(1);opacity:1} }
        button:active           { transform: scale(0.98) !important }
        input::placeholder      { color: #444 }
        input                   { font-size: 16px !important } /* ✅ empêche zoom iOS */
        ::-webkit-scrollbar     { width: 4px }
        ::-webkit-scrollbar-track { background: #0f1521 }
        ::-webkit-scrollbar-thumb { background: #2a3448; border-radius: 4px }
      `}</style>
    </div>
  );
}

const container:CSSProperties      = { minHeight:"100dvh", background:"#0b0f1a", color:"#f4f1ec", display:"flex", flexDirection:"column", position:"relative", overflow:"hidden" };
const bgGlow:CSSProperties         = { position:"absolute", top:"-10%", left:"50%", transform:"translateX(-50%)", width:500, height:400, background:"radial-gradient(ellipse, rgba(232,184,75,0.06), transparent 65%)", pointerEvents:"none" };
const headerStyle:CSSProperties    = { position:"fixed", top:0, left:0, right:0, display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 20px", background:"rgba(11,15,26,0.95)", backdropFilter:"blur(12px)", borderBottom:"1px solid #1e2a3a", zIndex:100 };
const backBtn:CSSProperties        = { background:"none", border:"none", color:"#aaa", cursor:"pointer", fontSize:14, fontFamily:"inherit" };
const logoStyle:CSSProperties      = { fontWeight:900, fontSize:20, fontFamily:"serif" };
const progressTrack:CSSProperties  = { height:3, background:"#1e2a3a", borderRadius:3, overflow:"hidden", marginBottom:8 };
const progressFill:CSSProperties   = { height:"100%", background:"linear-gradient(to right,#e8b84b,#2dd4bf)", borderRadius:3, transition:"width 0.5s ease" };
const progressLabel:CSSProperties  = { fontSize:11, color:"#555", letterSpacing:"0.08em", textTransform:"uppercase" };
const titleStyle:CSSProperties     = { fontSize:22, fontWeight:700, margin:"0 0 8px", color:"#f4f1ec" };
const subStyle:CSSProperties       = { fontSize:13, color:"#aaa", margin:"0 0 20px", lineHeight:1.5 };
const nextBtn:CSSProperties        = { width:"100%", padding:"15px", background:"#e8b84b", color:"#000", border:"none", borderRadius:14, fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", transition:"opacity 0.2s", boxShadow:"0 8px 24px rgba(232,184,75,0.15)" };
