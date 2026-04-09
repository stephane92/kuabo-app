"use client";

import { useState, useEffect, useCallback } from "react";
import { useLoadScript, GoogleMap, Marker } from "@react-google-maps/api";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";

type Lang = "fr" | "en" | "es";
type Place = { id:string; name:string; address:string; lat:number; lng:number; rating:number|null; open:boolean|null; distance:string; };
type FilterType = "ssn"|"dmv"|"bank"|"uscis"|"clinic"|"food";
type CommunityUser = { id:string; situation:string; arrival:string; lat:number; lng:number; isNew:boolean; };
type ExplorerSubTab = "services"|"community";
type CommFilter = "all"|"dv"|"work"|"student"|"family"|"refugee";
type BubbleInfo = { type:"user"|"me"; markerId:string } | null;

const FILTERS: { id:FilterType; icon:string; label:Record<Lang,string> }[] = [
  { id:"ssn",    icon:"🪪", label:{ fr:"SSA",       en:"SSA",     es:"SSA"      } },
  { id:"dmv",    icon:"🚗", label:{ fr:"DMV",       en:"DMV",     es:"DMV"      } },
  { id:"bank",   icon:"🏦", label:{ fr:"Banques",   en:"Banks",   es:"Bancos"   } },
  { id:"uscis",  icon:"🛂", label:{ fr:"USCIS",     en:"USCIS",   es:"USCIS"    } },
  { id:"clinic", icon:"🏥", label:{ fr:"Cliniques", en:"Clinics", es:"Clínicas" } },
  { id:"food",   icon:"🍽️", label:{ fr:"Nourriture",en:"Food",   es:"Comida"   } },
];

const COMM_FILTERS: { id:CommFilter; label:Record<Lang,string> }[] = [
  { id:"all",     label:{ fr:"Tous",      en:"All",      es:"Todos"     } },
  { id:"dv",      label:{ fr:"DV Lottery",en:"DV Lottery",es:"Lotería DV"} },
  { id:"work",    label:{ fr:"Travail",   en:"Work",     es:"Trabajo"   } },
  { id:"student", label:{ fr:"Étudiant",  en:"Student",  es:"Estudiante"} },
  { id:"family",  label:{ fr:"Famille",   en:"Family",   es:"Familia"   } },
  { id:"refugee", label:{ fr:"Réfugié",   en:"Refugee",  es:"Refugiado" } },
];

const MARKER_COLORS: Record<FilterType,string> = {
  ssn:"#e8b84b", dmv:"#f97316", bank:"#22c55e",
  uscis:"#a78bfa", clinic:"#2dd4bf", food:"#f472b6"
};

const SITUATION_MESSAGES: Record<string,Record<Lang,string>> = {
  dv:      { fr:"🎰 Tu n'es pas seul — d'autres DV Lottery winners sont dans ton état !", en:"🎰 You're not alone — other DV Lottery winners are in your state!", es:"🎰 ¡No estás solo — otros ganadores de DV Lottery están en tu estado!" },
  work:    { fr:"💼 Des immigrants en visa travail sont dans ta zone !",                   en:"💼 Work visa immigrants are in your area!",                          es:"💼 ¡Hay inmigrantes con visa de trabajo en tu zona!" },
  student: { fr:"🎓 Des étudiants Kuabo sont dans ton état !",                            en:"🎓 Kuabo students are in your state!",                                es:"🎓 ¡Hay estudiantes Kuabo en tu estado!" },
  family:  { fr:"👨‍👩‍👧 Des familles Kuabo sont près de toi !",                              en:"👨‍👩‍👧 Kuabo families are near you!",                                    es:"👨‍👩‍👧 ¡Hay familias Kuabo cerca de ti!" },
  refugee: { fr:"🤝 La communauté Kuabo est là pour toi !",                               en:"🤝 The Kuabo community is here for you!",                             es:"🤝 ¡La comunidad Kuabo está aquí para ti!" },
  default: { fr:"🌍 Tu n'es pas seul dans cette aventure !",                              en:"🌍 You're not alone in this journey!",                               es:"🌍 ¡No estás solo en esta aventura!" },
};

const mapContainerStyle = { width:"100%", height:"240px" };

const mapOptions = {
  disableDefaultUI:       true,
  zoomControl:            false,
  scrollwheel:            false,
  disableDoubleClickZoom: true,
  gestureHandling:        "none",
  draggable:              true,
  styles: [
    { elementType:"geometry",           stylers:[{ color:"#0f1521" }] },
    { elementType:"labels.text.fill",   stylers:[{ color:"#aaa" }]   },
    { elementType:"labels.text.stroke", stylers:[{ color:"#0f1521" }]},
    { featureType:"road",    elementType:"geometry", stylers:[{ color:"#1e2a3a" }] },
    { featureType:"water",   elementType:"geometry", stylers:[{ color:"#0b0f1a" }] },
    { featureType:"poi",     stylers:[{ visibility:"off" }] },
  ],
};

function getDistanceKm(lat1:number,lng1:number,lat2:number,lng2:number):number {
  const R=6371,dLat=(lat2-lat1)*Math.PI/180,dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function formatDistance(d:number):string {
  return d<1?Math.round(d*1000)+" m":d.toFixed(1)+" km";
}

function anonLocation(lat:number,lng:number):{lat:number;lng:number} {
  return { lat:Math.round(lat*50)/50, lng:Math.round(lng*50)/50 };
}

export default function ExplorerTab({ lang }: { lang:Lang }) {
  const [subTab, setSubTab]               = useState<ExplorerSubTab>("services");
  const [userLocation, setUserLocation]   = useState<{lat:number;lng:number}|null>(null);
  const [userState, setUserState]         = useState("");
  const [userSituation, setUserSituation] = useState("default");
  const [locating, setLocating]           = useState(false);
  const [activeFilter, setActiveFilter]   = useState<FilterType>("ssn");
  const [commFilter, setCommFilter]       = useState<CommFilter>("all");
  const [places, setPlaces]               = useState<Place[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [mapCenter, setMapCenter]         = useState({lat:20,lng:-20});
  const [communityUsers, setCommunityUsers] = useState<CommunityUser[]>([]);
  const [newUsersCount, setNewUsersCount] = useState(0);
  const [loadingComm, setLoadingComm]     = useState(false);
  const [commVisible, setCommVisible]     = useState(false);
  const [savingToggle, setSavingToggle]   = useState(false);
  // ✅ Fix bulle — toggle avec markerId
  const [bubble, setBubble]               = useState<BubbleInfo>(null);

  const { isLoaded } = useLoadScript({ googleMapsApiKey:process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY||"" });
  const activeColor = MARKER_COLORS[activeFilter];

  useEffect(() => {
    setUserSituation(localStorage.getItem("reason")||"default");
    setUserState(localStorage.getItem("userState")||"");
  },[]);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const snap = await getDoc(doc(db,"users",user.uid));
        if (snap.exists()) setCommVisible((snap.data() as any)?.communityVisible||false);
      } catch { /* continue */ }
    };
    load();
  },[]);

  const fetchPlaces = useCallback(async (loc:{lat:number;lng:number},type:FilterType) => {
    setLoadingPlaces(true);
    setPlaces([]);
    try {
      const res  = await fetch("/api/places",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({lat:loc.lat,lng:loc.lng,type})});
      const data = await res.json();
      setPlaces(data.places||[]);
    } catch { setPlaces([]); }
    setLoadingPlaces(false);
  },[]);

  const fetchCommunity = useCallback(async (loc:{lat:number;lng:number},state:string) => {
    setLoadingComm(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const snap = await getDocs(collection(db,"users"));
      const users:CommunityUser[] = [];
      let newCount = 0;
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate()-7);
      snap.forEach(d => {
        const data = d.data() as any;
        if (d.id===user.uid) return;
        if (!data.communityVisible) return;
        if (!data.location?.lat) return;
        if (state&&data.location?.state&&data.location.state!==state) return;
        const dist = getDistanceKm(loc.lat,loc.lng,data.location.lat,data.location.lng);
        if (dist>50) return;
        const isNew = data.createdAt?new Date(data.createdAt)>oneWeekAgo:false;
        if (isNew) newCount++;
        const anon = anonLocation(data.location.lat,data.location.lng);
        users.push({id:d.id,situation:data.reason||"other",arrival:data.arrival||"unknown",lat:anon.lat,lng:anon.lng,isNew});
      });
      setCommunityUsers(users);
      setNewUsersCount(newCount);
    } catch { setCommunityUsers([]); }
    setLoadingComm(false);
  },[]);

  const saveLocation = useCallback(async (loc:{lat:number;lng:number},state:string,city:string) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await updateDoc(doc(db,"users",user.uid),{
        location:{lat:loc.lat,lng:loc.lng,state,city,updatedAt:new Date().toISOString()}
      });
    } catch { /* continue */ }
  },[]);

  const geolocate = useCallback(async () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const loc = {lat:pos.coords.latitude,lng:pos.coords.longitude};
        setUserLocation(loc);
        setMapCenter(loc);
        setLocating(false);
        fetchPlaces(loc,"ssn");
        try {
          const res  = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${loc.lat},${loc.lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`);
          const data = await res.json();
          const comps = data.results?.[0]?.address_components||[];
          const state = comps.find((c:any)=>c.types.includes("administrative_area_level_1"))?.short_name||"";
          const city  = comps.find((c:any)=>c.types.includes("locality"))?.long_name||"";
          setUserState(state);
          localStorage.setItem("userState",state);
          localStorage.setItem("userCity",city);
          saveLocation(loc,state,city);
          fetchCommunity(loc,state);
        } catch { /* continue */ }
      },
      () => setLocating(false),
      {timeout:10000}
    );
  },[fetchPlaces,fetchCommunity,saveLocation]);

  useEffect(() => { geolocate(); },[geolocate]);

  const handleFilter = (f:FilterType) => {
    setActiveFilter(f);
    if (userLocation) fetchPlaces(userLocation,f);
  };

  const toggleCommVisible = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setSavingToggle(true);
    const newVal = !commVisible;
    setCommVisible(newVal);
    try {
      await updateDoc(doc(db,"users",user.uid),{communityVisible:newVal});
      if (newVal&&userLocation) fetchCommunity(userLocation,userState);
    } catch { /* continue */ }
    setSavingToggle(false);
  };

  // ✅ Fix bulle — toggle on/off au touch
  const handleMarkerClick = useCallback((type:"user"|"me", markerId:string) => {
    setBubble(prev => {
      // Si même marker cliqué → ferme la bulle
      if (prev?.markerId===markerId) return null;
      // Sinon → ouvre la bulle
      return {type, markerId};
    });
  },[]);

  // ✅ Auto-ferme après 3s mais reset si nouveau click
  useEffect(() => {
    if (!bubble) return;
    const t = setTimeout(() => setBubble(null), 3000);
    return () => clearTimeout(t);
  },[bubble]);

  const filteredUsers = commFilter==="all"?communityUsers:communityUsers.filter(u=>u.situation===commFilter);
  const sitMsg = SITUATION_MESSAGES[userSituation]?.[lang]||SITUATION_MESSAGES.default[lang];
  const onMapLoad = useCallback(()=>{},[]);

  return (
    <div style={{marginTop:14}}>

      {/* Title */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:20,fontWeight:700,color:"#fff"}}>Explorer</div>
        <div style={{fontSize:12,color:"#aaa"}}>
          {subTab==="services"
            ?(lang==="fr"?"Services près de toi":lang==="es"?"Servicios cerca de ti":"Services near you")
            :(lang==="fr"?"Communauté Kuabo":lang==="es"?"Comunidad Kuabo":"Kuabo Community")}
        </div>
      </div>

      {/* Sub tabs */}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {[
          {id:"services",  label:lang==="fr"?"🏢 Services":lang==="es"?"🏢 Servicios":"🏢 Services"},
          {id:"community", label:lang==="fr"?"👥 Communauté":lang==="es"?"👥 Comunidad":"👥 Community"},
        ].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id as ExplorerSubTab)} style={{flex:1,padding:"10px",borderRadius:12,background:subTab===t.id?"#e8b84b":"#141d2e",border:"1px solid "+(subTab===t.id?"#e8b84b":"#1e2a3a"),color:subTab===t.id?"#000":"#aaa",fontSize:13,fontWeight:subTab===t.id?700:400,cursor:"pointer",fontFamily:"inherit"}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ SERVICES ══ */}
      {subTab==="services"&&(
        <>
          <div style={{borderRadius:16,overflow:"hidden",border:"1px solid #1e2a3a",marginBottom:12}}>
            {isLoaded?(
              <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={userLocation?13:2} options={mapOptions} onLoad={onMapLoad}>
                {userLocation&&(
                  <Marker position={userLocation} icon={{path:google.maps.SymbolPath.CIRCLE,scale:8,fillColor:"#e8b84b",fillOpacity:1,strokeColor:"#fff",strokeWeight:2}} />
                )}
                {places.map(p=>(
                  <Marker key={p.id} position={{lat:p.lat,lng:p.lng}}
                    icon={{path:google.maps.SymbolPath.CIRCLE,scale:7,fillColor:activeColor,fillOpacity:1,strokeColor:"#fff",strokeWeight:1.5}}
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.name)}&destination_place_id=${p.id}`,"_blank")}
                  />
                ))}
              </GoogleMap>
            ):(
              <div style={{height:240,background:"#0f1521",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{color:"#555",fontSize:13}}>Chargement...</div>
              </div>
            )}
          </div>

          {!userLocation&&(
            <button onClick={geolocate} disabled={locating} style={{width:"100%",padding:"13px",background:"rgba(232,184,75,0.1)",border:"1px solid rgba(232,184,75,0.3)",borderRadius:14,color:"#e8b84b",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              📍 {locating?(lang==="fr"?"Localisation...":lang==="es"?"Ubicando...":"Locating..."):(lang==="fr"?"Activer la localisation":lang==="es"?"Activar ubicación":"Enable location")}
            </button>
          )}

          <div style={{display:"flex",gap:8,overflowX:"auto",marginBottom:14,paddingBottom:4}}>
            {FILTERS.map(f=>{
              const active=activeFilter===f.id;
              return(
                <button key={f.id} onClick={() => handleFilter(f.id)} style={{background:active?activeColor:"#141d2e",border:"1px solid "+(active?activeColor:"#1e2a3a"),borderRadius:20,padding:"6px 14px",color:active?"#000":"#aaa",fontSize:11,fontWeight:active?700:400,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap" as const,flexShrink:0,display:"flex",alignItems:"center",gap:5}}>
                  {f.icon} {f.label[lang]}
                </button>
              );
            })}
          </div>

          {loadingPlaces&&<div style={{textAlign:"center",padding:"24px",color:"#555",fontSize:13}}>{lang==="fr"?"Recherche...":lang==="es"?"Buscando...":"Searching..."}</div>}
          {!loadingPlaces&&places.length===0&&userLocation&&<div style={{textAlign:"center",padding:"24px",color:"#555",fontSize:13}}>{lang==="fr"?"Aucun résultat":lang==="es"?"Sin resultados":"No results"}</div>}

          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {places.map(p=>(
              <div key={p.id} style={{background:"#141d2e",border:"1px solid "+activeColor+"33",borderRadius:14,padding:"14px",display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:42,height:42,borderRadius:12,background:activeColor+"18",border:"1px solid "+activeColor+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                  {FILTERS.find(f=>f.id===activeFilter)?.icon}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#f4f1ec",marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{p.name}</div>
                  <div style={{fontSize:11,color:"#aaa",display:"flex",alignItems:"center",gap:6}}>
                    <span style={{color:p.open===true?"#22c55e":p.open===false?"#ef4444":"#555",fontWeight:600}}>
                      {p.open===true?(lang==="fr"?"Ouvert":lang==="es"?"Abierto":"Open"):p.open===false?(lang==="fr"?"Fermé":lang==="es"?"Cerrado":"Closed"):"?"}
                    </span>
                    <span>·</span><span>{p.distance}</span>
                    {p.rating&&<><span>·</span><span>⭐ {p.rating}</span></>}
                  </div>
                </div>
                <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.name)}&destination_place_id=${p.id}`,"_blank")} style={{background:"none",border:"none",color:"#e8b84b",fontSize:18,cursor:"pointer",flexShrink:0,padding:4}}>→</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ══ COMMUNAUTÉ ══ */}
      {subTab==="community"&&(
        <>
          {/* Toggle */}
          <div style={{background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:14,padding:"14px",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:"#f4f1ec",marginBottom:2}}>
                  {lang==="fr"?"Apparaître sur la carte":lang==="es"?"Aparecer en el mapa":"Appear on map"}
                </div>
                <div style={{fontSize:11,color:"#aaa"}}>
                  {lang==="fr"?"Anonyme — position approximative (~2km)":lang==="es"?"Anónimo — posición aproximada (~2km)":"Anonymous — approximate position (~2km)"}
                </div>
              </div>
              <button onClick={toggleCommVisible} disabled={savingToggle} style={{width:48,height:26,borderRadius:13,background:commVisible?"#e8b84b":"#2a3448",border:"none",cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}>
                <div style={{position:"absolute",top:3,left:commVisible?24:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left 0.2s"}} />
              </button>
            </div>
          </div>

          {/* Message rassurant */}
          <div style={{background:"rgba(45,212,191,0.06)",border:"1px solid rgba(45,212,191,0.2)",borderRadius:14,padding:"14px 16px",marginBottom:12}}>
            <div style={{fontSize:13,color:"#f4f1ec",lineHeight:1.6}}>{sitMsg}</div>
          </div>

          {/* Compteurs */}
          {userLocation&&(
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <div style={{flex:1,background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12,padding:"12px",textAlign:"center" as const}}>
                <div style={{fontSize:22,fontWeight:800,color:"#e8b84b",lineHeight:1}}>{communityUsers.length}</div>
                <div style={{fontSize:10,color:"#aaa",marginTop:3}}>
                  {lang==="fr"?`dans ${userState||"ton état"}`:lang==="es"?`en ${userState||"tu estado"}`:`in ${userState||"your state"}`}
                </div>
              </div>
              <div style={{flex:1,background:"#141d2e",border:"1px solid #1e2a3a",borderRadius:12,padding:"12px",textAlign:"center" as const}}>
                <div style={{fontSize:22,fontWeight:800,color:"#2dd4bf",lineHeight:1}}>{newUsersCount}</div>
                <div style={{fontSize:10,color:"#aaa",marginTop:3}}>
                  {lang==="fr"?"nouveaux cette semaine":lang==="es"?"nuevos esta semana":"new this week"}
                </div>
              </div>
            </div>
          )}

          {/* Filtres */}
          <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:12,paddingBottom:4}}>
            {COMM_FILTERS.map(f=>{
              const active=commFilter===f.id;
              return(
                <button key={f.id} onClick={() => setCommFilter(f.id)} style={{background:active?"#2dd4bf":"#141d2e",border:"1px solid "+(active?"#2dd4bf":"#1e2a3a"),borderRadius:20,padding:"5px 12px",color:active?"#000":"#aaa",fontSize:10,fontWeight:active?700:400,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap" as const,flexShrink:0}}>
                  {f.label[lang]}
                </button>
              );
            })}
          </div>

          {/* Carte communauté */}
          <div style={{borderRadius:16,overflow:"hidden",border:"1px solid rgba(45,212,191,0.2)",marginBottom:12,position:"relative"}}>

            {/* ✅ Bulle animée — toggle on/off */}
            {bubble&&(
              <div
                onClick={() => setBubble(null)}
                style={{position:"absolute",top:"20%",left:"50%",transform:"translateX(-50%)",zIndex:100,cursor:"pointer"}}
              >
                <div style={{
                  background:bubble.type==="me"?"rgba(232,184,75,0.95)":"rgba(45,212,191,0.95)",
                  color:"#000",
                  borderRadius:16,
                  padding:"10px 16px",
                  fontSize:13,
                  fontWeight:700,
                  whiteSpace:"nowrap" as const,
                  boxShadow:"0 8px 24px rgba(0,0,0,0.4)",
                  animation:"popIn 0.4s cubic-bezier(.34,1.56,.64,1) forwards",
                }}>
                  {bubble.type==="me"
                    ?(lang==="fr"?"📍 C'est toi !":lang==="es"?"📍 ¡Eres tú!":"📍 That's you!")
                    :(lang==="fr"?"👤 Kuabo user proche de toi":lang==="es"?"👤 Usuario Kuabo cerca de ti":"👤 Kuabo user near you")
                  }
                </div>
                <div style={{width:0,height:0,borderLeft:"8px solid transparent",borderRight:"8px solid transparent",borderTop:`8px solid ${bubble.type==="me"?"rgba(232,184,75,0.95)":"rgba(45,212,191,0.95)"}`,margin:"0 auto"}} />
              </div>
            )}

            {isLoaded?(
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={mapCenter}
                zoom={userLocation?11:2}
                options={mapOptions}
                onLoad={onMapLoad}
              >
                {/* ✅ Point doré pulsant (toi) */}
                {userLocation&&(
                  <Marker
                    position={userLocation}
                    icon={{
                      path:google.maps.SymbolPath.CIRCLE,
                      scale:10,
                      fillColor:"#e8b84b",
                      fillOpacity:1,
                      strokeColor:"#fff",
                      strokeWeight:3,
                    }}
                    onClick={() => handleMarkerClick("me","user-me")}
                  />
                )}
                {/* Points communauté */}
                {filteredUsers.map(u=>(
                  <Marker
                    key={u.id}
                    position={{lat:u.lat,lng:u.lng}}
                    icon={{
                      path:google.maps.SymbolPath.CIRCLE,
                      scale:u.isNew?8:6,
                      fillColor:u.isNew?"#2dd4bf":"#60a5fa",
                      fillOpacity:0.85,
                      strokeColor:"#fff",
                      strokeWeight:1.5,
                    }}
                    onClick={() => handleMarkerClick("user","user-"+u.id)}
                  />
                ))}
              </GoogleMap>
            ):(
              <div style={{height:240,background:"#0f1521",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{color:"#555",fontSize:13}}>Chargement...</div>
              </div>
            )}
          </div>

          {/* Légende */}
          <div style={{display:"flex",gap:16,marginBottom:16,padding:"0 4px"}}>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:"#e8b84b"}} />
              <span style={{fontSize:11,color:"#aaa"}}>{lang==="fr"?"Toi":lang==="es"?"Tú":"You"}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:"#2dd4bf"}} />
              <span style={{fontSize:11,color:"#aaa"}}>{lang==="fr"?"Nouveau cette semaine":lang==="es"?"Nuevo esta semana":"New this week"}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:"#60a5fa"}} />
              <span style={{fontSize:11,color:"#aaa"}}>Kuabo user</span>
            </div>
          </div>

          {!userLocation&&(
            <button onClick={geolocate} disabled={locating} style={{width:"100%",padding:"13px",background:"rgba(45,212,191,0.1)",border:"1px solid rgba(45,212,191,0.3)",borderRadius:14,color:"#2dd4bf",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              📍 {locating?(lang==="fr"?"Localisation...":lang==="es"?"Ubicando...":"Locating..."):(lang==="fr"?"Activer la localisation":lang==="es"?"Activar ubicación":"Enable location")}
            </button>
          )}

          {loadingComm&&<div style={{textAlign:"center",padding:"24px",color:"#555",fontSize:13}}>Chargement...</div>}

          {!loadingComm&&communityUsers.length===0&&userLocation&&(
            <div style={{textAlign:"center",padding:"32px 20px"}}>
              <div style={{fontSize:40,marginBottom:12}}>👥</div>
              <div style={{fontSize:14,color:"#f4f1ec",fontWeight:600,marginBottom:8}}>
                {lang==="fr"?"Sois le premier dans ta zone !":lang==="es"?"¡Sé el primero en tu zona!":"Be the first in your area!"}
              </div>
              <div style={{fontSize:12,color:"#555"}}>
                {lang==="fr"?"Active le toggle pour apparaître et montrer aux autres immigrants qu'ils ne sont pas seuls.":lang==="es"?"Activa el toggle para aparecer y mostrar a otros inmigrantes que no están solos.":"Enable the toggle to appear and show other immigrants they're not alone."}
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        ::-webkit-scrollbar{display:none}
        @keyframes popIn{
          0%{transform:translateX(-50%) scale(0) translateY(10px);opacity:0}
          60%{transform:translateX(-50%) scale(1.1) translateY(-2px);opacity:1}
          100%{transform:translateX(-50%) scale(1) translateY(0);opacity:1}
        }
        @keyframes float{
          0%,100%{transform:translateX(-50%) translateY(0px)}
          50%{transform:translateX(-50%) translateY(-4px)}
        }
      `}</style>
    </div>
  );
}