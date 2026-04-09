"use client";

import { useState, useEffect, useCallback } from "react";
import { useLoadScript, GoogleMap, Marker } from "@react-google-maps/api";
import type { CSSProperties } from "react";

type Lang = "fr" | "en" | "es";

type Place = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number | null;
  open: boolean | null;
  distance: string;
};

type FilterType = "ssn" | "dmv" | "bank" | "uscis" | "clinic" | "food";

const FILTERS: { id: FilterType; icon: string; label: Record<Lang, string> }[] = [
  { id: "ssn",    icon: "🪪", label: { fr: "SSA",      en: "SSA",      es: "SSA"      } },
  { id: "dmv",    icon: "🚗", label: { fr: "DMV",      en: "DMV",      es: "DMV"      } },
  { id: "bank",   icon: "🏦", label: { fr: "Banques",  en: "Banks",    es: "Bancos"   } },
  { id: "uscis",  icon: "🛂", label: { fr: "USCIS",    en: "USCIS",    es: "USCIS"    } },
  { id: "clinic", icon: "🏥", label: { fr: "Cliniques",en: "Clinics",  es: "Clínicas" } },
  { id: "food",   icon: "🍽️", label: { fr: "Nourriture",en: "Food",   es: "Comida"   } },
];

const MARKER_COLORS: Record<FilterType, string> = {
  ssn:    "#e8b84b",
  dmv:    "#f97316",
  bank:   "#22c55e",
  uscis:  "#a78bfa",
  clinic: "#2dd4bf",
  food:   "#f472b6",
};

const LABELS: Record<Lang, Record<string, string>> = {
  fr: {
    title:      "Explorer",
    sub:        "Services près de toi",
    locating:   "Localisation en cours...",
    noLocation: "Active la localisation pour voir les services",
    activate:   "Activer la localisation",
    open:       "Ouvert",
    closed:     "Fermé",
    unknown:    "Horaires inconnus",
    noResults:  "Aucun résultat trouvé",
    loading:    "Recherche en cours...",
    directions: "Itinéraire →",
    all:        "Tous",
  },
  en: {
    title:      "Explorer",
    sub:        "Services near you",
    locating:   "Getting your location...",
    noLocation: "Enable location to see nearby services",
    activate:   "Enable location",
    open:       "Open",
    closed:     "Closed",
    unknown:    "Hours unknown",
    noResults:  "No results found",
    loading:    "Searching...",
    directions: "Directions →",
    all:        "All",
  },
  es: {
    title:      "Explorar",
    sub:        "Servicios cerca de ti",
    locating:   "Obteniendo ubicación...",
    noLocation: "Activa la ubicación para ver servicios",
    activate:   "Activar ubicación",
    open:       "Abierto",
    closed:     "Cerrado",
    unknown:    "Horario desconocido",
    noResults:  "Sin resultados",
    loading:    "Buscando...",
    directions: "Cómo llegar →",
    all:        "Todos",
  },
};

const mapContainerStyle = { width: "100%", height: "220px", borderRadius: "0px" };
const mapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  styles: [
    { elementType: "geometry",          stylers: [{ color: "#0f1521" }] },
    { elementType: "labels.text.fill",  stylers: [{ color: "#aaa" }]   },
    { elementType: "labels.text.stroke",stylers: [{ color: "#0f1521" }]},
    { featureType: "road",              elementType: "geometry", stylers: [{ color: "#1e2a3a" }] },
    { featureType: "water",             elementType: "geometry", stylers: [{ color: "#0b0f1a" }] },
    { featureType: "poi",               stylers: [{ visibility: "off" }] },
  ],
};

export default function ExplorerTab({ lang }: { lang: Lang }) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating]         = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("ssn");
  const [places, setPlaces]             = useState<Place[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [mapCenter, setMapCenter]       = useState({ lat: 38.9, lng: -77.0 });
  const [map, setMap]                   = useState<google.maps.Map | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
  });

  const label = LABELS[lang];

  // ── Géolocalisation
  const getLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setMapCenter(loc);
        setLocating(false);
        fetchPlaces(loc, activeFilter);
      },
      () => setLocating(false),
      { timeout: 10000 }
    );
  };

  // ── Fetch places
  const fetchPlaces = async (loc: { lat: number; lng: number }, type: FilterType) => {
    setLoadingPlaces(true);
    setPlaces([]);
    try {
      const res  = await fetch("/api/places", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ lat: loc.lat, lng: loc.lng, type }),
      });
      const data = await res.json();
      setPlaces(data.places || []);
    } catch {
      setPlaces([]);
    }
    setLoadingPlaces(false);
  };

  const handleFilter = (f: FilterType) => {
    setActiveFilter(f);
    if (userLocation) fetchPlaces(userLocation, f);
  };

  const onMapLoad = useCallback((m: google.maps.Map) => setMap(m), []);

  const activeColor = MARKER_COLORS[activeFilter];

  return (
    <div style={{ marginTop: 14 }}>

      {/* Title */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{label.title}</div>
        <div style={{ fontSize: 12, color: "#aaa" }}>{label.sub}</div>
      </div>

      {/* Carte */}
      <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #1e2a3a", marginBottom: 12 }}>
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={userLocation ? 13 : 11}
            options={mapOptions}
            onLoad={onMapLoad}
          >
            {/* User marker */}
            {userLocation && (
              <Marker
                position={userLocation}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: "#e8b84b",
                  fillOpacity: 1,
                  strokeColor: "#fff",
                  strokeWeight: 2,
                }}
              />
            )}
            {/* Places markers */}
            {places.map(p => (
              <Marker
                key={p.id}
                position={{ lat: p.lat, lng: p.lng }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 7,
                  fillColor: activeColor,
                  fillOpacity: 1,
                  strokeColor: "#fff",
                  strokeWeight: 1.5,
                }}
                onClick={() => {
                  window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`,
                    "_blank"
                  );
                }}
              />
            ))}
          </GoogleMap>
        ) : (
          <div style={{ height: 220, background: "#0f1521", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ color: "#555", fontSize: 13 }}>Chargement de la carte...</div>
          </div>
        )}
      </div>

      {/* Bouton localisation */}
      {!userLocation && (
        <button
          onClick={getLocation}
          disabled={locating}
          style={{
            width: "100%", padding: "13px",
            background: "rgba(232,184,75,0.1)",
            border: "1px solid rgba(232,184,75,0.3)",
            borderRadius: 14, color: "#e8b84b",
            fontSize: 14, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
            marginBottom: 12,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {locating ? "📍 " + label.locating : "📍 " + label.activate}
        </button>
      )}

      {/* Filtres */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 14, paddingBottom: 4 }}>
        {FILTERS.map(f => {
          const active = activeFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => handleFilter(f.id)}
              style={{
                background: active ? activeColor : "#141d2e",
                border:     "1px solid " + (active ? activeColor : "#1e2a3a"),
                borderRadius: 20,
                padding:    "6px 14px",
                color:      active ? "#000" : "#aaa",
                fontSize:   11, fontWeight: active ? 700 : 400,
                cursor:     "pointer", fontFamily: "inherit",
                whiteSpace: "nowrap" as const,
                flexShrink: 0,
                display:    "flex", alignItems: "center", gap: 5,
              }}
            >
              {f.icon} {f.label[lang]}
            </button>
          );
        })}
      </div>

      {/* Liste des lieux */}
      {loadingPlaces && (
        <div style={{ textAlign: "center", padding: "24px", color: "#555", fontSize: 13 }}>
          {label.loading}
        </div>
      )}

      {!loadingPlaces && places.length === 0 && userLocation && (
        <div style={{ textAlign: "center", padding: "24px", color: "#555", fontSize: 13 }}>
          {label.noResults}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {places.map(p => (
          <div
            key={p.id}
            style={{
              background: "#141d2e",
              border: "1px solid " + activeColor + "33",
              borderRadius: 14, padding: "14px",
              display: "flex", alignItems: "center", gap: 12,
            }}
          >
            {/* Icon */}
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: activeColor + "18",
              border: "1px solid " + activeColor + "33",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, flexShrink: 0,
            }}>
              {FILTERS.find(f => f.id === activeFilter)?.icon}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#f4f1ec", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                {p.name}
              </div>
              <div style={{ fontSize: 11, color: "#aaa", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const }}>
                <span style={{ color: p.open === true ? "#22c55e" : p.open === false ? "#ef4444" : "#555", fontWeight: 600 }}>
                  {p.open === true ? label.open : p.open === false ? label.closed : label.unknown}
                </span>
                <span>·</span>
                <span>{p.distance}</span>
                {p.rating && <><span>·</span><span>⭐ {p.rating}</span></>}
              </div>
            </div>

            {/* Directions */}
            <button
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`, "_blank")}
              style={{
                background: "none", border: "none",
                color: "#e8b84b", fontSize: 18,
                cursor: "pointer", flexShrink: 0, padding: 4,
              }}
            >
              →
            </button>
          </div>
        ))}
      </div>

      <style>{`
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}