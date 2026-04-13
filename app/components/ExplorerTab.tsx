"use client";

import { useState, useEffect, useCallback } from "react";
import { useLoadScript, GoogleMap, Marker } from "@react-google-maps/api";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { ChevronRight } from "lucide-react";

type Lang = "fr" | "en" | "es";
type Place = { id:string; name:string; address:string; lat:number; lng:number; rating:number|null; open:boolean|null; distance:string; };
type FilterType = "ssn"|"dmv"|"bank"|"uscis"|"clinic"|"food";
type CommunityUser = { id:string; situation:string; arrival:string; lat:number; lng:number; isNew:boolean; };
type ExplorerSubTab = "services"|"community"|"documents"|"messages"|"budget";
type CommFilter = "all"|"dv"|"work"|"student"|"family"|"refugee";
type MapMode = "gps"|"usstate";

const FILTERS: { id:FilterType; icon:string; label:Record<Lang,string> }[] = [
  { id:"ssn",    icon:"🪪", label:{ fr:"SSA",       en:"SSA",     es:"SSA"      } },
  { id:"dmv",    icon:"🚗", label:{ fr:"DMV",       en:"DMV",     es:"DMV"      } },
  { id:"bank",   icon:"🏦", label:{ fr:"Banques",   en:"Banks",   es:"Bancos"   } },
  { id:"uscis",  icon:"🛂", label:{ fr:"USCIS",     en:"USCIS",   es:"USCIS"    } },
  { id:"clinic", icon:"🏥", label:{ fr:"Cliniques", en:"Clinics", es:"Clínicas" } },
  { id:"food",   icon:"🍽️", label:{ fr:"Nourriture",en:"Food",   es:"Comida"   } },
];

const COMM_FILTERS: { id:CommFilter; label:Record<Lang,string> }[] = [
  { id:"all",     label:{ fr:"Tous",       en:"All",      es:"Todos"     } },
  { id:"dv",      label:{ fr:"DV Lottery", en:"DV Lottery",es:"Lotería DV"} },
  { id:"work",    label:{ fr:"Travail",    en:"Work",     es:"Trabajo"   } },
  { id:"student", label:{ fr:"Étudiant",   en:"Student",  es:"Estudiante"} },
  { id:"family",  label:{ fr:"Famille",    en:"Family",   es:"Familia"   } },
  { id:"refugee", label:{ fr:"Réfugié",    en:"Refugee",  es:"Refugiado" } },
];

const MARKER_COLORS: Record<FilterType,string> = {
  ssn:"#e8b84b", dmv:"#f97316", bank:"#22c55e",
  uscis:"#a78bfa", clinic:"#2dd4bf", food:"#f472b6"
};

const US_STATE_COORDS: Record<string,{lat:number;lng:number;name:string}> = {
  AL:{lat:32.36,lng:-86.27,name:"Alabama"},AK:{lat:58.30,lng:-134.41,name:"Alaska"},
  AZ:{lat:33.44,lng:-112.07,name:"Arizona"},AR:{lat:34.74,lng:-92.28,name:"Arkansas"},
  CA:{lat:38.55,lng:-121.46,name:"California"},CO:{lat:39.74,lng:-104.98,name:"Colorado"},
  CT:{lat:41.76,lng:-72.68,name:"Connecticut"},DE:{lat:39.15,lng:-75.52,name:"Delaware"},
  FL:{lat:30.43,lng:-84.28,name:"Florida"},GA:{lat:33.74,lng:-84.38,name:"Georgia"},
  HI:{lat:21.30,lng:-157.85,name:"Hawaii"},ID:{lat:43.61,lng:-116.20,name:"Idaho"},
  IL:{lat:39.78,lng:-89.65,name:"Illinois"},IN:{lat:39.77,lng:-86.15,name:"Indiana"},
  IA:{lat:41.59,lng:-93.62,name:"Iowa"},KS:{lat:39.04,lng:-95.67,name:"Kansas"},
  KY:{lat:38.18,lng:-84.87,name:"Kentucky"},LA:{lat:30.45,lng:-91.13,name:"Louisiana"},
  ME:{lat:44.31,lng:-69.77,name:"Maine"},MD:{lat:38.97,lng:-76.49,name:"Maryland"},
  MA:{lat:42.35,lng:-71.06,name:"Massachusetts"},MI:{lat:42.73,lng:-84.55,name:"Michigan"},
  MN:{lat:44.94,lng:-93.09,name:"Minnesota"},MS:{lat:32.30,lng:-90.18,name:"Mississippi"},
  MO:{lat:38.57,lng:-92.17,name:"Missouri"},MT:{lat:46.59,lng:-112.02,name:"Montana"},
  NE:{lat:40.80,lng:-96.67,name:"Nebraska"},NV:{lat:39.16,lng:-119.76,name:"Nevada"},
  NH:{lat:43.21,lng:-71.53,name:"New Hampshire"},NJ:{lat:40.22,lng:-74.76,name:"New Jersey"},
  NM:{lat:35.66,lng:-105.96,name:"New Mexico"},NY:{lat:42.65,lng:-73.75,name:"New York"},
  NC:{lat:35.77,lng:-78.63,name:"North Carolina"},ND:{lat:46.81,lng:-100.77,name:"North Dakota"},
  OH:{lat:39.96,lng:-83.00,name:"Ohio"},OK:{lat:35.47,lng:-97.52,name:"Oklahoma"},
  OR:{lat:44.93,lng:-123.03,name:"Oregon"},PA:{lat:40.26,lng:-76.88,name:"Pennsylvania"},
  RI:{lat:41.82,lng:-71.42,name:"Rhode Island"},SC:{lat:34.00,lng:-81.03,name:"South Carolina"},
  SD:{lat:44.36,lng:-100.34,name:"South Dakota"},TN:{lat:36.16,lng:-86.78,name:"Tennessee"},
  TX:{lat:30.26,lng:-97.74,name:"Texas"},UT:{lat:40.76,lng:-111.89,name:"Utah"},
  VT:{lat:44.26,lng:-72.57,name:"Vermont"},VA:{lat:37.53,lng:-77.46,name:"Virginia"},
  WA:{lat:47.03,lng:-122.89,name:"Washington"},WV:{lat:38.34,lng:-81.63,name:"West Virginia"},
  WI:{lat:43.07,lng:-89.39,name:"Wisconsin"},WY:{lat:41.14,lng:-104.82,name:"Wyoming"},
};

const mapContainerStyle = { width:"100%", height:"240px" };
const mapOptions = {
  disableDefaultUI:true, zoomControl:false, scrollwheel:false,
  disableDoubleClickZoom:true, gestureHandling:"none", draggable:true,
  styles:[
    { elementType:"geometry",           stylers:[{ color:"#0f1521" }] },
    { elementType:"labels.text.fill",   stylers:[{ color:"#aaa" }]   },
    { elementType:"labels.text.stroke", stylers:[{ color:"#0f1521" }]},
    { featureType:"road",  elementType:"geometry", stylers:[{ color:"#1e2a3a" }] },
    { featureType:"water", elementType:"geometry", stylers:[{ color:"#0b0f1a" }] },
    { featureType:"poi",   stylers:[{ visibility:"off" }] },
  ],
};

function getDistanceKm(lat1:number,lng1:number,lat2:number,lng2:number):number {
  const R=6371,dLat=(lat2-lat1)*Math.PI/180,dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function anonLocation(lat:number,lng:number){ return { lat:Math.round(lat*50)/50, lng:Math.round(lng*50)/50 }; }

// ══════════════════════════════════════════════
// BUDGET & MAGASINS SECTION
// ══════════════════════════════════════════════
function BudgetSection({ lang, userState }: { lang:Lang; userState:string }) {
  const [income, setIncome] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kuabo_budget")||"{}").income || ""; } catch { return ""; }
  });
  const [saved, setSaved] = useState(false);

  const stateName = US_STATE_COORDS[userState]?.name || "";

  // Prix moyens par état (simplifiés)
  const STATE_RENT: Record<string,number> = {
    CA:2800,NY:2600,MA:2400,WA:2200,CO:1900,IL:1600,TX:1400,FL:1500,
    GA:1400,NC:1300,VA:1700,MD:1800,NJ:2000,PA:1500,AZ:1500,NV:1600,
    OR:1700,MN:1400,WI:1200,OH:1100,MI:1100,IN:1100,MO:1100,TN:1300,
    SC:1200,AL:1100,MS:1000,AR:1000,OK:1000,KS:1100,NE:1100,IA:1100,
    ND:1100,SD:1100,MT:1200,WY:1100,ID:1300,UT:1600,NM:1100,KY:1100,
    WV:900,ME:1300,VT:1400,NH:1600,RI:1700,CT:1900,DE:1500,HI:2500,AK:1700,LA:1200,
  };

  const rentEst = STATE_RENT[userState] || 1300;
  const incomeNum = parseFloat(income) || 0;
  const remaining = incomeNum - rentEst;

  const L = {
    fr: {
      title:"Budget & Magasins",
      sub:"Guide des magasins + calculateur de budget mensuel",
      incomeLabel:"Mon salaire mensuel net (USD)",
      incomePh:"ex: 3500",
      saveBtn:"Calculer",
      savedBtn:"✅ Calculé !",
      budgetTitle:"Répartition recommandée",
      rentLabel:"Loyer estimé",
      foodLabel:"Nourriture",
      transLabel:"Transport",
      phoneLabel:"Téléphone",
      otherLabel:"Divers",
      savedLabel:"Épargne",
      storeTitle:"Où faire ses courses",
      storeNote:"Guide des magasins pour immigrants",
      budgetNote:"Estimation basée sur les prix moyens",
      noState:"Enregistre ton état pour voir les prix locaux",
    },
    en: {
      title:"Budget & Stores",
      sub:"Store guide + monthly budget calculator",
      incomeLabel:"My monthly net salary (USD)",
      incomePh:"e.g. 3500",
      saveBtn:"Calculate",
      savedBtn:"✅ Calculated!",
      budgetTitle:"Recommended breakdown",
      rentLabel:"Estimated rent",
      foodLabel:"Food",
      transLabel:"Transport",
      phoneLabel:"Phone",
      otherLabel:"Misc",
      savedLabel:"Savings",
      storeTitle:"Where to shop",
      storeNote:"Store guide for immigrants",
      budgetNote:"Estimate based on average prices",
      noState:"Set your state to see local prices",
    },
    es: {
      title:"Presupuesto y Tiendas",
      sub:"Guía de tiendas + calculadora de presupuesto mensual",
      incomeLabel:"Mi salario mensual neto (USD)",
      incomePh:"ej: 3500",
      saveBtn:"Calcular",
      savedBtn:"✅ ¡Calculado!",
      budgetTitle:"Distribución recomendada",
      rentLabel:"Alquiler estimado",
      foodLabel:"Comida",
      transLabel:"Transporte",
      phoneLabel:"Teléfono",
      otherLabel:"Varios",
      savedLabel:"Ahorros",
      storeTitle:"Dónde hacer las compras",
      storeNote:"Guía de tiendas para inmigrantes",
      budgetNote:"Estimación basada en precios promedio",
      noState:"Registra tu estado para ver precios locales",
    },
  }[lang];

  const STORES = [
    {
      name:"Walmart",
      icon:"🛒",
      color:"#1D72A3",
      tag:lang==="fr"?"Meilleur rapport qualité/prix":lang==="es"?"Mejor relación calidad/precio":"Best value for money",
      desc:lang==="fr"?"Tout en un : alimentation, vêtements, électronique, médicaments. Prix très bas. Ouvert 24h dans beaucoup d'endroits.":lang==="es"?"Todo en uno: alimentación, ropa, electrónica, medicamentos. Precios muy bajos. Abierto 24h en muchos lugares.":"All-in-one: food, clothes, electronics, medicine. Very low prices. Open 24h in many locations.",
      tips:lang==="fr"?"• App Walmart pour scanner les prix\n• Walmart+ = livraison illimitée ($98/an)\n• Sections 'Clearance' pour les bonnes affaires":lang==="es"?"• App Walmart para escanear precios\n• Walmart+ = entrega ilimitada ($98/año)\n• Secciones 'Clearance' para las mejores ofertas":"• Walmart app to scan prices\n• Walmart+ = unlimited delivery ($98/yr)\n• 'Clearance' sections for great deals",
      rating:"⭐⭐⭐⭐⭐",
      price:"$",
    },
    {
      name:"Aldi",
      icon:"🥦",
      color:"#FF6600",
      tag:lang==="fr"?"Le moins cher pour la nourriture":lang==="es"?"El más barato para comida":"Cheapest for food",
      desc:lang==="fr"?"Épicerie discount allemande. Prix 30-50% moins cher que les supermarchés normaux. Qualité surprenante.":lang==="es"?"Supermercado de descuento alemán. Precios 30-50% más baratos que los supermercados normales. Calidad sorprendente.":"German discount grocery. Prices 30-50% cheaper than regular supermarkets. Surprisingly good quality.",
      tips:lang==="fr"?"• Apporter des sacs (pas fournis)\n• Amener une pièce de $0.25 pour le caddie\n• Les produits changent chaque semaine ('ALDI Finds')":lang==="es"?"• Llevar bolsas (no se proporcionan)\n• Traer moneda de $0.25 para el carrito\n• Los productos cambian cada semana ('ALDI Finds')":"• Bring your own bags (not provided)\n• Bring a $0.25 coin for the cart\n• Products change weekly ('ALDI Finds')",
      rating:"⭐⭐⭐⭐⭐",
      price:"$",
    },
    {
      name:"Dollar Tree / Dollar General",
      icon:"💚",
      color:"#22c55e",
      tag:lang==="fr"?"Tout à $1.25 ou presque":lang==="es"?"Todo a $1.25 o casi":"Everything $1.25 or close",
      desc:lang==="fr"?"Parfait pour : produits ménagers, hygiène, cuisine basique, papeterie, emballages cadeaux. Certains produits sont de très bonne qualité.":lang==="es"?"Perfecto para: productos del hogar, higiene, cocina básica, papelería, papel de regalo. Algunos productos son de muy buena calidad.":"Perfect for: household products, hygiene, basic kitchen, stationery, gift wrap. Some products are very good quality.",
      tips:lang==="fr"?"• Dollar Tree : tout à $1.25\n• Dollar General : prix variés mais très bas\n• Idéal pour : tampons, papier, produits nettoyants":lang==="es"?"• Dollar Tree: todo a $1.25\n• Dollar General: precios variados pero muy bajos\n• Ideal para: tampones, papel, productos de limpieza":"• Dollar Tree: everything $1.25\n• Dollar General: varied but very low prices\n• Great for: tampons, paper, cleaning products",
      rating:"⭐⭐⭐⭐",
      price:"$",
    },
    {
      name:"Target",
      icon:"🎯",
      color:"#CC0000",
      tag:lang==="fr"?"Qualité + style à prix correct":lang==="es"?"Calidad + estilo a precio correcto":"Quality + style at fair price",
      desc:lang==="fr"?"Plus cher que Walmart mais meilleure qualité et design. Excellent pour vêtements (marque propre), déco maison, électronique.":lang==="es"?"Más caro que Walmart pero mejor calidad y diseño. Excelente para ropa (marca propia), decoración del hogar, electrónica.":"Pricier than Walmart but better quality and design. Excellent for clothing (own brand), home decor, electronics.",
      tips:lang==="fr"?"• App Target : coupons et Circle Rewards\n• RedCard = 5% de réduction sur tout\n• Drive Up = commande prête en 2h":lang==="es"?"• App Target: cupones y Circle Rewards\n• RedCard = 5% de descuento en todo\n• Drive Up = pedido listo en 2h":"• Target app: coupons and Circle Rewards\n• RedCard = 5% off everything\n• Drive Up = order ready in 2h",
      rating:"⭐⭐⭐⭐",
      price:"$$",
    },
    {
      name:"Costco",
      icon:"📦",
      color:"#005DAA",
      tag:lang==="fr"?"Achats en gros — économies max":lang==="es"?"Compras al por mayor — máximo ahorro":"Bulk buying — maximum savings",
      desc:lang==="fr"?"Idéal pour familles ou colocs. Adhésion requise ($65/an). Économies énormes sur : viande, produits ménagers, essence.":lang==="es"?"Ideal para familias o compañeros de piso. Membresía requerida ($65/año). Grandes ahorros en: carne, productos del hogar, gasolina.":"Great for families or roommates. Membership required ($65/yr). Huge savings on: meat, household products, gas.",
      tips:lang==="fr"?"• Adhésion : $65/an (Executive $130 = cashback)\n• Essence Costco = souvent la moins chère\n• Pharmacie Costco ouverte sans adhésion":lang==="es"?"• Membresía: $65/año (Executive $130 = cashback)\n• Gasolina Costco = a menudo la más barata\n• Farmacia Costco abierta sin membresía":"• Membership: $65/yr (Executive $130 = cashback)\n• Costco gas = often cheapest around\n• Costco pharmacy open without membership",
      rating:"⭐⭐⭐⭐⭐",
      price:"$$$",
    },
    {
      name:"CVS / Walgreens",
      icon:"💊",
      color:"#CC0000",
      tag:lang==="fr"?"Pharmacie + urgences":lang==="es"?"Farmacia + urgencias":"Pharmacy + emergencies",
      desc:lang==="fr"?"Pharmacie + produits du quotidien. Ouvert tard ou 24h. Essentiel pour médicaments sans ordonnance, soins de santé basiques.":lang==="es"?"Farmacia + productos del día a día. Abierto tarde o 24h. Esencial para medicamentos sin receta, cuidados de salud básicos.":"Pharmacy + daily products. Open late or 24h. Essential for OTC medicine, basic healthcare.",
      tips:lang==="fr"?"• ExtraCare Card = remises immédiates\n• Pharmacie : donne ton assurance\n• MinuteClinic pour soins sans rendez-vous":lang==="es"?"• ExtraCare Card = descuentos inmediatos\n• Farmacia: da tu seguro médico\n• MinuteClinic para atención sin cita":"• ExtraCare Card = instant discounts\n• Pharmacy: give your insurance\n• MinuteClinic for walk-in care",
      rating:"⭐⭐⭐",
      price:"$$",
    },
  ];

  // Budget breakdown
  const food = Math.round(incomeNum * 0.15);
  const transport = Math.round(incomeNum * 0.12);
  const phone = 45;
  const other = Math.round(incomeNum * 0.08);
  const totalExpenses = rentEst + food + transport + phone + other;
  const savings = incomeNum - totalExpenses;
  const savingsColor = savings >= 0 ? "#22c55e" : "#ef4444";

  const handleSave = () => {
    localStorage.setItem("kuabo_budget", JSON.stringify({ income }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const [expandedStore, setExpandedStore] = useState<string|null>(null);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:11,color:"#e8b84b",fontWeight:700,letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:4 }}>
          💰 {L.title}
        </div>
        <div style={{ fontSize:12,color:"#aaa" }}>{L.sub}</div>
      </div>

      {/* ── CALCULATEUR BUDGET ── */}
      <div style={{ background:"linear-gradient(135deg,#141d2e,#0f1521)",border:"1px solid rgba(232,184,75,.25)",borderRadius:16,padding:"16px",marginBottom:16 }}>
        <div style={{ fontSize:13,fontWeight:700,color:"#e8b84b",marginBottom:12 }}>
          🧮 {lang==="fr"?"Mon budget mensuel":lang==="es"?"Mi presupuesto mensual":"My monthly budget"}
        </div>

        {/* Salaire input */}
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11,color:"#aaa",marginBottom:6 }}>{L.incomeLabel}</div>
          <div style={{ display:"flex",gap:8 }}>
            <input
              type="number" placeholder={L.incomePh} value={income}
              onChange={e=>setIncome(e.target.value)}
              style={{ flex:1,padding:"12px 14px",background:"#0f1521",border:"1px solid #e8b84b",borderRadius:11,color:"#f4f1ec",fontSize:16,fontFamily:"inherit",outline:"none" }}
            />
            <button onClick={handleSave} style={{ padding:"12px 16px",background:"#e8b84b",border:"none",borderRadius:11,color:"#000",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap" as const }}>
              {saved ? L.savedBtn : L.saveBtn}
            </button>
          </div>
        </div>

        {/* Résultat budget */}
        {incomeNum > 0 && (
          <>
            <div style={{ fontSize:11,color:"#555",letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:10 }}>
              {L.budgetTitle} {stateName ? `— ${stateName}` : ""}
            </div>

            {/* Loyer */}
            <div style={{ display:"flex",flexDirection:"column" as const,gap:8,marginBottom:12 }}>
              {[
                { label:L.rentLabel, amount:rentEst, color:"#ef4444", pct:Math.round((rentEst/incomeNum)*100), icon:"🏠" },
                { label:L.foodLabel, amount:food, color:"#f97316", pct:Math.round((food/incomeNum)*100), icon:"🛒" },
                { label:L.transLabel, amount:transport, color:"#e8b84b", pct:Math.round((transport/incomeNum)*100), icon:"🚗" },
                { label:L.phoneLabel, amount:phone, color:"#2dd4bf", pct:Math.round((phone/incomeNum)*100), icon:"📱" },
                { label:L.otherLabel, amount:other, color:"#a78bfa", pct:Math.round((other/incomeNum)*100), icon:"💳" },
              ].map((item,i)=>(
                <div key={i}>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                      <span style={{ fontSize:14 }}>{item.icon}</span>
                      <span style={{ fontSize:12,color:"#aaa" }}>{item.label}</span>
                    </div>
                    <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                      <span style={{ fontSize:11,color:"#555" }}>{item.pct}%</span>
                      <span style={{ fontSize:13,fontWeight:700,color:item.color }}>${item.amount.toLocaleString()}</span>
                    </div>
                  </div>
                  <div style={{ height:4,background:"#1e2a3a",borderRadius:4,overflow:"hidden" }}>
                    <div style={{ height:"100%",width:`${Math.min(item.pct,100)}%`,background:item.color,borderRadius:4,transition:"width 0.6s ease" }}/>
                  </div>
                </div>
              ))}
            </div>

            {/* Épargne */}
            <div style={{ borderTop:"1px solid #1e2a3a",paddingTop:12,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <div style={{ fontSize:13,color:"#aaa" }}>💰 {L.savedLabel}</div>
              <div style={{ fontSize:20,fontWeight:900,color:savingsColor }}>
                {savings >= 0 ? "+" : ""}{savings.toLocaleString()}$
              </div>
            </div>

            {savings < 0 && (
              <div style={{ marginTop:10,padding:"10px 12px",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:10,fontSize:12,color:"#ef4444",lineHeight:1.6 }}>
                ⚠️ {lang==="fr"?"Ton salaire ne couvre pas les dépenses estimées. Essaie de trouver une colocation.":lang==="es"?"Tu salario no cubre los gastos estimados. Intenta encontrar un compañero de piso.":"Your salary doesn't cover estimated expenses. Try finding a roommate."}
              </div>
            )}

            <div style={{ marginTop:8,fontSize:11,color:"#555",fontStyle:"italic" }}>{L.budgetNote}</div>
          </>
        )}
      </div>

      {/* ── GUIDE MAGASINS ── */}
      <div style={{ fontSize:11,color:"#555",letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:12,fontWeight:600 }}>
        🛍️ {L.storeTitle}
      </div>
      <div style={{ fontSize:12,color:"#aaa",marginBottom:12 }}>{L.storeNote}</div>

      <div style={{ display:"flex",flexDirection:"column" as const,gap:10 }}>
        {STORES.map(store=>{
          const isExpanded = expandedStore === store.name;
          return (
            <div key={store.name} style={{ background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:14,overflow:"hidden" }}>
              {/* Header store */}
              <div onClick={()=>setExpandedStore(isExpanded?null:store.name)}
                style={{ padding:"14px",display:"flex",alignItems:"center",gap:12,cursor:"pointer" }}>
                <div style={{ width:46,height:46,borderRadius:12,background:`${store.color}15`,border:`1px solid ${store.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0 }}>
                  {store.icon}
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:2 }}>
                    <div style={{ fontSize:14,fontWeight:700,color:"#f4f1ec" }}>{store.name}</div>
                    <div style={{ fontSize:11,color:store.color,fontWeight:600,background:`${store.color}15`,padding:"2px 8px",borderRadius:8 }}>{store.price}</div>
                  </div>
                  <div style={{ fontSize:11,color:"#aaa" }}>{store.tag}</div>
                  <div style={{ fontSize:11,color:"#555",marginTop:2 }}>{store.rating}</div>
                </div>
                <div style={{ fontSize:16,color:"#555",transition:"transform 0.2s",transform:isExpanded?"rotate(90deg)":"rotate(0deg)" }}>›</div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{ padding:"0 14px 14px",borderTop:"1px solid #1e2a3a" }}>
                  <div style={{ paddingTop:12,fontSize:13,color:"#aaa",lineHeight:1.7,marginBottom:12 }}>
                    {store.desc}
                  </div>
                  <div style={{ background:"rgba(232,184,75,.05)",border:"1px solid rgba(232,184,75,.15)",borderRadius:10,padding:"12px 14px" }}>
                    <div style={{ fontSize:10,color:"#e8b84b",fontWeight:700,letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:8 }}>
                      💡 {lang==="fr"?"Astuces":lang==="es"?"Consejos":"Tips"}
                    </div>
                    {store.tips.split("\n").map((tip,i)=>(
                      <div key={i} style={{ fontSize:12,color:"#f4f1ec",lineHeight:1.7 }}>{tip}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── APPS UTILES ── */}
      <div style={{ marginTop:16,fontSize:11,color:"#555",letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:10,fontWeight:600 }}>
        📱 {lang==="fr"?"Apps pour économiser":lang==="es"?"Apps para ahorrar":"Apps to save money"}
      </div>
      <div style={{ display:"flex",flexDirection:"column" as const,gap:8 }}>
        {[
          { icon:"🍃", name:"Ibotta", desc:lang==="fr"?"Cashback sur les courses (+$5 offerts)":lang==="es"?"Cashback en compras (+$5 de regalo)":"Grocery cashback (+$5 bonus)" },
          { icon:"✂️", name:"Flipp", desc:lang==="fr"?"Comparer les promos de tous les magasins":lang==="es"?"Comparar ofertas de todas las tiendas":"Compare all store sales flyers" },
          { icon:"🟡", name:"Honey (PayPal)", desc:lang==="fr"?"Codes promo automatiques en ligne":lang==="es"?"Códigos de descuento automáticos online":"Auto promo codes online" },
          { icon:"📊", name:"Mint / YNAB", desc:lang==="fr"?"Suivre ton budget facilement":lang==="es"?"Seguir tu presupuesto fácilmente":"Track your budget easily" },
          { icon:"🛒", name:"Instacart", desc:lang==="fr"?"Livraison de courses à domicile":lang==="es"?"Entrega de compras a domicilio":"Grocery delivery home" },
        ].map((app,i)=>(
          <div key={i} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12 }}>
            <span style={{ fontSize:22,flexShrink:0 }}>{app.icon}</span>
            <div>
              <div style={{ fontSize:13,fontWeight:600,color:"#f4f1ec",marginBottom:2 }}>{app.name}</div>
              <div style={{ fontSize:11,color:"#aaa" }}>{app.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// MODE "PAS ENCORE ARRIVÉ"
// ══════════════════════════════════════════════
function PreArrivalExplorer({ lang, targetState }: { lang:Lang; targetState:string }) {
  const stateName = US_STATE_COORDS[targetState]?.name || targetState || "USA";
  const T = {
    fr: { title:"Prépare ton arrivée", sub:`Tu n'es pas encore aux USA. Voici ce qu'il faut savoir avant d'arriver${stateName?" à "+stateName:""}. 🌍`, mapNote:"La carte des services sera disponible dès ton arrivée.", guides:[
      { icon:"🪪",title:"Le SSN — c'est quoi ?",desc:"Le Social Security Number est ton identifiant américain. Tu peux le demander 10 jours après ton arrivée.",urgent:true },
      { icon:"📱",title:"Carte SIM dès l'aéroport",desc:"T-Mobile ou Mint Mobile. Pas besoin de SSN. Entre $30 et $50/mois.",urgent:true },
      { icon:"🏦",title:"Ouvrir un compte bancaire",desc:"Chase ou Bank of America acceptent juste ton passeport. Fais-le dans les 2 premières semaines.",urgent:false },
      { icon:"💳",title:"Ta Green Card arrive par courrier",desc:"USCIS t'envoie ta carte physique en 2-3 semaines. Pas besoin de faire quoi que ce soit.",urgent:false },
      { icon:"🏠",title:"Trouver un logement",desc:"Zillow, Apartments.com, Facebook Marketplace. Budget moyen : $1200-2000/mois selon l'état.",urgent:false },
      { icon:"🚗",title:"Permis de conduire",desc:"Passe d'abord l'examen théorique sur le site du DMV de ton état. Ensuite le pratique.",urgent:false },
    ]},
    en: { title:"Prepare your arrival", sub:`You haven't arrived in the USA yet. Here's what you need to know before arriving${stateName?" in "+stateName:""}. 🌍`, mapNote:"The services map will be available once you arrive.", guides:[
      { icon:"🪪",title:"What is the SSN?",desc:"The Social Security Number is your US ID. You can apply 10 days after arrival.",urgent:true },
      { icon:"📱",title:"Get a SIM at the airport",desc:"T-Mobile or Mint Mobile. No SSN needed. $30-50/month.",urgent:true },
      { icon:"🏦",title:"Open a bank account",desc:"Chase or Bank of America accept just your passport. Do it in the first 2 weeks.",urgent:false },
      { icon:"💳",title:"Your Green Card arrives by mail",desc:"USCIS sends your physical card in 2-3 weeks. No action needed.",urgent:false },
      { icon:"🏠",title:"Finding housing",desc:"Zillow, Apartments.com, Facebook Marketplace. Average: $1200-2000/month.",urgent:false },
      { icon:"🚗",title:"Driver's license",desc:"First take the written test on your state's DMV website. Then the practical test.",urgent:false },
    ]},
    es: { title:"Prepara tu llegada", sub:`Aún no has llegado a EE.UU. Esto es lo que debes saber antes de llegar${stateName?" a "+stateName:""}. 🌍`, mapNote:"El mapa de servicios estará disponible cuando llegues.", guides:[
      { icon:"🪪",title:"¿Qué es el SSN?",desc:"El Social Security Number es tu identificador americano. Puedes pedirlo 10 días después de llegar.",urgent:true },
      { icon:"📱",title:"Consigue una SIM en el aeropuerto",desc:"T-Mobile o Mint Mobile. Sin SSN. $30-50/mes.",urgent:true },
      { icon:"🏦",title:"Abrir cuenta bancaria",desc:"Chase o Bank of America aceptan solo tu pasaporte. Hazlo en las primeras 2 semanas.",urgent:false },
      { icon:"💳",title:"Tu Green Card llega por correo",desc:"USCIS te envía la tarjeta física en 2-3 semanas. No necesitas hacer nada.",urgent:false },
      { icon:"🏠",title:"Encontrar vivienda",desc:"Zillow, Apartments.com, Facebook Marketplace. Media: $1200-2000/mes.",urgent:false },
      { icon:"🚗",title:"Licencia de conducir",desc:"Primero el examen teórico en el sitio del DMV de tu estado. Luego el práctico.",urgent:false },
    ]},
  }[lang];
  return (
    <div>
      <div style={{ background:"linear-gradient(135deg,rgba(232,184,75,.08),rgba(232,184,75,.04))",border:"1px solid rgba(232,184,75,.2)",borderRadius:14,padding:"16px",marginBottom:14 }}>
        <div style={{ fontSize:11,color:"#e8b84b",fontWeight:700,letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:6 }}>🌍 {T.title}</div>
        <div style={{ fontSize:13,color:"#f4f1ec",lineHeight:1.7 }}>{T.sub}</div>
      </div>
      <div style={{ borderRadius:14,overflow:"hidden",border:"1px solid #1e2a3a",marginBottom:14 }}>
        <div style={{ height:180,background:"#0a0e17",display:"flex",flexDirection:"column" as const,alignItems:"center",justifyContent:"center",gap:10 }}>
          <span style={{ fontSize:36 }}>🗺️</span>
          <div style={{ fontSize:13,color:"#555",textAlign:"center" as const,lineHeight:1.6,padding:"0 20px" }}>{T.mapNote}</div>
        </div>
      </div>
      <div style={{ fontSize:11,color:"#555",letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:10,fontWeight:600 }}>📚 {lang==="fr"?"Guides essentiels":lang==="es"?"Guías esenciales":"Essential guides"}</div>
      <div style={{ display:"flex",flexDirection:"column" as const,gap:8 }}>
        {T.guides.map((guide,i)=>(
          <div key={i} style={{ background:"#141d2e",border:`1px solid ${guide.urgent?"rgba(232,184,75,.25)":"#1e2a3a"}`,borderRadius:12,padding:"13px 14px",display:"flex",alignItems:"flex-start",gap:12 }}>
            <span style={{ fontSize:22,flexShrink:0,marginTop:2 }}>{guide.icon}</span>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:4 }}>
                <div style={{ fontSize:13,fontWeight:600,color:"#f4f1ec" }}>{guide.title}</div>
                {guide.urgent&&<span style={{ fontSize:9,color:"#e8b84b",fontWeight:700,background:"rgba(232,184,75,.1)",padding:"2px 6px",borderRadius:6 }}>URGENT</span>}
              </div>
              <div style={{ fontSize:12,color:"#aaa",lineHeight:1.6 }}>{guide.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// DOCUMENTS SECTION
// ══════════════════════════════════════════════
function DocumentsSection({ lang, completedSteps }: { lang:Lang; completedSteps:string[] }) {
  const [activeDoc, setActiveDoc] = useState<string|null>(null);
  const [lostModal, setLostModal] = useState<string|null>(null);
  const [conservation, setConservation] = useState<Record<string,boolean>>(()=>{ try{ return JSON.parse(localStorage.getItem("doc_conservation")||"{}"); }catch{ return {}; } });
  type DocItem = { id:string; icon:string; label:string; desc:string; linked:string|null; alwaysOk:boolean; guideId:string|null; info:string; lostSteps:string[]; };
  const docs: Record<Lang,DocItem[]> = {
    fr:[
      { id:"passport",icon:"🛂",label:"Passeport",desc:"Document d'identité international",linked:null,alwaysOk:true,guideId:null,info:"Ton passeport est valide 6 mois minimum. Garde-le toujours en lieu sûr.",lostSteps:["Contacte l'ambassade de ton pays aux USA","Prends rendez-vous pour un passeport d'urgence","Apporte 2 photos + preuve de citoyenneté","Délai : 24-72h pour un passeport d'urgence"] },
      { id:"visa",icon:"🟩",label:"Visa immigrant (DV)",desc:"DV Lottery — tampon dans ton passeport",linked:null,alwaysOk:true,guideId:null,info:"Le tampon DV prouve ton entrée légale. Il sert de preuve de statut pendant 1 an.",lostSteps:["Le visa est dans ton passeport","Si passeport perdu → contacte l'ambassade","Contacte USCIS au 1-800-375-5283"] },
      { id:"ssn_card",icon:"🪪",label:"Carte SSN",desc:"Reçue 2 semaines après le bureau SSA",linked:"ssn",alwaysOk:false,guideId:"ssn",info:"Ton SSN est permanent et ne change jamais. Ne le partage qu'avec ton employeur ou ta banque.",lostSteps:["Va sur ssa.gov/ssnumber","Clique sur 'Replace a Social Security Card'","Apporte passeport + Green Card au bureau SSA","Gratuit — 3 remplacements max par an"] },
      { id:"sim",icon:"📱",label:"SIM / Numéro US",desc:"T-Mobile ou Mint Mobile — Jour 1",linked:"phone",alwaysOk:false,guideId:"phone",info:"Ton numéro US est essentiel pour les vérifications bancaires et les employeurs.",lostSteps:["Va dans une boutique T-Mobile ou Mint Mobile","Montre une pièce d'identité","Nouveau SIM : gratuit ou $5-10","Tu gardes le même numéro"] },
      { id:"greencard",icon:"💳",label:"Green Card physique",desc:"Courrier USCIS — 2 à 3 semaines",linked:"greencard",alwaysOk:false,guideId:"greencard",info:"Ta Green Card est valide 10 ans. C'est la preuve officielle de ta résidence permanente.",lostSteps:["Va sur uscis.gov/i90","Remplis le formulaire I-90 en ligne","Paye les frais de remplacement","Délai : 3-6 mois pour la nouvelle carte"] },
      { id:"bank_card",icon:"🏦",label:"Carte bancaire",desc:"Chase ou BofA — passeport seulement",linked:"bank",alwaysOk:false,guideId:"bank",info:"Ta carte bancaire US te permet de payer partout et de recevoir ton salaire.",lostSteps:["Bloque immédiatement via l'app bancaire","Appelle le numéro au dos de ta carte","Nouvelle carte : 3-5 jours par courrier","Vérifie les transactions pour fraude"] },
      { id:"license_c",icon:"🚗",label:"Permis de conduire",desc:"Examen théorique + pratique DMV",linked:"license",alwaysOk:false,guideId:"license",info:"Ton permis US est aussi une pièce d'identité valable. Avec le REAL ID tu peux prendre l'avion.",lostSteps:["Va sur le site du DMV de ton état","Prends rendez-vous pour un remplacement","Apporte passeport + preuve d'adresse","Frais : $20-$40 selon l'état"] },
    ],
    en:[
      { id:"passport",icon:"🛂",label:"Passport",desc:"International ID document",linked:null,alwaysOk:true,guideId:null,info:"Your passport is valid for 6 months minimum. Make a digital copy on Google Drive.",lostSteps:["Contact your country's embassy in the USA","Schedule an emergency passport appointment","Bring 2 photos + proof of citizenship","Delay: 24-72h for emergency passport"] },
      { id:"visa",icon:"🟩",label:"Immigrant Visa (DV)",desc:"DV Lottery — stamp in your passport",linked:null,alwaysOk:true,guideId:null,info:"The DV stamp proves your legal entry. Serves as proof of status for 1 year.",lostSteps:["The visa is in your passport","If passport lost → contact the embassy","Contact USCIS at 1-800-375-5283"] },
      { id:"ssn_card",icon:"🪪",label:"SSN Card",desc:"Received 2 weeks after SSA office",linked:"ssn",alwaysOk:false,guideId:"ssn",info:"Your SSN is permanent and never changes. Only share it with your employer or bank.",lostSteps:["Go to ssa.gov/ssnumber","Click 'Replace a Social Security Card'","Bring passport + Green Card to SSA","Free — max 3 replacements per year"] },
      { id:"sim",icon:"📱",label:"SIM / US Phone",desc:"T-Mobile or Mint Mobile — Day 1",linked:"phone",alwaysOk:false,guideId:"phone",info:"Your US number is essential for bank verifications and employers.",lostSteps:["Go to T-Mobile or Mint Mobile store","Show an ID","New SIM: free or $5-10","You keep the same number"] },
      { id:"greencard",icon:"💳",label:"Physical Green Card",desc:"USCIS mail — 2 to 3 weeks",linked:"greencard",alwaysOk:false,guideId:"greencard",info:"Your Green Card is valid for 10 years. Official proof of permanent residency.",lostSteps:["Go to uscis.gov/i90","Fill out Form I-90 online","Pay the replacement fee","Delay: 3-6 months for new card"] },
      { id:"bank_card",icon:"🏦",label:"Bank Card",desc:"Chase or BofA — passport only",linked:"bank",alwaysOk:false,guideId:"bank",info:"Your US bank card lets you pay everywhere and receive your salary.",lostSteps:["Immediately block via banking app","Call number on back of card","New card: 3-5 days by mail","Check recent transactions for fraud"] },
      { id:"license_c",icon:"🚗",label:"Driver's License",desc:"Written + practical DMV test",linked:"license",alwaysOk:false,guideId:"license",info:"Your US license is valid ID. With REAL ID you can fly domestically without a passport.",lostSteps:["Go to your state's DMV website","Schedule a replacement appointment","Bring passport + proof of address","Fee: $20-$40 depending on state"] },
    ],
    es:[
      { id:"passport",icon:"🛂",label:"Pasaporte",desc:"Documento de identidad internacional",linked:null,alwaysOk:true,guideId:null,info:"Tu pasaporte es válido por 6 meses mínimo. Haz una copia digital en Google Drive.",lostSteps:["Contacta la embajada de tu país en EE.UU.","Programa cita para pasaporte de emergencia","Lleva 2 fotos + prueba de ciudadanía","Plazo: 24-72h para pasaporte de emergencia"] },
      { id:"visa",icon:"🟩",label:"Visa inmigrante (DV)",desc:"DV Lottery — sello en tu pasaporte",linked:null,alwaysOk:true,guideId:null,info:"El sello DV prueba tu entrada legal. Sirve como prueba de estatus durante 1 año.",lostSteps:["La visa está en tu pasaporte","Si pierdes el pasaporte → contacta la embajada","Contacta USCIS al 1-800-375-5283"] },
      { id:"ssn_card",icon:"🪪",label:"Tarjeta SSN",desc:"Recibida 2 semanas después SSA",linked:"ssn",alwaysOk:false,guideId:"ssn",info:"Tu SSN es permanente y nunca cambia. Solo compártelo con tu empleador o banco.",lostSteps:["Ve a ssa.gov/ssnumber","Haz clic en 'Replace a Social Security Card'","Lleva pasaporte + Green Card a SSA","Gratis — máximo 3 reemplazos por año"] },
      { id:"sim",icon:"📱",label:"SIM / Número US",desc:"T-Mobile o Mint Mobile — Día 1",linked:"phone",alwaysOk:false,guideId:"phone",info:"Tu número de EE.UU. es esencial para verificaciones bancarias y empleadores.",lostSteps:["Ve a tienda T-Mobile o Mint Mobile","Muestra una identificación","Nuevo SIM: gratis o $5-10","Conservas el mismo número"] },
      { id:"greencard",icon:"💳",label:"Green Card física",desc:"Correo USCIS — 2 a 3 semanas",linked:"greencard",alwaysOk:false,guideId:"greencard",info:"Tu Green Card es válida por 10 años. Prueba oficial de tu residencia permanente.",lostSteps:["Ve a uscis.gov/i90","Completa el Formulario I-90 en línea","Paga la tarifa de reemplazo","Plazo: 3-6 meses para la nueva tarjeta"] },
      { id:"bank_card",icon:"🏦",label:"Tarjeta bancaria",desc:"Chase o BofA — solo pasaporte",linked:"bank",alwaysOk:false,guideId:"bank",info:"Tu tarjeta bancaria de EE.UU. te permite pagar en todas partes y recibir tu salario.",lostSteps:["Bloquea inmediatamente a través de la app","Llama al número al dorso de tu tarjeta","Nueva tarjeta: 3-5 días por correo","Verifica transacciones recientes por fraude"] },
      { id:"license_c",icon:"🚗",label:"Licencia de conducir",desc:"Examen teórico + práctico DMV",linked:"license",alwaysOk:false,guideId:"license",info:"Tu licencia de EE.UU. también es identificación válida. Con REAL ID puedes volar sin pasaporte.",lostSteps:["Ve al sitio web del DMV de tu estado","Programa cita de reemplazo","Lleva pasaporte + prueba de domicilio","Tarifa: $20-$40 según el estado"] },
    ],
  };
  const CONS: Record<Lang,{ id:string; label:string }[]> = {
    fr:[{ id:"originals",label:"Originaux dans un endroit sûr (pas le portefeuille)" },{ id:"google_drive",label:"Copies numériques sur Google Drive ou iCloud" },{ id:"family_copy",label:"Copies physiques chez un proche de confiance" },{ id:"ssn_memorize",label:"SSN mémorisé — carte rangée en lieu sûr" },{ id:"gc_safe",label:"Green Card rangée — pas dans le portefeuille" }],
    en:[{ id:"originals",label:"Originals in a safe place (not your wallet)" },{ id:"google_drive",label:"Digital copies on Google Drive or iCloud" },{ id:"family_copy",label:"Physical copies with a trusted person" },{ id:"ssn_memorize",label:"SSN memorized — card stored safely" },{ id:"gc_safe",label:"Green Card stored safely — not in wallet" }],
    es:[{ id:"originals",label:"Originales en un lugar seguro (no la billetera)" },{ id:"google_drive",label:"Copias digitales en Google Drive o iCloud" },{ id:"family_copy",label:"Copias físicas con una persona de confianza" },{ id:"ssn_memorize",label:"SSN memorizado — tarjeta guardada en lugar seguro" },{ id:"gc_safe",label:"Green Card guardada — no en la billetera" }],
  };
  const L = { fr:{title:"Mes Documents",sub:"Coche ce que tu as — on t'aide pour le reste",ok:"OK",pending:"En attente",missing:"Manquant",score:"Score documentaire",infoTitle:"À savoir",lostTitle:"Si tu perds ce document",lostBtn:"J'ai perdu ce document",guideBtn:"Voir le guide →",explorerBtn:"Trouver un bureau",conservTitle:"📦 Check-list de conservation",conservSub:"Coche pour confirmer que tu as bien rangé tes documents"},en:{title:"My Documents",sub:"Check what you have — we'll help with the rest",ok:"OK",pending:"Pending",missing:"Missing",score:"Document score",infoTitle:"Good to know",lostTitle:"If you lose this document",lostBtn:"I lost this document",guideBtn:"View guide →",explorerBtn:"Find an office",conservTitle:"📦 Storage checklist",conservSub:"Check to confirm you've safely stored your documents"},es:{title:"Mis Documentos",sub:"Marca lo que tienes — te ayudamos con el resto",ok:"OK",pending:"Pendiente",missing:"Faltante",score:"Puntuación docs",infoTitle:"Bueno saber",lostTitle:"Si pierdes este documento",lostBtn:"Perdí este documento",guideBtn:"Ver guía →",explorerBtn:"Encontrar oficina",conservTitle:"📦 Lista de conservación",conservSub:"Marca para confirmar que guardaste bien tus documentos"} }[lang];
  const list=docs[lang];
  const getStatus=(d:DocItem)=>{ if(d.alwaysOk)return "ok"; if(d.linked&&completedSteps.includes(d.linked))return "ok"; if(d.linked)return "pending"; return "missing"; };
  const sColor={ ok:"#22c55e",pending:"#e8b84b",missing:"#ef4444" };
  const sBg={ ok:"rgba(34,197,94,0.07)",pending:"rgba(232,184,75,0.07)",missing:"rgba(239,68,68,0.05)" };
  const sBorder={ ok:"rgba(34,197,94,0.18)",pending:"rgba(232,184,75,0.18)",missing:"rgba(239,68,68,0.15)" };
  const counts={ ok:0,pending:0,missing:0 };
  list.forEach(d=>{ counts[getStatus(d) as keyof typeof counts]++; });
  const docScore=Math.round((counts.ok/list.length)*100);
  const selDoc=list.find(d=>d.id===activeDoc);
  const lostDoc=list.find(d=>d.id===lostModal);
  const EXP: Record<string,string>={ ssn_card:"ssn",greencard:"uscis",bank_card:"bank",license_c:"dmv",sim:"",passport:"",visa:"" };
  const toggleCons=(id:string)=>{ const u={...conservation,[id]:!conservation[id]}; setConservation(u); localStorage.setItem("doc_conservation",JSON.stringify(u)); };
  return (
    <div>
      {activeDoc&&selDoc&&(<div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)",padding:"0 16px" }} onClick={()=>setActiveDoc(null)}><div style={{ background:"#0f1521",border:"1px solid #1e2a3a",borderRadius:20,padding:"24px 18px",width:"100%",maxWidth:480,maxHeight:"85vh",overflowY:"auto",animation:"alertPop 0.3s cubic-bezier(.34,1.56,.64,1)" }} onClick={e=>e.stopPropagation()}><div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:16 }}><span style={{ fontSize:28 }}>{selDoc.icon}</span><div><div style={{ fontSize:16,fontWeight:700,color:"#f4f1ec" }}>{selDoc.label}</div><div style={{ fontSize:12,color:"#aaa" }}>{selDoc.desc}</div></div></div><div style={{ background:"rgba(232,184,75,0.05)",border:"1px solid rgba(232,184,75,0.18)",borderRadius:12,padding:"13px 15px",marginBottom:16 }}><div style={{ fontSize:10,color:"#e8b84b",fontWeight:700,letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:6 }}>💡 {L.infoTitle}</div><div style={{ fontSize:13,color:"#f4f1ec",lineHeight:1.7 }}>{selDoc.info}</div></div><div style={{ display:"flex",flexDirection:"column" as const,gap:8 }}>{selDoc.guideId&&<button onClick={()=>{ setActiveDoc(null); window.location.href=`/guide/${selDoc.guideId}`; }} style={{ width:"100%",padding:"13px",background:"#e8b84b",color:"#000",border:"none",borderRadius:12,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit" }}>{L.guideBtn}</button>}{EXP[selDoc.id]&&<button onClick={()=>{ setActiveDoc(null); window.location.href=`/near/${EXP[selDoc.id]}`; }} style={{ width:"100%",padding:"12px",background:"rgba(45,212,191,0.1)",border:"1px solid rgba(45,212,191,0.3)",borderRadius:12,color:"#2dd4bf",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>🗺️ {L.explorerBtn}</button>}<button onClick={()=>{ setActiveDoc(null); setLostModal(selDoc.id); }} style={{ width:"100%",padding:"12px",background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.22)",borderRadius:12,color:"#ef4444",fontSize:14,cursor:"pointer",fontFamily:"inherit" }}>🆘 {L.lostBtn}</button></div></div></div>)}
      {lostModal&&lostDoc&&(<div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)",padding:"0 16px" }} onClick={()=>setLostModal(null)}><div style={{ background:"#0f1521",border:"1px solid #1e2a3a",borderRadius:20,padding:"24px 18px",width:"100%",maxWidth:480,maxHeight:"85vh",overflowY:"auto",animation:"alertPop 0.3s cubic-bezier(.34,1.56,.64,1)" }} onClick={e=>e.stopPropagation()}><div style={{ fontSize:16,fontWeight:700,color:"#ef4444",marginBottom:4 }}>🆘 {L.lostTitle}</div><div style={{ fontSize:14,color:"#f4f1ec",marginBottom:16 }}>{lostDoc.label}</div><div style={{ display:"flex",flexDirection:"column" as const,gap:8 }}>{lostDoc.lostSteps.map((step,i)=>(<div key={i} style={{ display:"flex",alignItems:"flex-start",gap:12,padding:"12px 14px",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:11 }}><div style={{ width:24,height:24,borderRadius:"50%",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#ef4444",flexShrink:0 }}>{i+1}</div><span style={{ fontSize:13,color:"#f4f1ec",lineHeight:1.6 }}>{step}</span></div>))}</div><button onClick={()=>setLostModal(null)} style={{ width:"100%",marginTop:16,padding:"13px",background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12,color:"#aaa",fontSize:14,cursor:"pointer",fontFamily:"inherit" }}>{lang==="fr"?"Fermer":lang==="es"?"Cerrar":"Close"}</button></div></div>)}
      <div style={{ fontSize:11,color:"#555",letterSpacing:".1em",textTransform:"uppercase" as const,marginBottom:12,fontWeight:600 }}>📄 {L.title}</div>
      <div style={{ fontSize:12,color:"#aaa",marginBottom:14 }}>{L.sub}</div>
      <div style={{ background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12,padding:"14px 16px",marginBottom:14 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}><div style={{ fontSize:12,color:"#aaa" }}>{L.score}</div><div style={{ fontSize:20,fontWeight:800,color:docScore>=80?"#22c55e":docScore>=50?"#e8b84b":"#ef4444" }}>{docScore}%</div></div>
        <div style={{ height:4,background:"#1e2a3a",borderRadius:4,overflow:"hidden" }}><div style={{ height:"100%",width:docScore+"%",background:docScore>=80?"linear-gradient(to right,#22c55e,#2dd4bf)":docScore>=50?"linear-gradient(to right,#e8b84b,#f97316)":"linear-gradient(to right,#ef4444,#f97316)",borderRadius:4,transition:"width 0.8s ease" }}/></div>
        <div style={{ display:"flex",gap:8,marginTop:10 }}>{([["ok",L.ok,"#22c55e"],["pending",L.pending,"#e8b84b"],["missing",L.missing,"#ef4444"]] as const).map(([key,lbl,color])=>(<div key={key} style={{ flex:1,background:sBg[key as keyof typeof sBg],border:"1px solid "+sBorder[key as keyof typeof sBorder],borderRadius:9,padding:"7px 4px",textAlign:"center" as const }}><div style={{ fontSize:18,fontWeight:700,color }}>{counts[key as keyof typeof counts]}</div><div style={{ fontSize:9,color:"#aaa",marginTop:2 }}>{lbl}</div></div>))}</div>
      </div>
      <div style={{ display:"flex",flexDirection:"column" as const,gap:8,marginBottom:18 }}>{list.map(d=>{ const s=getStatus(d); return (<div key={d.id} onClick={()=>setActiveDoc(d.id)} style={{ background:"#141d2e",border:"1px solid "+sBorder[s as keyof typeof sBorder],borderRadius:12,padding:"13px",display:"flex",alignItems:"center",gap:12,cursor:"pointer" }}><div style={{ fontSize:22,flexShrink:0 }}>{d.icon}</div><div style={{ flex:1,minWidth:0 }}><div style={{ fontSize:13,fontWeight:500,color:"#fff",marginBottom:2 }}>{d.label}</div><div style={{ fontSize:11,color:"#aaa" }}>{d.desc}</div></div><div style={{ display:"flex",alignItems:"center",gap:6,flexShrink:0 }}><div style={{ padding:"3px 8px",borderRadius:16,fontSize:9,fontWeight:600,background:sBg[s as keyof typeof sBg],color:sColor[s as keyof typeof sColor],border:"1px solid "+sBorder[s as keyof typeof sBorder],whiteSpace:"nowrap" as const }}>{ ({ ok:L.ok,pending:L.pending,missing:L.missing })[s as keyof typeof sColor] }</div><ChevronRight size={14} color="#555"/></div></div>); })}</div>
      <div style={{ background:"rgba(45,212,191,0.04)",border:"1px solid rgba(45,212,191,0.13)",borderRadius:12,padding:"16px" }}>
        <div style={{ fontSize:14,fontWeight:700,color:"#2dd4bf",marginBottom:4 }}>{L.conservTitle}</div>
        <div style={{ fontSize:12,color:"#aaa",marginBottom:12 }}>{L.conservSub}</div>
        <div style={{ display:"flex",flexDirection:"column" as const,gap:9 }}>{CONS[lang].map(item=>{ const checked=!!conservation[item.id]; return (<div key={item.id} onClick={()=>toggleCons(item.id)} style={{ display:"flex",alignItems:"center",gap:12,cursor:"pointer" }}><div style={{ width:20,height:20,borderRadius:5,border:"2px solid "+(checked?"#2dd4bf":"#2a3448"),background:checked?"#2dd4bf":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.2s" }}>{checked&&<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#0f1521" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div><span style={{ fontSize:12,color:checked?"#aaa":"#f4f1ec",textDecoration:checked?"line-through":"none",lineHeight:1.5 }}>{item.label}</span></div>); })}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// MESSAGES SECTION
// ══════════════════════════════════════════════
function MessagesSection({ lang, userId }: { lang:Lang; userId:string|undefined }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(()=>{
    if(!userId) return;
    const f=async()=>{
      try{
        const snap=await getDocs(collection(db,"users",userId,"messages"));
        const msgs:any[]=[];
        for(const d of snap.docs){
          const data=d.data() as any;
          const adminSnap=await getDoc(doc(db,"admin_messages",d.id)).catch(()=>null);
          if(adminSnap?.exists()){ const adminData=adminSnap.data() as any; msgs.push({ id:d.id,...data,title:adminData["title_"+lang]||adminData.title||"",content:adminData["content_"+lang]||adminData.content||"",type:adminData.type,publishedAt:adminData.publishedAt }); }
        }
        msgs.sort((a,b)=>new Date(b.publishedAt||0).getTime()-new Date(a.publishedAt||0).getTime());
        setMessages(msgs);
      }catch{}
      setLoaded(true);
    };
    f();
  },[userId,lang]);
  const T={ fr:{title:"Messages Kuabo",empty:"Aucun message pour l'instant",new:"Nouveau",seen:"Lu"},en:{title:"Kuabo Messages",empty:"No messages yet",new:"New",seen:"Read"},es:{title:"Mensajes Kuabo",empty:"Sin mensajes por ahora",new:"Nuevo",seen:"Leído"} }[lang];
  return (
    <div>
      <div style={{ fontSize:11,color:"#555",letterSpacing:".1em",textTransform:"uppercase" as const,marginBottom:12,fontWeight:600 }}>📨 {T.title}</div>
      {!loaded&&<div style={{ textAlign:"center" as const,padding:"24px",color:"#555",fontSize:13 }}>...</div>}
      {loaded&&messages.length===0&&<div style={{ textAlign:"center" as const,padding:"32px 20px" }}><div style={{ fontSize:36,marginBottom:12 }}>📭</div><div style={{ fontSize:13,color:"#555" }}>{T.empty}</div></div>}
      <div style={{ display:"flex",flexDirection:"column" as const,gap:8 }}>{messages.map(msg=>{ const isUrgent=msg.type==="urgent"; const color=isUrgent?"#ef4444":"#e8b84b"; return (<div key={msg.id} style={{ background:"#141d2e",border:`1px solid ${color}25`,borderRadius:12,padding:"14px" }}><div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6 }}><div style={{ fontSize:10,color,fontWeight:700,textTransform:"uppercase" as const,letterSpacing:".06em" }}>{isUrgent?"⚠️":"📢"} Kuabo</div><div style={{ fontSize:10,color:"#555" }}>{msg.seen?T.seen:`🔴 ${T.new}`}</div></div><div style={{ fontSize:13,fontWeight:600,color:"#f4f1ec",marginBottom:4 }}>{msg.title}</div>{msg.content&&<div style={{ fontSize:12,color:"#aaa",lineHeight:1.65 }}>{msg.content}</div>}</div>); })}</div>
    </div>
  );
}

// ══════════════════════════════════════════════
// EXPLORER TAB PRINCIPAL
// ══════════════════════════════════════════════
export default function ExplorerTab({ lang, completedSteps, userId, userArrival, userState: propUserState }: {
  lang: Lang; completedSteps?: string[]; userId?: string; userArrival?: string; userState?: string;
}) {
  const [subTab,        setSubTab]        = useState<ExplorerSubTab>("services");
  const [mapMode,       setMapMode]       = useState<MapMode>("gps");
  const [userLocation,  setUserLocation]  = useState<{lat:number;lng:number}|null>(null);
  const [userState,     setUserState]     = useState(propUserState||"");
  const [locating,      setLocating]      = useState(false);
  const [locError,      setLocError]      = useState<string|false>(false);
  const [activeFilter,  setActiveFilter]  = useState<FilterType>("ssn");
  const [commFilter,    setCommFilter]    = useState<CommFilter>("all");
  const [places,        setPlaces]        = useState<Place[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [mapCenter,     setMapCenter]     = useState({lat:38.9,lng:-77.0});
  const [communityUsers,setCommunityUsers]= useState<CommunityUser[]>([]);
  const [newUsersCount, setNewUsersCount] = useState(0);
  const [loadingComm,   setLoadingComm]   = useState(false);
  const [commVisible,   setCommVisible]   = useState(false);
  const [savingToggle,  setSavingToggle]  = useState(false);
  const [mapRef,        setMapRef]        = useState<google.maps.Map|null>(null);

  const isAbroad = userArrival === "abroad";
  const { isLoaded } = useLoadScript({ googleMapsApiKey:process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY||"" });
  const activeColor = MARKER_COLORS[activeFilter];
  const effectiveCenter = mapMode==="usstate"&&userState&&US_STATE_COORDS[userState] ? { lat:US_STATE_COORDS[userState].lat,lng:US_STATE_COORDS[userState].lng } : mapCenter;
  const effectiveZoom = mapMode==="usstate" ? 10 : (userLocation ? 13 : 10);

  useEffect(()=>{
    if(!propUserState) setUserState(localStorage.getItem("userState")||"");
    const load=async()=>{ const user=auth.currentUser; if(!user)return; try{ const snap=await getDoc(doc(db,"users",user.uid)); if(snap.exists())setCommVisible((snap.data() as any)?.communityVisible||false); }catch{} };
    load();
  },[propUserState]);

  const fetchPlaces=useCallback(async(loc:{lat:number;lng:number},type:FilterType)=>{
    setLoadingPlaces(true); setPlaces([]);
    try{ const res=await fetch("/api/places",{ method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({lat:loc.lat,lng:loc.lng,type}) }); const data=await res.json(); setPlaces(data.places||[]); }catch{ setPlaces([]); }
    setLoadingPlaces(false);
  },[]);

  const fetchCommunity=useCallback(async(loc:{lat:number;lng:number},state:string)=>{
    setLoadingComm(true);
    try{
      const user=auth.currentUser; if(!user)return;
      const snap=await getDocs(collection(db,"users")); const users:CommunityUser[]=[]; let newCount=0;
      const oneWeekAgo=new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate()-7);
      snap.forEach(d=>{ const data=d.data() as any; if(d.id===user.uid||!data.communityVisible||!data.location?.lat)return; if(state&&data.location?.state&&data.location.state!==state)return; const dist=getDistanceKm(loc.lat,loc.lng,data.location.lat,data.location.lng); if(dist>50)return; const isNew=data.createdAt?new Date(data.createdAt)>oneWeekAgo:false; if(isNew)newCount++; const anon=anonLocation(data.location.lat,data.location.lng); users.push({ id:d.id,situation:data.reason||"other",arrival:data.arrival||"unknown",lat:anon.lat,lng:anon.lng,isNew }); });
      setCommunityUsers(users); setNewUsersCount(newCount);
    }catch{ setCommunityUsers([]); }
    setLoadingComm(false);
  },[]);

  const saveLocation=useCallback(async(loc:{lat:number;lng:number},state:string,city:string)=>{ const user=auth.currentUser; if(!user)return; try{ await updateDoc(doc(db,"users",user.uid),{ location:{ lat:loc.lat,lng:loc.lng,state,city,updatedAt:new Date().toISOString() } }); }catch{} },[]);

  const geolocate=useCallback(async()=>{
    if(!navigator.geolocation){ setLocError("unavailable"); return; }
    setLocating(true); setLocError(false);
    const tryGeo=(highAccuracy:boolean)=>{
      navigator.geolocation.getCurrentPosition(
        async pos=>{
          const loc={ lat:pos.coords.latitude,lng:pos.coords.longitude };
          setUserLocation(loc); setMapCenter(loc); setLocating(false); setLocError(false); setMapMode("gps");
          fetchPlaces(loc,"ssn");
          try{ const res=await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${loc.lat},${loc.lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`); const data=await res.json(); const comps=data.results?.[0]?.address_components||[]; const state=comps.find((c:any)=>c.types.includes("administrative_area_level_1"))?.short_name||""; const city=comps.find((c:any)=>c.types.includes("locality"))?.long_name||""; setUserState(state); localStorage.setItem("userState",state); localStorage.setItem("userCity",city); saveLocation(loc,state,city); fetchCommunity(loc,state); }catch{}
        },
        err=>{ if(err.code===1){ setLocating(false); setLocError("permission"); } else if(highAccuracy){ tryGeo(false); } else { setLocating(false); setLocError("failed"); } },
        { timeout:highAccuracy?12000:20000, enableHighAccuracy:highAccuracy, maximumAge:300000 }
      );
    };
    tryGeo(true);
  },[fetchPlaces,fetchCommunity,saveLocation]);

  const loadUSStateServices=useCallback((stateCode:string,filter:FilterType)=>{ const coords=US_STATE_COORDS[stateCode]; if(!coords)return; setMapCenter({lat:coords.lat,lng:coords.lng}); fetchPlaces({lat:coords.lat,lng:coords.lng},filter); fetchCommunity({lat:coords.lat,lng:coords.lng},stateCode); },[fetchPlaces,fetchCommunity]);
  const switchToUSState=()=>{ if(!userState)return; setMapMode("usstate"); setLocError(false); loadUSStateServices(userState,activeFilter); };

  useEffect(()=>{
    if(isAbroad)return;
    if(userState&&!userLocation){ setMapMode("usstate"); loadUSStateServices(userState,activeFilter); }
    else { geolocate(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const handleFilter=(f:FilterType)=>{ setActiveFilter(f); if(mapMode==="gps"&&userLocation)fetchPlaces(userLocation,f); else if(mapMode==="usstate"&&userState)loadUSStateServices(userState,f); };
  const filteredUsers=commFilter==="all"?communityUsers:communityUsers.filter(u=>u.situation===commFilter);
  const toggleCommVisible=async()=>{ const user=auth.currentUser; if(!user)return; setSavingToggle(true); const newVal=!commVisible; setCommVisible(newVal); try{ await updateDoc(doc(db,"users",user.uid),{ communityVisible:newVal }); if(newVal&&userLocation)fetchCommunity(userLocation,userState); }catch{} setSavingToggle(false); };
  const onMapLoad=useCallback((m:google.maps.Map)=>{ setMapRef(m); m.setOptions({ gestureHandling:"none",scrollwheel:false }); },[]);

  const locErrMessages: Record<string,Record<Lang,string>> = {
    permission:{ fr:"❌ Localisation bloquée. Sur iPhone : Réglages → Confidentialité → Service de localisation → Safari → « Lors de l'utilisation ».",en:"❌ Location blocked. On iPhone: Settings → Privacy → Location Services → Safari → 'While Using'.",es:"❌ Ubicación bloqueada. En iPhone: Ajustes → Privacidad → Localización → Safari → 'Al usar la app'." },
    failed:{ fr:"📍 Impossible de te localiser. Active le WiFi ou rapproche-toi d'une fenêtre.",en:"📍 Can't locate you. Enable WiFi or move near a window.",es:"📍 No se puede localizarte. Activa el WiFi o acércate a una ventana." },
    unavailable:{ fr:"❌ Géolocalisation indisponible. Essaie Safari.",en:"❌ Geolocation unavailable. Try Safari.",es:"❌ Geolocalización no disponible. Intenta con Safari." },
  };
  const locErrMsg=locError?(locErrMessages[locError as string]?.[lang]||locErrMessages.failed[lang]):"";

  // ✅ 5 SOUS-ONGLETS
  const subTabs = [
    { id:"services",  label:lang==="fr"?"🏢 Services":lang==="es"?"🏢 Servicios":"🏢 Services" },
    { id:"community", label:lang==="fr"?"👥 Communauté":lang==="es"?"👥 Comunidad":"👥 Community" },
    { id:"documents", label:lang==="fr"?"📄 Documents":lang==="es"?"📄 Documentos":"📄 Documents" },
    { id:"messages",  label:lang==="fr"?"📨 Messages":lang==="es"?"📨 Mensajes":"📨 Messages" },
    { id:"budget",    label:lang==="fr"?"💰 Budget":lang==="es"?"💰 Presupuesto":"💰 Budget" },
  ];

  return (
    <div style={{ marginTop:8 }}>
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:20,fontWeight:700,color:"#fff",marginBottom:4 }}>Explorer</div>
      </div>

      {/* Sub tabs scrollable */}
      <div style={{ display:"flex",gap:6,overflowX:"auto",marginBottom:16,paddingBottom:4 }}>
        {subTabs.map(t=>(
          <button key={t.id} onClick={()=>setSubTab(t.id as ExplorerSubTab)}
            style={{ padding:"8px 14px",borderRadius:12,background:subTab===t.id?"#e8b84b":"#141d2e",border:"1px solid "+(subTab===t.id?"#e8b84b":"#1e2a3a"),color:subTab===t.id?"#000":"#aaa",fontSize:12,fontWeight:subTab===t.id?700:400,cursor:"pointer",fontFamily:"inherit",flexShrink:0,whiteSpace:"nowrap" as const }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ SERVICES ══ */}
      {subTab==="services"&&(
        <>
          {isAbroad ? <PreArrivalExplorer lang={lang} targetState={userState}/> : (
            <>
              {userState&&(
                <div style={{ display:"flex",gap:6,marginBottom:12 }}>
                  <button onClick={()=>{ setMapMode("gps"); if(userLocation)fetchPlaces(userLocation,activeFilter); else geolocate(); }} style={{ flex:1,padding:"9px",borderRadius:10,background:mapMode==="gps"?"#e8b84b":"#141d2e",border:"1px solid "+(mapMode==="gps"?"#e8b84b":"#1e2a3a"),color:mapMode==="gps"?"#000":"#aaa",fontSize:12,fontWeight:mapMode==="gps"?700:400,cursor:"pointer",fontFamily:"inherit" }}>📍 {lang==="fr"?"Ma position":lang==="es"?"Mi posición":"My location"}</button>
                  <button onClick={switchToUSState} style={{ flex:1,padding:"9px",borderRadius:10,background:mapMode==="usstate"?"#2dd4bf":"#141d2e",border:"1px solid "+(mapMode==="usstate"?"#2dd4bf":"#1e2a3a"),color:mapMode==="usstate"?"#000":"#aaa",fontSize:12,fontWeight:mapMode==="usstate"?700:400,cursor:"pointer",fontFamily:"inherit" }}>🇺🇸 {US_STATE_COORDS[userState]?.name||userState}</button>
                </div>
              )}
              <div style={{ borderRadius:16,overflow:"hidden",border:"1px solid #1e2a3a",marginBottom:12 }}>
                {isLoaded?(
                  <GoogleMap mapContainerStyle={mapContainerStyle} center={effectiveCenter} zoom={effectiveZoom} options={mapOptions} onLoad={onMapLoad}>
                    {mapMode==="gps"&&userLocation&&<Marker position={userLocation} icon={{ path:google.maps.SymbolPath.CIRCLE,scale:8,fillColor:"#e8b84b",fillOpacity:1,strokeColor:"#fff",strokeWeight:2 }}/>}
                    {mapMode==="usstate"&&userState&&US_STATE_COORDS[userState]&&<Marker position={{ lat:US_STATE_COORDS[userState].lat,lng:US_STATE_COORDS[userState].lng }} icon={{ path:google.maps.SymbolPath.CIRCLE,scale:10,fillColor:"#2dd4bf",fillOpacity:1,strokeColor:"#fff",strokeWeight:2 }}/>}
                    {places.map(p=><Marker key={p.id} position={{lat:p.lat,lng:p.lng}} icon={{ path:google.maps.SymbolPath.CIRCLE,scale:7,fillColor:activeColor,fillOpacity:1,strokeColor:"#fff",strokeWeight:1.5 }} onClick={()=>window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.name)}&destination_place_id=${p.id}`,"_blank")}/>)}
                  </GoogleMap>
                ):(
                  <div style={{ height:240,background:"#0f1521",display:"flex",alignItems:"center",justifyContent:"center" }}><div style={{ color:"#555",fontSize:13 }}>...</div></div>
                )}
              </div>
              {mapMode==="usstate"&&userState&&(<div style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"rgba(45,212,191,.08)",border:"1px solid rgba(45,212,191,.2)",borderRadius:10,marginBottom:12 }}><span style={{ fontSize:14 }}>🇺🇸</span><span style={{ fontSize:12,color:"#2dd4bf",flex:1 }}>{lang==="fr"?`Services autour de ${US_STATE_COORDS[userState]?.name||userState}`:`Services near ${US_STATE_COORDS[userState]?.name||userState}`}</span><button onClick={geolocate} style={{ fontSize:11,color:"#555",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit" }}>{lang==="fr"?"Utiliser ma position":"Use my location"}</button></div>)}
              {locError&&mapMode==="gps"&&(<div style={{ background:locError==="permission"?"rgba(239,68,68,0.08)":"rgba(232,184,75,0.08)",border:`1px solid ${locError==="permission"?"rgba(239,68,68,0.25)":"rgba(232,184,75,0.25)"}`,borderRadius:12,padding:"12px 14px",marginBottom:12 }}><div style={{ fontSize:12,color:locError==="permission"?"#ef4444":"#e8b84b",lineHeight:1.6,marginBottom:locError!=="permission"?10:0 }}>{locErrMsg}</div>{locError!=="permission"&&<button onClick={geolocate} style={{ padding:"8px 14px",background:"rgba(232,184,75,0.1)",border:"1px solid rgba(232,184,75,0.3)",borderRadius:9,color:"#e8b84b",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>🔄 {lang==="fr"?"Réessayer":"Try again"}</button>}</div>)}
              {mapMode==="gps"&&!userLocation&&!locError&&(<button onClick={geolocate} disabled={locating} style={{ width:"100%",padding:"13px",background:"rgba(232,184,75,0.1)",border:"1px solid rgba(232,184,75,0.3)",borderRadius:14,color:"#e8b84b",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>{locating?(lang==="fr"?"Localisation...":"Locating..."):(lang==="fr"?"📍 Ma position réelle":"📍 My real location")}</button>)}
              {mapMode==="gps"&&userLocation&&(<button onClick={geolocate} disabled={locating} style={{ width:"100%",padding:"10px",background:"transparent",border:"1px solid #1e2a3a",borderRadius:12,color:"#555",fontSize:12,cursor:"pointer",fontFamily:"inherit",marginBottom:12 }}>🔄 {lang==="fr"?"Actualiser ma position":"Refresh location"}</button>)}
              <div style={{ display:"flex",gap:8,overflowX:"auto",marginBottom:14,paddingBottom:4 }}>
                {FILTERS.map(f=>{ const active=activeFilter===f.id; return <button key={f.id} onClick={()=>handleFilter(f.id)} style={{ background:active?activeColor:"#141d2e",border:"1px solid "+(active?activeColor:"#1e2a3a"),borderRadius:20,padding:"6px 14px",color:active?"#000":"#aaa",fontSize:11,fontWeight:active?700:400,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap" as const,flexShrink:0,display:"flex",alignItems:"center",gap:5 }}>{f.icon} {f.label[lang]}</button>; })}
              </div>
              {loadingPlaces&&<div style={{ textAlign:"center" as const,padding:"24px",color:"#555",fontSize:13 }}>🔍</div>}
              {!loadingPlaces&&places.length===0&&(userLocation||mapMode==="usstate")&&<div style={{ textAlign:"center" as const,padding:"24px",color:"#555",fontSize:13 }}>{lang==="fr"?"Aucun résultat":"No results"}</div>}
              <div style={{ display:"flex",flexDirection:"column" as const,gap:10 }}>
                {places.map(p=>(<div key={p.id} style={{ background:"#141d2e",border:`1px solid ${activeColor}33`,borderRadius:14,padding:"14px",display:"flex",alignItems:"center",gap:12 }}><div style={{ width:42,height:42,borderRadius:12,background:`${activeColor}18`,border:`1px solid ${activeColor}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>{FILTERS.find(f=>f.id===activeFilter)?.icon}</div><div style={{ flex:1,minWidth:0 }}><div style={{ fontSize:13,fontWeight:600,color:"#f4f1ec",marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const }}>{p.name}</div><div style={{ fontSize:11,color:"#aaa",display:"flex",alignItems:"center",gap:6 }}><span style={{ color:p.open===true?"#22c55e":p.open===false?"#ef4444":"#555",fontWeight:600 }}>{p.open===true?(lang==="fr"?"Ouvert":"Open"):p.open===false?(lang==="fr"?"Fermé":"Closed"):"?"}</span><span>·</span><span>{p.distance}</span>{p.rating&&<><span>·</span><span>⭐ {p.rating}</span></>}</div></div><button onClick={()=>window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.name)}&destination_place_id=${p.id}`,"_blank")} style={{ background:"none",border:"none",color:"#e8b84b",fontSize:18,cursor:"pointer",flexShrink:0,padding:4 }}>→</button></div>))}
              </div>
            </>
          )}
        </>
      )}

      {/* ══ COMMUNAUTÉ ══ */}
      {subTab==="community"&&(
        <>
          <div style={{ background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:14,padding:"14px",marginBottom:12 }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <div><div style={{ fontSize:13,fontWeight:600,color:"#f4f1ec",marginBottom:2 }}>{lang==="fr"?"Apparaître sur la carte":"Appear on map"}</div><div style={{ fontSize:11,color:"#aaa" }}>Anonymous — ~2km</div></div>
              <button onClick={toggleCommVisible} disabled={savingToggle} style={{ width:48,height:26,borderRadius:13,background:commVisible?"#e8b84b":"#2a3448",border:"none",cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0 }}><div style={{ position:"absolute",top:3,left:commVisible?24:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left 0.2s" }}/></button>
            </div>
          </div>
          {(userLocation||mapMode==="usstate")&&(<div style={{ display:"flex",gap:8,marginBottom:12 }}><div style={{ flex:1,background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12,padding:"12px",textAlign:"center" as const }}><div style={{ fontSize:22,fontWeight:800,color:"#e8b84b",lineHeight:1 }}>{communityUsers.length}</div><div style={{ fontSize:10,color:"#aaa",marginTop:3 }}>{lang==="fr"?`dans ${userState||"ton état"}`:`in ${userState||"your state"}`}</div></div><div style={{ flex:1,background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12,padding:"12px",textAlign:"center" as const }}><div style={{ fontSize:22,fontWeight:800,color:"#2dd4bf",lineHeight:1 }}>{newUsersCount}</div><div style={{ fontSize:10,color:"#aaa",marginTop:3 }}>{lang==="fr"?"nouveaux cette semaine":"new this week"}</div></div></div>)}
          <div style={{ display:"flex",gap:6,overflowX:"auto",marginBottom:12,paddingBottom:4 }}>{COMM_FILTERS.map(f=>{ const active=commFilter===f.id; return <button key={f.id} onClick={()=>setCommFilter(f.id)} style={{ background:active?"#2dd4bf":"#141d2e",border:"1px solid "+(active?"#2dd4bf":"#1e2a3a"),borderRadius:20,padding:"5px 12px",color:active?"#000":"#aaa",fontSize:10,fontWeight:active?700:400,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap" as const,flexShrink:0 }}>{f.label[lang]}</button>; })}</div>
          <div style={{ borderRadius:16,overflow:"hidden",border:"1px solid rgba(45,212,191,0.2)",marginBottom:12 }}>
            {isLoaded?(<GoogleMap mapContainerStyle={mapContainerStyle} center={effectiveCenter} zoom={mapMode==="usstate"?8:(userLocation?11:10)} options={mapOptions} onLoad={onMapLoad}>{userLocation&&<Marker position={userLocation} icon={{ path:google.maps.SymbolPath.CIRCLE,scale:10,fillColor:"#e8b84b",fillOpacity:1,strokeColor:"#fff",strokeWeight:3 }}/>}{filteredUsers.map(u=><Marker key={u.id} position={{lat:u.lat,lng:u.lng}} icon={{ path:google.maps.SymbolPath.CIRCLE,scale:u.isNew?8:6,fillColor:u.isNew?"#2dd4bf":"#60a5fa",fillOpacity:0.85,strokeColor:"#fff",strokeWeight:1.5 }}/>)}</GoogleMap>):(<div style={{ height:240,background:"#0f1521",display:"flex",alignItems:"center",justifyContent:"center" }}><div style={{ color:"#555",fontSize:13 }}>...</div></div>)}
          </div>
          {!userLocation&&!isAbroad&&(<button onClick={geolocate} disabled={locating} style={{ width:"100%",padding:"13px",background:"rgba(45,212,191,0.1)",border:"1px solid rgba(45,212,191,0.3)",borderRadius:14,color:"#2dd4bf",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:10 }}>📍 {locating?(lang==="fr"?"Localisation...":"Locating..."):(lang==="fr"?"Activer ma position":"Enable location")}</button>)}
          {locError&&<div style={{ fontSize:12,color:locError==="permission"?"#ef4444":"#e8b84b",lineHeight:1.6,padding:"8px 0" }}>{locErrMsg}</div>}
          {loadingComm&&<div style={{ textAlign:"center" as const,padding:"20px",color:"#555",fontSize:13 }}>...</div>}
        </>
      )}

      {/* ══ DOCUMENTS ══ */}
      {subTab==="documents"&&<DocumentsSection lang={lang} completedSteps={completedSteps||[]}/>}

      {/* ══ MESSAGES ══ */}
      {subTab==="messages"&&<MessagesSection lang={lang} userId={userId}/>}

      {/* ══ BUDGET ✅ NOUVEAU ══ */}
      {subTab==="budget"&&<BudgetSection lang={lang} userState={userState}/>}

      <style>{`
        ::-webkit-scrollbar { display:none; }
        @keyframes alertPop { 0%{transform:scale(.85);opacity:0} 100%{transform:scale(1);opacity:1} }
      `}</style>
    </div>
  );
}
