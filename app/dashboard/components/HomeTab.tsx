"use client";

import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { Flame, Lock, Bell } from "lucide-react";
import { PHASES_META, PHASE_STEPS, STEP_GUIDES } from "./data";
import { isPhaseUnlocked, addDays, getDaysLeft } from "./utils";
import { computeKuaboScore, computeBadges, getScoreLabel, type Badge } from "./gamification";
import type { Lang, PhaseId } from "./data";
import type { UserStatus } from "@/lib/statusSystem";

// ══════════════════════════════════════════════
// CLOUDINARY CONFIG
// ══════════════════════════════════════════════
const CLOUD = "dccg6dl6b";
const cloudUrl = (publicId: string, w = 800, h = 200) =>
  `https://res.cloudinary.com/${CLOUD}/image/upload/w_${w},h_${h},c_fill,q_auto,f_auto/${publicId}`;

// ══════════════════════════════════════════════
// BANNER COMPONENT — image Cloudinary + SVG fallback
// ══════════════════════════════════════════════
function BannerImage({ publicId, fallbackSvg, height = 130 }: {
  publicId: string;
  fallbackSvg: React.ReactNode;
  height?: number;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div style={{ position: "relative", height, overflow: "hidden", background: "#0a0e17" }}>
      {!imgFailed ? (
        <img
          src={cloudUrl(publicId)}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
          {fallbackSvg}
        </div>
      )}
      {/* Gradient overlay toujours présent */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(11,15,26,0.15) 0%,rgba(11,15,26,0.88) 100%)" }} />
    </div>
  );
}

// ══════════════════════════════════════════════
// SVG FALLBACKS
// ══════════════════════════════════════════════
const HeroSvg = () => (
  <svg width="100%" height="100%" viewBox="0 0 400 130" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <rect width="400" height="130" fill="#0a1628"/>
    <circle cx="40" cy="20" r="1.2" fill="#e8b84b" opacity=".7"/>
    <circle cx="90" cy="35" r=".8" fill="#fff" opacity=".5"/>
    <circle cx="150" cy="15" r="1" fill="#fff" opacity=".6"/>
    <circle cx="200" cy="28" r=".9" fill="#e8b84b" opacity=".5"/>
    <circle cx="280" cy="18" r="1.1" fill="#fff" opacity=".6"/>
    <circle cx="340" cy="30" r=".7" fill="#fff" opacity=".4"/>
    <circle cx="370" cy="12" r="1" fill="#e8b84b" opacity=".6"/>
    <circle cx="350" cy="22" r="12" fill="#1a2e50"/>
    <circle cx="357" cy="19" r="10" fill="#0a1628"/>
    <rect x="0" y="75" width="30" height="55" rx="2" fill="#0d1e3a"/>
    <rect x="5" y="60" width="18" height="70" rx="2" fill="#0f2040"/>
    <rect x="8" y="55" width="12" height="75" rx="1" fill="#122248"/>
    <rect x="35" y="80" width="25" height="50" rx="2" fill="#0d1e3a"/>
    <rect x="40" y="68" width="15" height="62" rx="1" fill="#0f2040"/>
    <rect x="190" y="45" width="6" height="60" fill="#1a3a5c"/>
    <polygon points="193,30 188,50 198,50" fill="#1a3a5c"/>
    <circle cx="193" cy="28" r="8" fill="#1d4068" stroke="#2a5a8a" strokeWidth="1"/>
    <rect x="192" y="16" width="3" height="14" fill="#2a5a8a"/>
    <ellipse cx="193.5" cy="15" rx="4" ry="5" fill="#e8b84b" opacity=".8"/>
    <line x1="193" y1="38" x2="204" y2="28" stroke="#1a3a5c" strokeWidth="3"/>
    <rect x="240" y="70" width="35" height="60" rx="2" fill="#0d1e3a"/>
    <rect x="248" y="58" width="20" height="72" rx="2" fill="#0f2040"/>
    <rect x="290" y="65" width="30" height="65" rx="2" fill="#0d1e3a"/>
    <rect x="295" y="50" width="18" height="80" rx="2" fill="#0f2040"/>
    <rect x="330" y="72" width="28" height="58" rx="2" fill="#0d1e3a"/>
    <rect x="360" y="60" width="40" height="70" rx="2" fill="#0f2040"/>
    <rect x="10" y="65" width="4" height="4" rx="1" fill="#e8b84b" opacity=".6"/>
    <rect x="43" y="75" width="4" height="4" rx="1" fill="#e8b84b" opacity=".5"/>
    <rect x="250" y="65" width="4" height="4" rx="1" fill="#e8b84b" opacity=".5"/>
    <rect x="298" y="58" width="4" height="4" rx="1" fill="#e8b84b" opacity=".6"/>
    <rect x="0" y="118" width="400" height="12" fill="#061020" opacity=".7"/>
  </svg>
);

const ScoreSvg = () => (
  <svg width="100%" height="100%" viewBox="0 0 400 130" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <rect width="400" height="130" fill="#071520"/>
    <circle cx="200" cy="65" r="120" fill="none" stroke="#0d2a3a" strokeWidth="1"/>
    <circle cx="200" cy="65" r="90" fill="none" stroke="#0d2a3a" strokeWidth="1"/>
    <circle cx="200" cy="65" r="60" fill="none" stroke="#0d2a3a" strokeWidth="1"/>
    <circle cx="200" cy="65" r="30" fill="none" stroke="#0d2a3a" strokeWidth="1"/>
    <line x1="200" y1="-55" x2="200" y2="185" stroke="#0d2a3a" strokeWidth="1"/>
    <line x1="80" y1="65" x2="320" y2="65" stroke="#0d2a3a" strokeWidth="1"/>
    <circle cx="200" cy="65" r="90" fill="none" stroke="#2dd4bf" strokeWidth="3" strokeLinecap="round"
      strokeDasharray="565" strokeDashoffset="310" transform="rotate(-90 200 65)" opacity=".7"/>
    <circle cx="281" cy="38" r="5" fill="#2dd4bf" opacity=".9"/>
    <circle cx="281" cy="38" r="10" fill="#2dd4bf" opacity=".2"/>
    <circle cx="50" cy="20" r="2" fill="#2dd4bf" opacity=".5"/>
    <circle cx="330" cy="25" r="2" fill="#2dd4bf" opacity=".6"/>
    <circle cx="30" cy="80" r="1" fill="#e8b84b" opacity=".5"/>
    <circle cx="380" cy="50" r="1.5" fill="#e8b84b" opacity=".4"/>
    <circle cx="200" cy="65" r="28" fill="#0d2a3a" stroke="#2dd4bf" strokeWidth="1.5"/>
    <text x="200" y="63" textAnchor="middle" fill="#2dd4bf" fontSize="16" fontWeight="900">★</text>
  </svg>
);

const CountdownSvg = () => (
  <svg width="100%" height="100%" viewBox="0 0 400 130" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <rect width="400" height="130" fill="#150a0a"/>
    <circle cx="200" cy="65" r="55" fill="none" stroke="#2a1010" strokeWidth="2"/>
    <circle cx="200" cy="65" r="45" fill="#1a0808" stroke="#3a1515" strokeWidth="1"/>
    <line x1="200" y1="65" x2="200" y2="28" stroke="#ef4444" strokeWidth="3" strokeLinecap="round"/>
    <line x1="200" y1="65" x2="226" y2="72" stroke="#f4f1ec" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="200" cy="65" r="4" fill="#ef4444"/>
    <circle cx="200" cy="23" r="2" fill="#ef4444" opacity=".8"/>
    <circle cx="242" cy="65" r="2" fill="#555"/>
    <circle cx="200" cy="107" r="1.5" fill="#555"/>
    <circle cx="158" cy="65" r="2" fill="#555"/>
    <circle cx="200" cy="65" r="55" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"
      strokeDasharray="345" strokeDashoffset="172" transform="rotate(-90 200 65)" opacity=".6"/>
  </svg>
);

const ArmySvg = () => (
  <svg width="100%" height="100%" viewBox="0 0 400 130" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <rect width="400" height="130" fill="#071510"/>
    <ellipse cx="50" cy="40" rx="60" ry="40" fill="#0d2218" opacity=".8"/>
    <ellipse cx="180" cy="20" rx="80" ry="35" fill="#0a1c14" opacity=".7"/>
    <ellipse cx="320" cy="70" rx="90" ry="50" fill="#0d2218" opacity=".8"/>
    <ellipse cx="100" cy="100" rx="70" ry="40" fill="#091a10" opacity=".7"/>
    <ellipse cx="280" cy="30" rx="60" ry="30" fill="#0f2a1a" opacity=".6"/>
    <polygon points="200,25 207,45 228,45 212,57 218,78 200,65 182,78 188,57 172,45 193,45" fill="#22c55e" opacity=".25"/>
    <polygon points="200,32 205,46 220,46 209,55 213,70 200,61 187,70 191,55 180,46 195,46" fill="#22c55e" opacity=".4"/>
    <rect x="320" y="0" width="80" height="10" fill="#22c55e" opacity=".15"/>
    <rect x="320" y="20" width="80" height="10" fill="#22c55e" opacity=".1"/>
    <rect x="320" y="40" width="80" height="10" fill="#22c55e" opacity=".15"/>
    <rect x="320" y="60" width="80" height="10" fill="#22c55e" opacity=".1"/>
    <rect x="320" y="80" width="80" height="10" fill="#22c55e" opacity=".15"/>
    <rect x="320" y="100" width="80" height="10" fill="#22c55e" opacity=".1"/>
  </svg>
);

// ══════════════════════════════════════════════
// TYPES MAGASINS
// ══════════════════════════════════════════════
type Place = { id: string; name: string; address: string; lat: number; lng: number; rating: number | null; open: boolean | null; distance: string; };
type StoreInfo = { name: string; emoji: string; cloudinaryUrl: string; color: string; tag: string; desc: string; tips: string; price: string; searchQuery: string; };

// ══════════════════════════════════════════════
// STORE WEBSITES + PLACE TYPES
// ══════════════════════════════════════════════
const STORE_WEBSITES: Record<string, string> = {
  "Walmart": "https://www.walmart.com",
  "Aldi": "https://www.aldi.us",
  "Dollar Tree": "https://www.dollartree.com",
  "Target": "https://www.target.com",
  "Costco": "https://www.costco.com",
  "CVS / Walgreens": "https://www.cvs.com",
};

const STORE_PLACE_TYPES: Record<string, string> = {
  "Walmart": "Walmart superstore",
  "Aldi": "Aldi supermarket",
  "Dollar Tree": "Dollar Tree",
  "Target": "Target store",
  "Costco": "Costco wholesale",
  "CVS / Walgreens": "CVS pharmacy",
};

// ══════════════════════════════════════════════
// STORE MODAL
// ══════════════════════════════════════════════
function StoreModal({ store, lang, userLocation, onClose, onGoToExplorer }: {
  store: StoreInfo | null; lang: Lang;
  userLocation: { lat: number; lng: number } | null;
  onClose: () => void; onGoToExplorer: () => void;
}) {
  const [nearbyStores, setNearbyStores] = useState<Place[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [showNearby, setShowNearby] = useState(false);

  // Reset quand on change de magasin
  useEffect(() => {
    setNearbyStores([]);
    setShowNearby(false);
    setLoadingNearby(false);
  }, [store?.name]);

  const L = {
    fr: { close:"Fermer", tips:"Astuces", nearbyBtn:"Voir les", nearSuffix:"près de moi", hideResults:"Fermer les résultats", loading:"Recherche en cours...", noResult:"Aucun résultat trouvé", directions:"Itinéraire →", mapBtn:"Voir sur la carte Explorer →", website:"Site officiel →" },
    en: { close:"Close", tips:"Tips", nearbyBtn:"See", nearSuffix:"near me", hideResults:"Hide results", loading:"Searching...", noResult:"No results found", directions:"Directions →", mapBtn:"See on Explorer map →", website:"Official website →" },
    es: { close:"Cerrar", tips:"Consejos", nearbyBtn:"Ver", nearSuffix:"cerca de mí", hideResults:"Ocultar resultados", loading:"Buscando...", noResult:"Sin resultados", directions:"Cómo llegar →", mapBtn:"Ver en mapa Explorer →", website:"Sitio oficial →" },
  }[lang];

  const toggleNearby = async () => {
    if (showNearby) { setShowNearby(false); setNearbyStores([]); return; }
    if (!store || !userLocation) return;
    setLoadingNearby(true); setShowNearby(true);
    try {
      const searchTerm = STORE_PLACE_TYPES[store.name] || store.name;
      const res = await fetch("/api/places", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: userLocation.lat, lng: userLocation.lng, type: "store", query: searchTerm, keyword: store.name }),
      });
      const data = await res.json();
      const filtered = (data.places || [])
        .filter((p: Place) => p.name.toLowerCase().includes(store.name.split(" ")[0].toLowerCase()))
        .slice(0, 5);
      setNearbyStores(filtered.length > 0 ? filtered : (data.places || []).slice(0, 5));
    } catch { setNearbyStores([]); }
    setLoadingNearby(false);
  };

  if (!store) return null;
  const officialUrl = STORE_WEBSITES[store.name];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:700, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(8px)", padding:"0 16px" }} onClick={onClose}>
      {/* ✅ Flex column — close toujours visible en bas */}
      <div style={{ background:"#0f1521", border:"1px solid #1e2a3a", borderRadius:22, width:"100%", maxWidth:420, maxHeight:"88vh", display:"flex", flexDirection:"column" as const, animation:"alertPop 0.3s cubic-bezier(.34,1.56,.64,1)" }} onClick={e => e.stopPropagation()}>

        {/* Zone scrollable */}
        <div style={{ overflowY:"auto", flex:1, borderRadius:"22px 22px 0 0" }}>
          {/* Cover */}
          <div style={{ position:"relative", height:180, borderRadius:"22px 22px 0 0", overflow:"hidden", flexShrink:0 }}>
            <img src={store.cloudinaryUrl} alt={store.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display="none"; }} />
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom,transparent 40%,rgba(15,21,33,0.95))" }} />
            <button onClick={onClose} style={{ position:"absolute", top:12, right:12, width:32, height:32, borderRadius:"50%", background:"rgba(0,0,0,0.5)", border:"none", color:"#fff", fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
            <div style={{ position:"absolute", bottom:12, left:16 }}>
              {/* ✅ Titre blanc */}
              <div style={{ fontSize:22, fontWeight:800, color:"#ffffff" }}>{store.name}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)" }}>{store.tag}</div>
            </div>
            <div style={{ position:"absolute", bottom:12, right:16, background:"rgba(0,0,0,0.65)", borderRadius:8, padding:"2px 10px", fontSize:12, fontWeight:800, color:"#22c55e" }}>{store.price}</div>
          </div>

          <div style={{ padding:"20px 20px 16px" }}>
            <div style={{ fontSize:13, color:"#aaa", lineHeight:1.7, marginBottom:14 }}>{store.desc}</div>

            {/* ✅ Site officiel */}
            {officialUrl && (
              <button onClick={() => window.open(officialUrl, "_blank")}
                style={{ width:"100%", padding:"11px", marginBottom:12, background:"rgba(45,212,191,0.08)", border:"1px solid rgba(45,212,191,0.25)", borderRadius:12, color:"#2dd4bf", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                🌐 {L.website}
              </button>
            )}

            {/* Bouton Explorer carte */}
            <button onClick={() => { onClose(); onGoToExplorer(); }}
              style={{ width:"100%", padding:"11px", marginBottom:14, background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.25)", borderRadius:12, color:"#a78bfa", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              🗺️ {L.mapBtn}
            </button>

            {/* Tips */}
            <div style={{ background:"rgba(232,184,75,0.05)", border:"1px solid rgba(232,184,75,0.18)", borderRadius:12, padding:"14px", marginBottom:14 }}>
              <div style={{ fontSize:10, color:"#e8b84b", fontWeight:700, textTransform:"uppercase" as const, letterSpacing:".08em", marginBottom:8 }}>💡 {L.tips}</div>
              {store.tips.split("\n").map((tip, i) => <div key={i} style={{ fontSize:12, color:"#f4f1ec", lineHeight:1.7 }}>{tip}</div>)}
            </div>

            {/* ✅ Bouton toggle "Voir près de moi" ↔ "Fermer résultats" */}
            {userLocation && (
              <button onClick={toggleNearby} disabled={loadingNearby}
                style={{
                  width:"100%", padding:"13px",
                  background: showNearby ? "rgba(239,68,68,0.08)" : "linear-gradient(135deg,rgba(232,184,75,0.15),rgba(232,184,75,0.08))",
                  border: `1px solid ${showNearby ? "rgba(239,68,68,0.3)" : "rgba(232,184,75,0.3)"}`,
                  borderRadius:12, color: showNearby ? "#ef4444" : "#e8b84b",
                  fontSize:14, fontWeight:700, cursor:loadingNearby?"wait":"pointer", fontFamily:"inherit",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all 0.2s",
                  marginBottom: showNearby ? 12 : 0,
                }}>
                {loadingNearby ? `🔍 ${L.loading}` : showNearby ? `✕ ${L.hideResults}` : `📍 ${L.nearbyBtn} ${store.name} ${L.nearSuffix}`}
              </button>
            )}

            {/* ✅ Résultats — toggle */}
            {showNearby && !loadingNearby && (
              <div style={{ marginTop:4 }}>
                {nearbyStores.length === 0
                  ? <div style={{ textAlign:"center" as const, padding:"16px", color:"#555", fontSize:13 }}>{L.noResult}</div>
                  : nearbyStores.map((p, i) => (
                    <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom: i < nearbyStores.length-1 ? "1px solid #1e2a3a" : "none" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:"#f4f1ec", marginBottom:2 }}>{p.name}</div>
                        <div style={{ fontSize:11, color:"#aaa", display:"flex", gap:6, flexWrap:"wrap" as const }}>
                          <span style={{ color:p.open===true?"#22c55e":p.open===false?"#ef4444":"#555", fontWeight:600 }}>
                            {p.open===true?(lang==="fr"?"Ouvert":"Open"):p.open===false?(lang==="fr"?"Fermé":"Closed"):"?"}
                          </span>
                          <span>·</span><span>{p.distance}</span>
                          {p.rating && <><span>·</span><span>⭐ {p.rating}</span></>}
                        </div>
                        {p.address && <div style={{ fontSize:10, color:"#555", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{p.address}</div>}
                      </div>
                      <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.name+" "+p.address)}&destination_place_id=${p.id}`, "_blank")}
                        style={{ padding:"7px 12px", background:"rgba(232,184,75,0.1)", border:"1px solid rgba(232,184,75,0.3)", borderRadius:8, color:"#e8b84b", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" as const, flexShrink:0 }}>
                        {L.directions}
                      </button>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        </div>

        {/* ✅ Bouton Fermer STICKY toujours visible */}
        <div style={{ padding:"12px 20px 16px", borderTop:"1px solid #1e2a3a", background:"#0f1521", borderRadius:"0 0 22px 22px", flexShrink:0 }}>
          <button onClick={onClose} style={{ width:"100%", padding:"13px", background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:12, color:"#f4f1ec", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>{L.close}</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// STORES SECTION — HomeTab
// ══════════════════════════════════════════════
function StoresSection({ lang, userLocation, onGoToExplorer }: {
  lang: Lang; userLocation: { lat: number; lng: number } | null; onGoToExplorer: () => void;
}) {
  const [selectedStore, setSelectedStore] = useState<StoreInfo | null>(null);
  const STORES: StoreInfo[] = [
    { name:"Walmart", emoji:"🛒", cloudinaryUrl:cloudUrl("kuabo/stores/walmart"), color:"#1D72A3", searchQuery:"Walmart", price:"$", tag:lang==="fr"?"Tout en un · Ouvert 24h":"All-in-one · Open 24h", desc:lang==="fr"?"Alimentation, vêtements, électronique. Prix très bas. Ouvert 24h.":"Food, clothes, electronics. Very low prices. Open 24h.", tips:lang==="fr"?"• App Walmart pour scanner les prix\n• Walmart+ = livraison illimitée ($98/an)\n• Sections 'Clearance' pour les bonnes affaires":"• Walmart app to scan prices\n• Walmart+ = unlimited delivery ($98/yr)\n• 'Clearance' sections for great deals" },
    { name:"Aldi", emoji:"🥦", cloudinaryUrl:cloudUrl("kuabo/stores/aldi"), color:"#CC4400", searchQuery:"Aldi grocery store", price:"$", tag:lang==="fr"?"Le moins cher":"Cheapest grocery", desc:lang==="fr"?"Épicerie discount. Prix 30-50% moins cher que les supermarchés.":"Discount grocery. Prices 30-50% cheaper than regular supermarkets.", tips:lang==="fr"?"• Apporter des sacs (pas fournis)\n• Amener une pièce de $0.25 pour le caddie\n• Les produits changent chaque semaine":"• Bring your own bags\n• Bring a $0.25 coin for the cart\n• Products change weekly" },
    { name:"Dollar Tree", emoji:"💚", cloudinaryUrl:cloudUrl("kuabo/stores/dollar_tree"), color:"#1b5e20", searchQuery:"Dollar Tree store", price:"$", tag:lang==="fr"?"Tout à $1.25":"Everything $1.25", desc:lang==="fr"?"Produits ménagers, hygiène, cuisine. Certains produits très bonne qualité.":"Household, hygiene, kitchen. Some products are very good quality.", tips:lang==="fr"?"• Dollar Tree : tout à $1.25\n• Dollar General : prix variés mais très bas\n• Idéal : tampons, papier, nettoyants":"• Dollar Tree: everything $1.25\n• Dollar General: varied but very low\n• Great for: tampons, paper, cleaning" },
    { name:"Target", emoji:"🎯", cloudinaryUrl:cloudUrl("kuabo/stores/target"), color:"#CC0000", searchQuery:"Target store", price:"$$", tag:lang==="fr"?"Qualité · Style":"Quality · Style", desc:lang==="fr"?"Meilleure qualité que Walmart. Excellent pour vêtements, déco, électronique.":"Better quality than Walmart. Excellent for clothing, home decor, electronics.", tips:lang==="fr"?"• App Target : coupons et Circle Rewards\n• RedCard = 5% de réduction sur tout\n• Drive Up = commande prête en 2h":"• Target app: coupons and Circle Rewards\n• RedCard = 5% off everything\n• Drive Up = order ready in 2h" },
    { name:"Costco", emoji:"📦", cloudinaryUrl:cloudUrl("kuabo/stores/costco"), color:"#005DAA", searchQuery:"Costco wholesale", price:"$$$", tag:lang==="fr"?"Gros volumes":"Bulk buying", desc:lang==="fr"?"Idéal pour familles. Adhésion $65/an. Économies énormes.":"Great for families. $65/yr membership. Huge savings.", tips:lang==="fr"?"• Adhésion : $65/an (Executive $130 = cashback)\n• Essence Costco = souvent la moins chère\n• Pharmacie ouverte sans adhésion":"• Membership: $65/yr (Executive $130 = cashback)\n• Costco gas = often cheapest\n• Pharmacy open without membership" },
    { name:"CVS / Walgreens", emoji:"💊", cloudinaryUrl:cloudUrl("kuabo/stores/cvs"), color:"#880e4f", searchQuery:"CVS pharmacy", price:"$$", tag:lang==="fr"?"Pharmacie 24h":"Pharmacy 24h", desc:lang==="fr"?"Pharmacie + produits du quotidien. Ouvert tard ou 24h.":"Pharmacy + daily products. Open late or 24h.", tips:lang==="fr"?"• ExtraCare Card = remises immédiates\n• Pharmacie : donne ton assurance\n• MinuteClinic pour soins sans rendez-vous":"• ExtraCare Card = instant discounts\n• Pharmacy: give your insurance\n• MinuteClinic for walk-in care" },
  ];
  const L = { fr:{ title:"Magasins essentiels", seeAll:"Tous →" }, en:{ title:"Essential stores", seeAll:"All →" }, es:{ title:"Tiendas esenciales", seeAll:"Todos →" } }[lang];
  return (
    <>
      <StoreModal store={selectedStore} lang={lang} userLocation={userLocation} onClose={() => setSelectedStore(null)} onGoToExplorer={onGoToExplorer} />
      <div style={{ marginBottom:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:600, color:"#f4f1ec" }}>🛍️ {L.title}</div>
          <span onClick={onGoToExplorer} style={{ fontSize:12, color:"#e8b84b", cursor:"pointer" }}>{L.seeAll}</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {STORES.map(store => (
            <div key={store.name} onClick={() => setSelectedStore(store)}
              style={{ borderRadius:18, overflow:"hidden", cursor:"pointer", background:"#141d2e", border:"1px solid #1e2a3a", transition:"transform 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform="scale(1.02)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform="scale(1)"; }}>
              <div style={{ height:110, position:"relative", overflow:"hidden", background:store.color, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <img src={store.cloudinaryUrl} alt={store.name} style={{ width:"100%", height:"100%", objectFit:"cover", position:"absolute", inset:0 }}
                  onError={e => {
                    const t = e.currentTarget as HTMLImageElement; t.style.display="none";
                    const p = t.parentElement;
                    if (p && !p.querySelector(".emoji-fb")) {
                      const s = document.createElement("span"); s.className="emoji-fb"; s.textContent=store.emoji;
                      s.style.cssText="font-size:44px;position:relative;z-index:1;filter:drop-shadow(0 4px 12px rgba(0,0,0,.4))"; p.appendChild(s);
                    }
                  }} />
                <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom,transparent 40%,rgba(20,29,46,0.5))" }} />
                <div style={{ position:"absolute", bottom:7, right:7, background:"rgba(0,0,0,.7)", borderRadius:7, padding:"2px 7px", fontSize:10, fontWeight:800, color:"#22c55e" }}>{store.price}</div>
              </div>
              <div style={{ padding:"10px 11px 12px" }}>
                <div style={{ fontSize:13, fontWeight:800, color:"#f4f1ec", marginBottom:2 }}>{store.name}</div>
                <div style={{ fontSize:10, color:"#aaa" }}>{store.tag}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════
// PHASE MODAL
// ══════════════════════════════════════════════
function PhaseModal({ phaseId, lang, completedSteps, onToggleStep, onClose }: {
  phaseId: PhaseId | null; lang: Lang; completedSteps: string[]; onToggleStep: (id: string) => void; onClose: () => void;
}) {
  if (!phaseId) return null;
  const meta = PHASES_META[phaseId];
  const steps = PHASE_STEPS[phaseId];
  const done = steps.filter(s => completedSteps.includes(s.id)).length;
  const total = steps.length;
  const pct = Math.round((done / total) * 100);
  const L = { fr:{ close:"Fermer", guide:"Guide", map:"Carte" }, en:{ close:"Close", guide:"Guide", map:"Map" }, es:{ close:"Cerrar", guide:"Guía", map:"Mapa" } }[lang];
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:700, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(8px)", padding:"0 16px" }} onClick={onClose}>
      <div style={{ background:"#0f1521", border:`1px solid ${meta.color}30`, borderRadius:22, width:"100%", maxWidth:440, maxHeight:"88vh", overflowY:"auto", animation:"alertPop 0.3s cubic-bezier(.34,1.56,.64,1)" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding:"20px 20px 16px", borderBottom:"1px solid #1e2a3a", position:"sticky", top:0, background:"#0f1521", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:`${meta.color}18`, border:`1.5px solid ${meta.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{meta.emoji}</div>
              <div>
                <div style={{ fontSize:10, color:meta.color, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase" as const }}>Phase {phaseId}</div>
                <div style={{ fontSize:16, fontWeight:800, color:"#f4f1ec" }}>{meta.name[lang]}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", color:"#555", cursor:"pointer", fontSize:20 }}>✕</button>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
            <div style={{ flex:1, height:6, background:"#1e2a3a", borderRadius:6, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(to right,${meta.color},#2dd4bf)`, borderRadius:6, transition:"width 0.6s ease" }} />
            </div>
            <div style={{ fontSize:14, fontWeight:800, color:meta.color, flexShrink:0 }}>{pct}%</div>
          </div>
          <div style={{ fontSize:11, color:"#aaa" }}>{done}/{total} {lang==="fr"?"étapes complétées":lang==="es"?"pasos completados":"steps completed"}</div>
        </div>
        <div style={{ padding:"12px 16px 20px", display:"flex", flexDirection:"column" as const, gap:8 }}>
          {steps.map(step => {
            const isDone = completedSteps.includes(step.id);
            const urgColor = step.urgency==="critical"?"#ef4444":step.urgency==="high"?"#f97316":meta.color;
            const guide = STEP_GUIDES[step.id];
            return (
              <div key={step.id} style={{ background:isDone?"rgba(34,197,94,0.04)":"#141d2e", border:`1px solid ${isDone?"rgba(34,197,94,0.2)":"#1e2a3a"}`, borderRadius:12, overflow:"hidden" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", cursor:"pointer" }} onClick={() => onToggleStep(step.id)}>
                  <div style={{ width:24, height:24, borderRadius:"50%", background:isDone?"#22c55e":"transparent", border:`2px solid ${isDone?"#22c55e":urgColor}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {isDone && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:isDone?"#555":"#f4f1ec", textDecoration:isDone?"line-through":"none" }}>{step.label[lang]}</div>
                    <div style={{ fontSize:11, color:"#555", marginTop:2 }}>{step.desc[lang]}</div>
                  </div>
                  <div style={{ fontSize:10, fontWeight:700, color:isDone?"#22c55e":urgColor, flexShrink:0 }}>{isDone?"✅":step.urgency==="critical"?"🔴":step.urgency==="high"?"🟠":"📋"}</div>
                </div>
                {!isDone && guide && (
                  <div style={{ display:"flex", gap:6, padding:"0 14px 12px" }}>
                    {guide.guideUrl && <button onClick={() => window.location.href=guide.guideUrl!} style={{ flex:1, padding:"7px", background:"rgba(232,184,75,0.08)", border:"1px solid rgba(232,184,75,0.2)", borderRadius:8, color:"#e8b84b", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>📖 {L.guide}</button>}
                    {guide.explorerType && <button onClick={() => window.location.href=`/near/${guide.explorerType}`} style={{ flex:1, padding:"7px", background:"rgba(45,212,191,0.08)", border:"1px solid rgba(45,212,191,0.2)", borderRadius:8, color:"#2dd4bf", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>🗺️ {L.map}</button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ padding:"0 16px 20px" }}>
          <button onClick={onClose} style={{ width:"100%", padding:"13px", background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:12, color:"#aaa", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>{L.close}</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// NOTIFICATION BELL
// ══════════════════════════════════════════════
type Notification = { id: string; message: string; fullContent: string; time: string; read: boolean; type: string; };

function NotificationBell({ lang, userId }: { lang: Lang; userId: string | undefined }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, "users", userId, "messages"));
        const msgs: Notification[] = [];
        for (const d of snap.docs) {
          const data = d.data() as any;
          const adminSnap = await getDoc(doc(db, "admin_messages", d.id)).catch(() => null);
          if (adminSnap?.exists()) {
            const ad = adminSnap.data() as any;
            const title = ad[`title_${lang}`] || ad.title_fr || "";
            const content = ad[`content_${lang}`] || ad.content_fr || "";
            const ts = ad.publishedAt ? new Date(ad.publishedAt) : new Date();
            const diff = Math.floor((Date.now() - ts.getTime()) / 60000);
            const timeStr = diff < 60 ? (lang==="fr"?`Il y a ${diff} min`:`${diff} min ago`) : diff < 1440 ? (lang==="fr"?`Il y a ${Math.floor(diff/60)}h`:`${Math.floor(diff/60)}h ago`) : (lang==="fr"?`Il y a ${Math.floor(diff/1440)}j`:`${Math.floor(diff/1440)}d ago`);
            msgs.push({ id:d.id, message:title, fullContent:content, time:timeStr, read:!!data.seen, type:ad.type||"info" });
          }
        }
        msgs.sort((a, b) => a.read===b.read?0:a.read?1:-1);
        setNotifications(msgs);
      } catch {}
    };
    load();
  }, [userId, lang]);

  const unread = notifications.filter(n => !n.read).length;
  const displayed = showAll ? notifications : notifications.slice(0, 6);
  const hasMore = notifications.length > 6;

  const markRead = async (n: Notification) => {
    setSelectedNotif(n);
    if (!n.read && userId) {
      setNotifications(prev => prev.map(x => x.id===n.id ? {...x, read:true} : x));
      try { await updateDoc(doc(db, "users", userId, "messages", n.id), { seen:true, seenAt:new Date().toISOString() }); } catch {}
    }
  };

  const typeIcon: Record<string, string> = { ssn:"🪪", badge:"🏅", admin:"📢", urgent:"⚠️", info:"ℹ️", conseil:"💡" };
  const L = { fr:{ title:"Notifications", empty:"Aucune notification", seeAll:"Voir tout", seeLess:"Réduire", close:"Fermer" }, en:{ title:"Notifications", empty:"No notifications", seeAll:"See all", seeLess:"Show less", close:"Close" }, es:{ title:"Notificaciones", empty:"Sin notificaciones", seeAll:"Ver todo", seeLess:"Reducir", close:"Cerrar" } }[lang];

  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{ position:"relative", width:40, height:40, borderRadius:"50%", background:"#141d2e", border:"1px solid #1e2a3a", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}
        onMouseEnter={e => (e.currentTarget.style.background="#1e2a3a")}
        onMouseLeave={e => (e.currentTarget.style.background="#141d2e")}>
        <Bell size={18} color={unread>0?"#e8b84b":"#555"} />
        {unread>0 && <div style={{ position:"absolute", top:6, right:6, width:8, height:8, borderRadius:"50%", background:"#ef4444", border:"1.5px solid #0b0f1a" }} />}
      </button>

      {open && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:600, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)", padding:"0 16px" }} onClick={() => { setOpen(false); setShowAll(false); }}>
          <div style={{ background:"#0f1521", border:"1px solid #1e2a3a", borderRadius:20, width:"100%", maxWidth:420, maxHeight:"80vh", overflow:"hidden", display:"flex", flexDirection:"column" as const, animation:"alertPop 0.25s cubic-bezier(.34,1.56,.64,1)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 20px 14px", borderBottom:"1px solid #1e2a3a", flexShrink:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <Bell size={16} color="#e8b84b" />
                <span style={{ fontSize:15, fontWeight:700, color:"#f4f1ec" }}>{L.title}</span>
                {unread>0 && <span style={{ background:"#ef4444", color:"#fff", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:10 }}>{unread}</span>}
              </div>
              <button onClick={() => { setOpen(false); setShowAll(false); }} style={{ background:"none", border:"none", color:"#555", cursor:"pointer", fontSize:18 }}>✕</button>
            </div>
            <div style={{ overflowY:"auto", flex:1, padding:"8px 0" }}>
              {notifications.length===0 ? (
                <div style={{ textAlign:"center" as const, padding:"32px 20px", color:"#555" }}>
                  <div style={{ fontSize:36, marginBottom:10 }}>🔔</div>{L.empty}
                </div>
              ) : displayed.map(n => (
                <div key={n.id} onClick={() => markRead(n)}
                  style={{ display:"flex", gap:12, padding:"12px 20px", cursor:"pointer", background:n.read?"transparent":"rgba(232,184,75,0.04)", borderBottom:"1px solid #1e2a3a" }}
                  onMouseEnter={e => (e.currentTarget.style.background="#141d2e")}
                  onMouseLeave={e => (e.currentTarget.style.background=n.read?"transparent":"rgba(232,184,75,0.04)")}>
                  <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0, marginTop:5, background:n.read?"#2a3448":"#e8b84b" }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, color:n.read?"#888":"#f4f1ec", lineHeight:1.5, marginBottom:3 }}>{typeIcon[n.type]||"📢"} {n.message}</div>
                    <div style={{ fontSize:10, color:"#555", display:"flex", justifyContent:"space-between" }}>
                      <span>{n.time}</span><span style={{ color:"#e8b84b" }}>Détail →</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {hasMore && (
              <div style={{ padding:"12px 20px", borderTop:"1px solid #1e2a3a", flexShrink:0 }}>
                <button onClick={() => setShowAll(!showAll)} style={{ width:"100%", padding:"10px", background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:10, color:"#e8b84b", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  {showAll ? L.seeLess : `${L.seeAll} (${notifications.length-6} ${lang==="fr"?"de plus":"more"})`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedNotif && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:700, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(8px)", padding:"0 16px" }} onClick={() => setSelectedNotif(null)}>
          <div style={{ background:"#0f1521", border:`1px solid ${selectedNotif.type==="urgent"?"rgba(239,68,68,0.4)":"rgba(232,184,75,0.3)"}`, borderRadius:22, width:"100%", maxWidth:400, animation:"alertPop 0.3s cubic-bezier(.34,1.56,.64,1)", padding:"28px 22px" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:48, textAlign:"center" as const, marginBottom:16 }}>{selectedNotif.type==="urgent"?"⚠️":selectedNotif.type==="badge"?"🏅":"📢"}</div>
            <div style={{ fontSize:10, color:selectedNotif.type==="urgent"?"#ef4444":"#e8b84b", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase" as const, textAlign:"center" as const, marginBottom:8 }}>Kuabo</div>
            <div style={{ fontSize:17, fontWeight:800, color:"#f4f1ec", textAlign:"center" as const, marginBottom:12, lineHeight:1.4 }}>{selectedNotif.message}</div>
            {selectedNotif.fullContent && <div style={{ fontSize:13, color:"#aaa", textAlign:"center" as const, lineHeight:1.7, marginBottom:20 }}>{selectedNotif.fullContent}</div>}
            <div style={{ fontSize:11, color:"#555", textAlign:"center" as const, marginBottom:20 }}>{selectedNotif.time}</div>
            <button onClick={() => setSelectedNotif(null)} style={{ width:"100%", padding:"13px", background:"#e8b84b", border:"none", borderRadius:12, color:"#000", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>{L.close}</button>
          </div>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════
// CIRCULAR HERO — avec banner Cloudinary
// ══════════════════════════════════════════════
function CircularHero({ currentPhase, phaseProgress, lang }: {
  currentPhase: PhaseId; phaseProgress: Record<PhaseId, { done: number; total: number; pct: number }>; lang: Lang;
}) {
  const meta = PHASES_META[currentPhase];
  const prog = phaseProgress[currentPhase];
  const size = 72, sw = 7, r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (prog.pct / 100) * circ;
  const nextPhase = (currentPhase + 1) as PhaseId;
  const nextMeta = currentPhase < 5 ? PHASES_META[nextPhase] : null;
  const leftCount = prog.total - prog.done;
  const L = {
    fr: { done:`${prog.done} étape${prog.done!==1?"s":""} complétée${prog.done!==1?"s":""}`, left:leftCount===0?"Toutes complétées ! 🎉":`${leftCount} restante${leftCount!==1?"s":""}` },
    en: { done:`${prog.done} step${prog.done!==1?"s":""} completed`, left:leftCount===0?"All completed! 🎉":`${leftCount} left` },
    es: { done:`${prog.done} paso${prog.done!==1?"s":""} completado${prog.done!==1?"s":""}`, left:leftCount===0?"¡Todos completados! 🎉":`${leftCount} restante${leftCount!==1?"s":""}` },
  }[lang];

  return (
    <div style={{ background:"linear-gradient(135deg,#141d2e,#0f1521)", border:`1px solid ${meta.color}30`, borderRadius:18, marginBottom:14, overflow:"hidden" }}>
      {/* Banner image */}
      <div style={{ position:"relative" }}>
        <BannerImage publicId="kuabo/banners/hero" fallbackSvg={<HeroSvg />} height={120} />
        {/* Label flottant sur l'image */}
        <div style={{ position:"absolute", bottom:10, left:14, right:14, zIndex:2 }}>
          <div style={{ fontSize:10, color:`${meta.color}`, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase" as const }}>{meta.emoji} Phase {currentPhase} — {meta.name[lang]}</div>
          <div style={{ fontSize:15, fontWeight:800, color:"#f4f1ec" }}>{L.done}</div>
        </div>
      </div>
      {/* Corps */}
      <div style={{ padding:"14px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
            <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
              <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e2a3a" strokeWidth={sw}/>
              <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={meta.color} strokeWidth={sw} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition:"stroke-dashoffset 0.8s ease" }}/>
            </svg>
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column" as const, alignItems:"center", justifyContent:"center" }}>
              <div style={{ fontSize:18, fontWeight:900, color:meta.color, lineHeight:1 }}>{prog.pct}%</div>
              <div style={{ fontSize:8, color:"#aaa", marginTop:1 }}>Phase {currentPhase}</div>
            </div>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, color:"#aaa", marginBottom:4 }}>{nextMeta ? `${L.left} → ${nextMeta.emoji} ${nextMeta.name[lang]}` : L.left}</div>
            <div style={{ height:4, background:"#1e2a3a", borderRadius:4, overflow:"hidden" }}>
              <div style={{ height:"100%", width:prog.pct+"%", background:`linear-gradient(to right,${meta.color},${nextMeta?.color||meta.color})`, borderRadius:4, transition:"width 0.8s ease" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// KUABO SCORE WIDGET — avec banner
// ══════════════════════════════════════════════
function KuaboScoreWidget({ score, streak, badges, lang }: { score: number; streak: number; badges: Badge[]; lang: Lang }) {
  const pct = Math.round((score / 1000) * 100);
  const label = getScoreLabel(score, lang);
  const unlockedBadges = badges.filter(b => b.unlocked).slice(0, 4);
  const scoreColor = score < 250 ? "#e8b84b" : score < 500 ? "#2dd4bf" : score < 750 ? "#a78bfa" : "#22c55e";
  const L = { fr:{ title:"Kuabo Score", badges:"Badges récents", noBadge:"Continue pour débloquer tes premiers badges !" }, en:{ title:"Kuabo Score", badges:"Recent badges", noBadge:"Keep going to unlock your first badges!" }, es:{ title:"Kuabo Score", badges:"Insignias recientes", noBadge:"¡Sigue para desbloquear tus primeras insignias!" } }[lang];

  return (
    <div style={{ background:"linear-gradient(135deg,#141d2e,#0f1521)", border:`1px solid ${scoreColor}30`, borderRadius:18, marginBottom:14, overflow:"hidden" }}>
      {/* Banner */}
      <div style={{ position:"relative" }}>
        <BannerImage publicId="kuabo/banners/score" fallbackSvg={<ScoreSvg />} height={110} />
        <div style={{ position:"absolute", bottom:10, left:14, right:14, zIndex:2 }}>
          <div style={{ fontSize:10, color:scoreColor, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase" as const }}>⭐ {L.title}</div>
          <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
            <div style={{ fontSize:32, fontWeight:900, color:scoreColor, lineHeight:1 }}>{score}</div>
            <div style={{ fontSize:12, color:"#aaa" }}>/ 1000</div>
            <div style={{ marginLeft:8, fontSize:11, color:scoreColor, fontWeight:700, background:`${scoreColor}20`, padding:"2px 8px", borderRadius:8, border:`1px solid ${scoreColor}30` }}>{label}</div>
          </div>
        </div>
      </div>
      {/* Corps */}
      <div style={{ padding:"14px 16px" }}>
        <div style={{ height:5, background:"#1e2a3a", borderRadius:5, overflow:"hidden", marginBottom:12 }}>
          <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(to right,${scoreColor},#2dd4bf)`, borderRadius:5, transition:"width 1s ease" }} />
        </div>
        <div style={{ fontSize:10, color:"#555", letterSpacing:".08em", textTransform:"uppercase" as const, marginBottom:8 }}>{L.badges}</div>
        {unlockedBadges.length === 0 ? (
          <div style={{ fontSize:12, color:"#444", fontStyle:"italic" }}>{L.noBadge}</div>
        ) : (
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" as const }}>
            {unlockedBadges.map(b => (
              <div key={b.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", background:`${b.color}10`, border:`1px solid ${b.color}30`, borderRadius:20 }}>
                <span style={{ fontSize:14 }}>{b.emoji}</span>
                <span style={{ fontSize:11, color:b.color, fontWeight:600 }}>{b.label[lang]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// COUNTDOWN SECTION — avec banner
// ══════════════════════════════════════════════
function CountdownSection({ arrivalDate, lang, completedSteps, onOpenStep }: {
  arrivalDate: string | null; lang: Lang; completedSteps: string[]; onOpenStep: (id: string) => void;
}) {
  if (!arrivalDate) return null;
  const allDeadlines = [
    { id:"ssn", days:10 }, { id:"phone", days:1 }, { id:"bank", days:14 },
    { id:"greencard", days:21 }, { id:"housing", days:30 }, { id:"license", days:45 },
    { id:"job", days:90 }, { id:"taxes_first", days:90 }, { id:"real_id", days:60 },
    { id:"credit_score", days:60 }, { id:"taxes_annual", days:365 }, { id:"renew_greencard", days:3650 },
  ];
  const allPhaseSteps = [...PHASE_STEPS[1], ...PHASE_STEPS[2], ...PHASE_STEPS[3], ...PHASE_STEPS[4], ...PHASE_STEPS[5]];
  const ssnPending = !completedSteps.includes("ssn");
  const pending = allDeadlines
    .filter(d => !completedSteps.includes(d.id))
    .map(d => ({ ...d, daysLeft:getDaysLeft(arrivalDate, d.days), dateStr:addDays(arrivalDate, d.days) }))
    .filter(d => d.daysLeft >= -30)
    .sort((a, b) => { if (ssnPending&&a.id==="ssn") return -1; if (ssnPending&&b.id==="ssn") return 1; return a.daysLeft-b.daysLeft; })
    .slice(0, 4);
  if (pending.length === 0) return null;
  const urgent = pending[0], others = pending.slice(1, 4);
  const isOverdue = urgent.daysLeft < 0;
  const urgColor = isOverdue||urgent.daysLeft<=3?"#ef4444":urgent.daysLeft<=10?"#f97316":"#e8b84b";
  const urgentStep = allPhaseSteps.find(s => s.id===urgent.id);
  if (!urgentStep) return null;
  const stepEmoji: Record<string,string> = { ssn:"🪪",bank:"🏦",greencard:"💳",housing:"🏠",phone:"📱",job:"💼",license:"🚗",taxes_first:"📊",real_id:"🪪",credit_score:"📈",taxes_annual:"📊",renew_greencard:"💳" };
  const L = { fr:{ urgentTitle:"Étape urgente", overdue:"En retard !", days:"jours restants", deadline:"Deadline", next:"Prochaines deadlines", done:"Fait ✅", guide:"Guide 📖" }, en:{ urgentTitle:"Urgent step", overdue:"Overdue!", days:"days left", deadline:"Deadline", next:"Upcoming deadlines", done:"Done ✅", guide:"Guide 📖" }, es:{ urgentTitle:"Paso urgente", overdue:"¡Atrasado!", days:"días restantes", deadline:"Fecha límite", next:"Próximas fechas", done:"Hecho ✅", guide:"Guía 📖" } }[lang];

  return (
    <div style={{ marginBottom:14 }}>
      {/* Card urgente avec banner */}
      <div style={{ background:`${urgColor}08`, border:`1px solid ${urgColor}35`, borderRadius:18, overflow:"hidden", marginBottom:10 }}>
        {/* Banner deadline */}
        <div style={{ position:"relative" }}>
          <BannerImage publicId="kuabo/banners/countdown" fallbackSvg={<CountdownSvg />} height={110} />
          <div style={{ position:"absolute", bottom:10, left:14, right:14, zIndex:2 }}>
            <div style={{ fontSize:9, color:urgColor, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase" as const }}>⏱ {L.urgentTitle} · {L.deadline}: {urgent.dateStr}</div>
            <div style={{ fontSize:16, fontWeight:800, color:"#f4f1ec" }}>{urgentStep.label[lang]}</div>
          </div>
        </div>
        {/* Corps */}
        <div style={{ padding:"14px 16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
            <div style={{ fontSize:36, flexShrink:0 }}>{stepEmoji[urgent.id]||"📋"}</div>
            <div>
              <div style={{ fontSize:28, fontWeight:900, color:urgColor, lineHeight:1 }}>{isOverdue?L.overdue:`${Math.abs(urgent.daysLeft)}`}</div>
              <div style={{ fontSize:12, color:"#aaa", marginTop:2 }}>{!isOverdue&&L.days}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:9 }}>
            <button onClick={() => onOpenStep(urgent.id)} style={{ flex:1, padding:"11px 8px", background:"#22c55e", border:"none", borderRadius:10, color:"#000", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>{L.done}</button>
            <button onClick={() => onOpenStep(urgent.id)} style={{ flex:1, padding:"11px 8px", background:"#e8b84b", border:"none", borderRadius:10, color:"#000", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>{L.guide}</button>
            {STEP_GUIDES[urgent.id]?.explorerType && (
              <button onClick={() => window.location.href=`/near/${STEP_GUIDES[urgent.id].explorerType}`} style={{ padding:"11px 12px", background:"rgba(45,212,191,0.1)", border:"1px solid rgba(45,212,191,0.3)", borderRadius:10, color:"#2dd4bf", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>🗺️</button>
            )}
          </div>
        </div>
      </div>
      {/* Prochaines deadlines */}
      {others.length > 0 && (
        <div style={{ background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:12, padding:"12px 14px" }}>
          <div style={{ fontSize:10, color:"#555", letterSpacing:"0.08em", textTransform:"uppercase" as const, marginBottom:10, fontWeight:600 }}>📅 {L.next}</div>
          {others.map((d, i) => {
            const s = allPhaseSteps.find(st => st.id===d.id);
            const dc = d.daysLeft<=7?"#ef4444":d.daysLeft<=14?"#f97316":"#e8b84b";
            return (
              <div key={d.id} onClick={() => onOpenStep(d.id)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderBottom:i<others.length-1?"1px solid #1a2438":"none", cursor:"pointer" }}>
                <div style={{ fontSize:13, color:"#aaa" }}>{d.daysLeft<=7?"🔴":d.daysLeft<=14?"🟠":"🟡"} {s?.label[lang]||d.id}</div>
                <div style={{ fontSize:13, fontWeight:700, color:dc }}>{d.daysLeft}j →</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// ARMY BANNER — banner image + site officiel + bases militaires proches
// Affiché SEULEMENT si army / army_interest / army_unsure
// ══════════════════════════════════════════════
function ArmyBanner({ armyStatus, lang, onViewGuide, userLocation }: {
  armyStatus: string; lang: Lang; onViewGuide: () => void;
  userLocation?: { lat: number; lng: number } | null;
}) {
  if (!armyStatus || !["army","army_interest","army_unsure"].includes(armyStatus)) return null;

  const { ARMY_GUIDE: AG } = require("./data");
  const guide = AG[armyStatus]; if (!guide) return null;
  const g = guide[lang];
  const color = armyStatus === "army" ? "#22c55e" : "#2dd4bf";

  const [nearbyBases, setNearbyBases] = useState<Place[]>([]);
  const [loadingBases, setLoadingBases] = useState(false);
  const [showBases, setShowBases] = useState(false);

  const badge = {
    fr: { army:"🎖️ Soldat actif", army_interest:"🤔 J'y pense", army_unsure:"❓ Pas encore décidé" },
    en: { army:"🎖️ Active soldier", army_interest:"🤔 Thinking about it", army_unsure:"❓ Not decided yet" },
    es: { army:"🎖️ Soldado activo", army_interest:"🤔 Lo estoy pensando", army_unsure:"❓ Aún no decidido" },
  }[lang][armyStatus as "army"|"army_interest"|"army_unsure"];

  const L = {
    fr: { guide:"Voir mon guide Army →", website:"Site officiel goarmy.com →", basesBtn:"Voir les bases militaires près de moi", hideBtn:"Fermer les bases", loading:"Recherche...", noResult:"Aucune base trouvée", directions:"Itinéraire →", recruiter:"Trouver un recruteur Army" },
    en: { guide:"View my Army guide →", website:"Official goarmy.com →", basesBtn:"See military bases near me", hideBtn:"Hide bases", loading:"Searching...", noResult:"No base found", directions:"Directions →", recruiter:"Find an Army recruiter" },
    es: { guide:"Ver mi guía Army →", website:"Sitio oficial goarmy.com →", basesBtn:"Ver bases militares cerca de mí", hideBtn:"Ocultar bases", loading:"Buscando...", noResult:"Sin bases encontradas", directions:"Cómo llegar →", recruiter:"Encontrar reclutador Army" },
  }[lang];

  const toggleBases = async () => {
    if (showBases) { setShowBases(false); setNearbyBases([]); return; }
    if (!userLocation) return;
    setLoadingBases(true); setShowBases(true);
    try {
      // ✅ Recherche précise : bases militaires + recruteurs Army
      const res = await fetch("/api/places", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: userLocation.lat, lng: userLocation.lng,
          type: "military",
          query: "US Army recruiting office military base",
          keyword: "Army",
        }),
      });
      const data = await res.json();
      // Filtre pour ne garder que les vrais résultats militaires
      const filtered = (data.places || [])
        .filter((p: Place) =>
          p.name.toLowerCase().includes("army") ||
          p.name.toLowerCase().includes("military") ||
          p.name.toLowerCase().includes("recruit") ||
          p.name.toLowerCase().includes("national guard") ||
          p.name.toLowerCase().includes("fort") ||
          p.name.toLowerCase().includes("base")
        )
        .slice(0, 5);
      setNearbyBases(filtered.length > 0 ? filtered : (data.places || []).slice(0, 5));
    } catch { setNearbyBases([]); }
    setLoadingBases(false);
  };

  return (
    <div style={{ background:`${color}06`, border:`1px solid ${color}25`, borderRadius:18, marginBottom:14, overflow:"hidden" }}>
      {/* Banner image */}
      <div style={{ position:"relative" }}>
        <BannerImage publicId="kuabo/banners/army" fallbackSvg={<ArmySvg />} height={110} />
        <div style={{ position:"absolute", bottom:10, left:14, right:14, zIndex:2 }}>
          <div style={{ fontSize:10, color, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase" as const }}>🎖️ US Army + DV Lottery</div>
          <div style={{ fontSize:16, fontWeight:800, color:"#f4f1ec" }}>{badge}</div>
        </div>
      </div>

      {/* Corps */}
      <div style={{ padding:"14px 16px" }}>
        <div style={{ fontSize:13, color:"#aaa", lineHeight:1.6, marginBottom:14 }}>{g.desc}</div>

        {/* ✅ Bouton guide — fond coloré texte BLANC */}
        <button onClick={onViewGuide}
          style={{ width:"100%", padding:"12px", background:color, border:"none", borderRadius:12, color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginBottom:10 }}>
          {L.guide}
        </button>

        {/* ✅ Site officiel goarmy.com */}
        <button onClick={() => window.open("https://www.goarmy.com", "_blank")}
          style={{ width:"100%", padding:"11px", background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:12, color:"#22c55e", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", marginBottom:10, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          🌐 {L.website}
        </button>

        {/* ✅ Bouton bases militaires proches — toggle */}
        {userLocation && (
          <button onClick={toggleBases} disabled={loadingBases}
            style={{
              width:"100%", padding:"11px",
              background: showBases ? "rgba(239,68,68,0.08)" : `rgba(${color === "#22c55e" ? "34,197,94" : "45,212,191"},0.08)`,
              border: `1px solid ${showBases ? "rgba(239,68,68,0.3)" : color + "40"}`,
              borderRadius:12, color: showBases ? "#ef4444" : color,
              fontSize:13, fontWeight:600, cursor:loadingBases?"wait":"pointer", fontFamily:"inherit",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              marginBottom: showBases ? 12 : 0, transition:"all 0.2s",
            }}>
            {loadingBases ? `🔍 ${L.loading}` : showBases ? `✕ ${L.hideBtn}` : `🪖 ${L.basesBtn}`}
          </button>
        )}

        {/* Résultats bases militaires */}
        {showBases && !loadingBases && (
          <div style={{ marginTop:4 }}>
            {nearbyBases.length === 0 ? (
              <div style={{ textAlign:"center" as const, padding:"14px", color:"#555", fontSize:13 }}>
                {L.noResult}
                <br/>
                <button onClick={() => window.open("https://www.goarmy.com/locate-a-recruiter.html", "_blank")}
                  style={{ marginTop:10, padding:"8px 16px", background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:10, color:"#22c55e", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  🔍 {L.recruiter}
                </button>
              </div>
            ) : (
              nearbyBases.map((p, i) => (
                <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom: i < nearbyBases.length-1 ? "1px solid #1e2a3a" : "none" }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>🪖</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#f4f1ec", marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{p.name}</div>
                    <div style={{ fontSize:11, color:"#aaa", display:"flex", gap:6, flexWrap:"wrap" as const }}>
                      <span style={{ color:p.open===true?"#22c55e":p.open===false?"#ef4444":"#555", fontWeight:600 }}>
                        {p.open===true?(lang==="fr"?"Ouvert":"Open"):p.open===false?(lang==="fr"?"Fermé":"Closed"):"?"}
                      </span>
                      <span>·</span><span>{p.distance}</span>
                      {p.rating && <><span>·</span><span>⭐ {p.rating}</span></>}
                    </div>
                    {p.address && <div style={{ fontSize:10, color:"#555", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{p.address}</div>}
                  </div>
                  <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.name+" "+p.address)}&destination_place_id=${p.id}`, "_blank")}
                    style={{ padding:"7px 10px", background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:8, color:"#22c55e", fontSize:10, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" as const, flexShrink:0 }}>
                    →
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// KUABO AI BUTTON
// ══════════════════════════════════════════════
function KuaboAIButton({ lang, completedSteps, userState, userCity }: { lang: Lang; completedSteps: string[]; userState: string; userCity: string }) {
  const location = userCity||userState||(lang==="fr"?"ta zone":"your area");
  const L = { fr:{ title:"Demande à Kuabo AI", sub:`Ton assistant — ${location}` }, en:{ title:"Ask Kuabo AI", sub:`Your assistant — ${location}` }, es:{ title:"Pregunta a Kuabo AI", sub:`Tu asistente — ${location}` } }[lang];
  return (
    <button onClick={() => { localStorage.setItem("completedSteps", JSON.stringify(completedSteps)); window.location.href="/chat"; }}
      style={{ width:"100%", background:"#141d2e", border:"1px solid rgba(232,184,75,0.25)", borderRadius:14, padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, cursor:"pointer", fontFamily:"inherit", transition:"background 0.2s" }}
      onMouseEnter={e => (e.currentTarget.style.background="#1a2540")}
      onMouseLeave={e => (e.currentTarget.style.background="#141d2e")}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:48, height:48, borderRadius:12, flexShrink:0, background:"linear-gradient(135deg,#f97316,#e8b84b)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:24, display:"block", animation:"robotBob 2s ease-in-out infinite" }}>🤖</span>
        </div>
        <div>
          <div style={{ fontSize:15, fontWeight:600, color:"#f4f1ec", textAlign:"left" as const }}>{L.title}</div>
          <div style={{ fontSize:12, color:"#aaa", marginTop:2 }}>{L.sub}</div>
        </div>
      </div>
      <div style={{ width:32, height:32, borderRadius:"50%", background:"#1e2a3a", display:"flex", alignItems:"center", justifyContent:"center", color:"#e8b84b", fontSize:14, flexShrink:0 }}>→</div>
    </button>
  );
}

// ══════════════════════════════════════════════
// DAILY TIP
// ══════════════════════════════════════════════
function DailyTip({ lang, userState, userCountry }: { lang: Lang; userState: string; userCountry: string }) {
  const TIPS: Record<Lang,string[]> = {
    fr:["Attends 10 jours après l'arrivée avant d'aller au bureau SSA.","Achète une SIM T-Mobile dès l'aéroport — pas besoin de SSN.","Tu peux ouvrir un compte Chase avec ton passeport seulement.","Ta Green Card physique arrivera par courrier USCIS en 2-3 semaines.","Zillow et Apartments.com sont les meilleurs sites pour trouver un logement.","LinkedIn et Indeed : les meilleurs sites pour chercher un emploi.","Commence à construire ton credit score avec une secured credit card.","Garde toujours une copie numérique de tes documents importants."],
    en:["Wait 10 days after arrival before going to the SSA office.","Buy a T-Mobile SIM at the airport — no SSN needed.","You can open a Chase account with your passport only.","Your Green Card will arrive by USCIS mail in 2-3 weeks.","Zillow and Apartments.com are the best sites to find housing.","LinkedIn and Indeed are the best job search sites.","Start building your credit score with a secured credit card.","Always keep a digital copy of your important documents."],
    es:["Espera 10 días antes de ir a la oficina SSA para tu SSN.","Compra una SIM T-Mobile en el aeropuerto — no necesitas SSN.","Puedes abrir cuenta en Chase solo con tu pasaporte.","Tu Green Card llegará por correo USCIS en 2-3 semanas.","Zillow y Apartments.com son los mejores sitios para vivienda.","LinkedIn e Indeed son los mejores sitios de empleo.","Comienza a construir tu historial crediticio con tarjeta asegurada.","Siempre guarda copia digital de tus documentos importantes."],
  };
  const [tip, setTip] = useState(""); const [isAdmin, setIsAdmin] = useState(false); const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const f = async () => {
      try {
        const snap = await getDocs(collection(db, "admin_messages")); let found: string|null = null;
        snap.forEach(d => { const data = d.data() as any; if (!data.active||data.type!=="conseil") return; if ((data.state==="ALL"||data.state===userState)&&(data.country==="ALL"||data.country===userCountry)) found=data["text_"+lang]||data.text_fr||null; });
        if (found) { setTip(found); setIsAdmin(true); } else setTip(TIPS[lang][new Date().getDate()%TIPS[lang].length]);
      } catch { setTip(TIPS[lang][new Date().getDate()%TIPS[lang].length]); }
      setLoaded(true);
    };
    f();
  }, [lang, userState, userCountry]);
  return (
    <div style={{ background:isAdmin?"rgba(232,184,75,0.05)":"#0d1e1e", border:"1px solid "+(isAdmin?"rgba(232,184,75,0.2)":"rgba(45,212,191,0.18)"), borderRadius:14, padding:"14px 16px", display:"flex", gap:14, marginBottom:14, alignItems:"flex-start" }}>
      <div style={{ width:40, height:40, borderRadius:10, flexShrink:0, background:isAdmin?"rgba(232,184,75,0.15)":"rgba(45,212,191,0.15)", border:"1px solid "+(isAdmin?"rgba(232,184,75,0.3)":"rgba(45,212,191,0.3)"), display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:20, display:"block", animation:"glowPulse 2.5s ease-in-out infinite" }}>{isAdmin?"📢":"💡"}</span>
      </div>
      <div>
        <div style={{ fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase" as const, color:isAdmin?"#e8b84b":"#2dd4bf", fontWeight:600, marginBottom:5 }}>{isAdmin?(lang==="fr"?"Message Kuabo":"Kuabo Message"):(lang==="fr"?"Conseil du jour":lang==="es"?"Consejo del día":"Tip of the day")}</div>
        <div style={{ fontSize:13, color:isAdmin?"#f4e8c8":"#c8eae8", lineHeight:1.7 }}>{loaded?tip:"..."}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// ADMIN MESSAGE CARD
// ══════════════════════════════════════════════
function AdminMessageCard({ lang, userId, userState }: { lang: Lang; userId: string|undefined; userState: string }) {
  const [msg, setMsg] = useState<any>(null); const [expanded, setExpanded] = useState(false); const [dismissed, setDismissed] = useState(false);
  useEffect(() => { if (!userId) return; const f = async () => { try { const snap = await getDocs(collection(db,"admin_messages")); let found: any=null; snap.forEach(d => { const data=d.data() as any; if (!data.active||data.type==="conseil"||data.type==="pub"||data.type==="event") return; if (data.target==="all"||data.target==="state:"+userState) found={id:d.id,...data}; }); if (found) { const userMsg=await getDoc(doc(db,"users",userId,"messages",found.id)).catch(()=>null); if (!userMsg?.exists()||!userMsg.data()?.seen) setMsg(found); } } catch {} }; f(); }, [userId, userState]);
  const handleSeen = async () => { if (!userId||!msg) return; try { await updateDoc(doc(db,"users",userId,"messages",msg.id),{seen:true,seenAt:new Date().toISOString()}).catch(()=>{}); } catch {} setDismissed(true); };
  if (!msg||dismissed) return null;
  const title=msg["title_"+lang]||msg.title_fr||""; const content=msg["content_"+lang]||msg.content_fr||""; const isUrgent=msg.type==="urgent"; const color=isUrgent?"#ef4444":"#e8b84b";
  return (
    <div style={{ background:`${color}08`, border:`1.5px solid ${color}30`, borderRadius:14, padding:"14px 16px", marginBottom:14, position:"relative" }}>
      <button onClick={handleSeen} style={{ position:"absolute", top:8, right:10, background:"none", border:"none", color:"#555", cursor:"pointer", fontSize:16 }}>×</button>
      <div style={{ fontSize:10, color, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase" as const, marginBottom:6 }}>{isUrgent?"⚠️ ":"📢 "}{lang==="fr"?"Information Kuabo":"Kuabo Information"}</div>
      <div style={{ fontSize:14, fontWeight:700, color:"#f4f1ec", marginBottom:expanded?8:0, paddingRight:20 }}>{title}</div>
      {expanded&&<div style={{ fontSize:13, color:"#aaa", lineHeight:1.7, marginBottom:12 }}>{content}</div>}
      <div style={{ display:"flex", gap:8, marginTop:10 }}>
        <button onClick={()=>setExpanded(!expanded)} style={{ flex:2, padding:"10px", background:color, border:"none", borderRadius:10, color:"#000", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>{expanded?(lang==="fr"?"Réduire":"Collapse"):(lang==="fr"?"👁️ Voir l'info":"👁️ See info")}</button>
        <button onClick={handleSeen} style={{ flex:1, padding:"10px", background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:10, color:"#aaa", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>{lang==="fr"?"Plus tard":"Later"}</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// ADMIN EVENTS + PUB
// ══════════════════════════════════════════════
function AdminEventsAndPub({ lang, userState, userCountry, userId }: { lang: Lang; userState: string; userCountry: string; userId: string }) {
  const [events, setEvents] = useState<any[]>([]); const [pub, setPub] = useState<any>(null); const [pubClosed, setPubClosed] = useState(false); const [participating, setParticipating] = useState<Record<string,boolean>>({});
  useEffect(() => { const f = async () => { try { const snap=await getDocs(collection(db,"admin_messages")); const evts: any[]=[]; let foundPub: any=null; snap.forEach(d => { const data=d.data() as any; if (!data.active) return; const targeted=data.target==="all"||data.target===`state:${userState}`||data.target==="dv"||data.target==="army"; if (!targeted) return; if (data.type==="event") evts.push({id:d.id,...data}); if (data.type==="pub"&&!foundPub) foundPub={id:d.id,...data}; }); evts.sort((a,b)=>new Date(a.eventDate||0).getTime()-new Date(b.eventDate||0).getTime()); setEvents(evts); setPub(foundPub); const part: Record<string,boolean>={}; evts.forEach(e=>{part[e.id]=(e.participants||[]).includes(userId);}); setParticipating(part); } catch {} }; f(); }, [userState, userId]);
  const getPubFields=(p: any,l: Lang)=>({ title:p?.[`title_${l}`]||p?.title_fr||"", desc:p?.[`desc_${l}`]||p?.desc_fr||"", cta:p?.[`cta_${l}`]||p?.cta_fr||"", url:p?.linkUrl||p?.link_url||"" });
  if (!pub&&events.length===0) return null;
  const pubF=pub?getPubFields(pub,lang):null;
  return (
    <>
      {pub&&pubF&&!pubClosed&&(
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:9, color:"#333", textTransform:"uppercase" as const, letterSpacing:".08em", marginBottom:3, textAlign:"right" as const }}>{lang==="fr"?"Publicité · Partenaire Kuabo":"Ad · Kuabo Partner"}</div>
          <div style={{ position:"relative", background:"#141d2e", border:"1px solid rgba(232,184,75,0.2)", borderRadius:14, overflow:"hidden" }}>
            <div style={{ height:2, background:"linear-gradient(to right,#e8b84b,#f97316)" }} />
            <div style={{ padding:"12px 14px", display:"flex", alignItems:"center", gap:12 }}>
              <button onClick={e=>{e.stopPropagation();setPubClosed(true);}} style={{ position:"absolute", top:8, right:10, background:"none", border:"none", color:"#555", cursor:"pointer", fontSize:16, zIndex:10 }}>✕</button>
              <div style={{ width:46, height:46, borderRadius:13, background:"rgba(232,184,75,.12)", border:"1px solid rgba(232,184,75,.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>📢</div>
              <div style={{ flex:1, minWidth:0, paddingRight:20 }}>
                <div style={{ fontSize:14, fontWeight:700, color:"#f4f1ec", marginBottom:2 }}>{pubF.title||"..."}</div>
                {pubF.cta&&<div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 10px", background:"rgba(232,184,75,.1)", border:"1px solid rgba(232,184,75,.3)", borderRadius:18 }}><span style={{ fontSize:11, color:"#e8b84b", fontWeight:700 }}>{pubF.cta} →</span></div>}
              </div>
            </div>
          </div>
        </div>
      )}
      {events.length>0&&(
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, color:"#555", letterSpacing:".08em", textTransform:"uppercase" as const, marginBottom:10, fontWeight:600 }}>📅 {lang==="fr"?"Événements Kuabo":"Kuabo Events"}</div>
          {events.map(event=>{ const isIn=participating[event.id]; const title=event[`title_${lang}`]||event.title_fr||""; const dateStr=event.eventDate?new Date(event.eventDate).toLocaleDateString(lang==="fr"?"fr-FR":"en-US",{day:"numeric",month:"long"}):""; return (
            <div key={event.id} style={{ background:"#141d2e", border:"1px solid rgba(45,212,191,0.2)", borderRadius:14, overflow:"hidden", position:"relative", marginBottom:8 }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(to right,#2dd4bf,#e8b84b)" }} />
              <div style={{ padding:"12px 14px", display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"#f4f1ec", marginBottom:3 }}>{title}</div>
                  <div style={{ fontSize:11, color:"#2dd4bf" }}>📅 {dateStr}{event.eventTime?` · ${event.eventTime}`:""}</div>
                  {event.eventLocation&&<div style={{ fontSize:11, color:"#aaa", marginTop:2 }}>📍 {event.eventLocation}</div>}
                </div>
                <button style={{ padding:"8px 12px", borderRadius:16, border:"1px solid "+(isIn?"rgba(34,197,94,0.4)":"rgba(45,212,191,0.4)"), background:isIn?"rgba(34,197,94,0.1)":"rgba(45,212,191,0.1)", color:isIn?"#22c55e":"#2dd4bf", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", flexShrink:0, whiteSpace:"nowrap" as const }}>
                  {isIn?(lang==="fr"?"✓ Inscrit":"✓ Going"):(lang==="fr"?"Participer":"Join")}
                </button>
              </div>
            </div>
          ); })}
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════
// PARCOURS SPOTIFY HORIZONTAL
// ══════════════════════════════════════════════
function ParcourSection({ lang, completedSteps, currentPhase, phaseProgress, onPhaseClick }: {
  lang: Lang; completedSteps: string[]; currentPhase: PhaseId;
  phaseProgress: Record<PhaseId,{ done:number; total:number; pct:number }>;
  onPhaseClick: (pid: PhaseId) => void;
}) {
  const L = { fr:{ title:"Ton parcours Kuabo", inProgress:"EN COURS", done:"✅ Terminé", locked:"🔒 Verrouillé" }, en:{ title:"Your Kuabo Journey", inProgress:"IN PROGRESS", done:"✅ Done", locked:"🔒 Locked" }, es:{ title:"Tu camino Kuabo", inProgress:"EN CURSO", done:"✅ Listo", locked:"🔒 Bloqueado" } }[lang];
  const phases = [1,2,3,4,5] as PhaseId[];
  const phaseBgs: Record<PhaseId,string> = { 1:"linear-gradient(145deg,#1a2235,#0d1520)", 2:"linear-gradient(145deg,#0d1e1e,#091515)", 3:"linear-gradient(145deg,#0d1e10,#091508)", 4:"linear-gradient(145deg,#1a1535,#0d0f20)", 5:"linear-gradient(145deg,#1e1508,#150e05)" };
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:13, fontWeight:600, color:"#f4f1ec", marginBottom:14 }}>🗺️ {L.title}</div>
      <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:4 }}>
        {phases.map(pid => {
          const meta=PHASES_META[pid]; const prog=phaseProgress[pid]; const isActive=pid===currentPhase; const isComplete=prog.pct===100; const unlocked=isPhaseUnlocked(pid,completedSteps);
          let badgeLabel=L.locked, badgeBg="#2a3448", badgeColor="#555";
          if (isComplete) { badgeLabel=L.done; badgeBg="#16a34a"; badgeColor="#bbf7d0"; }
          else if (isActive) { badgeLabel=L.inProgress; badgeBg="#7c3aed"; badgeColor="#e9d5ff"; }
          return (
            <div key={pid} onClick={() => unlocked&&onPhaseClick(pid)}
              style={{ flex:"0 0 140px", borderRadius:16, overflow:"hidden", background:"#141d2e", border:`1px solid ${isActive?meta.color+"40":"#1e2a3a"}`, cursor:unlocked?"pointer":"default", transition:"transform 0.2s", opacity:unlocked?1:0.5 }}
              onMouseEnter={e => { if(unlocked)(e.currentTarget as HTMLDivElement).style.transform="scale(1.03)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform="scale(1)"; }}>
              <div style={{ height:110, position:"relative", background:phaseBgs[pid], display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ position:"absolute", top:-10, right:-10, width:60, height:60, borderRadius:"50%", background:`${meta.color}15`, filter:"blur(12px)" }} />
                <span style={{ fontSize:48, position:"relative", zIndex:1, filter:unlocked?"none":"grayscale(1) opacity(0.3)", display:"block", animation:isActive?"floatEmoji 3s ease-in-out infinite":"none" }}>{unlocked?meta.emoji:"🔒"}</span>
                <div style={{ position:"absolute", top:8, left:8, fontSize:9, fontWeight:700, padding:"3px 8px", borderRadius:20, background:badgeBg, color:badgeColor, whiteSpace:"nowrap" as const }}>{badgeLabel}</div>
              </div>
              <div style={{ padding:"10px 10px 12px" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#f4f1ec", marginBottom:2 }}>{meta.name[lang]}</div>
                <div style={{ fontSize:11, color:"#aaa", marginBottom:7 }}>{unlocked?`${prog.done}/${prog.total}${isActive?` · ${prog.pct}%`:""}`:(lang==="fr"?"Verrouillé":"Locked")}</div>
                <div style={{ height:3, background:"#1e2a3a", borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${unlocked?prog.pct:0}%`, background:isComplete?meta.color:isActive?meta.color:"#2a3448", borderRadius:2, transition:"width 0.6s ease" }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// BOTTOM NAV
// ══════════════════════════════════════════════
export function BottomNav({ activeTab, setActiveTab, lang, onHomePress }: {
  activeTab: string; setActiveTab: (t: string) => void; lang: Lang; onHomePress: () => void;
}) {
  const L = { fr:{ home:"Accueil", explorer:"Explorer", jobs:"Emplois", profile:"Profil" }, en:{ home:"Home", explorer:"Explore", jobs:"Jobs", profile:"Profile" }, es:{ home:"Inicio", explorer:"Explorar", jobs:"Empleo", profile:"Perfil" } }[lang];
  const tabs = [{ id:"home", icon:"🏠", label:L.home }, { id:"explorer", icon:"🌍", label:L.explorer }, { id:"jobs", icon:"💼", label:L.jobs }, { id:"profile", icon:"👤", label:L.profile }];
  return (
    <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, height:68, background:"#0f1521", borderTop:"1px solid #1e2a3a", display:"flex", alignItems:"center", zIndex:200 }}>
      {tabs.map(({ id, icon, label }) => { const active=activeTab===id; return (
        <button key={id} onClick={() => id==="home"&&activeTab==="home"?onHomePress():setActiveTab(id)}
          style={{ flex:1, display:"flex", flexDirection:"column" as const, alignItems:"center", justifyContent:"center", gap:3, padding:"8px 0", background:"transparent", border:"none", cursor:"pointer", position:"relative", fontFamily:"inherit", WebkitTapHighlightColor:"transparent" }}>
          {active&&<div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:30, height:2, borderRadius:"0 0 3px 3px", background:"#e8b84b" }} />}
          <span style={{ fontSize:22, filter:active?"none":"grayscale(1) opacity(.45)" }}>{icon}</span>
          <span style={{ fontSize:10, fontWeight:active?600:400, color:active?"#e8b84b":"#4a5568" }}>{label}</span>
        </button>
      ); })}
    </div>
  );
}

// ══════════════════════════════════════════════
// HOME TAB — EXPORT PRINCIPAL
// ══════════════════════════════════════════════
export default function HomeTab({
  lang, userId, completedSteps, currentPhase, phaseProgress, arrivalDate,
  armyStatus, userState, userCity, userCountry, streak, userStatus,
  arrivalConfirmed, onOpenStep, onViewArmyGuide, onGoToExplorer, userLocation,
}: {
  lang: Lang; userId: string|undefined; completedSteps: string[]; currentPhase: PhaseId;
  phaseProgress: Record<PhaseId,{ done:number; total:number; pct:number }>;
  arrivalDate: string|null; armyStatus: string; userState: string; userCity: string; userCountry: string;
  streak: number; userStatus: UserStatus; arrivalConfirmed?: boolean;
  onOpenStep: (id: string) => void; onViewArmyGuide: () => void;
  onGoToExplorer: () => void;
  userLocation?: { lat: number; lng: number } | null;
}) {
  const streakColor = streak>=7?"#ef4444":streak>=3?"#f97316":"#e8b84b";
  const score = computeKuaboScore({ completedSteps, streak });
  const badges = computeBadges({ completedSteps, arrivalConfirmed:arrivalConfirmed||false, arrivalDate, streak });
  const [activePhase, setActivePhase] = useState<PhaseId|null>(null);

  return (
    <>
      <style>{`
        @keyframes floatEmoji{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes robotBob{0%,100%{transform:translateY(0) rotate(0deg)}25%{transform:translateY(-3px) rotate(-3deg)}75%{transform:translateY(-3px) rotate(3deg)}}
        @keyframes glowPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
        @keyframes alertPop{0%{transform:scale(.85);opacity:0}100%{transform:scale(1);opacity:1}}
      `}</style>

      <PhaseModal phaseId={activePhase} lang={lang} completedSteps={completedSteps} onToggleStep={onOpenStep} onClose={() => setActivePhase(null)} />

      {/* HEADER avec cloche */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <div style={{ fontSize:12, color:"#aaa" }}>{lang==="fr"?"Bonjour 👋":lang==="es"?"Hola 👋":"Hello 👋"}</div>
          <div style={{ fontSize:16, fontWeight:700, color:"#f4f1ec" }}>{lang==="fr"?"Ton tableau de bord":lang==="es"?"Tu panel":"Your dashboard"}</div>
        </div>
        <NotificationBell lang={lang} userId={userId} />
      </div>

      {/* 1. Admin msg */}
      {userId && <AdminMessageCard lang={lang} userId={userId} userState={userState} />}

      {/* 2. Hero avec banner */}
      <CircularHero currentPhase={currentPhase} phaseProgress={phaseProgress} lang={lang} />

      {/* 3. Score avec banner */}
      <KuaboScoreWidget score={score} streak={streak} badges={badges} lang={lang} />

      {/* 4. Countdown avec banner */}
      <CountdownSection arrivalDate={arrivalDate} lang={lang} completedSteps={completedSteps} onOpenStep={onOpenStep} />

      {/* 5. Army avec banner — seulement si army/interest/unsure */}
      <ArmyBanner armyStatus={armyStatus} lang={lang} onViewGuide={onViewArmyGuide} userLocation={userLocation} />

      {/* 6. AI */}
      <KuaboAIButton lang={lang} completedSteps={completedSteps} userState={userState} userCity={userCity} />

      {/* 7. Conseil */}
      <DailyTip lang={lang} userState={userState} userCountry={userCountry} />

      {/* 8. Pub + Events */}
      {userId && <AdminEventsAndPub lang={lang} userState={userState} userCountry={userCountry} userId={userId} />}

      {/* 9. Parcours Spotify */}
      <ParcourSection lang={lang} completedSteps={completedSteps} currentPhase={currentPhase} phaseProgress={phaseProgress} onPhaseClick={pid => setActivePhase(pid)} />

      {/* 10. Magasins essentiels */}
      <StoresSection lang={lang} userLocation={userLocation||null} onGoToExplorer={onGoToExplorer} />

      {/* 11. Streak */}
      {streak>0 && (
        <div style={{ background:"#0f1521", border:`1px solid ${streakColor}20`, borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
          <Flame size={20} color={streakColor} />
          <div style={{ flex:1 }}><span style={{ fontSize:20, fontWeight:800, color:streakColor }}>{streak}</span><span style={{ fontSize:12, color:"#aaa", marginLeft:6 }}>{lang==="fr"?"jours de suite":lang==="es"?"días seguidos":"days in a row"}</span></div>
          <span style={{ fontSize:12, color:"#555" }}>{streak>=7?"🔥":streak>=3?"💪":"⭐"}</span>
        </div>
      )}
    </>
  );
}
