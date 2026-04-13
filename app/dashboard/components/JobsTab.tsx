"use client";

import { useState, useEffect, useCallback } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, getDocs, addDoc, deleteDoc, setDoc } from "firebase/firestore";
import type { Lang } from "./data";

type JobsSubTab = "myjobs" | "community";

type MyJob = {
  id: string;
  company: string;
  position: string;
  city: string;
  state: string;
  startDate: string;
  endDate: string;
  current: boolean;
  visaType: string;
  sector: string;
};

type CommunityJob = {
  id: string;
  company: string;
  city: string;
  state: string;
  sector: string;
  visaFriendly: string[];
  rating: number;
  reviewCount: number;
  addedBy: string;
  verified: boolean;
  note: string;
};

const SECTORS: Record<Lang, { id: string; label: string }[]> = {
  fr: [
    { id:"tech",        label:"💻 Tech / IT" },
    { id:"health",      label:"🏥 Santé" },
    { id:"construction",label:"🏗️ Construction" },
    { id:"food",        label:"🍽️ Restauration" },
    { id:"transport",   label:"🚛 Transport / Logistique" },
    { id:"retail",      label:"🛒 Commerce / Retail" },
    { id:"finance",     label:"💰 Finance / Banque" },
    { id:"education",   label:"📚 Éducation" },
    { id:"security",    label:"🔒 Sécurité" },
    { id:"other",       label:"🔧 Autre" },
  ],
  en: [
    { id:"tech",        label:"💻 Tech / IT" },
    { id:"health",      label:"🏥 Healthcare" },
    { id:"construction",label:"🏗️ Construction" },
    { id:"food",        label:"🍽️ Food & Restaurant" },
    { id:"transport",   label:"🚛 Transport / Logistics" },
    { id:"retail",      label:"🛒 Retail / Commerce" },
    { id:"finance",     label:"💰 Finance / Banking" },
    { id:"education",   label:"📚 Education" },
    { id:"security",    label:"🔒 Security" },
    { id:"other",       label:"🔧 Other" },
  ],
  es: [
    { id:"tech",        label:"💻 Tech / IT" },
    { id:"health",      label:"🏥 Salud" },
    { id:"construction",label:"🏗️ Construcción" },
    { id:"food",        label:"🍽️ Restauración" },
    { id:"transport",   label:"🚛 Transporte / Logística" },
    { id:"retail",      label:"🛒 Comercio / Retail" },
    { id:"finance",     label:"💰 Finanzas / Banca" },
    { id:"education",   label:"📚 Educación" },
    { id:"security",    label:"🔒 Seguridad" },
    { id:"other",       label:"🔧 Otro" },
  ],
};

const VISA_TYPES = ["DV Lottery", "Green Card", "H1B", "H2A", "H2B", "TN", "OPT/CPT", "Other"];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

// ══════════════════════════════════════════════
// MODAL AJOUTER JOB
// ══════════════════════════════════════════════
function AddJobModal({ lang, userId, onClose, onSaved }: {
  lang: Lang; userId: string;
  onClose: () => void; onSaved: (job: MyJob) => void;
}) {
  const [form, setForm] = useState({
    company:"", position:"", city:"", state:"", sector:"tech",
    visaType:"DV Lottery", startDate:"", endDate:"", current:false,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const T = {
    fr:{ title:"Ajouter un job", company:"Entreprise", position:"Poste / Titre", city:"Ville", state:"État US", sector:"Secteur", visa:"Type de visa", startDate:"Date début", endDate:"Date fin", current:"Poste actuel", save:"Enregistrer", cancel:"Annuler", required:"Champs obligatoires manquants" },
    en:{ title:"Add a job", company:"Company", position:"Position / Title", city:"City", state:"US State", sector:"Sector", visa:"Visa type", startDate:"Start date", endDate:"End date", current:"Current position", save:"Save", cancel:"Cancel", required:"Missing required fields" },
    es:{ title:"Agregar trabajo", company:"Empresa", position:"Puesto / Título", city:"Ciudad", state:"Estado US", sector:"Sector", visa:"Tipo de visa", startDate:"Fecha inicio", endDate:"Fecha fin", current:"Puesto actual", save:"Guardar", cancel:"Cancelar", required:"Campos obligatorios faltantes" },
  }[lang];

  const handleSave = async () => {
    if (!form.company.trim() || !form.position.trim() || !form.startDate) {
      setError(T.required); return;
    }
    setSaving(true);
    try {
      const jobData = { ...form, createdAt: new Date().toISOString() };
      const ref = await addDoc(collection(db, "users", userId, "jobs"), jobData);
      onSaved({ id: ref.id, ...form });
      onClose();
    } catch { setError("Erreur — réessaie"); }
    setSaving(false);
  };

  const input = (label: string, field: keyof typeof form, type = "text", placeholder = "") => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: "#aaa", marginBottom: 5, fontWeight: 500 }}>{label}</div>
      <input
        type={type}
        value={form[field] as string}
        onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
        placeholder={placeholder}
        style={{ width:"100%", padding:"11px 12px", background:"#0b0f1a", border:"1px solid #1e2a3a", borderRadius:10, color:"#f4f1ec", fontSize:15, fontFamily:"inherit", outline:"none", boxSizing:"border-box" as const }}
      />
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.88)", zIndex:700, display:"flex", alignItems:"flex-end", justifyContent:"center", backdropFilter:"blur(6px)", padding:"0 0 0 0" }}
      onClick={onClose}>
      <div style={{ background:"#0f1521", border:"1px solid #1e2a3a", borderRadius:"22px 22px 0 0", padding:"24px 18px 32px", width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto", animation:"slideUp .4s ease" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ width:40, height:4, background:"#2a3448", borderRadius:4, margin:"0 auto 20px" }}/>
        <div style={{ fontSize:17, fontWeight:800, color:"#f4f1ec", marginBottom:18 }}>💼 {T.title}</div>

        {input(T.company,  "company",  "text", "ex: Amazon, Walmart...")}
        {input(T.position, "position", "text", "ex: Warehouse Associate...")}

        <div style={{ display:"flex", gap:10, marginBottom:12 }}>
          <div style={{ flex:2 }}>
            {input(T.city, "city", "text", "ex: Arlington")}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:"#aaa", marginBottom:5, fontWeight:500 }}>{T.state}</div>
            <select value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
              style={{ width:"100%", padding:"11px 8px", background:"#0b0f1a", border:"1px solid #1e2a3a", borderRadius:10, color:"#f4f1ec", fontSize:14, fontFamily:"inherit", outline:"none" }}>
              <option value="">—</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, color:"#aaa", marginBottom:5, fontWeight:500 }}>{T.sector}</div>
          <select value={form.sector} onChange={e => setForm(p => ({ ...p, sector: e.target.value }))}
            style={{ width:"100%", padding:"11px 12px", background:"#0b0f1a", border:"1px solid #1e2a3a", borderRadius:10, color:"#f4f1ec", fontSize:14, fontFamily:"inherit", outline:"none" }}>
            {SECTORS[lang].map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, color:"#aaa", marginBottom:5, fontWeight:500 }}>{T.visa}</div>
          <select value={form.visaType} onChange={e => setForm(p => ({ ...p, visaType: e.target.value }))}
            style={{ width:"100%", padding:"11px 12px", background:"#0b0f1a", border:"1px solid #1e2a3a", borderRadius:10, color:"#f4f1ec", fontSize:14, fontFamily:"inherit", outline:"none" }}>
            {VISA_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>

        <div style={{ display:"flex", gap:10, marginBottom:12 }}>
          <div style={{ flex:1 }}>{input(T.startDate, "startDate", "date")}</div>
          {!form.current && <div style={{ flex:1 }}>{input(T.endDate, "endDate", "date")}</div>}
        </div>

        <div onClick={() => setForm(p => ({ ...p, current: !p.current }))}
          style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background: form.current ? "rgba(34,197,94,.06)" : "#141d2e", border:`1px solid ${form.current ? "rgba(34,197,94,.3)" : "#1e2a3a"}`, borderRadius:10, cursor:"pointer", marginBottom:20 }}>
          <div style={{ width:20, height:20, borderRadius:6, background: form.current ? "#22c55e" : "transparent", border:`2px solid ${form.current ? "#22c55e" : "#2a3448"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            {form.current && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <span style={{ fontSize:13, color: form.current ? "#22c55e" : "#f4f1ec" }}>✅ {T.current}</span>
        </div>

        {error && <div style={{ fontSize:12, color:"#ef4444", marginBottom:12 }}>⚠️ {error}</div>}

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:"13px", background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:12, color:"#aaa", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>{T.cancel}</button>
          <button onClick={handleSave} disabled={saving} style={{ flex:2, padding:"13px", background:"#e8b84b", border:"none", borderRadius:12, color:"#000", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", opacity: saving ? .7 : 1 }}>
            {saving ? "⏳..." : T.save}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// MODAL RECOMMANDER EMPLOYEUR
// ══════════════════════════════════════════════
function RecommendModal({ lang, userId, onClose, onSaved }: {
  lang: Lang; userId: string;
  onClose: () => void; onSaved: (job: CommunityJob) => void;
}) {
  const [form, setForm] = useState({
    company:"", city:"", state:"", sector:"tech",
    visaFriendly:[] as string[], rating:5, note:"",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const T = {
    fr:{ title:"Recommander un employeur", company:"Nom de l'entreprise", city:"Ville", state:"État US", sector:"Secteur", visa:"Compatible avec quel(s) visa(s) ?", rating:"Note (1 à 5)", note:"Ton avis (optionnel)", notePlh:"Ex: Super employeur, très sympa avec les immigrants...", save:"Recommander ⭐", cancel:"Annuler", required:"Entreprise, ville et visa requis" },
    en:{ title:"Recommend an employer", company:"Company name", city:"City", state:"US State", sector:"Sector", visa:"Compatible with which visa(s)?", rating:"Rating (1 to 5)", note:"Your review (optional)", notePlh:"e.g: Great employer, very friendly with immigrants...", save:"Recommend ⭐", cancel:"Cancel", required:"Company, city and visa required" },
    es:{ title:"Recomendar empleador", company:"Nombre de empresa", city:"Ciudad", state:"Estado US", sector:"Sector", visa:"¿Compatible con qué visa(s)?", rating:"Calificación (1 a 5)", note:"Tu opinión (opcional)", notePlh:"Ej: Gran empleador, muy amigable con inmigrantes...", save:"Recomendar ⭐", cancel:"Cancelar", required:"Empresa, ciudad y visa requeridos" },
  }[lang];

  const toggleVisa = (v: string) => setForm(p => ({
    ...p,
    visaFriendly: p.visaFriendly.includes(v)
      ? p.visaFriendly.filter(x => x !== v)
      : [...p.visaFriendly, v],
  }));

  const handleSave = async () => {
    if (!form.company.trim() || !form.city.trim() || form.visaFriendly.length === 0) {
      setError(T.required); return;
    }
    setSaving(true);
    try {
      const jobData = {
        ...form, addedBy: userId, verified: false,
        reviewCount: 1, createdAt: new Date().toISOString(),
      };
      const ref = await addDoc(collection(db, "community_jobs"), jobData);
      onSaved({ id: ref.id, ...jobData });
      onClose();
    } catch { setError("Erreur — réessaie"); }
    setSaving(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.88)", zIndex:700, display:"flex", alignItems:"flex-end", justifyContent:"center", backdropFilter:"blur(6px)" }}
      onClick={onClose}>
      <div style={{ background:"#0f1521", border:"1px solid #1e2a3a", borderRadius:"22px 22px 0 0", padding:"24px 18px 32px", width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto", animation:"slideUp .4s ease" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ width:40, height:4, background:"#2a3448", borderRadius:4, margin:"0 auto 20px" }}/>
        <div style={{ fontSize:17, fontWeight:800, color:"#f4f1ec", marginBottom:18 }}>⭐ {T.title}</div>

        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, color:"#aaa", marginBottom:5 }}>{T.company} *</div>
          <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder="ex: Amazon, UPS, McDonald's..."
            style={{ width:"100%", padding:"11px 12px", background:"#0b0f1a", border:"1px solid #1e2a3a", borderRadius:10, color:"#f4f1ec", fontSize:15, fontFamily:"inherit", outline:"none", boxSizing:"border-box" as const }}/>
        </div>

        <div style={{ display:"flex", gap:10, marginBottom:12 }}>
          <div style={{ flex:2 }}>
            <div style={{ fontSize:11, color:"#aaa", marginBottom:5 }}>{T.city} *</div>
            <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="ex: Dallas"
              style={{ width:"100%", padding:"11px 12px", background:"#0b0f1a", border:"1px solid #1e2a3a", borderRadius:10, color:"#f4f1ec", fontSize:15, fontFamily:"inherit", outline:"none", boxSizing:"border-box" as const }}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:"#aaa", marginBottom:5 }}>{T.state}</div>
            <select value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
              style={{ width:"100%", padding:"11px 8px", background:"#0b0f1a", border:"1px solid #1e2a3a", borderRadius:10, color:"#f4f1ec", fontSize:14, fontFamily:"inherit", outline:"none" }}>
              <option value="">—</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, color:"#aaa", marginBottom:5 }}>{T.sector}</div>
          <select value={form.sector} onChange={e => setForm(p => ({ ...p, sector: e.target.value }))}
            style={{ width:"100%", padding:"11px 12px", background:"#0b0f1a", border:"1px solid #1e2a3a", borderRadius:10, color:"#f4f1ec", fontSize:14, fontFamily:"inherit", outline:"none" }}>
            {SECTORS[lang].map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        {/* Visa types */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, color:"#aaa", marginBottom:8 }}>{T.visa} *</div>
          <div style={{ display:"flex", flexWrap:"wrap" as const, gap:6 }}>
            {VISA_TYPES.map(v => {
              const sel = form.visaFriendly.includes(v);
              return (
                <button key={v} onClick={() => toggleVisa(v)}
                  style={{ padding:"6px 12px", borderRadius:20, background: sel ? "rgba(34,197,94,.1)" : "#141d2e", border:`1px solid ${sel ? "rgba(34,197,94,.4)" : "#1e2a3a"}`, color: sel ? "#22c55e" : "#aaa", fontSize:11, fontWeight: sel ? 700 : 400, cursor:"pointer", fontFamily:"inherit" }}>
                  {sel ? "✓ " : ""}{v}
                </button>
              );
            })}
          </div>
        </div>

        {/* Rating stars */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, color:"#aaa", marginBottom:8 }}>{T.rating}</div>
          <div style={{ display:"flex", gap:8 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setForm(p => ({ ...p, rating: n }))}
                style={{ fontSize:28, background:"none", border:"none", cursor:"pointer", opacity: n <= form.rating ? 1 : 0.3, transition:"opacity .15s" }}>⭐</button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, color:"#aaa", marginBottom:5 }}>{T.note}</div>
          <textarea value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder={T.notePlh} rows={3}
            style={{ width:"100%", padding:"11px 12px", background:"#0b0f1a", border:"1px solid #1e2a3a", borderRadius:10, color:"#f4f1ec", fontSize:14, fontFamily:"inherit", outline:"none", resize:"none", boxSizing:"border-box" as const }}/>
        </div>

        {error && <div style={{ fontSize:12, color:"#ef4444", marginBottom:12 }}>⚠️ {error}</div>}

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:"13px", background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:12, color:"#aaa", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>{T.cancel}</button>
          <button onClick={handleSave} disabled={saving} style={{ flex:2, padding:"13px", background:"#22c55e", border:"none", borderRadius:12, color:"#000", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", opacity: saving ? .7 : 1 }}>
            {saving ? "⏳..." : T.save}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// JOBS TAB PRINCIPAL
// ══════════════════════════════════════════════
export default function JobsTab({ lang, userId }: { lang: Lang; userId: string | undefined }) {
  const [subTab,       setSubTab]       = useState<JobsSubTab>("myjobs");
  const [myJobs,       setMyJobs]       = useState<MyJob[]>([]);
  const [commJobs,     setCommJobs]     = useState<CommunityJob[]>([]);
  const [loadingMy,    setLoadingMy]    = useState(true);
  const [loadingComm,  setLoadingComm]  = useState(true);
  const [showAddJob,   setShowAddJob]   = useState(false);
  const [showRecommend,setShowRecommend]= useState(false);

  // Filtres communauté
  const [filterVisa,   setFilterVisa]   = useState("all");
  const [filterState,  setFilterState]  = useState("all");
  const [filterSector, setFilterSector] = useState("all");

  const T = {
    fr:{
      title:"Emplois & Carrière 💼", myJobs:"Mes jobs", community:"Communauté",
      addJob:"+ Ajouter un job", recommend:"⭐ Recommander",
      noMyJobs:"Tu n'as pas encore ajouté de job.", noCommJobs:"Aucun employeur recommandé pour l'instant.",
      current:"Poste actuel", past:"Ancien poste",
      filterVisa:"Visa", filterState:"État", filterSector:"Secteur", filterAll:"Tous",
      friendly:"Friendly", reviews:"avis", verified:"✅ Vérifié",
      deleteJob:"Supprimer", confirmDelete:"Supprimer ce job ?",
      communityTitle:"Employeurs recommandés par la communauté",
      commSub:"Filtre par visa et état pour trouver un employeur near toi",
    },
    en:{
      title:"Jobs & Career 💼", myJobs:"My jobs", community:"Community",
      addJob:"+ Add a job", recommend:"⭐ Recommend",
      noMyJobs:"You haven't added any jobs yet.", noCommJobs:"No employer recommendations yet.",
      current:"Current position", past:"Past position",
      filterVisa:"Visa", filterState:"State", filterSector:"Sector", filterAll:"All",
      friendly:"Friendly", reviews:"reviews", verified:"✅ Verified",
      deleteJob:"Delete", confirmDelete:"Delete this job?",
      communityTitle:"Employers recommended by the community",
      commSub:"Filter by visa and state to find an employer near you",
    },
    es:{
      title:"Empleos & Carrera 💼", myJobs:"Mis trabajos", community:"Comunidad",
      addJob:"+ Agregar trabajo", recommend:"⭐ Recomendar",
      noMyJobs:"Aún no has agregado ningún trabajo.", noCommJobs:"Aún no hay empleadores recomendados.",
      current:"Puesto actual", past:"Puesto anterior",
      filterVisa:"Visa", filterState:"Estado", filterSector:"Sector", filterAll:"Todos",
      friendly:"Friendly", reviews:"reseñas", verified:"✅ Verificado",
      deleteJob:"Eliminar", confirmDelete:"¿Eliminar este trabajo?",
      communityTitle:"Empleadores recomendados por la comunidad",
      commSub:"Filtra por visa y estado para encontrar un empleador cerca tuyo",
    },
  }[lang];

  // Charger mes jobs
  useEffect(() => {
    if (!userId) { setLoadingMy(false); return; }
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, "users", userId, "jobs"));
        const jobs: MyJob[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        jobs.sort((a, b) => (b.current ? 1 : 0) - (a.current ? 1 : 0));
        setMyJobs(jobs);
      } catch {}
      setLoadingMy(false);
    };
    load();
  }, [userId]);

  // Charger jobs communauté
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, "community_jobs"));
        const jobs: CommunityJob[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        jobs.sort((a, b) => b.rating - a.rating);
        setCommJobs(jobs);
      } catch {}
      setLoadingComm(false);
    };
    load();
  }, []);

  const handleDeleteJob = async (jobId: string) => {
    if (!userId) return;
    if (!confirm(T.confirmDelete)) return;
    try {
      await deleteDoc(doc(db, "users", userId, "jobs", jobId));
      setMyJobs(prev => prev.filter(j => j.id !== jobId));
    } catch {}
  };

  // Filtres communauté
  const filteredCommJobs = commJobs.filter(j => {
    if (filterVisa !== "all" && !j.visaFriendly?.includes(filterVisa)) return false;
    if (filterState !== "all" && j.state !== filterState) return false;
    if (filterSector !== "all" && j.sector !== filterSector) return false;
    return true;
  });

  const sectorLabel = (id: string) => SECTORS[lang].find(s => s.id === id)?.label || id;

  const stars = (n: number) => "⭐".repeat(Math.round(n));

  return (
    <div style={{ paddingTop: 8 }}>
      {showAddJob && userId && (
        <AddJobModal lang={lang} userId={userId} onClose={() => setShowAddJob(false)}
          onSaved={job => setMyJobs(prev => [job, ...prev])}/>
      )}
      {showRecommend && userId && (
        <RecommendModal lang={lang} userId={userId} onClose={() => setShowRecommend(false)}
          onSaved={job => setCommJobs(prev => [job, ...prev])}/>
      )}

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#f4f1ec", marginBottom: 4 }}>{T.title}</h2>
      </div>

      {/* Sub tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:16 }}>
        {([["myjobs", T.myJobs], ["community", T.community]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setSubTab(id)}
            style={{ flex:1, padding:"10px", borderRadius:12, background: subTab === id ? "#e8b84b" : "#141d2e", border:`1px solid ${subTab === id ? "#e8b84b" : "#1e2a3a"}`, color: subTab === id ? "#000" : "#aaa", fontSize:13, fontWeight: subTab === id ? 700 : 400, cursor:"pointer", fontFamily:"inherit" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ══ MES JOBS ══ */}
      {subTab === "myjobs" && (
        <>
          <button onClick={() => setShowAddJob(true)}
            style={{ width:"100%", padding:"13px", background:"rgba(232,184,75,.1)", border:"1px dashed rgba(232,184,75,.4)", borderRadius:14, color:"#e8b84b", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginBottom:16 }}>
            {T.addJob}
          </button>

          {loadingMy && <div style={{ textAlign:"center", padding:"24px", color:"#555" }}>...</div>}

          {!loadingMy && myJobs.length === 0 && (
            <div style={{ textAlign:"center" as const, padding:"32px 20px" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>💼</div>
              <div style={{ fontSize:13, color:"#555" }}>{T.noMyJobs}</div>
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column" as const, gap:10 }}>
            {myJobs.map(job => (
              <div key={job.id} style={{ background:"#141d2e", border:`1px solid ${job.current ? "rgba(34,197,94,.25)" : "#1e2a3a"}`, borderRadius:14, padding:"14px" }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:"#f4f1ec" }}>{job.company}</div>
                      {job.current && (
                        <span style={{ fontSize:9, color:"#22c55e", fontWeight:700, background:"rgba(34,197,94,.1)", padding:"2px 7px", borderRadius:8, border:"1px solid rgba(34,197,94,.25)" }}>
                          {T.current}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:12, color:"#2dd4bf", marginBottom:4 }}>{job.position}</div>
                    <div style={{ fontSize:11, color:"#555", display:"flex", gap:8, flexWrap:"wrap" as const }}>
                      {job.city && <span>📍 {job.city}{job.state ? `, ${job.state}` : ""}</span>}
                      {job.visaType && <span>🪪 {job.visaType}</span>}
                      {job.sector && <span>{sectorLabel(job.sector)}</span>}
                    </div>
                    {job.startDate && (
                      <div style={{ fontSize:11, color:"#555", marginTop:4 }}>
                        {job.startDate} {!job.current && job.endDate ? `→ ${job.endDate}` : job.current ? "→ " + (lang==="fr"?"présent":lang==="es"?"presente":"present") : ""}
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleDeleteJob(job.id)}
                    style={{ background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)", borderRadius:8, padding:"6px 10px", color:"#ef4444", fontSize:11, cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ══ COMMUNAUTÉ ══ */}
      {subTab === "community" && (
        <>
          <button onClick={() => setShowRecommend(true)}
            style={{ width:"100%", padding:"13px", background:"rgba(34,197,94,.1)", border:"1px dashed rgba(34,197,94,.4)", borderRadius:14, color:"#22c55e", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginBottom:16 }}>
            {T.recommend}
          </button>

          {/* Filtres */}
          <div style={{ display:"flex", gap:6, marginBottom:12, overflowX:"auto", paddingBottom:4 }}>
            {/* Filtre Visa */}
            <select value={filterVisa} onChange={e => setFilterVisa(e.target.value)}
              style={{ padding:"7px 10px", background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:20, color: filterVisa !== "all" ? "#e8b84b" : "#aaa", fontSize:11, fontFamily:"inherit", outline:"none", flexShrink:0, cursor:"pointer" }}>
              <option value="all">🪪 {T.filterAll}</option>
              {VISA_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
            </select>

            {/* Filtre État */}
            <select value={filterState} onChange={e => setFilterState(e.target.value)}
              style={{ padding:"7px 10px", background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:20, color: filterState !== "all" ? "#2dd4bf" : "#aaa", fontSize:11, fontFamily:"inherit", outline:"none", flexShrink:0, cursor:"pointer" }}>
              <option value="all">🗺️ {T.filterAll}</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Filtre Secteur */}
            <select value={filterSector} onChange={e => setFilterSector(e.target.value)}
              style={{ padding:"7px 10px", background:"#141d2e", border:"1px solid #1e2a3a", borderRadius:20, color: filterSector !== "all" ? "#a78bfa" : "#aaa", fontSize:11, fontFamily:"inherit", outline:"none", flexShrink:0, cursor:"pointer" }}>
              <option value="all">💼 {T.filterAll}</option>
              {SECTORS[lang].map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          {/* Compteur résultats */}
          <div style={{ fontSize:11, color:"#555", marginBottom:12 }}>
            {filteredCommJobs.length} {lang==="fr"?"employeur(s) trouvé(s)":lang==="es"?"empleador(es) encontrado(s)":"employer(s) found"}
          </div>

          {loadingComm && <div style={{ textAlign:"center", padding:"24px", color:"#555" }}>...</div>}

          {!loadingComm && filteredCommJobs.length === 0 && (
            <div style={{ textAlign:"center" as const, padding:"32px 20px" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
              <div style={{ fontSize:13, color:"#555" }}>{T.noCommJobs}</div>
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column" as const, gap:10 }}>
            {filteredCommJobs.map(job => (
              <div key={job.id} style={{ background:"#141d2e", border:"1px solid rgba(34,197,94,.15)", borderRadius:14, padding:"14px" }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:8 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:"#f4f1ec" }}>{job.company}</div>
                      {job.verified && <span style={{ fontSize:10, color:"#22c55e" }}>{T.verified}</span>}
                    </div>
                    <div style={{ fontSize:11, color:"#555", marginBottom:6 }}>
                      {job.city}{job.state ? `, ${job.state}` : ""} · {sectorLabel(job.sector)}
                    </div>
                    {/* Rating */}
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                      <span style={{ fontSize:13 }}>{stars(job.rating)}</span>
                      <span style={{ fontSize:11, color:"#e8b84b", fontWeight:700 }}>{job.rating}/5</span>
                      <span style={{ fontSize:10, color:"#555" }}>({job.reviewCount} {T.reviews})</span>
                    </div>
                    {/* Visa badges */}
                    {job.visaFriendly?.length > 0 && (
                      <div style={{ display:"flex", flexWrap:"wrap" as const, gap:4 }}>
                        {job.visaFriendly.map(v => (
                          <span key={v} style={{ fontSize:9, color:"#22c55e", background:"rgba(34,197,94,.08)", border:"1px solid rgba(34,197,94,.2)", padding:"2px 7px", borderRadius:8, fontWeight:700 }}>
                            ✓ {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* Avis */}
                {job.note && (
                  <div style={{ fontSize:12, color:"#aaa", lineHeight:1.6, padding:"8px 10px", background:"rgba(255,255,255,.02)", borderRadius:9, borderLeft:"2px solid rgba(232,184,75,.3)", marginTop:4 }}>
                    "{job.note}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <style>{`
        @keyframes slideUp { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>
    </div>
  );
}
