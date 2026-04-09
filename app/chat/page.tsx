"use client";

import { useEffect, useState, useRef } from "react";
import type { CSSProperties } from "react";

type Lang = "fr" | "en" | "es";
type Message = { role: "user" | "assistant"; content: string };

const COUNTRY_NAMES: Record<string, Record<Lang, string>> = {
  us: { fr:"aux États-Unis", en:"in the USA",        es:"en EE.UU."    },
  fr: { fr:"en France",      en:"in France",          es:"en Francia"   },
  ca: { fr:"au Canada",      en:"in Canada",          es:"en Canadá"    },
  be: { fr:"en Belgique",    en:"in Belgium",         es:"en Bélgica"   },
  ch: { fr:"en Suisse",      en:"in Switzerland",     es:"en Suiza"     },
  uk: { fr:"au Royaume-Uni", en:"in the United Kingdom", es:"en el RU"  },
};

const STATE_NAMES: Record<string, Record<Lang, string>> = {
  MD: { fr:"au Maryland",      en:"in Maryland",      es:"en Maryland"      },
  CA: { fr:"en Californie",    en:"in California",    es:"en California"    },
  TX: { fr:"au Texas",         en:"in Texas",         es:"en Texas"         },
  NY: { fr:"à New York",       en:"in New York",      es:"en Nueva York"    },
  FL: { fr:"en Floride",       en:"in Florida",       es:"en Florida"       },
  GA: { fr:"en Géorgie",       en:"in Georgia",       es:"en Georgia"       },
  IL: { fr:"en Illinois",      en:"in Illinois",      es:"en Illinois"      },
  PA: { fr:"en Pennsylvanie",  en:"in Pennsylvania",  es:"en Pensilvania"   },
  OH: { fr:"en Ohio",          en:"in Ohio",          es:"en Ohio"          },
  NC: { fr:"en Caroline du Nord",en:"in North Carolina",es:"en Carolina del Norte"},
  VA: { fr:"en Virginie",      en:"in Virginia",      es:"en Virginia"      },
  WA: { fr:"à Washington",     en:"in Washington",    es:"en Washington"    },
  MA: { fr:"au Massachusetts", en:"in Massachusetts", es:"en Massachusetts" },
  NJ: { fr:"au New Jersey",    en:"in New Jersey",    es:"en Nueva Jersey"  },
  AZ: { fr:"en Arizona",       en:"in Arizona",       es:"en Arizona"       },
  MN: { fr:"au Minnesota",     en:"in Minnesota",     es:"en Minnesota"     },
  CO: { fr:"au Colorado",      en:"in Colorado",      es:"en Colorado"      },
  NV: { fr:"au Nevada",        en:"in Nevada",        es:"en Nevada"        },
};

function getSuggestedQuestions(lang: Lang, country: string, state: string, city: string): string[] {
  const location = city || STATE_NAMES[state]?.[lang] || COUNTRY_NAMES[country]?.[lang] || "";
  const locationShort = city || state || "";

  const questions: Record<Lang, string[]> = {
    fr: [
      `Comment obtenir mon SSN rapidement ${locationShort ? `${STATE_NAMES[state]?.[lang] || "dans ma zone"}` : ""}?`,
      `Quelle banque choisir sans credit score ${locationShort ? `${STATE_NAMES[state]?.[lang] || ""}` : ""}?`,
      `Comment trouver un logement ${location || "rapidement"} ?`,
    ],
    en: [
      `How do I get my SSN quickly ${locationShort ? `${STATE_NAMES[state]?.en || "in my area"}` : ""}?`,
      `Which bank to choose without a credit score ${locationShort ? `${STATE_NAMES[state]?.en || ""}` : ""}?`,
      `How to find housing ${location || "quickly"} ?`,
    ],
    es: [
      `¿Cómo obtengo mi SSN rápidamente ${locationShort ? `${STATE_NAMES[state]?.es || "en mi zona"}` : ""}?`,
      `¿Qué banco elegir sin historial crediticio ${locationShort ? `${STATE_NAMES[state]?.es || ""}` : ""}?`,
      `¿Cómo encontrar vivienda ${location || "rápidamente"} ?`,
    ],
  };

  // Questions spécifiques par pays
  if (country === "fr") {
    return {
      fr: ["Comment obtenir mon titre de séjour ?", "Comment m'inscrire à la CAF ?", "Comment ouvrir un compte bancaire en France ?"],
      en: ["How do I get my residence permit in France?", "How do I apply for CAF benefits?", "How do I open a bank account in France?"],
      es: ["¿Cómo obtengo mi permiso de residencia en Francia?", "¿Cómo solicito la CAF?", "¿Cómo abro una cuenta bancaria en Francia?"],
    }[lang];
  }

  if (country === "ca") {
    return {
      fr: ["Comment obtenir mon NAS au Canada ?", "Comment m'inscrire à l'assurance maladie ?", "Quelles aides pour les nouveaux arrivants ?"],
      en: ["How do I get my SIN in Canada?", "How do I register for health insurance?", "What help exists for newcomers in Canada?"],
      es: ["¿Cómo obtengo mi NAS en Canadá?", "¿Cómo me registro en el seguro médico?", "¿Qué ayudas existen para los recién llegados?"],
    }[lang];
  }

  return questions[lang];
}

const PLACEHOLDERS: Record<Lang, string> = {
  fr: "Pose ta question à Kuabo AI...",
  en: "Ask Kuabo AI a question...",
  es: "Haz tu pregunta a Kuabo AI...",
};

const LABELS: Record<Lang, Record<string, string>> = {
  fr: { title:"Kuabo AI", sub:"Ton assistant immigration personnel", back:"Retour", suggested:"Questions suggérées", error:"Erreur — réessaie", disclaimer:"Kuabo AI donne des conseils généraux. Consulte un professionnel pour les cas complexes." },
  en: { title:"Kuabo AI", sub:"Your personal immigration assistant", back:"Back",   suggested:"Suggested questions",  error:"Error — try again", disclaimer:"Kuabo AI gives general advice. Consult a professional for complex cases." },
  es: { title:"Kuabo AI", sub:"Tu asistente de inmigración personal", back:"Atrás", suggested:"Preguntas sugeridas",  error:"Error — inténtalo de nuevo", disclaimer:"Kuabo AI da consejos generales. Consulta un profesional para casos complejos." },
};

function buildSystemPrompt(profile: any, lang: Lang): string {
  const countryNames: Record<string, Record<Lang, string>> = {
    us:    { fr:"États-Unis",   en:"United States",    es:"Estados Unidos" },
    fr:    { fr:"France",       en:"France",            es:"Francia"        },
    ca:    { fr:"Canada",       en:"Canada",            es:"Canadá"         },
    be:    { fr:"Belgique",     en:"Belgium",           es:"Bélgica"        },
    ch:    { fr:"Suisse",       en:"Switzerland",       es:"Suiza"          },
    uk:    { fr:"Royaume-Uni",  en:"United Kingdom",    es:"Reino Unido"    },
    other: { fr:"autre pays",   en:"another country",   es:"otro país"      },
  };
  const reasonNames: Record<string, Record<Lang, string>> = {
    dv:       { fr:"DV Lottery",           en:"DV Lottery",            es:"Lotería DV"         },
    work:     { fr:"visa travail",         en:"work visa",             es:"visa trabajo"       },
    student:  { fr:"étudiant",             en:"student",               es:"estudiante"         },
    family:   { fr:"regroupement familial",en:"family reunification",  es:"reunificación"      },
    refugee:  { fr:"réfugié",             en:"refugee",               es:"refugiado"          },
    tourist:  { fr:"tourisme",            en:"tourism",               es:"turismo"            },
    worldcup: { fr:"Coupe du monde",      en:"World Cup",             es:"Copa del Mundo"     },
    other:    { fr:"autre",               en:"other",                 es:"otro"               },
  };

  const country  = countryNames[profile.country]?.[lang] || profile.country || "inconnu";
  const reason   = reasonNames[profile.reason]?.[lang]   || profile.reason  || "inconnu";
  const region   = profile.region   || profile.userState || "";
  const city     = profile.userCity || "";
  const hasSSN   = profile.hasSSN === "yes" || profile.hasSSN === true;
  const done     = (profile.completedSteps||[]).join(", ") || "aucune";
  const location = city ? `${city}${region ? `, ${region}` : ""}` : region || country;

  const prompts: Record<Lang, string> = {
    fr: `Tu es Kuabo, un assistant IA bienveillant, précis et chaleureux qui aide les immigrants à s'installer dans leur nouveau pays.

Profil de l'utilisateur :
- Nom : ${profile.userName || "l'utilisateur"}
- Destination : ${country}${location ? ` — ${location}` : ""}
- Situation : ${reason}
- SSN : ${profile.country==="us"?(hasSSN?"Obtenu ✅":"Pas encore ❌"):"N/A"}
- Étapes complétées : ${done}

Règles absolues :
1. Réponds TOUJOURS en français
2. Sois précis, pratique et concis — maximum 4 phrases
3. Adapte TOUJOURS tes conseils à la localisation exacte (${location})
4. Cite les bons organismes locaux (SSA, USCIS, DMV de ${region||country}...)
5. Termine toujours par UNE action concrète
6. Si tu ne sais pas — dis-le honnêtement
7. Ne donne jamais de conseils juridiques formels`,

    en: `You are Kuabo, a warm, precise and helpful AI assistant that helps immigrants settle in their new country.

User profile:
- Name: ${profile.userName || "the user"}
- Destination: ${country}${location ? ` — ${location}` : ""}
- Situation: ${reason}
- SSN: ${profile.country==="us"?(hasSSN?"Obtained ✅":"Not yet ❌"):"N/A"}
- Completed steps: ${done}

Absolute rules:
1. ALWAYS respond in English
2. Be precise, practical and concise — maximum 4 sentences
3. ALWAYS adapt advice to exact location (${location})
4. Cite local agencies (SSA, USCIS, DMV in ${region||country}...)
5. Always end with ONE concrete action
6. If you don't know — say so honestly
7. Never give formal legal advice`,

    es: `Eres Kuabo, un asistente IA cálido, preciso y útil que ayuda a los inmigrantes a instalarse en su nuevo país.

Perfil del usuario:
- Nombre: ${profile.userName || "el usuario"}
- Destino: ${country}${location ? ` — ${location}` : ""}
- Situación: ${reason}
- SSN: ${profile.country==="us"?(hasSSN?"Obtenido ✅":"Aún no ❌"):"N/A"}
- Pasos completados: ${done}

Reglas absolutas:
1. SIEMPRE responde en español
2. Sé preciso, práctico y conciso — máximo 4 oraciones
3. SIEMPRE adapta los consejos a la ubicación exacta (${location})
4. Cita agencias locales (SSA, USCIS, DMV en ${region||country}...)
5. Termina siempre con UNA acción concreta
6. Si no sabes — dilo honestamente
7. Nunca des consejos legales formales`,
  };
  return prompts[lang];
}

export default function ChatPage() {
  const [lang, setLang]                   = useState<Lang>("fr");
  const [profile, setProfile]             = useState<any>({});
  const [messages, setMessages]           = useState<Message[]>([]);
  const [input, setInput]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [mounted, setMounted]             = useState(false);
  const [showSuggested, setShowSuggested] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedLang = localStorage.getItem("lang") as Lang || "fr";
    setLang(savedLang);
    const p = {
      userName:       localStorage.getItem("userName")       || "",
      country:        localStorage.getItem("country")        || "us",
      region:         localStorage.getItem("region")         || "",
      userState:      localStorage.getItem("userState")      || "",
      userCity:       localStorage.getItem("userCity")       || "",
      reason:         localStorage.getItem("reason")         || "",
      arrival:        localStorage.getItem("arrival")        || "",
      hasSSN:         localStorage.getItem("hasSSN")         || "",
      completedSteps: JSON.parse(localStorage.getItem("completedSteps") || "[]"),
    };
    setProfile(p);
    setTimeout(() => setMounted(true), 100);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role:"user", content:text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setShowSuggested(false);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role:m.role, content:m.content })),
          systemPrompt: buildSystemPrompt(profile, lang),
        }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages(prev => [...prev, { role:"assistant", content:"❌ "+LABELS[lang].error }]);
      } else {
        setMessages(prev => [...prev, { role:"assistant", content:data.text }]);
      }
    } catch {
      setMessages(prev => [...prev, { role:"assistant", content:"❌ "+LABELS[lang].error }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); sendMessage(input); }
  };

  const label = LABELS[lang];
  const suggested = getSuggestedQuestions(
    lang,
    profile.country || "us",
    profile.userState || profile.region || "",
    profile.userCity || ""
  );

  if (!mounted) return <div style={{ minHeight:"100dvh", background:"#0b0f1a" }} />;

  return (
    <div style={container}>
      <div style={bgGlow} />

      {/* Header */}
      <div style={header}>
        <button style={backBtn} onClick={() => window.location.href="/dashboard"}>← {label.back}</button>
        <div style={{ textAlign:"center" }}>
          <div style={logoStyle}><span style={{ color:"#e8b84b" }}>Ku</span><span style={{ color:"#f4f1ec" }}>abo</span><span style={{ fontSize:13, color:"#e8b84b", fontWeight:400, marginLeft:6 }}>AI</span></div>
          <div style={{ fontSize:11, color:"#555", marginTop:2 }}>{label.sub}</div>
        </div>
        <div style={{ width:60 }} />
      </div>

      {/* Messages */}
      <div style={messagesWrap}>

        {messages.length === 0 && (
          <div style={{ textAlign:"center", padding:"32px 20px 16px", opacity:mounted?1:0, transition:"opacity 0.5s ease" }}>
            <div style={{ fontSize:52, marginBottom:12 }}>🤖</div>
            <div style={{ fontSize:18, fontWeight:700, color:"#f4f1ec", marginBottom:8 }}>
              {lang==="fr"?`Bonjour ${profile.userName||""} !`:lang==="es"?`¡Hola ${profile.userName||""}!`:`Hello ${profile.userName||""}!`}
            </div>
            <div style={{ fontSize:13, color:"#aaa", lineHeight:1.6 }}>
              {lang==="fr"?"Je suis ton assistant Kuabo AI. Pose-moi n'importe quelle question sur ton installation.":lang==="es"?"Soy tu asistente Kuabo AI. Hazme cualquier pregunta sobre tu instalación.":"I'm your Kuabo AI assistant. Ask me anything about your settlement."}
            </div>
          </div>
        )}

        {showSuggested && messages.length===0 && (
          <div style={{ padding:"0 16px 16px" }}>
            <div style={{ fontSize:11, color:"#555", letterSpacing:"0.08em", textTransform:"uppercase" as const, marginBottom:10 }}>{label.suggested}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {suggested.map((q,i) => (
                <button key={i} onClick={() => sendMessage(q)} style={{ background:"#0f1521", border:"1px solid #1e2a3a", borderRadius:12, padding:"12px 14px", color:"#f4f1ec", fontSize:13, cursor:"pointer", textAlign:"left" as const, fontFamily:"inherit", display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ color:"#e8b84b", flexShrink:0 }}>→</span>{q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg,i) => {
          const isUser = msg.role==="user";
          return (
            <div key={i} style={{ display:"flex", justifyContent:isUser?"flex-end":"flex-start", padding:"4px 16px", animation:"fadeUp 0.3s ease forwards" }}>
              {!isUser && (
                <div style={{ width:28, height:28, borderRadius:"50%", background:"rgba(232,184,75,0.15)", border:"1px solid rgba(232,184,75,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0, marginRight:8, marginTop:2 }}>🤖</div>
              )}
              <div style={{ maxWidth:"78%", padding:"12px 14px", borderRadius:isUser?"18px 18px 4px 18px":"18px 18px 18px 4px", background:isUser?"#e8b84b":"#0f1521", border:isUser?"none":"1px solid #1e2a3a", color:isUser?"#000":"#f4f1ec", fontSize:14, lineHeight:1.6, fontWeight:isUser?500:400 }}>
                {msg.content}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display:"flex", alignItems:"center", padding:"4px 16px", gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:"rgba(232,184,75,0.15)", border:"1px solid rgba(232,184,75,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>🤖</div>
            <div style={{ background:"#0f1521", border:"1px solid #1e2a3a", borderRadius:"18px 18px 18px 4px", padding:"12px 16px", display:"flex", gap:5, alignItems:"center" }}>
              {[0,1,2].map(i => <div key={i} style={{ width:7, height:7, borderRadius:"50%", background:"#e8b84b", animation:`bounce 1.2s ${i*0.2}s ease-in-out infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} style={{ height:16 }} />
      </div>

      <div style={disclaimer}>{label.disclaimer}</div>

      <div style={inputWrap}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDERS[lang]}
          type="text"
          style={{ flex:1, background:"#0f1521", border:"1px solid #1e2a3a", borderRadius:24, padding:"12px 16px", color:"#f4f1ec", fontSize:16, fontFamily:"inherit", outline:"none", minWidth:0 }}
        />
        <button onClick={() => sendMessage(input)} disabled={!input.trim()||loading} style={{ width:44, height:44, borderRadius:"50%", background:"#e8b84b", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, opacity:input.trim()&&!loading?1:0.4 }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M18 10L2 2L6 10L2 18L18 10Z" fill="#000" /></svg>
        </button>
      </div>

      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        input{font-size:16px!important}
        input::placeholder{color:#444}
        button:active{transform:scale(0.97)}
      `}</style>
    </div>
  );
}

const container: CSSProperties  = { minHeight:"100dvh", background:"#0b0f1a", color:"#f4f1ec", display:"flex", flexDirection:"column", position:"relative", overflow:"hidden" };
const bgGlow: CSSProperties     = { position:"absolute", top:"-10%", left:"50%", transform:"translateX(-50%)", width:500, height:400, background:"radial-gradient(ellipse, rgba(232,184,75,0.06), transparent 65%)", pointerEvents:"none" };
const header: CSSProperties     = { position:"fixed", top:0, left:0, right:0, display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", background:"rgba(11,15,26,0.95)", backdropFilter:"blur(12px)", borderBottom:"1px solid #1e2a3a", zIndex:100 };
const backBtn: CSSProperties    = { background:"none", border:"none", color:"#aaa", cursor:"pointer", fontSize:14, fontFamily:"inherit", padding:"4px 0" };
const logoStyle: CSSProperties  = { fontWeight:900, fontSize:18, fontFamily:"serif" };
const messagesWrap: CSSProperties = { flex:1, overflowY:"auto", paddingTop:80, paddingBottom:8, WebkitOverflowScrolling:"touch" as any };
const disclaimer: CSSProperties = { fontSize:10, color:"#333", textAlign:"center", padding:"6px 20px", lineHeight:1.5, flexShrink:0 };
const inputWrap: CSSProperties  = { display:"flex", alignItems:"center", gap:10, padding:"12px 16px", paddingBottom:"max(12px, env(safe-area-inset-bottom))", background:"rgba(11,15,26,0.98)", backdropFilter:"blur(12px)", borderTop:"1px solid #1e2a3a", flexShrink:0, position:"sticky" as any, bottom:0 };