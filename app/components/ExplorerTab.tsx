"use client";

import { useState, useEffect, useCallback } from "react";
import { useLoadScript, GoogleMap, Marker } from "@react-google-maps/api";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";

type Lang = "fr" | "en" | "es";
type Place = { id: string; name: string; address: string; lat: number; lng: number; rating: number | null; open: boolean | null; distance: string; };
type FilterType = "ssn" | "dmv" | "bank" | "uscis" | "clinic" | "food";
type CommunityUser = { id: string; situation: string; arrival: string; distance: string; lat: number; lng: number; };
type ExplorerSubTab = "services" | "community";

const FILTERS: { id: FilterType; icon: string; label: Record<Lang, string> }[] = [
  { id: "ssn",    icon: "🪪", label: { fr: "SSA",       en: "SSA",     es: "SSA"      } },
  { id: "dmv",    icon: "🚗", label: { fr: "DMV",       en: "DMV",     es: "DMV"      } },
  { id: "bank",   icon: "🏦", label: { fr: "Banques",   en: "Banks",   es: "Bancos"   } },
  { id: "uscis",  icon: "🛂", label: { fr: "USCIS",     en: "USCIS",   es: "USCIS"    } },
  { id: "clinic", icon: "🏥", label: { fr: "Cliniques", en: "Clinics", es: "Clínicas" } },
  { id: "food",   icon: "🍽️", label: { fr: "Nourriture",en: "Food",   es: "Comida"   } },
];

const MARKER_COLORS: Record<FilterType, string> = { ssn:"#e8b84b", dmv:"#f97316", bank:"#22c55e", uscis:"#a78bfa", clinic:"#2dd4bf", food:"#f472b6" };

const LABELS: Record<Lang, Record<string, string>> = {
  fr: { title:"Explorer", services:"Services", community:"Communauté", sub:"Services près de toi", commSub:"Kuabo users près de toi", locating:"Localisation...", activate:"Activer la localisation", open:"Ouvert", closed:"Fermé", unknown:"?", noResults:"Aucun résultat", loading:"Recherche...", directions:"→", commEmpty:"Aucun Kuabo user dans ta zone", commVisible:"Apparaître sur la carte", commVisibleSub:"Les autres users peuvent te voir (anonyme)", km:"km de toi", situation:"Situation", arrival:"Arrivée" },
  en: { title:"Explorer", services:"Services", community:"Community", sub:"Services near you", commSub:"Kuabo users near you", locating:"Locating...", activate:"Enable location", open:"Open", closed:"Closed", unknown:"?", noResults:"No results", loading:"Searching...", directions:"→", commEmpty:"No Kuabo users in your area", commVisible:"Appear on community map", commVisibleSub:"Other users can see you (anonymous)", km:"km away", situation:"Situation", arrival:"Arrival" },
  es: { title:"Explorar", services:"Servicios", community:"Comunidad", sub:"Servicios cerca de ti", commSub:"Usuarios Kuabo cerca de ti", locating:"Ubicando...", activate:"Activar ubicación", open:"Abierto", closed:"Cerrado", unknown:"?", noResults:"Sin resultados", loading:"Buscando...", directions:"→", commEmpty:"No hay usuarios Kuabo en tu zona", commVisible:"Aparecer en el mapa", commVisibleSub:"Otros usuarios pueden verte (anónimo)", km:"km de distancia", situation:"Situación", arrival:"Llegada" },
};

const mapContainerStyle = { width: "100%", height: "220px" };
const mapOptions = {
  disableDefaultUI: true, zoomControl: false,
  styles: [
    { elementType:"geometry",           stylers:[{ color:"#0f1521" }] },
    { elementType:"labels.text.fill",   stylers:[{ color:"#aaa" }]   },
    { elementType:"labels.text.stroke", stylers:[{ color:"#0f1521" }]},
    { featureType:"road",    elementType:"geometry", stylers:[{ color:"#1e2a3a" }] },
    { featureType:"water",   elementType:"geometry", stylers:[{ color:"#0b0f1a" }] },
    { featureType:"poi",     stylers:[{ visibility:"off" }] },
  ],
};

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function formatDistance(d: number): string {
  return d < 1 ? Math.round(d*1000)+" m" : d.toFixed(1)+" km";
}

export default function ExplorerTab({ lang }: { lang: Lang }) {
  const [subTab, setSubTab]               = useState<ExplorerSubTab>("services");
  const [userLocation, setUserLocation]   = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating]           = useState(false);
  const [activeFilter, setActiveFilter]   = useState<FilterType>("ssn");
  const [places, setPlaces]               = useState<Place[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [mapCenter, setMapCenter]         = useState({ lat: 20, lng: -20 });
  const [communityUsers, setCommunityUsers] = useState<CommunityUser[]>([]);
  const [loadingComm, setLoadingComm]     = useState(false);
  const [commVisible, setCommVisible]     = useState(false);
  const [savingToggle, setSavingToggle]   = useState(false);

  const { isLoaded } = useLoadScript({ googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "" });
  const label = LABELS[lang];
  const activeColor = MARKER_COLORS[activeFilter];

  const fetchPlaces = useCallback(async (loc: { lat: number; lng: number }, type: FilterType) => {
    setLoadingPlaces(true);
    setPlaces([]);
    try {
      const res  = await fetch("/api/places", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ lat:loc.lat, lng:loc.lng, type }) });
      const data = await res.json();
      setPlaces(data.places || []);
    } catch { setPlaces([]); }
    setLoadingPlaces(false);
  }, []);

  const fetchCommunity = useCallback(async (loc: { lat: number; lng: number }) => {
    setLoadingComm(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const snap = await getDocs(collection(db, "users"));
      const users: CommunityUser[] = [];
      snap.forEach(d => {
        const data = d.data() as any;
        if (d.id === user.uid) return;
        if (!data.communityVisible) return;
        if (!data.location?.lat) return;
        const dist = getDistanceKm(loc.lat, loc.lng, data.location.lat, data.location.lng);
        if (dist > 20) return;
        // Arrondi position à ~1km pour anonymat
        const anonLat = Math.round(data.location.lat * 100) / 100;
        const anonLng = Math.round(data.location.lng * 100) / 100;
        users.push({
          id: d.id,
          situation: data.reason || "unknown",
          arrival: data.arrival || "unknown",
          distance: formatDistance(dist),
          lat: anonLat,
          lng: anonLng,
        });
      });
      users.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
      setCommunityUsers(users);
    } catch { setCommunityUsers([]); }
    setLoadingComm(false);
  }, []);

  const saveLocation = useCallback(async (loc: { lat: number; lng: number }) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        location: { lat: loc.lat, lng: loc.lng, updatedAt: new Date().toISOString() }
      });
    } catch { /* continue */ }
  }, []);

  useEffect(() => {
    const loadCommVisible = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) setCommVisible((snap.data() as any)?.communityVisible || false);
      } catch { /* continue */ }
    };
    loadCommVisible();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setMapCenter(loc);
        setLocating(false);
        fetchPlaces(loc, "ssn");
        saveLocation(loc);
        fetchCommunity(loc);
      },
      () => setLocating(false),
      { timeout: 10000 }
    );
  }, [fetchPlaces, fetchCommunity, saveLocation]);

  const getLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setMapCenter(loc);
        setLocating(false);
        fetchPlaces(loc, activeFilter);
        saveLocation(loc);
        fetchCommunity(loc);
      },
      () => setLocating(false),
      { timeout: 10000 }
    );
  };

  const handleFilter = (f: FilterType) => {
    setActiveFilter(f);
    if (userLocation) fetchPlaces(userLocation, f);
  };

  const toggleCommVisible = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setSavingToggle(true);
    const newVal = !commVisible;
    setCommVisible(newVal);
    try {
      await updateDoc(doc(db, "users", user.uid), { communityVisible: newVal });
      if (newVal && userLocation) fetchCommunity(userLocation);
    } catch { /* continue */ }
    setSavingToggle(false);
  };

  const onMapLoad = useCallback(() => {}, []);

  const situationLabels: Record<string, Record<Lang, string>> = {
    dv:       { fr:"DV Lottery",           en:"DV Lottery",           es:"Lotería DV"        },
    work:     { fr:"Visa travail",         en:"Work visa",            es:"Visa trabajo"      },
    student:  { fr:"Étudiant",             en:"Student",              es:"Estudiante"        },
    family:   { fr:"Regroupement familial",en:"Family reunification", es:"Reunificación"     },
    refugee:  { fr:"Réfugié",             en:"Refugee",              es:"Refugiado"         },
    tourist:  { fr:"Tourisme",            en:"Tourism",              es:"Turismo"           },
    other:    { fr:"Autre",               en:"Other",                es:"Otro"              },
  };

  const arrivalLabels: Record<string, Record<Lang, string>> = {
    "not-yet": { fr:"Pas encore arrivé", en:"Not yet arrived", es:"Aún no llegado" },
    "just":    { fr:"Vient d'arriver",   en:"Just arrived",    es:"Recién llegado"  },
    "months":  { fr:"Quelques mois",     en:"A few months",    es:"Pocos meses"     },
    "settled": { fr:"Installé",          en:"Settled",         es:"Establecido"     },
  };

  return (
    <div style={{ marginTop: 14 }}>

      {/* Title */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{label.title}</div>
        <div style={{ fontSize: 12, color: "#aaa" }}>{subTab === "services" ? label.sub : label.commSub}</div>
      </div>

      {/* Sub tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {(["services","community"] as ExplorerSubTab[]).map(t => (
          <button key={t} onClick={() => setSubTab(t)} style={{
            flex:1, padding:"10px", borderRadius:12,
            background: subTab===t ? "#e8b84b" : "#141d2e",
            border: "1px solid " + (subTab===t ? "#e8b84b" : "#1e2a3a"),
            color: subTab===t ? "#000" : "#aaa",
            fontSize:13, fontWeight:subTab===t?700:400,
            cursor:"pointer", fontFamily:"inherit",
          }}>
            {t === "services" ? "🏢 " + label.services : "👥 " + label.community}
          </button>
        ))}
      </div>

      {/* ── SERVICES TAB ── */}
      {subTab === "services" && (
        <>
          {/* Carte */}
          <div style={{ borderRadius:16, overflow:"hidden", border:"1px solid #1e2a3a", marginBottom:12 }}>
            {isLoaded ? (
              <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={userLocation?13:2} options={mapOptions} onLoad={onMapLoad}>
                {userLocation && (
                  <Marker position={userLocation} icon={{ path:google.maps.SymbolPath.CIRCLE, scale:8, fillColor:"#e8b84b", fillOpacity:1, strokeColor:"#fff", strokeWeight:2 }} />
                )}
                {places.map(p => (
                  <Marker key={p.id} position={{ lat:p.lat, lng:p.lng }}
                    icon={{ path:google.maps.SymbolPath.CIRCLE, scale:7, fillColor:activeColor, fillOpacity:1, strokeColor:"#fff", strokeWeight:1.5 }}
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.name)}&destination_place_id=${p.id}`,"_blank")}
                  />
                ))}
              </GoogleMap>
            ) : (
              <div style={{ height:220, background:"#0f1521", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ color:"#555", fontSize:13 }}>Chargement...</div>
              </div>
            )}
          </div>

          {/* Bouton localisation */}
          {!userLocation && (
            <button onClick={getLocation} disabled={locating} style={{ width:"100%", padding:"13px", background:"rgba(232,184,75,0.1)", border:"1px solid rgba(232,184,75,0.3)", borderRadius:14, color:"#e8b84b", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", marginBottom:12, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              📍 {locating ? label.locating : label.activate}
            </button>
          )}

          {/* Filtres */}
          <div style={{ display:"flex", gap:8, overflowX:"auto", marginBottom:14, paddingBottom:4 }}>
            {FILTERS.map(f => {
              const active = activeFilter === f.id;
              return (
                <button key={f.id} onClick={() => handleFilter(f.id)} style={{ background:active?activeColor:"#141d2e", border:"1px solid "+(active?activeColor:"#1e2a3a"), borderRadius:20, padding:"6px 14px", color:active?"#000":"#aaa", fontSize:11, fontWeight:active?700:400, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" as const, flexShrink:0, display:"flex", alignItems:"center", gap:5 }}>
                  {f.icon} {f.label[lang]}
                </button>
              );
            })}
          </div>

          {loadingPlaces && <div style={{ textAlign:"center", padding:"24px", color:"#555", fontSize:13 }}>{label.loading}</div>}
          {!loadingPlaces && places.length===0 && userLocation && <div style={{ textAlign:"center", padding:"24px", color:"#555", fontSize:13 }}>{label.noResults}</div>}

          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {places.map(p => (
              <div key={p.id} style={{ background:"#141d2e", border:"1px solid "+activeColor+"33", borderRadius:14, padding:"14px", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:42, height:42, borderRadius:12, background:activeColor+"18", border:"1px solid "+activeColor+"33", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                  {FILTERS.find(f => f.id===activeFilter)?.icon}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#f4f1ec", marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{p.name}</div>
                  <div style={{ fontSize:11, color:"#aaa", display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ color:p.open===true?"#22c55e":p.open===false?"#ef4444":"#555", fontWeight:600 }}>{p.open===true?label.open:p.open===false?label.closed:label.unknown}</span>
                    <span>·</span><span>{p.distance}</span>
                    {p.rating && <><span>·</span><span>⭐ {p.rating}</span></>}
                  </div>
                </div>
                <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.name)}&destination_place_id=${p.id}`,"_blank")} style={{ background:"none", border:"none", color:"#e8b84b", fontSize:18, cursor:"pointer", flexShrink:0, padding:4 }}>→</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── COMMUNITY TAB ── */}
      {subTab === "community" && (
        <>
          {/* Toggle apparaître */}
          <div style={{ background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:14, padding:"16px", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:"#f4f1ec", marginBottom:3 }}>{label.commVisible}</div>
                <div style={{ fontSize:11, color:"#aaa" }}>{label.commVisibleSub}</div>
              </div>
              <button
                onClick={toggleCommVisible}
                disabled={savingToggle}
                style={{
                  width:48, height:26, borderRadius:13,
                  background: commVisible ? "#e8b84b" : "#2a3448",
                  border:"none", cursor:"pointer", position:"relative",
                  transition:"background 0.2s", flexShrink:0,
                }}
              >
                <div style={{
                  position:"absolute", top:3,
                  left: commVisible ? 24 : 3,
                  width:20, height:20, borderRadius:"50%",
                  background:"#fff",
                  transition:"left 0.2s",
                }} />
              </button>
            </div>
          </div>

          {/* Carte communauté */}
          <div style={{ borderRadius:16, overflow:"hidden", border:"1px solid #1e2a3a", marginBottom:12 }}>
            {isLoaded ? (
              <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={userLocation?12:2} options={mapOptions} onLoad={onMapLoad}>
                {userLocation && (
                  <Marker position={userLocation} icon={{ path:google.maps.SymbolPath.CIRCLE, scale:8, fillColor:"#e8b84b", fillOpacity:1, strokeColor:"#fff", strokeWeight:2 }} />
                )}
                {communityUsers.map(u => (
                  <Marker key={u.id} position={{ lat:u.lat, lng:u.lng }}
                    icon={{ path:google.maps.SymbolPath.CIRCLE, scale:7, fillColor:"#2dd4bf", fillOpacity:0.8, strokeColor:"#fff", strokeWeight:1.5 }}
                  />
                ))}
              </GoogleMap>
            ) : (
              <div style={{ height:220, background:"#0f1521", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ color:"#555", fontSize:13 }}>Chargement...</div>
              </div>
            )}
          </div>

          {/* Bouton localisation */}
          {!userLocation && (
            <button onClick={getLocation} disabled={locating} style={{ width:"100%", padding:"13px", background:"rgba(45,212,191,0.1)", border:"1px solid rgba(45,212,191,0.3)", borderRadius:14, color:"#2dd4bf", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", marginBottom:12, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              📍 {locating ? label.locating : label.activate}
            </button>
          )}

          {loadingComm && <div style={{ textAlign:"center", padding:"24px", color:"#555", fontSize:13 }}>Chargement...</div>}

          {!loadingComm && communityUsers.length === 0 && (
            <div style={{ textAlign:"center", padding:"32px 20px", color:"#555", fontSize:13 }}>
              <div style={{ fontSize:32, marginBottom:12 }}>👥</div>
              <div>{label.commEmpty}</div>
              <div style={{ fontSize:11, color:"#444", marginTop:8 }}>
                {lang==="fr"?"Active le toggle pour apparaître et inviter d'autres immigrants à rejoindre Kuabo.":lang==="es"?"Activa el toggle para aparecer e invitar a otros inmigrantes a unirse a Kuabo.":"Enable the toggle to appear and invite other immigrants to join Kuabo."}
              </div>
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {communityUsers.map((u, i) => (
              <div key={u.id} style={{ background:"#141d2e", border:"1px solid rgba(45,212,191,0.2)", borderRadius:14, padding:"14px", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:42, height:42, borderRadius:"50%", background:"rgba(45,212,191,0.1)", border:"1px solid rgba(45,212,191,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>👤</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#f4f1ec", marginBottom:3 }}>
                    Kuabo User #{i+1}
                  </div>
                  <div style={{ fontSize:11, color:"#aaa", display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" as const }}>
                    <span style={{ color:"#2dd4bf", fontWeight:600 }}>{situationLabels[u.situation]?.[lang] || u.situation}</span>
                    <span>·</span>
                    <span>{arrivalLabels[u.arrival]?.[lang] || u.arrival}</span>
                    <span>·</span>
                    <span>{u.distance}</span>
                  </div>
                </div>
                <div style={{ padding:"4px 10px", borderRadius:20, background:"rgba(45,212,191,0.1)", border:"1px solid rgba(45,212,191,0.2)", fontSize:10, color:"#2dd4bf", fontWeight:600 }}>
                  {u.distance}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <style>{`::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}