"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useLoadScript, GoogleMap, Marker } from "@react-google-maps/api";
import type { CSSProperties } from "react";

type Lang = "fr" | "en" | "es";
type Place = {
  id:string; name:string; address:string;
  lat:number; lng:number; rating:number|null;
  open:boolean|null; distance:string;
};

const TYPE_CONFIG:Record<string,{
  icon:string;
  color:string;
  label:Record<Lang,string>;
  desc:Record<Lang,string>;
  apiType:string;
}> = {
  ssn:{
    icon:"🪪", color:"#e8b84b",
    label:{fr:"Bureaux SSA",en:"SSA Offices",es:"Oficinas SSA"},
    desc:{fr:"Social Security Administration — pour ton SSN",en:"Social Security Administration — for your SSN",es:"Administración del Seguro Social — para tu SSN"},
    apiType:"ssn",
  },
  dmv:{
    icon:"🚗", color:"#f97316",
    label:{fr:"Bureaux DMV",en:"DMV Offices",es:"Oficinas DMV"},
    desc:{fr:"Department of Motor Vehicles — pour ton permis",en:"Department of Motor Vehicles — for your license",es:"Departamento de Vehículos — para tu licencia"},
    apiType:"dmv",
  },
  bank:{
    icon:"🏦", color:"#22c55e",
    label:{fr:"Banques",en:"Banks",es:"Bancos"},
    desc:{fr:"Chase, Bank of America, Wells Fargo",en:"Chase, Bank of America, Wells Fargo",es:"Chase, Bank of America, Wells Fargo"},
    apiType:"bank",
  },
  uscis:{
    icon:"🛂", color:"#a78bfa",
    label:{fr:"Bureaux USCIS",en:"USCIS Offices",es:"Oficinas USCIS"},
    desc:{fr:"US Citizenship and Immigration Services",en:"US Citizenship and Immigration Services",es:"Servicios de Ciudadanía e Inmigración"},
    apiType:"uscis",
  },
  clinic:{
    icon:"🏥", color:"#2dd4bf",
    label:{fr:"Cliniques",en:"Clinics",es:"Clínicas"},
    desc:{fr:"Cliniques et centres de santé proches",en:"Nearby clinics and health centers",es:"Clínicas y centros de salud cercanos"},
    apiType:"clinic",
  },
  food:{
    icon:"🍽️", color:"#f472b6",
    label:{fr:"Aide alimentaire",en:"Food assistance",es:"Ayuda alimentaria"},
    desc:{fr:"Banques alimentaires et aide sociale",en:"Food banks and social assistance",es:"Bancos de alimentos y ayuda social"},
    apiType:"food",
  },
};

const mapContainerStyle = { width:"100%", height:"260px" };

const mapOptions = {
  disableDefaultUI:true,
  zoomControl:false,
  scrollwheel:false,
  disableDoubleClickZoom:true,
  gestureHandling:"none",
  draggable:true,
  styles:[
    {elementType:"geometry",           stylers:[{color:"#0f1521"}]},
    {elementType:"labels.text.fill",   stylers:[{color:"#aaa"}]},
    {elementType:"labels.text.stroke", stylers:[{color:"#0f1521"}]},
    {featureType:"road",    elementType:"geometry", stylers:[{color:"#1e2a3a"}]},
    {featureType:"water",   elementType:"geometry", stylers:[{color:"#0b0f1a"}]},
    {featureType:"poi",     stylers:[{visibility:"off"}]},
  ],
};

export default function NearPage() {
  const params   = useParams();
  const typeId   = (params?.type as string)||"ssn";
  const config   = TYPE_CONFIG[typeId]||TYPE_CONFIG.ssn;

  const [lang,setLang]               = useState<Lang>("fr");
  const [userLocation,setUserLocation] = useState<{lat:number;lng:number}|null>(null);
  const [mapCenter,setMapCenter]     = useState({lat:39.0,lng:-77.0});
  const [places,setPlaces]           = useState<Place[]>([]);
  const [loading,setLoading]         = useState(false);
  const [locating,setLocating]       = useState(false);
  const [selectedPlace,setSelectedPlace] = useState<Place|null>(null);
  const [mounted,setMounted]         = useState(false);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY||"",
  });

  useEffect(() => {
    const l = localStorage.getItem("lang") as Lang;
    if (l&&["fr","en","es"].includes(l)) setLang(l);
    setTimeout(()=>setMounted(true),100);
    geolocate();
  },[]);

  const fetchPlaces = useCallback(async (loc:{lat:number;lng:number}) => {
    setLoading(true);
    setPlaces([]);
    try {
      const res  = await fetch("/api/places",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({lat:loc.lat,lng:loc.lng,type:config.apiType}),
      });
      const data = await res.json();
      setPlaces(data.places||[]);
    } catch { setPlaces([]); }
    setLoading(false);
  },[config.apiType]);

  const geolocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = {lat:pos.coords.latitude,lng:pos.coords.longitude};
        setUserLocation(loc);
        setMapCenter(loc);
        setLocating(false);
        fetchPlaces(loc);
      },
      ()=>setLocating(false),
      {timeout:10000}
    );
  },[fetchPlaces]);

  const L = {
    fr:{
      back:"Retour",
      near:"Près de toi",
      locating:"Localisation...",
      enableLoc:"Activer la localisation",
      searching:"Recherche en cours...",
      noResults:"Aucun résultat trouvé",
      open:"Ouvert",
      closed:"Fermé",
      itinerary:"Itinéraire →",
      call:"Appeler",
      select:"Sélectionner",
      selected:"✓ Sélectionné",
      noLoc:"Active la localisation pour voir les bureaux proches",
    },
    en:{
      back:"Back",
      near:"Near you",
      locating:"Locating...",
      enableLoc:"Enable location",
      searching:"Searching...",
      noResults:"No results found",
      open:"Open",
      closed:"Closed",
      itinerary:"Get directions →",
      call:"Call",
      select:"Select",
      selected:"✓ Selected",
      noLoc:"Enable location to see nearby offices",
    },
    es:{
      back:"Volver",
      near:"Cerca de ti",
      locating:"Ubicando...",
      enableLoc:"Activar ubicación",
      searching:"Buscando...",
      noResults:"Sin resultados",
      open:"Abierto",
      closed:"Cerrado",
      itinerary:"Cómo llegar →",
      call:"Llamar",
      select:"Seleccionar",
      selected:"✓ Seleccionado",
      noLoc:"Activa la ubicación para ver las oficinas cercanas",
    },
  }[lang];

  return (
    <div style={{minHeight:"100dvh",background:"#0b0f1a",color:"#f4f1ec",fontFamily:"inherit"}}>

      {/* Header */}
      <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(11,15,26,0.95)",backdropFilter:"blur(12px)",borderBottom:"1px solid #1e2a3a",padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
        <button onClick={()=>window.history.back()} style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:14,fontFamily:"inherit",flexShrink:0}}>
          ← {L.back}
        </button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:16,fontWeight:700,color:"#f4f1ec",display:"flex",alignItems:"center",gap:8}}>
            <span>{config.icon}</span>
            <span>{config.label[lang]}</span>
          </div>
          <div style={{fontSize:11,color:"#aaa",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>
            {config.desc[lang]}
          </div>
        </div>
      </div>

      <div style={{padding:"16px 16px 80px",maxWidth:480,margin:"0 auto",opacity:mounted?1:0,transition:"opacity 0.3s ease"}}>

        {/* Carte */}
        <div style={{borderRadius:16,overflow:"hidden",border:"1px solid "+(config.color+"40"),marginBottom:16,position:"relative"}}>
          {isLoaded?(
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={userLocation?13:10}
              options={mapOptions}
            >
              {/* Point user */}
              {userLocation&&(
                <Marker
                  position={userLocation}
                  icon={{
                    path:google.maps.SymbolPath.CIRCLE,
                    scale:8,
                    fillColor:"#e8b84b",
                    fillOpacity:1,
                    strokeColor:"#fff",
                    strokeWeight:2,
                  }}
                />
              )}
              {/* Points résultats */}
              {places.map(p=>(
                <Marker
                  key={p.id}
                  position={{lat:p.lat,lng:p.lng}}
                  icon={{
                    path:google.maps.SymbolPath.CIRCLE,
                    scale:selectedPlace?.id===p.id?10:7,
                    fillColor:config.color,
                    fillOpacity:1,
                    strokeColor:"#fff",
                    strokeWeight:selectedPlace?.id===p.id?3:1.5,
                  }}
                  onClick={()=>setSelectedPlace(selectedPlace?.id===p.id?null:p)}
                />
              ))}
            </GoogleMap>
          ):(
            <div style={{height:260,background:"#0f1521",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{color:"#555",fontSize:13}}>Chargement...</div>
            </div>
          )}

          {/* Bulle info sur marker sélectionné */}
          {selectedPlace&&(
            <div style={{position:"absolute",top:12,left:12,right:12,background:"rgba(15,21,33,0.95)",border:"1px solid "+config.color+"50",borderRadius:12,padding:"10px 14px",backdropFilter:"blur(8px)"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#f4f1ec",marginBottom:2}}>{selectedPlace.name}</div>
              <div style={{fontSize:11,color:"#aaa",marginBottom:8}}>{selectedPlace.address}</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedPlace.name)}&destination_place_id=${selectedPlace.id}`,"_blank")} style={{flex:1,padding:"7px",background:config.color,border:"none",borderRadius:8,color:"#000",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  {L.itinerary}
                </button>
                <button onClick={()=>setSelectedPlace(null)} style={{padding:"7px 12px",background:"#1a2438",border:"none",borderRadius:8,color:"#aaa",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bouton localisation */}
        {!userLocation&&(
          <button onClick={geolocate} disabled={locating} style={{width:"100%",padding:"13px",background:"rgba(232,184,75,0.1)",border:"1px solid rgba(232,184,75,0.3)",borderRadius:14,color:"#e8b84b",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            📍 {locating?L.locating:L.enableLoc}
          </button>
        )}

        {/* Message si pas de localisation */}
        {!userLocation&&!locating&&(
          <div style={{textAlign:"center" as const,padding:"20px",color:"#555",fontSize:13}}>
            {L.noLoc}
          </div>
        )}

        {/* Loading */}
        {loading&&(
          <div style={{textAlign:"center" as const,padding:"24px"}}>
            <div style={{fontSize:13,color:"#aaa"}}>{L.searching}</div>
            <div style={{display:"flex",justifyContent:"center",gap:6,marginTop:12}}>
              {[0,1,2].map(i=>(
                <div key={i} style={{width:8,height:8,borderRadius:"50%",background:config.color,animation:`bounce 1.2s ${i*0.2}s ease-in-out infinite`}} />
              ))}
            </div>
          </div>
        )}

        {/* No results */}
        {!loading&&places.length===0&&userLocation&&(
          <div style={{textAlign:"center" as const,padding:"32px 20px"}}>
            <div style={{fontSize:32,marginBottom:12}}>{config.icon}</div>
            <div style={{fontSize:14,color:"#aaa"}}>{L.noResults}</div>
          </div>
        )}

        {/* Liste résultats */}
        {!loading&&places.length>0&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {places.map((p,i)=>{
              const isSelected = selectedPlace?.id===p.id;
              return (
                <div
                  key={p.id}
                  onClick={()=>setSelectedPlace(isSelected?null:p)}
                  style={{
                    background:isSelected?"rgba("+hexToRgb(config.color)+",0.06)":"#141d2e",
                    border:"1px solid "+(isSelected?config.color+"60":"#1e2a3a"),
                    borderRadius:14,
                    padding:"14px",
                    cursor:"pointer",
                    transition:"all 0.2s",
                    WebkitTapHighlightColor:"transparent",
                  }}
                >
                  <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                    {/* Numéro */}
                    <div style={{width:32,height:32,borderRadius:"50%",background:i===0?config.color:"#1a2438",border:"1px solid "+(i===0?config.color:"#2a3448"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:i===0?"#000":"#aaa",flexShrink:0}}>
                      {i+1}
                    </div>

                    <div style={{flex:1,minWidth:0}}>
                      {/* Nom */}
                      <div style={{fontSize:14,fontWeight:600,color:"#f4f1ec",marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>
                        {p.name}
                      </div>

                      {/* Infos */}
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap" as const}}>
                        <span style={{fontSize:11,color:p.open===true?"#22c55e":p.open===false?"#ef4444":"#555",fontWeight:600}}>
                          {p.open===true?L.open:p.open===false?L.closed:"?"}
                        </span>
                        <span style={{fontSize:11,color:"#555"}}>·</span>
                        <span style={{fontSize:11,color:"#aaa"}}>{p.distance}</span>
                        {p.rating&&<>
                          <span style={{fontSize:11,color:"#555"}}>·</span>
                          <span style={{fontSize:11,color:"#aaa"}}>⭐ {p.rating}</span>
                        </>}
                      </div>

                      {/* Adresse */}
                      <div style={{fontSize:11,color:"#555",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>
                        📍 {p.address}
                      </div>
                    </div>
                  </div>

                  {/* Boutons action */}
                  <div style={{display:"flex",gap:8,marginTop:12}}>
                    <button
                      onClick={e=>{e.stopPropagation();window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.name)}&destination_place_id=${p.id}`,"_blank");}}
                      style={{flex:1,padding:"10px",background:config.color,border:"none",borderRadius:10,color:"#000",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}
                    >
                      {L.itinerary}
                    </button>
                    <button
                      onClick={e=>{e.stopPropagation();setMapCenter({lat:p.lat,lng:p.lng});setSelectedPlace(p);window.scrollTo({top:0,behavior:"smooth"});}}
                      style={{padding:"10px 14px",background:"#1a2438",border:"1px solid #2a3448",borderRadius:10,color:"#aaa",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}
                    >
                      🗺️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      <style>{`
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
      `}</style>
    </div>
  );
}

// Helper pour convertir hex en rgb
function hexToRgb(hex:string):string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1],16)},${parseInt(result[2],16)},${parseInt(result[3],16)}`
    : "232,184,75";
}