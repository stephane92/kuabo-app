"use client";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
type Lang = "fr" | "en" | "es";

export default function Terms() {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const l = localStorage.getItem("lang") as Lang;
    if (l) setLang(l);
  }, []);

  const content = {
    fr: {
      title: "Conditions d'utilisation",
      updated: "Dernière mise à jour : Avril 2026",
      sections: [
        { title: "1. Acceptation des conditions", text: "En utilisant Kuabo, vous acceptez les présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'application." },
        { title: "2. Description du service", text: "Kuabo est une application d'aide à l'installation pour les immigrants. Nous fournissons des informations générales et des outils pour faciliter votre installation dans votre nouveau pays." },
        { title: "3. Compte utilisateur", text: "Vous êtes responsable de la confidentialité de votre compte et de votre mot de passe. Vous acceptez de ne pas partager votre compte avec d'autres personnes." },
        { title: "4. Utilisation acceptable", text: "Vous vous engagez à utiliser Kuabo uniquement à des fins légales et conformément aux présentes conditions. Il est interdit d'utiliser l'application pour des activités illégales ou nuisibles." },
        { title: "5. Contenu de l'application", text: "Les informations fournies par Kuabo sont à titre informatif uniquement et ne constituent pas des conseils juridiques, financiers ou médicaux professionnels." },
        { title: "6. Données personnelles", text: "Nous collectons et traitons vos données personnelles conformément à notre Politique de confidentialité. En utilisant Kuabo, vous consentez à cette collecte et ce traitement." },
        { title: "7. Carte communauté", text: "La fonctionnalité de carte communauté est optionnelle. Votre position approximative n'est partagée qu'avec votre consentement explicite et reste anonyme." },
        { title: "8. Limitation de responsabilité", text: "Kuabo n'est pas responsable des décisions prises sur la base des informations fournies par l'application. Consultez toujours des professionnels qualifiés pour des conseils spécifiques." },
        { title: "9. Modifications", text: "Nous nous réservons le droit de modifier ces conditions à tout moment. Les utilisateurs seront informés des modifications importantes." },
        { title: "10. Contact", text: "Pour toute question concernant ces conditions, contactez-nous à : support@kuabo.co" },
      ],
    },
    en: {
      title: "Terms of Service",
      updated: "Last updated: April 2026",
      sections: [
        { title: "1. Acceptance of Terms", text: "By using Kuabo, you agree to these Terms of Service. If you do not agree to these terms, please do not use the application." },
        { title: "2. Service Description", text: "Kuabo is an installation assistance application for immigrants. We provide general information and tools to facilitate your settlement in your new country." },
        { title: "3. User Account", text: "You are responsible for maintaining the confidentiality of your account and password. You agree not to share your account with others." },
        { title: "4. Acceptable Use", text: "You agree to use Kuabo only for lawful purposes and in accordance with these Terms. You may not use the application for illegal or harmful activities." },
        { title: "5. Application Content", text: "Information provided by Kuabo is for general informational purposes only and does not constitute professional legal, financial, or medical advice." },
        { title: "6. Personal Data", text: "We collect and process your personal data in accordance with our Privacy Policy. By using Kuabo, you consent to such collection and processing." },
        { title: "7. Community Map", text: "The community map feature is optional. Your approximate location is only shared with your explicit consent and remains anonymous." },
        { title: "8. Limitation of Liability", text: "Kuabo is not responsible for decisions made based on information provided by the application. Always consult qualified professionals for specific advice." },
        { title: "9. Changes", text: "We reserve the right to modify these terms at any time. Users will be notified of important changes." },
        { title: "10. Contact", text: "For any questions regarding these terms, contact us at: support@kuabo.co" },
      ],
    },
    es: {
      title: "Términos de Servicio",
      updated: "Última actualización: Abril 2026",
      sections: [
        { title: "1. Aceptación de términos", text: "Al usar Kuabo, aceptas estos Términos de Servicio. Si no estás de acuerdo, por favor no uses la aplicación." },
        { title: "2. Descripción del servicio", text: "Kuabo es una aplicación de asistencia para inmigrantes. Proporcionamos información general y herramientas para facilitar tu instalación en tu nuevo país." },
        { title: "3. Cuenta de usuario", text: "Eres responsable de mantener la confidencialidad de tu cuenta y contraseña. Aceptas no compartir tu cuenta con otras personas." },
        { title: "4. Uso aceptable", text: "Aceptas usar Kuabo solo para fines legales y de acuerdo con estos términos. No puedes usar la aplicación para actividades ilegales o dañinas." },
        { title: "5. Contenido de la aplicación", text: "La información proporcionada por Kuabo es solo para fines informativos y no constituye asesoramiento legal, financiero o médico profesional." },
        { title: "6. Datos personales", text: "Recopilamos y procesamos tus datos personales de acuerdo con nuestra Política de Privacidad. Al usar Kuabo, consientes dicha recopilación y procesamiento." },
        { title: "7. Mapa comunitario", text: "La función de mapa comunitario es opcional. Tu ubicación aproximada solo se comparte con tu consentimiento explícito y permanece anónima." },
        { title: "8. Limitación de responsabilidad", text: "Kuabo no es responsable de las decisiones tomadas basadas en la información proporcionada. Siempre consulta profesionales calificados para asesoramiento específico." },
        { title: "9. Cambios", text: "Nos reservamos el derecho de modificar estos términos en cualquier momento. Los usuarios serán notificados de cambios importantes." },
        { title: "10. Contacto", text: "Para cualquier pregunta sobre estos términos, contáctanos en: support@kuabo.co" },
      ],
    },
  }[lang];

  return (
    <div style={container}>
      <div style={header}>
        <button style={backBtn} onClick={() => window.history.back()}>←</button>
        <div style={logo}><span style={{ color:"#e8b84b" }}>Ku</span>abo</div>
        <div style={{ width:40 }} />
      </div>
      <div style={content_wrap}>
        <div style={titleStyle}>{content.title}</div>
        <div style={updatedStyle}>{content.updated}</div>
        {content.sections.map((s, i) => (
          <div key={i} style={section}>
            <div style={sectionTitle}>{s.title}</div>
            <div style={sectionText}>{s.text}</div>
          </div>
        ))}
        <div style={{ height:40 }} />
      </div>
    </div>
  );
}

const container: CSSProperties  = { minHeight:"100dvh", background:"#0b0f1a", color:"#f4f1ec" };
const header: CSSProperties     = { position:"sticky", top:0, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px", background:"rgba(11,15,26,0.95)", backdropFilter:"blur(12px)", borderBottom:"1px solid #1e2a3a", zIndex:100 };
const backBtn: CSSProperties    = { background:"none", border:"none", color:"#aaa", cursor:"pointer", fontSize:20, fontFamily:"inherit", width:40 };
const logo: CSSProperties       = { fontWeight:900, fontSize:18, fontFamily:"serif" };
const content_wrap: CSSProperties = { padding:"24px 20px", maxWidth:600, margin:"0 auto" };
const titleStyle: CSSProperties = { fontSize:24, fontWeight:700, color:"#f4f1ec", marginBottom:8 };
const updatedStyle: CSSProperties = { fontSize:12, color:"#555", marginBottom:28 };
const section: CSSProperties    = { marginBottom:24 };
const sectionTitle: CSSProperties = { fontSize:15, fontWeight:600, color:"#e8b84b", marginBottom:8 };
const sectionText: CSSProperties = { fontSize:13, color:"#aaa", lineHeight:1.8 };