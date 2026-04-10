"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
type Lang = "fr" | "en" | "es";

export default function Privacy() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const l = localStorage.getItem("lang") as Lang;
    if (l) setLang(l);
  }, []);

  const content = {
    fr: {
      title: "Politique de confidentialité",
      updated: "Dernière mise à jour : Avril 2026",
      sections: [
        { title: "1. Données collectées", text: "Nous collectons : votre nom, adresse email, situation d'immigration, position géographique approximative (si vous l'autorisez), et vos étapes d'installation complétées." },
        { title: "2. Utilisation des données", text: "Vos données sont utilisées pour personnaliser votre expérience, afficher les services près de chez vous, et améliorer l'application. Nous ne vendons jamais vos données à des tiers." },
        { title: "3. Carte communauté", text: "Si vous activez la carte communauté, votre position est arrondie à ~2km pour protéger votre vie privée. Seuls les autres utilisateurs Kuabo dans votre région peuvent voir votre point anonyme sur la carte. Vous pouvez désactiver cette fonction à tout moment." },
        { title: "4. Firebase et Google", text: "Nous utilisons Firebase (Google) pour l'authentification et le stockage des données. Vos données sont stockées sur des serveurs sécurisés conformément aux politiques de Google." },
        { title: "5. Partage des données", text: "Nous ne partageons vos données qu'avec les services nécessaires au fonctionnement de l'application (Firebase, Google Maps). Nous ne vendons jamais vos données." },
        { title: "6. Sécurité", text: "Nous utilisons des mesures de sécurité standard pour protéger vos données, incluant le chiffrement HTTPS et l'authentification sécurisée." },
        { title: "7. Vos droits", text: "Vous avez le droit d'accéder à vos données, de les modifier, ou de supprimer votre compte à tout moment depuis les paramètres de l'application." },
        { title: "8. Données des mineurs", text: "Kuabo n'est pas destiné aux personnes de moins de 13 ans. Nous ne collectons pas sciemment de données de mineurs." },
        { title: "9. Cookies", text: "Nous utilisons le stockage local (localStorage) pour mémoriser vos préférences. Aucun cookie publicitaire n'est utilisé." },
        { title: "10. Contact", text: "Pour toute question concernant vos données personnelles, contactez-nous à : privacy@kuabo.co" },
      ],
    },
    en: {
      title: "Privacy Policy",
      updated: "Last updated: April 2026",
      sections: [
        { title: "1. Data Collected", text: "We collect: your name, email address, immigration situation, approximate geographic location (if you allow it), and your completed installation steps." },
        { title: "2. Use of Data", text: "Your data is used to personalize your experience, display nearby services, and improve the application. We never sell your data to third parties." },
        { title: "3. Community Map", text: "If you enable the community map, your location is rounded to ~2km to protect your privacy. Only other Kuabo users in your region can see your anonymous dot on the map. You can disable this feature at any time." },
        { title: "4. Firebase and Google", text: "We use Firebase (Google) for authentication and data storage. Your data is stored on secure servers in accordance with Google's policies." },
        { title: "5. Data Sharing", text: "We only share your data with services necessary for the application to function (Firebase, Google Maps). We never sell your data." },
        { title: "6. Security", text: "We use standard security measures to protect your data, including HTTPS encryption and secure authentication." },
        { title: "7. Your Rights", text: "You have the right to access, modify, or delete your account at any time from the application settings." },
        { title: "8. Children's Data", text: "Kuabo is not intended for persons under 13 years of age. We do not knowingly collect data from minors." },
        { title: "9. Cookies", text: "We use local storage (localStorage) to remember your preferences. No advertising cookies are used." },
        { title: "10. Contact", text: "For any questions regarding your personal data, contact us at: privacy@kuabo.co" },
      ],
    },
    es: {
      title: "Política de Privacidad",
      updated: "Última actualización: Abril 2026",
      sections: [
        { title: "1. Datos recopilados", text: "Recopilamos: tu nombre, dirección de correo electrónico, situación migratoria, ubicación geográfica aproximada (si lo permites), y tus pasos de instalación completados." },
        { title: "2. Uso de datos", text: "Tus datos se usan para personalizar tu experiencia, mostrar servicios cercanos y mejorar la aplicación. Nunca vendemos tus datos a terceros." },
        { title: "3. Mapa comunitario", text: "Si activas el mapa comunitario, tu ubicación se redondea a ~2km para proteger tu privacidad. Solo otros usuarios de Kuabo en tu región pueden ver tu punto anónimo en el mapa." },
        { title: "4. Firebase y Google", text: "Usamos Firebase (Google) para autenticación y almacenamiento de datos. Tus datos se almacenan en servidores seguros de acuerdo con las políticas de Google." },
        { title: "5. Compartir datos", text: "Solo compartimos tus datos con los servicios necesarios para el funcionamiento de la aplicación (Firebase, Google Maps). Nunca vendemos tus datos." },
        { title: "6. Seguridad", text: "Usamos medidas de seguridad estándar para proteger tus datos, incluyendo cifrado HTTPS y autenticación segura." },
        { title: "7. Tus derechos", text: "Tienes derecho a acceder, modificar o eliminar tu cuenta en cualquier momento desde la configuración de la aplicación." },
        { title: "8. Datos de menores", text: "Kuabo no está destinado a personas menores de 13 años. No recopilamos conscientemente datos de menores." },
        { title: "9. Cookies", text: "Usamos almacenamiento local (localStorage) para recordar tus preferencias. No se usan cookies publicitarias." },
        { title: "10. Contacto", text: "Para cualquier pregunta sobre tus datos personales, contáctanos en: privacy@kuabo.co" },
      ],
    },
  }[lang];

  return (
    <div style={container}>
      <div style={header}>
        <button style={backBtn} onClick={() => router.back()}>←</button>
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

const container: CSSProperties    = { minHeight:"100dvh", background:"#0b0f1a", color:"#f4f1ec" };
const header: CSSProperties       = { position:"sticky", top:0, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px", background:"rgba(11,15,26,0.95)", backdropFilter:"blur(12px)", borderBottom:"1px solid #1e2a3a", zIndex:100 };
const backBtn: CSSProperties      = { background:"none", border:"none", color:"#aaa", cursor:"pointer", fontSize:20, fontFamily:"inherit", width:40 };
const logo: CSSProperties         = { fontWeight:900, fontSize:18, fontFamily:"serif" };
const content_wrap: CSSProperties = { padding:"24px 20px", maxWidth:600, margin:"0 auto" };
const titleStyle: CSSProperties   = { fontSize:24, fontWeight:700, color:"#f4f1ec", marginBottom:8 };
const updatedStyle: CSSProperties = { fontSize:12, color:"#555", marginBottom:28 };
const section: CSSProperties      = { marginBottom:24 };
const sectionTitle: CSSProperties = { fontSize:15, fontWeight:600, color:"#e8b84b", marginBottom:8 };
const sectionText: CSSProperties  = { fontSize:13, color:"#aaa", lineHeight:1.8 };
